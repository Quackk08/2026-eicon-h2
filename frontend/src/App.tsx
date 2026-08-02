import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Menu, X } from "lucide-react";

const processSteps = [
  {
    number: "01",
    title: "Define the life you want.",
    description: "Describe the everyday life you want to regain and the patterns you want to sustain."
  },
  {
    number: "02",
    title: "Read today's conditions.",
    description: "Consider your energy, time, distance, cost, and social effort without diagnosing your mood."
  },
  {
    number: "03",
    title: "Adjust it to today's scale.",
    description: "Keep the long-term goal, then choose the most realistic action you can take right now."
  },
  {
    number: "04",
    title: "Shape the next step.",
    description: "Reflect on the result and effort, then redesign the next action and place around what you learned."
  }
];

const routeLevels = [
  ["Level 05", "Study at a cafe for 20 minutes"],
  ["Level 04", "Open a notebook at a cafe and stay for 10 minutes"],
  ["Level 03", "Walk to the entrance of a nearby cafe"],
  ["Level 02", "Take a five-minute walk outside"],
  ["Level 01", "Put one notebook in your bag"]
];

const navigationItems = [
  ["About ReNew", "#about"],
  ["How It Works", "#method"],
  ["Local Network", "#local"],
  ["e-ICON", "#e-icon"]
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="ReNew home">
          ReNew
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigationItems.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="text-link desktop-only" href="/login">
            Sign in
          </a>
          <a className="header-cta desktop-only" href="/onboarding">
            Get started
          </a>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div
        className={`mobile-menu${menuOpen ? " is-open" : ""}`}
        id="mobile-navigation"
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Mobile navigation">
          {navigationItems.map(([label, href], index) => (
            <a key={href} href={href} onClick={closeMenu}>
              <span>0{index + 1}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="mobile-menu-actions">
          <a href="/login" onClick={closeMenu}>
            Sign in
          </a>
          <a href="/onboarding" onClick={closeMenu}>
            Begin with ReNew <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>

      <main>
        <section className="hero" id="top" aria-labelledby="hero-title">
          <video className="hero-video" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" />
          <div className="hero-film-empty" aria-hidden="true">
            <span className="film-index">RN / 001</span>
            <span className="film-line film-line-one" />
            <span className="film-line film-line-two" />
          </div>
          <div className="hero-shade" aria-hidden="true" />

          <div className="hero-content">
            <p className="section-kicker hero-kicker">Lifestyle Architecture for everyone</p>
            <h1 id="hero-title">ReNew</h1>
            <p className="hero-script" aria-hidden="true">
              Rewrite the everyday
            </p>
            <p className="hero-summary">
              Keep the life you want in view.
              <br />
              Connect what feels possible today with the real places around you.
            </p>
            <a className="hero-action" href="/onboarding">
              Begin with ReNew <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <a className="scroll-cue" href="#about" aria-label="View the next section">
            <span>Discover</span>
            <ArrowDown aria-hidden="true" />
          </a>
        </section>

        <section className="manifesto section-pad" id="about">
          <div className="section-frame" data-reveal>
            <p className="section-kicker">01 / The question</p>
            <h2 className="manifesto-title">
              What kind of life
              <br />
              do you want to <span>build?</span>
            </h2>
            <div className="manifesto-copy">
              <p>
                ReNew does not begin by defining anyone as a patient or a risk profile. It starts from
                the belief that every person can shape their own life, then adjust the size and setting
                of an action as each day changes.
              </p>
              <p>
                Instead of abandoning a long-term goal, ReNew makes today's step smaller. It considers
                time, distance, cost, energy, and social effort to find a route that is genuinely
                possible right now.
              </p>
            </div>
          </div>
        </section>

        <section className="method section-pad" id="method">
          <div className="section-frame">
            <div className="section-heading" data-reveal>
              <p className="section-kicker">02 / How it works</p>
              <h2>
                Plan the life.
                <br />
                <span>Adjust the day.</span>
              </h2>
              <p>
                One continuous life loop, moving from your direction to today's action and back into
                what comes next.
              </p>
            </div>

            <ol className="process-list">
              {processSteps.map((step) => (
                <li key={step.number} data-reveal>
                  <span className="process-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="route-story section-pad">
          <div className="section-frame route-layout">
            <div className="route-intro" data-reveal>
              <p className="section-kicker">03 / Adaptive life route</p>
              <h2>
                Keep the destination.
                <br />
                Change today's scale.
              </h2>
              <div className="vision-note">
                <span>Life vision</span>
                <p>Build a routine of studying regularly outside the home</p>
              </div>
            </div>

            <ol className="route-levels" aria-label="Example adaptive action steps">
              {routeLevels.map(([level, action]) => (
                <li key={level} data-reveal>
                  <span>{level}</span>
                  <p>{action}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="local-network section-pad" id="local">
          <div className="section-frame">
            <div className="local-heading" data-reveal>
              <p className="section-kicker">04 / Local life network</p>
              <h2>
                Life continues beyond the screen,
                <br />
                <span>in real places.</span>
              </h2>
              <p>
                Nearby cafes, libraries, parks, and community programs become part of your route,
                matched to distance, cost, accessibility, and social effort.
              </p>
            </div>

            <div className="place-mosaic" aria-label="Examples of local places connected by ReNew">
              <figure className="place-tile place-tile-library" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Quiet / 01</span>
                </div>
                <figcaption>
                  <span>Library</span>
                  A public place where you can stay quietly
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-cafe" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Nearby / 02</span>
                </div>
                <figcaption>
                  <span>Local cafe</span>
                  A nearby place for starting a small action
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-park" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Open air / 03</span>
                </div>
                <figcaption>
                  <span>Park</span>
                  An open setting where movement costs nothing
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-community" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Together / 04</span>
                </div>
                <figcaption>
                  <span>Community</span>
                  A way to act alongside others without pressure to talk
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="trust section-pad">
          <div className="section-frame trust-layout">
            <div className="trust-statement" data-reveal>
              <p className="section-kicker">05 / Your pace, your choice</p>
              <h2>
                ReNew does not
                <br />
                <span>diagnose you.</span>
              </h2>
            </div>
            <div className="trust-principles">
              <div data-reveal>
                <span>01</span>
                <h3>Your own baseline</h3>
                <p>Look at your usual patterns and recent changes without comparing yourself to others.</p>
              </div>
              <div data-reveal>
                <span>02</span>
                <h3>Recommendations you control</h3>
                <p>Make any action smaller, decline a place, or pause whenever you need to.</p>
              </div>
              <div data-reveal>
                <span>03</span>
                <h3>Connections by consent</h3>
                <p>Contact and information sharing only happen after you review and approve them.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="eicon section-pad" id="e-icon">
          <div className="eicon-number" aria-hidden="true">
            03
          </div>
          <div className="section-frame eicon-layout">
            <div className="eicon-heading" data-reveal>
              <p className="section-kicker">06 / Built for a global challenge</p>
              <h2>e-ICON</h2>
              <p className="eicon-full-name">e-learning International Contest of Outstanding New Ages</p>
            </div>

            <div className="eicon-content" data-reveal>
              <p className="eicon-lead">
                e-ICON is an international SW and AI competition where secondary-school students from
                Korea and around the world form global teams to build web apps that advance the
                Sustainable Development Goals.
              </p>
              <p>
                ReNew began as a response to SDG 3, Good Health and Well-being, the 2026 competition
                theme. Instead of reducing health to a diagnostic score, it helps people of all ages
                recognize shifts in daily life and choose feasible actions and local connections.
              </p>

              <div className="sdg-links">
                <a href="https://e-icon.or.kr/ko/" target="_blank" rel="noreferrer">
                  Visit e-ICON <ArrowUpRight aria-hidden="true" />
                </a>
                <a href="https://sdgs.un.org/goals/goal3" target="_blank" rel="noreferrer">
                  Explore UN SDG 3 <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="eicon-relation" data-reveal>
              <p>SDG 3 / Good Health and Well-being</p>
              <div>
                <span>Recognize</span>
                Notice changes in your own everyday life
              </div>
              <div>
                <span>Act</span>
                Begin with the smallest action possible today
              </div>
              <div>
                <span>Connect</span>
                Reach real places and low-pressure relationships
              </div>
            </div>
          </div>
        </section>

        <section className="closing" id="start">
          <div className="closing-inner" data-reveal>
            <p className="section-kicker">Begin where you are</p>
            <p className="closing-script" aria-hidden="true">
              A life, renewed
            </p>
            <h2>
              Start with what is
              <br />
              possible today.
            </h2>
            <a className="closing-action" href="/onboarding">
              Begin with ReNew <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#top">
          ReNew
        </a>
        <p>Lifestyle Architecture for every life.</p>
        <div>
          <a href="#about">About</a>
          <a href="#e-icon">e-ICON</a>
          <a href="/privacy">Privacy policy</a>
        </div>
        <span>2026 ReNew</span>
      </footer>
    </div>
  );
}
