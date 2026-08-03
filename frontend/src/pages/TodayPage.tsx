import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Route as RouteIcon,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  createMissionFromOption,
  type Mission,
  type MissionVariant,
  type RecommendationOption
} from "../data/appData";
import {
  describeResultAdjustment,
  getEligibleMissionOptions,
  getLatestResult,
  getMissionPlace,
  getRecommendationReasons,
  getRecommendedMissionOption
} from "../data/missionLogic";
import { useAppState } from "../state/AppState";

const variantLabels: Record<MissionVariant, string> = {
  recommended: "Recommended",
  lighter: "Lighter",
  different: "Different setting",
  more: "More time",
  alternative: "Another way"
};

const statusLabels: Record<Mission["status"], string> = {
  planned: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
  partly: "Partly completed",
  not_today: "Moved on from today"
};

const outcomeLabels = {
  completed: "Completed",
  partly: "Partly completed",
  not_today: "Not today"
} as const;

const scheduleTimes = ["08:00", "10:00", "12:00", "14:00", "18:00", "20:00"];

interface ScheduleDay {
  value: string;
  label: string;
  weekday: string;
  day: string;
  month: string;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildScheduleDays(): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: toDateKey(date),
      label: new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "short",
        day: "numeric"
      }).format(date),
      weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      day: String(date.getDate()),
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(date)
    };
  });
}

