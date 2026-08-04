import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Info,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  /* ─── Collapsible "This Week" section ─── */
  const [weekOpen, setWeekOpen] = useState(false);

  /* ─── Walkthrough state ─── */
  const TOTAL_STEPS = 4;
  const [activeStep, setActiveStep] = useState<number | null>(
    data.settings.walkthroughSeen ? null : 0
  );
  const [walkthroughDone, setWalkthroughDone] = useState(data.settings.walkthroughSeen);

  /* One ref per target element, in display order:
     0 = Check-in button   1 = Plan/Do/Review   2 = Vision link   3 = Why-this-fits */
  const cmRef0 = useRef<HTMLElement | null>(null); // check-in link (set via callback ref)
  const cmRef1 = useRef<HTMLElement | null>(null); // planner-flow section
  const cmRef2 = useRef<HTMLElement | null>(null); // vision link
  const cmRef3 = useRef<HTMLElement | null>(null); // why-this-fits aside

  /* Measured rect of the current target */
  interface Rect { top: number; left: number; width: number; height: number }
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const refs = [cmRef0, cmRef1, cmRef2, cmRef3];

  /* Measure (or re-measure) the active target */
  const measureTarget = () => {
    if (activeStep === null) return;
    const el = refs[activeStep].current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  };

  /* On step change: scroll target into view, then measure */
  useEffect(() => {
    if (activeStep === null || walkthroughDone) return;
    const el = refs[activeStep].current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const inView = r.top >= 0 && r.bottom <= window.innerHeight;
    if (!inView) {
      el.scrollIntoView({ behavior: data.settings.reducedMotion ? "auto" : "smooth", block: "center" });
      /* Re-measure after scroll settles */
      const timer = window.setTimeout(measureTarget, data.settings.reducedMotion ? 0 : 350);
      return () => clearTimeout(timer);
    }
    measureTarget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, walkthroughDone]);

  /* Re-measure on scroll and resize while walkthrough is active */
  useEffect(() => {
    if (walkthroughDone) return;
    window.addEventListener("scroll", measureTarget, { passive: true });
    window.addEventListener("resize", measureTarget, { passive: true });
    const ro = new ResizeObserver(measureTarget);
    const el = activeStep !== null ? refs[activeStep].current : null;
    if (el) ro.observe(el);
    return () => {
      window.removeEventListener("scroll", measureTarget);
      window.removeEventListener("resize", measureTarget);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthroughDone, activeStep]);

  const dismissWalkthrough = () => {
    setActiveStep(null);
    setWalkthroughDone(true);
    setTargetRect(null);
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, walkthroughSeen: true }
    }));
  };

  const advanceStep = () => {
    if (activeStep === null) return;
    if (activeStep >= TOTAL_STEPS - 1) {
      dismissWalkthrough();
    } else {
      setTargetRect(null); // clear until next measurement
      setActiveStep(activeStep + 1);
    }
  };

  /* Escape key dismisses */
  useEffect(() => {
    if (walkthroughDone) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dismissWalkthrough(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthroughDone]);

  /* Functional tip content — instruction shape: what it is + what to do */
  const tips = [
    {
      label: "Check-In button",
      copy: "Tap here to check in — it takes about a minute and shapes what's suggested today."
    },
    {
      label: "Plan · Do · Review",
      copy: "This shows where you are today — tap any step to look back at it."
    },
    {
      label: "Life Vision link",
      copy: "Tap here anytime to see or change your bigger goal."
    },
    {
      label: "Why this fits today",
      copy: "Tap to see the reasoning behind today's suggestion, anytime."
    }
  ];

  /* Info disclosure state — "(i)" affordances */
  const [visionInfoOpen, setVisionInfoOpen] = useState(false);
  const [routeInfoOpen, setRouteInfoOpen] = useState(false);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      {/* ── Coach-marks: real-position spotlight ── */}
      {!walkthroughDone && activeStep !== null && (() => {
        const tip = tips[activeStep];
        const PAD = 8; // px padding around target

        /* Compute spotlight panels from targetRect */
        const top    = targetRect ? Math.max(0, targetRect.top    - PAD) : 0;
        const left   = targetRect ? Math.max(0, targetRect.left   - PAD) : 0;
        const w      = targetRect ? targetRect.width  + PAD * 2 : 0;
        const h      = targetRect ? targetRect.height + PAD * 2 : 0;

        /* Position tip: below target if space available, else above */
        const viewH = window.innerHeight;
        const viewW = window.innerWidth;
        const TIP_H = 160; // estimated tip height px
        const TIP_W = Math.min(352, viewW - 32);
        const belowRoom = (top + h + 14 + TIP_H) <= viewH;
        const arrowDir = belowRoom ? "is-up" : "is-down";

        /* Tip top edge */
        const tipTop = belowRoom ? top + h + 14 : top - 14 - TIP_H;
        /* Arrow X relative to tip: centre over the target */
        const targetCentreX = left + w / 2;
        const tipLeft = Math.min(Math.max(targetCentreX - TIP_W / 2, 16), viewW - TIP_W - 16);
        const arrowX = Math.min(Math.max(targetCentreX - tipLeft, 16), TIP_W - 16);

        const sceneStyle = {
          "--cm-top":  `${top}px`,
          "--cm-left": `${left}px`,
          "--cm-w":    `${w}px`,
          "--cm-h":    `${h}px`
        } as React.CSSProperties;

        const tipStyle = targetRect ? {
          top:   `${tipTop}px`,
          left:  `${tipLeft}px`,
          "--arrow-x": `${arrowX}px`
        } as React.CSSProperties : {};

        return (
          <>
            {/* Four dim panels leaving the target element unobscured */}
            <div className="coach-mark-scene" style={sceneStyle} aria-hidden="true">
              <div className="coach-mark-dim-top" />
              <div className="coach-mark-dim-bottom" />
              <div className="coach-mark-dim-left" />
              <div className="coach-mark-dim-right" />
              {targetRect && <div className="coach-mark-ring" />}
            </div>

            {/* Tip bubble anchored to the target */}
            <div
              className={`coach-mark-tip${targetRect ? " is-positioned" : ""}`}
              style={tipStyle}
              role="dialog"
              aria-modal="true"
              aria-label={`Walkthrough ${activeStep + 1} of ${TOTAL_STEPS}: ${tip.label}`}
              aria-describedby="cm-instruction"
            >
              {/* Arrow pointing toward the highlighted element */}
              {targetRect && <span className={`coach-mark-arrow ${arrowDir}`} aria-hidden="true" />}

              <div className="coach-mark-text">
                <strong>{tip.label}</strong>
                <p id="cm-instruction">{tip.copy}</p>
              </div>
              <button
                className="coach-mark-close"
                type="button"
                aria-label="Dismiss walkthrough"
                onClick={dismissWalkthrough}
              >
                <X aria-hidden="true" />
              </button>
              <div className="coach-mark-actions">
                <span className="coach-mark-step">{activeStep + 1} / {TOTAL_STEPS}</span>
                {activeStep < TOTAL_STEPS - 1 ? (
                  <button className="primary-command" type="button" onClick={advanceStep}
                    aria-label={`Next: ${tips[activeStep + 1].label}`}>
                    Next <ArrowRight aria-hidden="true" />
                  </button>
                ) : (
                  <button className="primary-command" type="button" onClick={dismissWalkthrough}>
                    Got it <Check aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Header ── */}
      <header className="planner-heading">
        <div>
          <p className="app-kicker">Week of {scheduleDays[0].month} {scheduleDays[0].day}</p>
          <h1>Plan the week. Do one thing today.</h1>
          <p>Give a possible action a real day and time, then adjust the plan when life changes.</p>
        </div>
        {/* Life Vision link with (i) affordance */}
        <div className="planner-direction-wrap">
          <Link className="planner-direction" to="/app/vision" aria-label="View your Life Vision" ref={(el) => { cmRef2.current = el; }}>
            <span>
              Life Vision
              <button
                className="info-affordance"
                type="button"
                aria-label="What is a Life Vision?"
                aria-expanded={visionInfoOpen}
                onClick={(e) => { e.preventDefault(); setVisionInfoOpen((v) => !v); }}
              ><Info aria-hidden="true" /></button>
            </span>
            <strong>{data.vision.title}</strong>
            <small>{currentRouteStep ? `Route Level ${currentRouteStep.level} of ${data.route.length}` : `${completedRouteSteps} levels explored`}</small>
            <ChevronRight aria-hidden="true" />
          </Link>
          {visionInfoOpen && (
            <aside className="info-disclosure" role="note">
              <p>Your Life Vision is the direction you want to move toward — not a deadline or diagnosis. Every Mission is a small step along that route.</p>
              <button type="button" className="text-button" onClick={() => setVisionInfoOpen(false)}>Close</button>
            </aside>
          )}
        </div>
      </header>

      <div className="planner-header-actions">
        <Link
          className="primary-command"
          to="/app/check-in"
          ref={(el) => { cmRef0.current = el; }}
        >
          <RefreshCcw aria-hidden="true" />
          <span>Update today's conditions</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {/* ── Plan / Do / Review status row ── */}
      <section
        className="planner-flow"
        aria-label="Plan, do, and review status"
        ref={(el) => { cmRef1.current = el; }}
      >
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

      {/* ── Mission hero — always visible ── */}
      <section
        className="planner-focus today-hero-focus"
        id="planner-focus"
        aria-labelledby="planner-focus-title"
      >
        <div className="planner-focus-topline">
          <span>{selectedIsActive && activeStatus ? statusLabels[activeStatus] : variantLabels[selectedOption.variant]}</span>
          <small>Today's Mission</small>
        </div>
        <h2 id="planner-focus-title">{selectedOption.title}</h2>
        <p className="planner-focus-description">{selectedOption.description}</p>

        <div className="planner-focus-actions">
          <button className="primary-command" type="button" onClick={handlePrimaryAction}>
            <Play aria-hidden="true" />
            {primaryLabel}
          </button>
          <Link
            className="secondary-command"
            to="/app/recommendation"
            aria-label="See other Mission sizes"
          >
            <RefreshCcw aria-hidden="true" /> See other sizes →
          </Link>
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

        {/* ── Why this fits — always visible, never collapsed ── */}
        {reasons.length > 0 && (
          <aside
            className="mission-fit"
            aria-label="Why this Mission fits today"
            ref={(el) => { cmRef3.current = el; }}
          >
            <p className="app-kicker">Why this fits today</p>
            <ul>
              {reasons.map((reason) => (
                <li key={reason}><Check aria-hidden="true" /> {reason}</li>
              ))}
            </ul>
          </aside>
        )}
      </section>

      {/* ── Collapsible "This Week" section ── */}
      <div className="today-week-section">
        <button
          className="today-week-toggle"
          type="button"
          aria-expanded={weekOpen}
          onClick={() => setWeekOpen((v) => !v)}
        >
          <CalendarDays aria-hidden="true" />
          This week
          {weekOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>

        {weekOpen && (
          <div className="today-week-body">

            {/* 7-day calendar strip */}
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

            {/* Day agenda panel */}
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

            {/* See other Mission options link */}
            <div className="today-week-mission-link">
              <Link to="/app/recommendation">
                See other Mission sizes <ArrowRight aria-hidden="true" />
              </Link>
            </div>

          </div>
        )}
      </div>

      {/* ── Schedule editor (shown when scheduling) ── */}
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

      {/* ── Supporting nav links — unchanged ── */}
      <nav className="mission-supporting-links" aria-label="Supporting ReNew tools">
        <Link to="/app/route">
          <RouteIcon aria-hidden="true" />
          <span>
            Route
            <button
              className="info-affordance"
              type="button"
              aria-label="What is the Route?"
              aria-expanded={routeInfoOpen}
              onClick={(e) => { e.preventDefault(); setRouteInfoOpen((v) => !v); }}
            ><Info aria-hidden="true" /></button>
            <strong>{completedRouteSteps} of {data.route.length} levels explored</strong>
          </span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link to="/app/places"><MapPin aria-hidden="true" /><span>Places<strong>Review real-world conditions</strong></span><ChevronRight aria-hidden="true" /></Link>
        <Link to="/app/insights"><CheckCircle2 aria-hidden="true" /><span>Insights<strong>Monitor plans and results</strong></span><ChevronRight aria-hidden="true" /></Link>
        <Link to="/app/support"><UsersRound aria-hidden="true" /><span>Support<strong>Available when you choose it</strong></span><ChevronRight aria-hidden="true" /></Link>
      </nav>

      {routeInfoOpen && (
        <aside className="info-disclosure info-disclosure-bottom" role="note">
          <p>Your Route is a set of levels — from the smallest possible action up to your full goal. Each completed Mission advances you along it at your own pace.</p>
          <button type="button" className="text-button" onClick={() => setRouteInfoOpen(false)}>Close</button>
        </aside>
      )}
    </main>
  );
}
