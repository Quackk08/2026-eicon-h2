import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarDays,
  ChevronRight,
  Clock3,
  CloudOff,
  Compass,
  HeartHandshake,
  MapPin,
  Minimize2,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import type { AppData, CheckInRecord, EffortLevel, Reflection } from "../data/appData";
import { useAppState } from "../state/AppState";

const responseLabels: Record<EffortLevel, string> = {
  1: "Very low",
  2: "Low",
  3: "In between",
  4: "Good",
  5: "Strong"
};

const inverseLabels: Record<EffortLevel, string> = {
  1: "Very light",
  2: "Light",
  3: "Manageable",
  4: "Heavy",
  5: "Very heavy"
};

const missionStatusLabels = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  not_today: "Not today"
} as const;

const rhythmLabels = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  custom: "Custom days"
} as const;

function formatToday(): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

function formatRecordedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatNextCheckIn(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function getNextCheckIn(data: AppData, now = new Date()): Date | null {
  const rhythm = data.settings.checkInRhythm;

  if (!rhythm.enabled || rhythm.days.length === 0) {
    return null;
  }

  const [hours, minutes] = rhythm.time.split(":").map(Number);

  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);

    if (rhythm.days.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  return null;
}

function isWithinLastSevenDays(value: string, now = Date.now()): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= now - 7 * 24 * 60 * 60 * 1000 && timestamp <= now;
}

type NumericCheckInKey = "mood" | "energy" | "capacity" | "stress" | "sleep" | "socialLoad";

function averageSignal(records: CheckInRecord[], key: NumericCheckInKey): number | null {
  const values = records
    .map((record) => {
      const value = record[key];
      return typeof value === "number" ? value : null;
    })
    .filter((value): value is EffortLevel => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function describeCurrentState(checkIn: CheckInRecord): string {
  if (checkIn.energy <= 2 && checkIn.capacity <= 2) {
    return "Your latest record shows lower available energy and everyday capacity. A smaller step may fit better today.";
  }

  if (checkIn.socialLoad !== undefined && checkIn.socialLoad >= 4) {
    return "Being around people may feel relatively demanding today, so lower-contact options are shown first.";
  }

  if (checkIn.stress !== undefined && checkIn.stress >= 4) {
    return "Your latest record carries a heavier stress load. ReNew will keep the next action clear and limited.";
  }

  if (checkIn.energy >= 4 && checkIn.capacity >= 4) {
    return "Your latest record shows more available energy and capacity, while every suggested step remains optional.";
  }

  return "Your latest signals sit in a mixed range. The next action can stay flexible and change in size at any time.";
}

function describeRecentPattern(checkIns: CheckInRecord[], reflections: Reflection[]): string {
  const validCheckIns = [...checkIns]
    .filter((record) => Number.isFinite(new Date(record.createdAt).getTime()))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  if (validCheckIns.length < 3) {
    return "There are not enough records to describe a recent pattern yet. Three Check-Ins are needed before a comparison appears.";
  }

  const recent = validCheckIns.filter((record) => isWithinLastSevenDays(record.createdAt));
  const previous = validCheckIns.filter((record) => !isWithinLastSevenDays(record.createdAt));

  if (recent.length < 2) {
    return "There are not enough Check-Ins from the last seven days to describe a recent pattern yet.";
  }

  const recentReflections = reflections.filter((reflection) => isWithinLastSevenDays(reflection.createdAt));

  if (previous.length > 0) {
    const comparisons = [
      { key: "energy" as const, label: "available energy" },
      { key: "capacity" as const, label: "everyday capacity" },
      { key: "socialLoad" as const, label: "social load" }
    ]
      .map(({ key, label }) => {
        const currentAverage = averageSignal(recent, key);
        const previousAverage = averageSignal(previous, key);
        return currentAverage === null || previousAverage === null
          ? null
          : { label, difference: currentAverage - previousAverage };
      })
      .filter((item): item is { label: string; difference: number } => item !== null)
      .sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));

    const clearestChange = comparisons.find((item) => Math.abs(item.difference) >= 0.5);

    if (clearestChange) {
      const direction = clearestChange.difference > 0 ? "higher" : "lower";
      const reflectionNote = recentReflections.length > 0
        ? ` You also added ${recentReflections.length} reflection${recentReflections.length === 1 ? "" : "s"} during this period.`
        : "";
      return `Recent records show ${direction} ${clearestChange.label} compared with earlier records.${reflectionNote}`;
    }

    return "Recent signals have stayed close to your earlier records. No clear shift is large enough to summarize yet.";
  }

  const recentEnergy = averageSignal(recent, "energy");
  const recentCapacity = averageSignal(recent, "capacity");
  const partlyCount = recentReflections.filter((reflection) => reflection.outcome === "partly").length;

  if ((recentEnergy ?? 5) <= 2.5 && (recentCapacity ?? 5) <= 2.5) {
    return "Recent records show lower available energy and capacity. Keeping actions small has remained an available choice.";
  }

  if (partlyCount > 0) {
    return "Recent reflections include partly completed actions. These are recorded as useful adjustments, not failed attempts.";
  }

  return "A recent baseline is forming. More records over time will make comparisons with earlier weeks possible.";
}

