import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Menu, X } from "lucide-react";

const processSteps = [
  {
    number: "01",
    title: "삶의 방향을 정합니다.",
    description: "회복하고 싶은 일상과 오래 유지하고 싶은 삶의 모습을 직접 정의합니다."
  },
  {
    number: "02",
    title: "지금의 조건을 확인합니다.",
    description: "기분을 진단하지 않고 에너지, 시간, 거리, 비용과 사회적 부담을 살펴봅니다."
  },
  {
    number: "03",
    title: "오늘의 크기로 조정합니다.",
    description: "장기 목표는 남겨두고 지금 실행할 수 있는 가장 현실적인 행동을 선택합니다."
  },
  {
    number: "04",
    title: "다음 삶에 반영합니다.",
    description: "시도한 결과와 부담도를 기록하고 다음 행동과 장소를 다시 설계합니다."
  }
];

const routeLevels = [
  ["Level 05", "카페에서 20분 공부하기"],
  ["Level 04", "카페에서 노트를 펼치고 10분 머무르기"],
  ["Level 03", "가까운 카페 입구까지 다녀오기"],
  ["Level 02", "집 앞까지 5분 걷기"],
  ["Level 01", "가방에 노트 한 권 넣기"]
];

const navigationItems = [
  ["ReNew란", "#about"],
  ["작동 방식", "#method"],
  ["지역 연결", "#local"],
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
        <a className="wordmark" href="#top" aria-label="ReNew 홈">
          ReNew
        </a>

        <nav className="desktop-nav" aria-label="주요 메뉴">
          {navigationItems.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="text-link desktop-only" href="/login">
            로그인
          </a>
          <a className="header-cta desktop-only" href="/onboarding">
            시작하기
          </a>
          <button
            className="menu-button"
            type="button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
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
        <nav aria-label="모바일 메뉴">
          {navigationItems.map(([label, href], index) => (
            <a key={href} href={href} onClick={closeMenu}>
              <span>0{index + 1}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="mobile-menu-actions">
          <a href="/login" onClick={closeMenu}>
            로그인
          </a>
          <a href="/onboarding" onClick={closeMenu}>
            ReNew 시작하기 <ArrowUpRight aria-hidden="true" />
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
              원하는 삶의 방향을 잃지 않도록,
              <br />
              오늘 가능한 행동과 실제 생활의 장소를 연결합니다.
            </p>
            <a className="hero-action" href="/onboarding">
              ReNew 시작하기 <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <a className="scroll-cue" href="#about" aria-label="다음 내용 보기">
            <span>Discover</span>
            <ArrowDown aria-hidden="true" />
          </a>
        </section>

        <section className="manifesto section-pad" id="about">
          <div className="section-frame" data-reveal>
            <p className="section-kicker">01 / The question</p>
            <h2 className="manifesto-title">
              당신은 어떤 삶을
              <br />
              <span>만들고</span> 싶나요?
            </h2>
            <div className="manifesto-copy">
              <p>
                ReNew는 사용자를 환자나 위험군으로 먼저 정의하지 않습니다. 누구나 자신의 삶을
                설계하고, 달라진 하루의 조건에 맞춰 행동의 크기와 환경을 조정할 수 있다고
                믿습니다.
              </p>
              <p>
                장기 목표를 포기하는 대신 오늘의 한 걸음을 더 작게 만듭니다. 시간, 거리, 비용,
                에너지와 사람을 만나는 부담까지 고려해 지금의 나에게 가능한 경로를 찾습니다.
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
                삶의 방향에서 시작해 오늘의 행동으로, 그리고 다시 다음 계획으로 이어지는 하나의
                생활 루프입니다.
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
                목표는 남겨두고,
                <br />
                오늘의 크기만 바꿉니다.
              </h2>
              <div className="vision-note">
                <span>Life vision</span>
                <p>집 밖에서 규칙적으로 공부하는 생활 만들기</p>
              </div>
            </div>

            <ol className="route-levels" aria-label="적응형 행동 단계 예시">
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
                생활은 화면 안이 아니라
                <br />
                <span>실제 장소에서</span> 이어집니다.
              </h2>
              <p>
                가까운 카페, 도서관, 공원과 지역 프로그램을 거리, 비용, 접근성, 사회적 부담에 맞춰
                행동 경로와 연결합니다.
              </p>
            </div>

            <div className="place-mosaic" aria-label="ReNew가 연결하는 생활 장소 예시">
              <figure className="place-tile place-tile-library" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Quiet / 01</span>
                </div>
                <figcaption>
                  <span>Library</span>
                  조용히 머무를 수 있는 공공 공간
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-cafe" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Nearby / 02</span>
                </div>
                <figcaption>
                  <span>Local cafe</span>
                  짧은 행동을 시작하기 좋은 가까운 장소
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-park" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Open air / 03</span>
                </div>
                <figcaption>
                  <span>Park</span>
                  비용 없이 움직임을 시작하는 생활 환경
                </figcaption>
              </figure>
              <figure className="place-tile place-tile-community" data-reveal>
                <div className="place-visual" aria-hidden="true">
                  <span>Together / 04</span>
                </div>
                <figcaption>
                  <span>Community</span>
                  대화 없이도 함께 행동할 수 있는 연결
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
                ReNew는 당신을
                <br />
                <span>진단하지 않습니다.</span>
              </h2>
            </div>
            <div className="trust-principles">
              <div data-reveal>
                <span>01</span>
                <h3>나의 기준선</h3>
                <p>다른 사람과 비교하지 않고 나의 평소 생활과 최근 변화를 함께 봅니다.</p>
              </div>
              <div data-reveal>
                <span>02</span>
                <h3>선택 가능한 추천</h3>
                <p>모든 행동과 장소는 더 작게 바꾸거나 거절하고 잠시 멈출 수 있습니다.</p>
              </div>
              <div data-reveal>
                <span>03</span>
                <h3>승인 기반 연결</h3>
                <p>연락과 정보 공유는 내용을 미리 확인하고 직접 승인한 경우에만 실행됩니다.</p>
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
                e-ICON 세계대회는 국내외 중·고등학생이 글로벌 팀을 이루어 지속가능개발목표를 위한
                웹 앱을 만드는 국제 SW·AI 경진대회입니다.
              </p>
              <p>
                ReNew는 2026년 대회 주제인 SDG 3, 건강과 웰빙에 대한 응답으로 시작되었습니다.
                건강을 진단 점수로 단순화하는 대신, 모든 연령의 사람이 자신의 생활 변화를
                알아차리고 오늘 가능한 행동과 지역의 연결을 선택할 수 있도록 돕습니다.
              </p>

              <div className="sdg-links">
                <a href="https://e-icon.or.kr/ko/" target="_blank" rel="noreferrer">
                  e-ICON 세계대회 <ArrowUpRight aria-hidden="true" />
                </a>
                <a href="https://sdgs.un.org/goals/goal3" target="_blank" rel="noreferrer">
                  UN SDG 3 <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="eicon-relation" data-reveal>
              <p>SDG 3 · Good Health and Well-being</p>
              <div>
                <span>Recognize</span>
                생활의 변화를 스스로 알아차리기
              </div>
              <div>
                <span>Act</span>
                오늘 가능한 가장 작은 행동 시작하기
              </div>
              <div>
                <span>Connect</span>
                실제 장소와 낮은 부담의 관계로 이어지기
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
              오늘 가능한
              <br />
              한 걸음부터.
            </h2>
            <a className="closing-action" href="/onboarding">
              ReNew 시작하기 <ArrowUpRight aria-hidden="true" />
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
          <a href="#about">서비스 소개</a>
          <a href="#e-icon">e-ICON</a>
          <a href="/privacy">개인정보 처리방침</a>
        </div>
        <span>2026 ReNew</span>
      </footer>
    </div>
  );
}
