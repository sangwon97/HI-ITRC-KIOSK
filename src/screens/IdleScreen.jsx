import { useEffect, useState } from 'react';
import { eventInfo } from '../data/eventInfo';
import './IdleScreen.css';

const SLIDES = [
  {
    tag: 'AI 대전환 시대',
    title: '기술주권을 이끄는\n미래인재',
    sub: '전국 38개 대학 · 81개 연구센터',
    accent: '#00b4ff',
  },
  {
    tag: '2026. 04. 22~24',
    title: 'COEX에서\n만나요',
    sub: '국내 최대 ICT 연구성과 전시회',
    accent: '#00e5a0',
  },
  {
    tag: '80+ 전시 부스',
    title: '첨단 ICT 기술의\n모든 것',
    sub: 'AI반도체 · 6G · 양자기술 · 바이오헬스케어',
    accent: '#a29bfe',
  },
];

export default function IdleScreen({ onStart }) {
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setSlide(s => (s + 1) % SLIDES.length);
        setAnimating(false);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pulse = setInterval(() => {
      setPulse(p => !p);
    }, 1500);
    return () => clearInterval(pulse);
  }, []);

  const current = SLIDES[slide];

  return (
    <div className="idle-screen" onClick={onStart}>
      {/* 배경 파티클 효과 */}
      <div className="idle-bg">
        <div className="idle-orb idle-orb-1" />
        <div className="idle-orb idle-orb-2" />
        <div className="idle-orb idle-orb-3" />
        <div className="idle-grid" />
      </div>

      {/* 상단 로고 */}
      <header className="idle-header">
        <div className="idle-logo">
          <span className="idle-logo-itrc">ITRC</span>
          <span className="idle-logo-year">2026</span>
        </div>
        <div className="idle-header-right">
          <span className="idle-header-tag">인재양성대전</span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={`idle-main ${animating ? 'idle-slide-exit' : 'idle-slide-enter'}`}>
        <div className="idle-tag" style={{ background: `${current.accent}20`, color: current.accent, borderColor: `${current.accent}40` }}>
          {current.tag}
        </div>
        <h1 className="idle-headline">
          {current.title.split('\n').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h1>
        <p className="idle-sub">{current.sub}</p>

        {/* 행사 정보 요약 */}
        <div className="idle-event-info">
          <div className="idle-event-item">
            <span className="idle-event-icon">📅</span>
            <span className="idle-event-text">{eventInfo.date}</span>
          </div>
          <div className="idle-event-divider" />
          <div className="idle-event-item">
            <span className="idle-event-icon">📍</span>
            <span className="idle-event-text">{eventInfo.venue}</span>
          </div>
        </div>
      </main>

      {/* 통계 */}
      <div className="idle-stats">
        {eventInfo.stats.map((s, i) => (
          <div key={i} className="idle-stat">
            <span className="idle-stat-value gradient-text">{s.value}</span>
            <span className="idle-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 터치 프롬프트 */}
      <div className={`idle-touch-prompt ${pulse ? 'idle-touch-pulse' : ''}`}>
        <div className="idle-touch-icon">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M32 20v16M24 36l8 8 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span>화면을 터치하여 시작하세요</span>
      </div>

      {/* 슬라이드 인디케이터 */}
      <div className="idle-indicators">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`idle-dot ${i === slide ? 'idle-dot-active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