function placeFitsBudget(cost: string, budget: AppData["preferences"]["budget"]): boolean {
  if (budget === "Flexible") return true;
  if (budget === "Low cost") return cost === "Free" || cost === "Low cost";
  return cost === "Free";
}

function getSuggestedPlaces(data: AppData, latestCheckIn: CheckInRecord | null) {
  const prefersLowestSocialLoad =
    data.preferences.socialPreference === "Solo" || (latestCheckIn?.socialLoad ?? 0) >= 4;

  return data.places
    .filter((place) => place.distanceKm <= data.preferences.maxDistanceKm)
    .filter((place) => placeFitsBudget(place.cost, data.preferences.budget))
    .filter((place) => !prefersLowestSocialLoad || place.socialLoad === "Low")
    .filter((place) =>
      data.preferences.accessibilityNeeds.every((need) => place.accessibility.includes(need))
    )
    .sort((left, right) => {
      const leftPreferred = data.preferences.preferredPlaces.includes(left.type) ? 0 : 1;
      const rightPreferred = data.preferences.preferredPlaces.includes(right.type) ? 0 : 1;
      return leftPreferred - rightPreferred || left.distanceKm - right.distanceKm;
    })
    .slice(0, 3);
}

function hasAvailability(capacity: string): boolean {
  const match = capacity.match(/(\d+)\s+of\s+(\d+)/i);
  return !match || Number(match[1]) < Number(match[2]);
}

function getSuggestedCommunity(data: AppData, latestCheckIn: CheckInRecord | null) {
  if (data.preferences.socialPreference === "Solo") {
    return null;
  }

  const needsLowSocialLoad =
    data.preferences.socialPreference === "Low pressure" || (latestCheckIn?.socialLoad ?? 0) >= 4;

  return data.community
    .map((activity) => ({
      activity,
      venue: data.places.find((place) => place.name === activity.place)
    }))
    .filter(({ activity }) => activity.joined || hasAvailability(activity.capacity))
    .filter(({ activity }) => !needsLowSocialLoad || activity.socialLoad === "Low")
    .filter(({ venue }) => venue !== undefined && venue.distanceKm <= data.preferences.maxDistanceKm)
    .sort((left, right) => {
      if (left.activity.joined !== right.activity.joined) return left.activity.joined ? -1 : 1;
      if (left.activity.socialLoad !== right.activity.socialLoad) {
        return left.activity.socialLoad === "Low" ? -1 : 1;
      }
      return (left.venue?.distanceKm ?? 0) - (right.venue?.distanceKm ?? 0);
    })[0] ?? null;
}

function getSmallerOption(data: AppData, currentRouteStep: AppData["route"][number] | null) {
  const mission = data.mission;

  if (!mission) {
    return null;
  }

  const lighterRecommendation = data.recommendations.find(
    (option) =>
      option.effort === "Light" &&
      option.id !== mission.optionId &&
      option.durationMinutes < mission.durationMinutes
  );

  if (lighterRecommendation) {
    return {
      title: lighterRecommendation.title,
      description: lighterRecommendation.description,
      durationMinutes: lighterRecommendation.durationMinutes,
      source: "Lighter reviewed option",
      href: "/app/mission"
    };
  }

  if (!currentRouteStep) {
    return null;
  }

  const lowerRouteStep = [...data.route]
    .filter((step) => step.level < currentRouteStep.level)
    .sort((left, right) => right.level - left.level)[0];

  return lowerRouteStep
    ? {
        title: lowerRouteStep.title,
        description: `An explored step from Level ${lowerRouteStep.level} of your Life Route.`,
        durationMinutes: lowerRouteStep.durationMinutes,
        source: "Smaller Life Route step",
        href: "/app/route"
      }
    : null;
}

