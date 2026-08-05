import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  clearAppData,
  createDefaultAppData,
  loadAppData,
  saveAppData,
  type AppData
} from "../data/appData";
import { hydrateFromBackend, isServerReachable, resetProfileData } from "../api/backend";
import { onQueueChange, pendingCount } from "../api/offlineQueue";
import { clearGuestProfileId } from "../api/client";
import { getAccessToken, onAuthChange } from "../api/auth";
import type { ApiRecommendation } from "../api/types";

interface AppStateValue {
  data: AppData;
  ready: boolean;
  /** False when the backend is unreachable; the UI still runs from local data. */
  online: boolean;
  /** Writes waiting in the outbox for the connection to come back. */
  pending: number;
  /** True while the outbox is being drained, so the header can say so. */
  syncing: boolean;
  /**
   * How many operations the last drain cleared, held briefly.
   *
   * Coming back online is otherwise completely silent, and someone who
   * watched "3 waiting" sit in the header has no way to learn it ever
   * resolved. This is what lets the header say so once, then go quiet.
   */
  justSynced: number;
  /**
   * The backend's current pick, shared so Today and Recommendation cannot
   * disagree about which step is today's.
   */
  recommendation: ApiRecommendation | null;
  updateData: (updater: (current: AppData) => AppData) => void;
  /** Re-pulls server state after a write. Safe to call when offline. */
  refresh: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

/**
 * How long to wait before probing again while offline. Backs off so a device
 * left in a tunnel is not retrying every few seconds all afternoon, but stays
 * responsive for the common case of a short drop.
 */
const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000];

/** How long "3 synced" stays on screen before the header goes quiet again. */
const JUST_SYNCED_MS = 4_000;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createDefaultAppData());
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(0);
  const [recommendation, setRecommendation] = useState<ApiRecommendation | null>(null);

  /**
   * Local IndexedDB stays the immediate source of truth so Check-In and
   * Reflection keep working offline (docs/PRODUCT_GUARDRAILS.md); this
   * overlays whatever the server already knows on top of it.
   *
   * The queue depth is read on both sides of the pull because
   * hydrateFromBackend drains the outbox on its way in: the difference is how
   * many writes just reached the server, which is the only thing worth
   * interrupting someone to say.
   */
  const refresh = useCallback(async () => {
    const before = await pendingCount().catch(() => 0);
    if (before > 0) setSyncing(true);

    try {
      const snapshot = await loadAppData();
      const { patch, recommendation: latest } = await hydrateFromBackend(snapshot);
      setData((current) => ({ ...current, ...patch }));
      setRecommendation(latest);
      setOnline(true);

      const after = await pendingCount().catch(() => 0);
      setPending(after);
      if (before > after) setJustSynced(before - after);
    } catch {
      setOnline(false);
      setPending(await pendingCount().catch(() => before));
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadAppData()
      .then((storedData) => {
        if (!active) return undefined;
        setData(storedData);
        setReady(true);
        return refresh();
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [refresh]);

  // Signing in or out changes whose records these are, so re-pull rather than
  // leaving the previous identity's data on screen.
  useEffect(() => onAuthChange(() => void refresh()), [refresh]);

  /*
   * A write that had to be queued should show up in the header as it happens,
   * not at the next successful pull — which is precisely what someone offline
   * cannot get.
   *
   * Queueing is also the earliest evidence the server is gone. Every page
   * calls refresh() only after a request has already succeeded, so without
   * this the app could sit unreachable for an entire session and still call
   * itself online; the outbox would fill while the header said everything
   * was fine.
   */
  useEffect(
    () =>
      onQueueChange((depth) => {
        setPending(depth);
        if (depth > 0) void isServerReachable().then(setOnline);
      }),
    []
  );

  useEffect(() => {
    if (justSynced === 0) return;
    const timer = window.setTimeout(() => setJustSynced(0), JUST_SYNCED_MS);
    return () => window.clearTimeout(timer);
  }, [justSynced]);

  /**
   * Gets back to the server as soon as it is actually reachable.
   *
   * Three triggers, because no single one is reliable. The browser's `online`
   * event fires for the network interface, not for the API — a captive portal
   * or a stopped server still looks online. Returning to the tab is when
   * someone is present to notice. The backoff timer covers the rest, and is
   * the only path that recovers when the device never lost connectivity and
   * the server was the thing that went away.
   */
  useEffect(() => {
    if (!ready || online) return;

    let cancelled = false;
    let attempt = 0;
    let timer = 0;

    const probe = async () => {
      if (cancelled) return;
      if (await isServerReachable()) {
        if (!cancelled) await refresh();
        return;
      }
      schedule();
    };

    // Nothing is gained by probing a tab nobody is watching, but the chain
    // must not die there either: skipping the request while still scheduling
    // the next tick keeps recovery from depending on visibilitychange alone.
    const tick = () => (document.hidden ? schedule() : void probe());

    const schedule = () => {
      if (cancelled) return;
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      attempt += 1;
      timer = window.setTimeout(tick, delay);
    };

    // An event means conditions actually changed, so probe straight away and
    // start the backoff over rather than waiting out a long delay. This runs
    // even while hidden: the browser only fires it when something happened.
    const retryNow = () => {
      attempt = 0;
      window.clearTimeout(timer);
      void probe();
    };

    const handleVisibility = () => {
      if (!document.hidden) retryNow();
    };

    window.addEventListener("online", retryNow);
    document.addEventListener("visibilitychange", handleVisibility);
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("online", retryNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [ready, online, refresh]);

  useEffect(() => {
    if (ready) {
      void saveAppData(data);
    }
  }, [data, ready]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      ready,
      online,
      pending,
      syncing,
      justSynced,
      recommendation,
      updateData: setData,
      refresh,
      resetDemo: async () => {
        await resetProfileData();
        await clearAppData();

        // Clearing the local cache alone was not a reset: the guest id
        // stayed behind, so the next load pulled the same Vision, Route and
        // Check-Ins straight back from the server while the dialog claimed
        // they had been removed. Forgetting the id starts a genuinely empty
        // profile. Signed-in users keep their account — their records belong
        // to it, not to this browser.
        if (!(await getAccessToken())) clearGuestProfileId();

        setData(createDefaultAppData());
        setRecommendation(null);
      }
    }),
    [data, ready, online, pending, syncing, justSynced, recommendation, refresh]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);

  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return value;
}
