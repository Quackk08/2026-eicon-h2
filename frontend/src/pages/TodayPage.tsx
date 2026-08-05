import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Camera,
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
  Square,
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
  getLatestResult,
  getMissionPlace,
  getRecommendationReasons,
  getRecommendedMissionOption
} from "../data/missionLogic";
import { toDateKey } from "../data/dates";
import {
  fetchLatestRecommendation,
  requestDailyRecommendation,
  selectMissionOption,
  updateMission as updateMissionOnServer,
  updateMissionStatusOrQueue
} from "../api/backend";
import { ApiError } from "../api/client";
import { fromApiMission } from "../api/mappers";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MissionVerifySheet } from "../components/MissionVerifySheet";
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

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(Math.max(seconds, 0) / 60);
  const rest = Math.max(seconds, 0) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * A <select> whose value is absent from its options renders as the first
 * option instead, silently moving the plan. The Check-In rhythm and an
 * already-saved plan are both free-form times, so whatever is actually
 * selected is always offered.
 */
function withSelectedTime(value: string): string[] {
  return scheduleTimes.includes(value) ? scheduleTimes : [...scheduleTimes, value].sort();
}

type Notice = { text: string; tone: "ok" | "error" } | null;

/** The three first-visit coach-marks; each points at one spotlighted element. */
const walkthroughTips = [
  {
    label: "Plan · Do · Review",
    copy: "These three cells show where you are in today's flow.",
    step: "01 / 03"
  },
  {
    label: "Your Life Vision",
    copy: "Tap here anytime to read or update your direction.",
    step: "02 / 03"
  },
  {
    label: "Why this fits today",
    copy: "These reasons explain exactly why this Mission size was matched to your Check-In.",
    step: "03 / 03"
  }
];

