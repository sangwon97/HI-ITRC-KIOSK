import { useState } from 'react';
import './CenterInfo.css';

export default function CenterInfo({ data, goBack, goHome }) {
  if (!data) return null;
  const { center, booth } = data;
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="center-info screen-enter">
      {/* 헤더 */}
      <header className="screen-header ci-header">
        <button className="btn-back" onClick={goBack}>이전</button>
        <div className="ci-header-title">연구센터 소개</div>
        <button className="btn-back" onClick={goHome}>홈</button>
      </header>

      <div className="ci-content scrollable">
        {/* 히어로 */}
        <div className="ci-hero">
          <div className="ci-hero-icon">🏫</div>
          <div className="ci-hero-text">
            <h1 className="ci-hero-name">{center.name}</h1>
            <div className="ci-hero-univ">
              <span>🎓</span>
              <span>{center.univ}</span>
            </div>
            {booth && (
              <div className="ci-hero-id">부스 {booth.id}</div>
            )}
          </div>
        </div>

        {/* 소개 */}
        <section className="ci-section">
          <h2 className="ci-section-title">
            <span>📋</span>
            <span>센터 소개</span>
          </h2>
          <div className="ci-intro-card">
            <p className="ci-intro-text">{center.intro}</p>
          </div>
        </section>

        {/* FAQ */}
        {center.faqs && center.faqs.length > 0 && (
          <section className="ci-section">
            <h2 className="ci-section-title">
              <span>💬</span>
              <span>자주 묻는 질문</span>
            </h2>
            <div className="ci-faqs">
              {center.faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`ci-faq-item ${openFaq === i ? 'ci-faq-open' : ''}`}
                >
                  <button
                    className="ci-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="ci-faq-num">Q{i + 1}</span>
                    <span className="ci-faq-question">{faq.q}</span>
                    <span className="ci-faq-chevron">{openFaq === i ? '▲' : '▼'}</span>
                  </button>
                  {openFaq === i && (
                    <div className="ci-faq-a">
                      <span className="ci-faq-a-label">A</span>
                      <p className="ci-faq-answer">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