function formatSchedule(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatResultDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function isInNextSevenDays(value: string): boolean {
  const scheduled = new Date(value).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduled >= today.getTime() && scheduled < today.getTime() + 7 * 24 * 60 * 60 * 1000;
}

function missionDateKey(mission: Mission): string | null {
  return mission.scheduledFor ? toDateKey(new Date(mission.scheduledFor)) : null;
}

export function TodayPage() {
  const navigate = useNavigate();
  const { data, ready, updateData } = useAppState();
  const recommendedOption = useMemo(() => getRecommendedMissionOption(data), [data]);
  const eligibleOptions = useMemo(() => getEligibleMissionOptions(data), [data]);
  const scheduleDays = useMemo(buildScheduleDays, []);
  const [selectedDay, setSelectedDay] = useState(scheduleDays[0].value);
  const [selectedOptionId, setSelectedOptionId] = useState(
    data.mission?.optionId ?? recommendedOption.id
  );
  const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(scheduleDays[0].value);
  const [scheduleTime, setScheduleTime] = useState(data.settings.checkInRhythm.time);
  const [scheduleNotice, setScheduleNotice] = useState("");

  useEffect(() => {
    if (data.mission) {
      setSelectedOptionId(data.mission.optionId);
    } else {
      setSelectedOptionId(recommendedOption.id);
    }
  }, [data.mission?.optionId, recommendedOption.id]);

  const selectedOption =
    data.recommendations.find((option) => option.id === selectedOptionId) ?? recommendedOption;
  const selectedPlace = getMissionPlace(data, selectedOption);
  const selectedIsActive = data.mission?.optionId === selectedOption.id;
  const activeStatus = selectedIsActive ? data.mission?.status : null;
  const reasons = getRecommendationReasons(data, selectedOption);
  const completedRouteSteps = data.route.filter((step) => step.completed).length;
  const currentRouteStep = data.route.find((step) => !step.completed) ?? null;
  const latestResult = getLatestResult(data);
  const resultAdjustment = describeResultAdjustment(latestResult);
  const scheduleTarget = scheduleTargetId
    ? data.recommendations.find((option) => option.id === scheduleTargetId) ?? null
    : null;
  const selectedDayInfo = scheduleDays.find((day) => day.value === selectedDay) ?? scheduleDays[0];
  const isTodaySelected = selectedDay === scheduleDays[0].value;
  const upcomingMissions = [...data.plannedMissions]
    .filter((mission) => mission.scheduledFor && isInNextSevenDays(mission.scheduledFor))
    .sort(
      (left, right) =>
        new Date(left.scheduledFor ?? 0).getTime() - new Date(right.scheduledFor ?? 0).getTime()
    );
  const selectedDayPlans = upcomingMissions.filter((mission) => missionDateKey(mission) === selectedDay);
  const unscheduledCurrentMission =
    isTodaySelected && data.mission && !data.mission.scheduledFor ? data.mission : null;
  const selectedDayCount = selectedDayPlans.length + (unscheduledCurrentMission ? 1 : 0);
  const plannerOptions = data.recommendations.filter((option) => option.visionId === data.vision.id);
  const locationName =
    selectedPlace?.name ?? (selectedOption.format === "At home" ? "Home" : "Online");
  const focusTiming =
    selectedIsActive && data.mission?.scheduledFor
      ? formatSchedule(data.mission.scheduledFor)
      : isTodaySelected
        ? "Today / Flexible time"
        : `${selectedDayInfo.label} / Time not set`;
  const recordedResult = latestResult
    ? `${outcomeLabels[latestResult.reflection.outcome]} on ${formatResultDate(latestResult.reflection.createdAt)}`
    : "No result yet";

  if (!ready) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading Missions stored on this device...</p>
      </main>
    );
  }

  const chooseOption = (option: RecommendationOption, scrollToFocus = true) => {
    setSelectedOptionId(option.id);
    setScheduleNotice("");
    if (scrollToFocus) {
      document.getElementById("planner-focus")?.scrollIntoView({
        behavior: data.settings.reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    }
  };

  const startSelectedMission = () => {
    const startedAt = new Date().toISOString();
    updateData((current) => ({
      ...current,
      mission:
        current.mission?.optionId === selectedOption.id
          ? { ...current.mission, status: "in_progress", startedAt }
          : createMissionFromOption(selectedOption, { status: "in_progress", startedAt })
    }));
    navigate("/app/mission");
  };

  const finishSelectedMission = () => {
    const completedAt = new Date().toISOString();
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status: "completed", completedAt } : null
    }));
    navigate("/app/reflection");
  };

  const markNotToday = () => {
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status: "not_today" } : null
    }));
    navigate("/app/reflection");
  };

  const runPrimaryAction = () => {
    if (activeStatus === "in_progress") {
      finishSelectedMission();
    } else if (activeStatus === "completed" || activeStatus === "partly" || activeStatus === "not_today") {
      navigate("/app/reflection");
    } else {
      startSelectedMission();
    }
  };

  const openSchedule = (option: RecommendationOption, plan?: Mission, preferredDate?: string) => {
    setScheduleTargetId(option.id);
    setEditingPlanId(plan?.id ?? null);
    if (plan?.scheduledFor) {
      const scheduled = new Date(plan.scheduledFor);
      const existingDate = toDateKey(scheduled);
      setScheduleDate(scheduleDays.some((day) => day.value === existingDate) ? existingDate : scheduleDays[0].value);
      setScheduleTime(`${String(scheduled.getHours()).padStart(2, "0")}:${String(scheduled.getMinutes()).padStart(2, "0")}`);
    } else {
      setScheduleDate(preferredDate ?? selectedDay);
      setScheduleTime(data.settings.checkInRhythm.time);
    }
    setScheduleNotice("");
  };

  const saveSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleTarget) return;

    const wasEditing = editingPlanId !== null;
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    updateData((current) => ({
      ...current,
      plannedMissions: editingPlanId
        ? current.plannedMissions.map((mission) =>
            mission.id === editingPlanId ? { ...mission, scheduledFor } : mission
          )
        : [
            ...current.plannedMissions,
            createMissionFromOption(scheduleTarget, { status: "planned", scheduledFor })
          ]
    }));
    setSelectedDay(scheduleDate);
    setScheduleTargetId(null);
    setEditingPlanId(null);
    setScheduleNotice(wasEditing ? "Mission moved." : "Mission added to your week.");
  };

  const startPlannedMissionNow = (mission: Mission) => {
    const startedAt = new Date().toISOString();
    updateData((current) => ({
      ...current,
      mission: {
        ...mission,
        status: "in_progress",
        scheduledFor: null,
        selectedAt: startedAt,
        startedAt
      },
      plannedMissions: current.plannedMissions.filter((item) => item.id !== mission.id)
    }));
    navigate("/app/mission");
  };

  const removePlannedMission = (missionId: string) => {
    updateData((current) => ({
      ...current,
      plannedMissions: current.plannedMissions.filter((mission) => mission.id !== missionId)
    }));
  };

  const primaryLabel = !isTodaySelected
    ? `Plan for ${selectedDayInfo.weekday}`
    : activeStatus === "in_progress"
      ? "Finish and reflect"
      : activeStatus === "completed" || activeStatus === "partly" || activeStatus === "not_today"
        ? "Open reflection"
        : activeStatus === "planned"
          ? "Start mission"
          : "Start now";

  const handlePrimaryAction = () => {
    if (isTodaySelected) {
      runPrimaryAction();
    } else {
      openSchedule(selectedOption, undefined, selectedDay);
    }
  };

  return (
    <main className="app-page mission-home planner-dashboard">
      <header className="planner-heading">
        <div>
          <p className="app-kicker">Week of {scheduleDays[0].month} {scheduleDays[0].day}</p>
          <h1>Plan the week. Do one thing today.</h1>
          <p>Give a possible action a real day and time, then adjust the plan when life changes.</p>
        </div>
        <Link className="planner-direction" to="/app/vision">
          <span>Current direction</span>
          <strong>{data.vision.title}</strong>
          <small>{currentRouteStep ? `Route step ${currentRouteStep.level} of ${data.route.length}` : `${completedRouteSteps} steps explored`}</small>
          <ChevronRight aria-hidden="true" />
        </Link>
      </header>

      <div className="planner-header-actions">
        <Link className="primary-command" to="/app/check-in">
          <RefreshCcw aria-hidden="true" />
          <span>Update today's conditions</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>


      <section className="planner-flow" aria-label="Plan, do, and review status">
        <div className={upcomingMissions.length ? "is-complete" : "is-current"}>
          <span>01 / Plan</span>
          <strong>{upcomingMissions.length ? `${upcomingMissions.length} on the calendar` : "Choose a day"}</strong>
        </div>
        <div className={activeStatus === "in_progress" ? "is-current" : ""}>
          <span>02 / Do</span>
          <strong>{activeStatus ? statusLabels[activeStatus] : "Mission ready"}</strong>
        </div>
        <div className={latestResult ? "is-complete" : ""}>
          <span>03 / Review</span>
          <strong>{recordedResult}</strong>
        </div>
        {latestResult && (
          <p className="planner-result-line">
            {resultAdjustment}
            <Link to="/app/insights">View full history <ArrowRight aria-hidden="true" /></Link>
          </p>
        )}
      </section>

      <section className="planner-calendar" aria-labelledby="planner-calendar-title">
        <div className="planner-calendar-heading">
          <div>
            <p className="app-kicker">Your next seven days</p>
            <h2 id="planner-calendar-title">This week</h2>
          </div>
          <CalendarDays aria-hidden="true" />
        </div>
        <div className="planner-day-strip" role="tablist" aria-label="Choose a day">
          {scheduleDays.map((day, index) => {
            const planCount = upcomingMissions.filter((mission) => missionDateKey(mission) === day.value).length;
            const count = planCount + (index === 0 && data.mission && !data.mission.scheduledFor ? 1 : 0);
            return (
              <button
                className={`${selectedDay === day.value ? "is-selected" : ""}${index === 0 ? " is-today" : ""}`}
                type="button"
                role="tab"
                aria-selected={selectedDay === day.value}
                onClick={() => setSelectedDay(day.value)}
                key={day.value}
              >
                <span>{index === 0 ? "Today" : day.weekday}</span>
                <strong>{day.day}</strong>
                <small>{count ? `${count} planned` : "Open"}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="planner-workspace">
        <section className="planner-focus" id="planner-focus" aria-labelledby="planner-focus-title">
          <div className="planner-focus-topline">
            <span>{selectedIsActive && activeStatus ? statusLabels[activeStatus] : variantLabels[selectedOption.variant]}</span>
            <small>{isTodaySelected ? "Today's action" : `For ${selectedDayInfo.label}`}</small>
          </div>
          <h2 id="planner-focus-title">{selectedOption.title}</h2>
          <p className="planner-focus-description">{selectedOption.description}</p>

          <div className="planner-focus-actions">
            <button className="primary-command" type="button" onClick={handlePrimaryAction}>
              {isTodaySelected ? <Play aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
              {primaryLabel}
            </button>
            <button
              className="secondary-command"
              type="button"
              onClick={() => document.getElementById("mission-library")?.scrollIntoView({ behavior: data.settings.reducedMotion ? "auto" : "smooth" })}
            >
              <RefreshCcw aria-hidden="true" /> Change
            </button>
            {isTodaySelected && (
              <button className="text-button" type="button" onClick={() => openSchedule(selectedOption)}>
                <CalendarPlus aria-hidden="true" /> Add to calendar
              </button>
            )}
            {selectedIsActive && activeStatus !== "completed" && activeStatus !== "not_today" && (
              <button className="text-button planner-defer-action" type="button" onClick={markNotToday}>
                <Pause aria-hidden="true" /> Not today
              </button>
            )}
          </div>

          <dl className="planner-facts">
            <div><dt><CalendarClock aria-hidden="true" /> When</dt><dd>{focusTiming}</dd></div>
            <div><dt><Clock3 aria-hidden="true" /> Duration</dt><dd>{selectedOption.durationMinutes} minutes</dd></div>
            <div><dt><MapPin aria-hidden="true" /> Place</dt><dd>{locationName}</dd></div>
            <div><dt><Navigation aria-hidden="true" /> Travel</dt><dd>{selectedPlace ? `${selectedPlace.distanceKm} km` : "No travel"}</dd></div>
            <div><dt><WalletCards aria-hidden="true" /> Cost</dt><dd>{selectedPlace?.cost ?? selectedOption.estimatedCost}</dd></div>
            <div><dt><PackageCheck aria-hidden="true" /> Bring</dt><dd>{selectedOption.supplies.length ? selectedOption.supplies.join(", ") : "Nothing extra"}</dd></div>
          </dl>
        </section>

        <aside className="planner-day-agenda" aria-labelledby="planner-day-title">
          <header>
            <div>
              <p className="app-kicker">{selectedDayInfo.label}</p>
              <h2 id="planner-day-title">Day plan</h2>
            </div>
            <span>{selectedDayCount} {selectedDayCount === 1 ? "mission" : "missions"}</span>
          </header>

          <div className="planner-agenda-list">
            {unscheduledCurrentMission && (
              <article className="planner-agenda-item is-current">
                <time>Anytime</time>
                <div>
                  <span>{statusLabels[unscheduledCurrentMission.status]}</span>
                  <h3>{unscheduledCurrentMission.title}</h3>
                  <p>{unscheduledCurrentMission.durationMinutes} min / {unscheduledCurrentMission.placeType}</p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Open ${unscheduledCurrentMission.title}`}
                  title="Open mission"
                  onClick={() => {
                    const option = data.recommendations.find((item) => item.id === unscheduledCurrentMission.optionId);
                    if (option) chooseOption(option, false);
                  }}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </article>
            )}

            {selectedDayPlans.map((mission) => {
              const option = data.recommendations.find((item) => item.id === mission.optionId) ?? recommendedOption;
              const place = getMissionPlace(data, mission);
              return (
                <article className="planner-agenda-item" key={mission.id}>
                  <time dateTime={mission.scheduledFor ?? undefined}>{mission.scheduledFor ? formatTime(mission.scheduledFor) : "Anytime"}</time>
                  <div>
                    <span>Planned</span>
                    <h3>{mission.title}</h3>
                    <p>{mission.durationMinutes} min / {place?.name ?? mission.placeType}</p>
                  </div>
                  <div className="planner-agenda-actions">
                    {isTodaySelected && (
                      <button className="planner-small-command" type="button" onClick={() => startPlannedMissionNow(mission)}>Start</button>
                    )}
                    <button className="icon-button" type="button" aria-label={`Move ${mission.title}`} title="Move" onClick={() => openSchedule(option, mission)}><CalendarClock aria-hidden="true" /></button>
                    <button className="icon-button" type="button" aria-label={`Remove ${mission.title}`} title="Remove" onClick={() => removePlannedMission(mission.id)}><X aria-hidden="true" /></button>
                  </div>
                </article>
              );
            })}

            {selectedDayCount === 0 && (
              <div className="planner-open-slot">
                <span>{data.settings.checkInRhythm.time}</span>
                <div><strong>Open time</strong><p>Add one realistic action to this day.</p></div>
                <button className="icon-button" type="button" aria-label={`Add a mission to ${selectedDayInfo.label}`} title="Add mission" onClick={() => openSchedule(selectedOption, undefined, selectedDay)}><Plus aria-hidden="true" /></button>
              </div>
            )}
          </div>

          <div className="planner-day-footer">
            <Link to="/app/check-in">Update today's conditions <ArrowRight aria-hidden="true" /></Link>
            {scheduleNotice && <span aria-live="polite">{scheduleNotice}</span>}
          </div>
        </aside>
      </div>

      {scheduleTarget && (
        <form className="mission-schedule-editor planner-schedule-editor" onSubmit={saveSchedule}>
          <div>
            <p className="app-kicker">{editingPlanId ? "Move Mission" : "Add to calendar"}</p>
            <h2>{scheduleTarget.title}</h2>
          </div>
          <label>
            Day
            <select value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)}>
              {scheduleDays.map((day) => <option value={day.value} key={day.value}>{day.label}</option>)}
            </select>
          </label>
          <label>
            Time
            <select value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)}>
              {scheduleTimes.map((time) => <option value={time} key={time}>{time}</option>)}
            </select>
          </label>
          <div className="mission-schedule-actions">
            <button className="primary-command" type="submit">Save plan <ArrowRight aria-hidden="true" /></button>
            <button className="icon-button" type="button" aria-label="Close schedule editor" title="Close" onClick={() => setScheduleTargetId(null)}>
              <X aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      <nav className="mission-supporting-links" aria-label="Supporting ReNew tools">
        <Link to="/app/route"><RouteIcon aria-hidden="true" /><span>Life Route<strong>{completedRouteSteps} of {data.route.length} explored</strong></span><ChevronRight aria-hidden="true" /></Link>
        <Link to="/app/places"><MapPin aria-hidden="true" /><span>Places<strong>Review real-world conditions</strong></span><ChevronRight aria-hidden="true" /></Link>
        <Link to="/app/insights"><CheckCircle2 aria-hidden="true" /><span>Activity records<strong>Monitor plans and results</strong></span><ChevronRight aria-hidden="true" /></Link>
        <Link to="/app/support"><UsersRound aria-hidden="true" /><span>Support<strong>Available when you choose it</strong></span><ChevronRight aria-hidden="true" /></Link>
      </nav>
    </main>
  );
}