interface ScheduleDay {
  value: string;
  label: string;
  weekday: string;
  day: string;
  month: string;
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
  const { data, ready, recommendation, updateData, refresh } = useAppState();
  // The backend decides today's step from the latest Check-In; the local
  // heuristic is only the offline fallback. Without this the "Best fit" badge
  // sat on the Route's first step no matter what the Check-In said.
  const recommendedOption = useMemo(
    () =>
      (recommendation &&
        data.recommendations.find((option) => option.id === recommendation.selected_template_id)) ??
      getRecommendedMissionOption(data),
    [data, recommendation]
  );
  const scheduleDays = useMemo(buildScheduleDays, []);
  const [selectedDay, setSelectedDay] = useState(scheduleDays[0].value);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    data.mission?.optionId ?? recommendedOption?.id ?? null
  );
  const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(scheduleDays[0].value);
  const [scheduleTime, setScheduleTime] = useState(data.settings.checkInRhythm.time);
  const [notice, setNotice] = useState<Notice>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  /* ─── Live-mission state: the hero itself is the mission surface ─── */
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const verifySheetRef = useRef<HTMLDivElement>(null);

  /* ─── Collapsible "This Week" section ─── */
  const [weekOpen, setWeekOpen] = useState(false);

  /* ─── Walkthrough state ─── */
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [walkthroughDone, setWalkthroughDone] = useState(true);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);
  const walkthroughOffered = useRef(false);

  /* Info disclosure state — "(i)" affordances */
  const [visionInfoOpen, setVisionInfoOpen] = useState(false);
  const [routeInfoOpen, setRouteInfoOpen] = useState(false);

  const scheduleFormRef = useRef<HTMLFormElement>(null);
  const tooltipRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  /*
   * The stored flag is only trustworthy once IndexedDB has loaded. Reading it
   * during the first render read the empty default instead, so every returning
   * user was shown the tour again on every visit.
   */
  useEffect(() => {
    if (!ready || walkthroughOffered.current) return;
    walkthroughOffered.current = true;
    if (!data.settings.walkthroughSeen) {
      setWalkthroughDone(false);
      setActiveTooltip(0);
    }
  }, [ready, data.settings.walkthroughSeen]);

  const dismissWalkthrough = () => {
    setActiveTooltip(null);
    setWalkthroughDone(true);
    setSpotlight(null);
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, walkthroughSeen: true }
    }));
  };

  const advanceTooltip = () => {
    if (activeTooltip === null) return;
    if (activeTooltip >= 2) {
      dismissWalkthrough();
    } else {
      setActiveTooltip(activeTooltip + 1);
    }
  };

  /* Escape key dismisses walkthrough */
  useEffect(() => {
    if (walkthroughDone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissWalkthrough();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [walkthroughDone]);

  /*
   * Each step names one element ("Tap here anytime"), so it has to be visible
   * and marked. Without this the ring the stylesheet defines was never drawn
   * and the bubble sat at the bottom of the viewport pointing at nothing.
   */
  useEffect(() => {
    if (walkthroughDone || activeTooltip === null) {
      setSpotlight(null);
      return;
    }
    const target = tooltipRefs[activeTooltip]?.current;
    if (!target) {
      setSpotlight(null);
      return;
    }

    target.scrollIntoView({
      behavior: data.settings.reducedMotion ? "auto" : "smooth",
      block: "center"
    });

    const measure = () => setSpotlight(target.getBoundingClientRect());
    measure();
    // Capture phase so the scroll above is tracked wherever it happens.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [walkthroughDone, activeTooltip, data.settings.reducedMotion]);

  /*
   * The editor renders below the week panel, which is collapsed by default —
   * so "Add to calendar" appeared to do nothing at all. Bring it into view,
   * put the cursor in it, and let Escape back out.
   */
  useEffect(() => {
    if (!scheduleTargetId) return;
    const form = scheduleFormRef.current;
    form?.scrollIntoView({
      behavior: data.settings.reducedMotion ? "auto" : "smooth",
      block: "center"
    });
    form?.querySelector("select")?.focus();

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setScheduleTargetId(null);
        setEditingPlanId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [scheduleTargetId, data.settings.reducedMotion]);

  useEffect(() => {
    if (data.mission) {
      setSelectedOptionId(data.mission.optionId);
    } else if (recommendedOption) {
      setSelectedOptionId(recommendedOption.id);
    }
  }, [data.mission?.optionId, recommendedOption?.id]);

  // The remaining-time chip on the live hero; only ticks while something runs.
  const missionRunning = data.mission?.status === "in_progress";
  useEffect(() => {
    if (!missionRunning) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [missionRunning]);

  // The verify sheet renders below the hero; bring it into view and let
  // Escape back out, mirroring the schedule editor's behaviour.
  useEffect(() => {
    if (!verifyOpen) return;
    verifySheetRef.current?.scrollIntoView({
      behavior: data.settings.reducedMotion ? "auto" : "smooth",
      block: "center"
    });
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVerifyOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [verifyOpen, data.settings.reducedMotion]);

  // A finished (or stopped) mission takes its sheet with it.
  useEffect(() => {
    if (!missionRunning) setVerifyOpen(false);
  }, [missionRunning]);

  const selectedOption =
    data.recommendations.find((option) => option.id === selectedOptionId) ?? recommendedOption;

  if (!ready) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading Missions stored on this device...</p>
      </main>
    );
  }

  // Loaded, but this Vision has no steps to plan yet — usually because there
  // has been no Check-In. Spinning here forever read as a hang, when in fact
  // nothing was on its way.
  if (!selectedOption) {
    return (
      <main className="app-page flow-page mission-empty">
        <p className="app-kicker">Nothing planned yet</p>
        <h1>Today opens up after a Check-In.</h1>
        <p>Tell ReNew what today is giving you, and it will suggest one workable size.</p>
        <Link className="primary-command" to="/app/check-in">
          Start Check-In <ArrowRight aria-hidden="true" />
        </Link>
      </main>
    );
  }

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

  // The running Mission, when the hero is showing it. Remaining time is
  // derived from startedAt (like MissionPage), so it survives navigation.
  const liveMission = selectedIsActive && activeStatus === "in_progress" ? data.mission : null;
  const liveRemainingSeconds = liveMission?.startedAt
    ? Math.min(
        Math.max(
          liveMission.durationMinutes * 60 -
            Math.floor((nowTick - new Date(liveMission.startedAt).getTime()) / 1000),
          0
        ),
        liveMission.durationMinutes * 60
      )
    : null;

  const chooseOption = (option: RecommendationOption, scrollToFocus = true) => {
    setSelectedOptionId(option.id);
    setNotice(null);
    if (scrollToFocus) {
      document.getElementById("planner-focus")?.scrollIntoView({
        behavior: data.settings.reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    }
  };

  /**
   * A Mission the server actually knows about. Falling back to a local id
   * here produced Missions every later PATCH answered with 404 — starting,
   * scheduling, and reflecting all silently broke downstream.
   */
  const createServerMission = async (option: RecommendationOption): Promise<Mission> => {
    let pick = recommendation ?? (await fetchLatestRecommendation().catch(() => null));
    if (!pick) {
      try {
        pick = await requestDailyRecommendation();
      } catch {
        // The server refuses to recommend without a Check-In — the honest
        // next step for the person, not an error to bury.
        throw new Error("needs-check-in");
      }
    }

    let created;
    try {
      created = await selectMissionOption(pick, option);
    } catch (cause) {
      // A pick from before the Route changed (or was regenerated under old
      // rules) can name templates from another ladder entirely; every start
      // then 400s. A fresh pick lines back up with today's Route.
      if (!(cause instanceof ApiError && cause.status === 400)) throw cause;
      pick = await requestDailyRecommendation();
      created = await selectMissionOption(pick, option);
    }

    return fromApiMission(created, data.vision.id) ??
      createMissionFromOption(option, { id: created.id });
  };

  const describeMissionError = (cause: unknown, fallback: string): string =>
    cause instanceof Error && cause.message === "needs-check-in"
      ? "Scheduling needs today's conditions. Complete a quick Check-In first and this will work."
      : fallback;

  const startSelectedMission = async () => {
    setActionBusy(true);
    setNotice(null);
    try {
      const selectedMission =
        data.mission?.optionId === selectedOption.id
          ? data.mission
          : await createServerMission(selectedOption);
      await updateMissionOnServer(selectedMission.id, { status: "in_progress" });
      const startedAt = new Date().toISOString();
      updateData((current) => ({
        ...current,
        mission: { ...selectedMission, status: "in_progress", startedAt }
      }));
      // No navigation: the hero itself becomes the running Mission, with
      // stop and verify one tap away. The detail page stays reachable
      // through the "Mission started" button.
    } catch (cause) {
      setNotice({
        tone: "error",
        text: describeMissionError(
          cause,
          "The Mission could not be started. Please check the connection and try again."
        )
      });
    } finally {
      setActionBusy(false);
    }
  };

  const finishSelectedMission = () => {
    const missionId = data.mission?.id;
    const completedAt = new Date().toISOString();
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status: "completed", completedAt } : null
    }));
    // Like MissionPage: the reflection also records the outcome, but a
    // refresh in between must not resurrect the Mission as still open.
    // Queued rather than best-effort, so finishing something offline is
    // still finished when the connection returns.
    if (missionId) void updateMissionStatusOrQueue(missionId, "completed").catch(() => undefined);
    navigate("/app/reflection");
  };

  const markNotToday = () => {
    const missionId = data.mission?.id;
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status: "not_today" } : null
    }));
    if (missionId) void updateMissionStatusOrQueue(missionId, "not_today").catch(() => undefined);
    navigate("/app/reflection");
  };

  /** The server already recorded the completion; mirror it and hand over to reflection. */
  const handleVerified = (summary: string | null) => {
    const completedAt = new Date().toISOString();
    updateData((current) => ({
      ...current,
      mission: current.mission ? { ...current.mission, status: "completed", completedAt } : null
    }));
    setVerifyOpen(false);
    navigate("/app/reflection", {
      state: { verifiedNote: summary ? `Verified from photo: ${summary}` : "Verified with a photo." }
    });
  };

  const runPrimaryAction = () => {
    if (activeStatus === "in_progress") {
      finishSelectedMission();
    } else if (activeStatus === "completed" || activeStatus === "partly" || activeStatus === "not_today") {
      navigate("/app/reflection");
    } else {
      void startSelectedMission();
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
    setNotice(null);
  };

  const closeSchedule = () => {
    setScheduleTargetId(null);
    setEditingPlanId(null);
  };

  const saveSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleTarget) return;

    setActionBusy(true);
    setNotice(null);
    const wasEditing = editingPlanId !== null;
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    try {
      if (editingPlanId) {
        await updateMissionOnServer(editingPlanId, { scheduledFor });
        updateData((current) => ({
          ...current,
          plannedMissions: current.plannedMissions.map((mission) =>
            mission.id === editingPlanId ? { ...mission, scheduledFor } : mission
          )
        }));
      } else {
        const created = await createServerMission(scheduleTarget);
        await updateMissionOnServer(created.id, { status: "planned", scheduledFor });
        updateData((current) => ({
          ...current,
          plannedMissions: [
            ...current.plannedMissions.filter((mission) => mission.id !== created.id),
            { ...created, status: "planned", scheduledFor }
          ]
        }));
      }
      await refresh();
      setSelectedDay(scheduleDate);
      closeSchedule();
      // The plan lands in the week panel, which is collapsed by default —
      // opening it is how "added to your week" becomes something you can see.
      setWeekOpen(true);
      setNotice({
        tone: "ok",
        text: wasEditing ? "Mission moved." : "Mission added to your week."
      });
    } catch (cause) {
      setNotice({
        tone: "error",
        text: describeMissionError(
          cause,
          "The plan could not be saved. Please check the connection and try again."
        )
      });
    } finally {
      setActionBusy(false);
    }
  };

  const startPlannedMissionNow = async (mission: Mission) => {
    setActionBusy(true);
    setNotice(null);
    try {
      await updateMissionOnServer(mission.id, { status: "in_progress" });
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
    } catch {
      setNotice({
        tone: "error",
        text: "The planned Mission could not be started. Please check the connection and try again."
      });
    } finally {
      setActionBusy(false);
    }
  };

  const removePlannedMission = async (missionId: string) => {
    setActionBusy(true);
    setNotice(null);
    try {
      await updateMissionOnServer(missionId, { status: "cancelled" });
      updateData((current) => ({
        ...current,
        plannedMissions: current.plannedMissions.filter((mission) => mission.id !== missionId)
      }));
      setConfirmRemoveId(null);
      setNotice({ tone: "ok", text: "Mission removed from your week." });
    } catch {
      setNotice({
        tone: "error",
        text: "The planned Mission could not be removed. Please check the connection and try again."
      });
    } finally {
      setActionBusy(false);
    }
  };

  const isReviewable =
    activeStatus === "completed" || activeStatus === "partly" || activeStatus === "not_today";

  const primaryLabel = !isTodaySelected
    ? `Plan for ${selectedDayInfo.weekday}`
    : activeStatus === "in_progress"
      ? "Finish and reflect"
      : isReviewable
        ? "Open reflection"
        : activeStatus === "planned"
          ? "Start mission"
          : "Start now";

  // The icon has to agree with the label; a play triangle on "Plan for Wed"
  // promised the Mission was about to begin.
  const PrimaryIcon = !isTodaySelected
    ? CalendarPlus
    : activeStatus === "in_progress"
      ? Check
      : isReviewable
        ? ArrowRight
        : Play;

  const handlePrimaryAction = () => {
    if (isTodaySelected) {
      runPrimaryAction();
    } else {
      openSchedule(selectedOption, undefined, selectedDay);
    }
  };

  return (
    <main className="app-page mission-home planner-dashboard">

      {/* ── First-visit coach-marks (spotlight pattern, one element each) ── */}
      {!walkthroughDone && activeTooltip !== null && (() => {
        const tip = walkthroughTips[activeTooltip];
        // Keep the bubble clear of whatever it is pointing at, so step 2 does
        // not sit on top of the very link it is asking you to look at.
        const place = spotlight && spotlight.top > window.innerHeight * 0.55 ? "top" : "bottom";
        return (
          <>
            {/* Dim overlay — clicking anywhere outside the bubble leaves the tour */}
            <div className="coach-mark-overlay" onClick={dismissWalkthrough} />
            {spotlight && (
              <div
                className="coach-mark-cutout"
                aria-hidden="true"
                style={
                  {
                    "--cx": `${spotlight.left - 6}px`,
                    "--cy": `${spotlight.top - 6}px`,
                    "--cw": `${spotlight.width + 12}px`,
                    "--ch": `${spotlight.height + 12}px`
                  } as CSSProperties
                }
              />
            )}
            {/* Tip bubble with pointer arrow */}
            <div
              className="coach-mark-tip"
              data-place={place}
              role="dialog"
              aria-modal="true"
              aria-label={`Walkthrough step ${activeTooltip + 1} of 3`}
            >
              <div className="coach-mark-text">
                <strong>{tip.label}</strong>
                <p>{tip.copy}</p>
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
                <span className="app-kicker" style={{ marginRight: "auto" }}>{tip.step}</span>
                {activeTooltip < 2 ? (
                  <button className="primary-command" type="button" onClick={advanceTooltip} autoFocus>
                    Next <ArrowRight aria-hidden="true" />
                  </button>
                ) : (
                  <button className="primary-command" type="button" onClick={dismissWalkthrough} autoFocus>
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
          <Link className="planner-direction" to="/app/vision" aria-label="View your Life Vision" ref={tooltipRefs[1] as React.Ref<HTMLAnchorElement>}>
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
        <Link className="primary-command" to="/app/check-in">
          <RefreshCcw aria-hidden="true" />
          <span>Update today's conditions</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {/* ── Plan / Do / Review status row ── */}
      <section className="planner-flow" aria-label="Plan, do, and review status" ref={tooltipRefs[0]}>
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

        {liveMission ? (
          /* ── Live state: what to do, how long is left, and the three
                controls that matter while it runs. ── */
          <>
            <div className="planner-now-card">
              <div className="planner-now-topline">
                <p className="app-kicker">What to do now</p>
                {liveRemainingSeconds !== null && (
                  <span className="planner-now-remaining" role="timer" aria-label="Time remaining">
                    <Clock3 aria-hidden="true" />
                    {liveRemainingSeconds > 0 ? `${formatCountdown(liveRemainingSeconds)} left` : "Time's up — any part counts"}
                  </span>
                )}
              </div>
              <p>{selectedOption.description}</p>
              <small>
                {selectedOption.durationMinutes} min · {locationName}
                {selectedOption.supplies.length > 0 ? ` · Bring: ${selectedOption.supplies.join(", ")}` : ""}
              </small>
            </div>

            <div className="planner-focus-actions">
              <button
                className="primary-command planner-started-command"
                type="button"
                aria-label="Mission started — open details"
                onClick={() => navigate("/app/mission")}
              >
                <Check aria-hidden="true" /> Mission started
              </button>
              <button className="secondary-command" type="button" onClick={() => setStopConfirmOpen(true)}>
                <Square aria-hidden="true" /> Stop
              </button>
              <button
                className="primary-command"
                type="button"
                aria-expanded={verifyOpen}
                onClick={() => setVerifyOpen((open) => !open)}
              >
                <Camera aria-hidden="true" /> Verify
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="planner-focus-description">{selectedOption.description}</p>

            <div className="planner-focus-actions">
              <button className="primary-command" type="button" disabled={actionBusy} onClick={handlePrimaryAction}>
                <PrimaryIcon aria-hidden="true" />
                {actionBusy ? "Starting..." : primaryLabel}
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
          </>
        )}

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
          <aside className="mission-fit" aria-label="Why this Mission fits today" ref={tooltipRefs[2] as React.Ref<HTMLElement>}>
            <p className="app-kicker">Why this fits today</p>
            <ul>
              {reasons.map((reason) => (
                <li key={reason}><Check aria-hidden="true" /> {reason}</li>
              ))}
            </ul>
          </aside>
        )}
      </section>

      {/* ── Photo verification, one tap from the running hero ── */}
      {verifyOpen && liveMission && (
        <div ref={verifySheetRef}>
          <MissionVerifySheet
            mission={liveMission}
            onClose={() => setVerifyOpen(false)}
            onVerified={handleVerified}
            onCompleteWithout={() => {
              setVerifyOpen(false);
              finishSelectedMission();
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={stopConfirmOpen}
        kicker="Stop this Mission"
        title="Stop here for today?"
        confirmLabel="Stop for today"
        cancelLabel="Keep going"
        onCancel={() => setStopConfirmOpen(false)}
        onConfirm={() => {
          setStopConfirmOpen(false);
          markNotToday();
        }}
      >
        <p>
          The Mission is set aside without penalty and you can say a word about it in the
          reflection. Starting again later today is always possible.
        </p>
      </ConfirmDialog>

      {/* One shared feedback line for every planner action; sits between the
          hero and the week panel so it is adjacent to whichever produced it. */}
      {notice && (
        <p
          className="planner-notice"
          data-tone={notice.tone}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.tone === "ok" ? <Check aria-hidden="true" /> : <Info aria-hidden="true" />}
          {notice.text}
        </p>
      )}

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
                      onClick={() => {
                        setSelectedDay(day.value);
                        setConfirmRemoveId(null);
                      }}
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
                  const option = data.recommendations.find((item) => item.id === mission.optionId) ?? selectedOption;
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
                        {confirmRemoveId === mission.id ? (
                          /* Two-tap removal — the first tap swaps the icon for an
                             explicit question instead of deleting outright. */
                          <>
                            <button
                              className="planner-small-command is-danger"
                              type="button"
                              disabled={actionBusy}
                              onClick={() => void removePlannedMission(mission.id)}
                            >
                              Remove?
                            </button>
                            <button className="text-button" type="button" onClick={() => setConfirmRemoveId(null)}>
                              Keep
                            </button>
                          </>
                        ) : (
                          <>
                            {isTodaySelected && (
                              <button className="planner-small-command" type="button" disabled={actionBusy} onClick={() => void startPlannedMissionNow(mission)}>Start</button>
                            )}
                            <button className="icon-button" type="button" aria-label={`Move ${mission.title}`} title="Move" onClick={() => openSchedule(option, mission)}><CalendarClock aria-hidden="true" /></button>
                            <button className="icon-button" type="button" disabled={actionBusy} aria-label={`Remove ${mission.title}`} title="Remove" onClick={() => setConfirmRemoveId(mission.id)}><X aria-hidden="true" /></button>
                          </>
                        )}
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
        <form ref={scheduleFormRef} className="mission-schedule-editor planner-schedule-editor" onSubmit={saveSchedule}>
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
              {withSelectedTime(scheduleTime).map((time) => <option value={time} key={time}>{time}</option>)}
            </select>
          </label>
          <div className="mission-schedule-actions">
            <button className="primary-command" type="submit" disabled={actionBusy}>Save plan <ArrowRight aria-hidden="true" /></button>
            <button className="icon-button" type="button" aria-label="Close schedule editor" title="Close" onClick={closeSchedule}>
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
        <Link to="/app/nearby"><MapPin aria-hidden="true" /><span>Nearby<strong>Review real-world conditions</strong></span><ChevronRight aria-hidden="true" /></Link>
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