export function TodayPage() {
  const { data, ready } = useAppState();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  const latestCheckIn = useMemo(
    () =>
      [...data.checkIns].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )[0] ?? null,
    [data.checkIns]
  );
  const currentRouteIndex = data.route.findIndex((step) => !step.completed);
  const currentRouteStep = currentRouteIndex >= 0 ? data.route[currentRouteIndex] : null;
  const nextRouteStep = currentRouteIndex >= 0 ? data.route[currentRouteIndex + 1] ?? null : null;
  const completedSteps = data.route.filter((step) => step.completed).length;
  const routeProgress = data.route.length > 0 ? (completedSteps / data.route.length) * 100 : 0;
  const nextCheckIn = getNextCheckIn(data);
  const suggestedPlaces = getSuggestedPlaces(data, latestCheckIn);
  const suggestedCommunity = getSuggestedCommunity(data, latestCheckIn);
  const smallerOption = getSmallerOption(data, currentRouteStep);
  const recentCheckIns = data.checkIns.filter((record) => isWithinLastSevenDays(record.createdAt));
  const recentReflections = data.reflections.filter((reflection) => isWithinLastSevenDays(reflection.createdAt));
  const weeklyStats = [
    { label: "Check-Ins", value: recentCheckIns.length },
    { label: "Reflections", value: recentReflections.length },
    { label: "Completed", value: recentReflections.filter((item) => item.outcome === "completed").length },
    { label: "Partly", value: recentReflections.filter((item) => item.outcome === "partly").length },
    { label: "Not today", value: recentReflections.filter((item) => item.outcome === "not_today").length }
  ];

  if (!ready) {
    return (
      <main className="app-page dashboard-loading" aria-live="polite">
        <span />
        <p>Loading your locally stored Dashboard...</p>
      </main>
    );
  }

  return (
    <main className="app-page dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="app-kicker">{formatToday()}</p>
          <h1>Your life, in view.</h1>
          <p>Welcome back, {data.profile.name}. Connect your longer direction with one workable choice for today.</p>
        </div>
        <div className="dashboard-storage" aria-label="Data storage status">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Saved locally</strong>
            <span>Stored on this device / {online ? "Sync unavailable" : "Waiting for connection"}</span>
          </div>
        </div>
      </header>

      <dl className="dashboard-summary-strip">
        <div>
          <dt>Last Check-In</dt>
          <dd>{latestCheckIn ? formatRecordedAt(latestCheckIn.createdAt) : "No record yet"}</dd>
        </div>
        <div>
          <dt>Next Check-In</dt>
          <dd>{nextCheckIn ? formatNextCheckIn(nextCheckIn) : "Not scheduled"}</dd>
        </div>
        <div>
          <dt>Local access</dt>
          <dd>{online ? "Available on this device" : "Offline and available"}</dd>
        </div>
      </dl>

      <div className="dashboard-grid">
        <section className="dashboard-panel direction-panel" aria-labelledby="direction-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">My Life Direction</p><h2 id="direction-title">{data.vision.title}</h2></div>
            <Compass aria-hidden="true" />
          </div>
          <p className="dashboard-lead">{data.vision.description}</p>
          <dl className="direction-facts">
            <div><dt>Life area</dt><dd>{data.vision.domain}</dd></div>
            <div><dt>Vision status</dt><dd>{data.vision.status === "active" ? "Active" : "Paused"}</dd></div>
            <div><dt>Route position</dt><dd>{currentRouteStep ? `Level ${currentRouteStep.level}` : "All explored"}</dd></div>
            <div><dt>Progress</dt><dd>{completedSteps} of {data.route.length} explored</dd></div>
          </dl>
          <div className="dashboard-actions">
            <Link className="primary-command" to="/app/vision">Open Life Vision <ArrowRight aria-hidden="true" /></Link>
            <Link className="inline-arrow-link" to="/app/route">View Life Route <ChevronRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="dashboard-panel state-panel" aria-labelledby="state-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Current State</p><h2 id="state-title">Your latest signals</h2></div>
            <Activity aria-hidden="true" />
          </div>
          {latestCheckIn ? (
            <>
              <p className="state-summary">{describeCurrentState(latestCheckIn)}</p>
              <dl className="signal-summary">
                <div><dt>Mood</dt><dd>{responseLabels[latestCheckIn.mood]}</dd></div>
                <div><dt>Energy</dt><dd>{responseLabels[latestCheckIn.energy]}</dd></div>
                <div><dt>Everyday capacity</dt><dd>{responseLabels[latestCheckIn.capacity]}</dd></div>
                {latestCheckIn.stress !== undefined && <div><dt>Stress load</dt><dd>{inverseLabels[latestCheckIn.stress]}</dd></div>}
                {latestCheckIn.sleep !== undefined && <div><dt>Sleep</dt><dd>{responseLabels[latestCheckIn.sleep]}</dd></div>}
                {latestCheckIn.socialLoad !== undefined && <div><dt>Social load</dt><dd>{inverseLabels[latestCheckIn.socialLoad]}</dd></div>}
              </dl>
              <p className="recorded-time">Recorded {formatRecordedAt(latestCheckIn.createdAt)} / {latestCheckIn.type} Check-In</p>
            </>
          ) : (
            <div className="dashboard-empty-state">
              <p>No state record yet.</p>
              <span>A Check-In adds context without turning your day into a score.</span>
              <Link className="primary-command" to="/app/check-in">Start Check-In <ArrowRight aria-hidden="true" /></Link>
            </div>
          )}
        </section>

        <section className="dashboard-panel mission-panel" aria-labelledby="mission-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Today's Mission</p><h2 id="mission-title">{data.mission ? data.mission.title : "Choose what fits today"}</h2></div>
            <Sparkles aria-hidden="true" />
          </div>
          {data.mission ? (
            <>
              <p className="dashboard-lead">{data.mission.description}</p>
              <div className="mission-dashboard-meta">
                <span><Clock3 aria-hidden="true" /> {data.mission.durationMinutes} min</span>
                <span><MapPin aria-hidden="true" /> {data.mission.placeType}</span>
                <span>{missionStatusLabels[data.mission.status]}</span>
              </div>
              <Link className="primary-command" to={data.mission.status === "completed" || data.mission.status === "not_today" ? "/app/reflection" : "/app/mission"}>
                {data.mission.status === "completed" || data.mission.status === "not_today" ? "Open Reflection" : "Open Mission"}
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="dashboard-empty-state mission-empty-actions">
              <p>No Mission is selected. Start from your current conditions or return to your Route.</p>
              <div>
                <Link className="primary-command" to="/app/check-in">Start Check-In <ArrowRight aria-hidden="true" /></Link>
                <Link className="secondary-command" to="/app/recommendation">View recommendations</Link>
                <Link className="inline-arrow-link" to="/app/route">Choose from Life Route <ChevronRight aria-hidden="true" /></Link>
              </div>
            </div>
          )}
        </section>

        {smallerOption && (
          <section className="dashboard-panel smaller-panel" aria-labelledby="smaller-title">
            <div className="dashboard-panel-heading">
              <div><p className="app-kicker">Smaller Option</p><h2 id="smaller-title">One step lighter</h2></div>
              <Minimize2 aria-hidden="true" />
            </div>
            <span className="source-label">{smallerOption.source}</span>
            <h3>{smallerOption.title}</h3>
            <p>{smallerOption.description}</p>
            <div className="smaller-footer">
              <span><Clock3 aria-hidden="true" /> {smallerOption.durationMinutes} min</span>
              <Link className="inline-arrow-link" to={smallerOption.href}>Review this option <ChevronRight aria-hidden="true" /></Link>
            </div>
          </section>
        )}

        <section className="dashboard-panel route-panel" aria-labelledby="route-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Life Route Progress</p><h2 id="route-title">Keep the direction, adjust the scale.</h2></div>
            <RouteIcon aria-hidden="true" />
          </div>
          <div className="route-dashboard-progress">
            <div><span>{completedSteps} explored</span><span>{data.route.length} total</span></div>
            <div aria-hidden="true"><i style={{ width: `${routeProgress}%` }} /></div>
          </div>
          <div className="route-dashboard-steps">
            <div>
              <span>{data.vision.status === "paused" ? "Paused" : "Current step"}</span>
              <p>{currentRouteStep?.title ?? "Every Route step has been explored."}</p>
            </div>
            {nextRouteStep && (
              <div><span>Available next</span><p>{nextRouteStep.title}</p></div>
            )}
          </div>
          <Link className="inline-arrow-link" to="/app/route">Open full Route <ChevronRight aria-hidden="true" /></Link>
        </section>

        <section className="dashboard-panel weekly-panel" aria-labelledby="weekly-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Last 7 Days</p><h2 id="weekly-title">Weekly life records</h2></div>
            <CalendarDays aria-hidden="true" />
          </div>
          <dl className="weekly-stats">
            {weeklyStats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          <p>Partly and Not today are adjustment records. They are not failures or broken streaks.</p>
          <Link className="inline-arrow-link" to="/app/insights">Open Insights <ChevronRight aria-hidden="true" /></Link>
        </section>

        <section className="dashboard-panel pattern-panel" aria-labelledby="pattern-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Recent Pattern</p><h2 id="pattern-title">What the records can say</h2></div>
            <Activity aria-hidden="true" />
          </div>
          <p className="pattern-copy">{describeRecentPattern(data.checkIns, data.reflections)}</p>
          <span>Rule-based summary / No diagnosis / No comparison with other people</span>
        </section>

        <section className="dashboard-panel places-panel" aria-labelledby="places-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Nearby Places</p><h2 id="places-title">Places that fit your conditions</h2></div>
            <MapPin aria-hidden="true" />
          </div>
          {suggestedPlaces.length > 0 ? (
            <div className="dashboard-place-list">
              {suggestedPlaces.map((place) => (
                <Link to={`/app/places/${place.id}`} key={place.id}>
                  <span className={`place-swatch is-${place.color}`} aria-hidden="true" />
                  <div>
                    <h3>{place.name}</h3>
                    <p>{place.type} / {place.distanceKm} km / {place.cost} / {place.socialLoad} social load</p>
                    <span>{place.hours} / {place.accessibility.join(", ") || "No accessibility details listed"}</span>
                  </div>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <p>No listed place matches all of your current distance, cost, social, and accessibility preferences.</p>
            </div>
          )}
          <Link className="inline-arrow-link" to="/app/places">Browse all places <ChevronRight aria-hidden="true" /></Link>
        </section>

        <section className="dashboard-panel community-panel" aria-labelledby="community-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Community Step</p><h2 id="community-title">A lower-pressure way to join</h2></div>
            <Users aria-hidden="true" />
          </div>
          {suggestedCommunity ? (
            <div className="community-dashboard-detail">
              <span>{suggestedCommunity.activity.joined ? "Joined" : "Available"}</span>
              <h3>{suggestedCommunity.activity.title}</h3>
              <p>{suggestedCommunity.activity.dateLabel} / {suggestedCommunity.activity.place}</p>
              <dl>
                <div><dt>Social load</dt><dd>{suggestedCommunity.activity.socialLoad}</dd></div>
                <div><dt>Participation</dt><dd>{suggestedCommunity.activity.capacity}</dd></div>
                <div><dt>Distance</dt><dd>{suggestedCommunity.venue?.distanceKm} km</dd></div>
              </dl>
              <Link className="primary-command" to={`/app/community/${suggestedCommunity.activity.id}`}>Open activity <ArrowRight aria-hidden="true" /></Link>
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <p>No community activity matches your current conditions.</p>
              <span>You can keep choosing actions that are possible to do alone.</span>
              <Link className="inline-arrow-link" to="/app/community">Review all activities <ChevronRight aria-hidden="true" /></Link>
            </div>
          )}
          <p className="privacy-note">Your Check-In details are never shown to community hosts or participants.</p>
        </section>

        <section className="dashboard-panel rhythm-panel" aria-labelledby="rhythm-title">
          <div className="dashboard-panel-heading">
            <div><p className="app-kicker">Check-In Rhythm</p><h2 id="rhythm-title">Your next pause point</h2></div>
            <BellRing aria-hidden="true" />
          </div>
          <dl className="rhythm-facts">
            <div><dt>Schedule</dt><dd>{rhythmLabels[data.settings.checkInRhythm.frequency]} at {data.settings.checkInRhythm.time}</dd></div>
            <div><dt>Reminder</dt><dd>{data.settings.checkInRhythm.enabled ? "On" : "Off"}</dd></div>
            <div><dt>Next Check-In</dt><dd>{nextCheckIn ? formatNextCheckIn(nextCheckIn) : "Not scheduled"}</dd></div>
          </dl>
          <div className="dashboard-actions">
            <Link className="primary-command" to="/app/check-in">Check in now <ArrowRight aria-hidden="true" /></Link>
            <Link className="inline-arrow-link" to="/app/settings">Change rhythm <ChevronRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="dashboard-panel support-panel" aria-labelledby="support-title">
          <div className="support-panel-icon"><HeartHandshake aria-hidden="true" /></div>
          <div>
            <p className="app-kicker">Support Options</p>
            <h2 id="support-title">Support stays available by your choice.</h2>
            <p>{data.trustedContact ? `${data.trustedContact.name} is saved as a trusted contact on this device.` : "Review message starters or add a trusted contact when it would be useful."} Nothing is sent and nobody is contacted without your approval.</p>
          </div>
          <Link className="secondary-command" to="/app/support">Review support <ArrowRight aria-hidden="true" /></Link>
        </section>
      </div>

      {!online && (
        <div className="dashboard-offline-note" role="status">
          <CloudOff aria-hidden="true" />
          <p><strong>Waiting for connection.</strong> Your Dashboard remains available with data stored on this device.</p>
        </div>
      )}
    </main>
  );
}
