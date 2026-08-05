import {
  BarChart3,
  CalendarCheck2,
  HeartHandshake,
  MapPin,
  Menu,
  Route as RouteIcon,
  Settings,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppState } from "../state/AppState";

const navigation = [
  { label: "Today", href: "/app/today", icon: CalendarCheck2 },
  { label: "Route", href: "/app/route", icon: RouteIcon },
  { label: "Places", href: "/app/places", icon: MapPin },
  { label: "Community", href: "/app/community", icon: UsersRound },
  { label: "Insights", href: "/app/insights", icon: BarChart3 },
  { label: "Settings", href: "/app/settings", icon: Settings }
];

const pageTitles: Record<string, string> = {
  "/app/today": "Life Dashboard",
  "/app/check-in": "Check-In",
  "/app/recommendation": "Recommendation",
  "/app/mission": "Mission",
  "/app/reflection": "Reflection",
  "/app/vision": "Life Vision",
  "/app/route": "Route",
  "/app/places": "Places",
  "/app/community": "Shared Activities",
  "/app/insights": "Insights",
  "/app/settings": "Settings",
  "/app/support": "Support"
};

/**
 * What the header says about where this person's work currently is.
 *
 * The rule is that the ordinary case stays quiet and only the exceptions
 * speak. "tone" drives the dot; nothing is signalled by colour alone, so the
 * label always changes with it.
 *
 * Offline is deliberately not phrased as a failure. Every write lands in
 * IndexedDB first, so nothing is at risk — it is waiting, and saying
 * otherwise would alarm someone about a state the app was built to handle.
 */
function describeSyncState(
  online: boolean,
  pending: number,
  syncing: boolean,
  justSynced: number
): { tone: "ok" | "waiting" | "idle"; label: string; count: string; pulse: boolean } {
  const count = pending > 0 ? String(pending) : "";

  if (justSynced > 0) {
    return { tone: "ok", label: `${justSynced} synced`, count: "", pulse: false };
  }
  if (syncing) {
    return { tone: "ok", label: pending > 0 ? `Syncing ${pending}` : "Syncing", count, pulse: true };
  }
  if (pending > 0) {
    const where = online ? "Waiting to sync" : "On this device";
    return { tone: "waiting", label: `${where} · ${pending}`, count, pulse: false };
  }
  if (!online) {
    return { tone: "idle", label: "On this device", count: "", pulse: false };
  }
  return { tone: "ok", label: "Synced", count: "", pulse: false };
}

export function AppShell() {
  const location = useLocation();
  const { online, pending, syncing, justSynced } = useAppState();
  const sync = describeSyncState(online, pending, syncing, justSynced);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const basePath = Object.keys(pageTitles).find((path) => location.pathname.startsWith(path));
  const pageTitle = basePath ? pageTitles[basePath] : "ReNew";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="product-shell">
      <aside className="product-sidebar">
        <Link className="app-wordmark product-wordmark" to="/">
          ReNew
        </Link>
        <nav aria-label="App navigation">
          {navigation.map(({ label, href, icon: Icon }) => (
            <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} to={href} key={href}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {/* C1: Support always one tap away in sidebar */}
        <div className="sidebar-bottom">
          <Link className="sidebar-support" to="/app/support" aria-label="Support">
            <HeartHandshake aria-hidden="true" />
            <span>Support</span>
          </Link>
          <Link className="sidebar-checkin" to="/app/check-in">
            <span>Daily reset</span>
            Quick Check-In
          </Link>
        </div>
      </aside>

      <div className="product-main">
        <header className="product-header">
          <Link className="app-wordmark mobile-app-wordmark" to="/">
            ReNew
          </Link>
          <p>{pageTitle}</p>
          <div className="product-header-actions">
            {/* Same chip, same place — now driven by where the work actually
                is. Phones get the dot and a count, because the full phrase
                squeezes the page title down to an ellipsis; the wording is
                still there for screen readers at every size. */}
            <span
              className="save-state"
              data-tone={sync.tone}
              data-pulse={sync.pulse ? "true" : "false"}
              role="status"
              aria-live="polite"
            >
              <i aria-hidden="true" />
              <span className="save-state-label">{sync.label}</span>
              {sync.count ? (
                <span className="save-state-count" aria-hidden="true">
                  {sync.count}
                </span>
              ) : null}
            </span>
            <Link className="header-checkin" to="/app/check-in">
              Check in
            </Link>
            {/* C1: Support always reachable from header */}
            <Link
              className="header-support"
              to="/app/support"
              aria-label="Support"
              title="Support"
            >
              <HeartHandshake aria-hidden="true" />
            </Link>
            <button
              className="mobile-app-menu"
              type="button"
              aria-label={mobileMenuOpen ? "Close app menu" : "Open app menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav className="mobile-app-drawer" aria-label="More app navigation">
            {navigation.map(({ label, href, icon: Icon }) => (
              <NavLink to={href} key={href} onClick={() => setMobileMenuOpen(false)}>
                <Icon aria-hidden="true" /> {label}
              </NavLink>
            ))}
            <NavLink to="/app/support" onClick={() => setMobileMenuOpen(false)}>
              <HeartHandshake aria-hidden="true" /> Support
            </NavLink>
          </nav>
        )}

        <div className="product-content">
          <Outlet />
        </div>

        <nav className="mobile-bottom-nav" aria-label="Primary app navigation">
          {navigation.slice(0, 5).map(({ label, href, icon: Icon }) => (
            <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} to={href} key={href}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
