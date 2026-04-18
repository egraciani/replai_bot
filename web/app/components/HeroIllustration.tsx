export default function HeroIllustration() {
  return (
    <>
      <style>{`
        @keyframes floatRobot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes reviewFlow {
          0%   { transform: translate(-50px, 100px) scale(0.8); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(50px, -100px) scale(1.1); opacity: 0; }
        }
        @keyframes replyFlow {
          0%   { transform: translate(50px, -50px) scale(0.8); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(-50px, 50px) scale(1.1); opacity: 0; }
        }
        .robot-svg { animation: floatRobot 4s ease-in-out infinite; }
        .hi-bubble {
          position: absolute;
          padding: 10px 15px;
          border-radius: 15px;
          font-size: 0.85rem;
          max-width: 150px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          opacity: 0;
          font-family: var(--font-inter, sans-serif);
        }
        .hi-review { background: white; color: #1A2B3C; border: 1px solid rgba(26,43,60,0.1); animation: reviewFlow 6s linear infinite; }
        .hi-reply  { background: #2D5A27; color: white; animation: replyFlow 6s linear infinite; }
        .hi-r1 { animation-delay: 0s;  top: 150px; left: 0; }
        .hi-r2 { animation-delay: 2s;  top: 180px; left: 30px; }
        .hi-r3 { animation-delay: 4s;  top: 130px; left: -20px; }
        .hi-p1 { animation-delay: 1s;  top: 50px;  right: 0; }
        .hi-p2 { animation-delay: 3s;  top: 20px;  right: 40px; }
        .hi-p3 { animation-delay: 5s;  top: 80px;  right: -20px; }
        .owner-chip {
          font-weight: 600;
          color: #1A2B3C;
          background: rgba(255,255,255,0.7);
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
        }
      `}</style>

      <div style={{ position: "relative", maxWidth: 650, height: 450, width: "100%" }}>

        {/* ── Owner (left) ── */}
        <div style={{ position: "absolute", left: 0, bottom: 50, width: 200, textAlign: "center" }}>
          <div style={{
            width: 120, height: 120,
            backgroundColor: "#1A2B3C",
            borderRadius: "50%",
            margin: "0 auto 15px",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <svg viewBox="0 0 24 24" width="60" height="60" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {/* Apron */}
            <div style={{
              position: "absolute", bottom: -15,
              width: 100, height: 60,
              backgroundColor: "#A0522D",
              borderRadius: "10px 10px 50% 50%",
            }} />
          </div>
          <span className="owner-chip">Panadería Luján</span>
        </div>

        {/* ── Bubbles (center) ── */}
        <div style={{ position: "absolute", top: 100, left: 180, right: 180, height: 250 }}>
          {/* Review bubbles */}
          <div className="hi-bubble hi-review hi-r1">
            <svg style={{ width: 80, display: "block", marginBottom: 5 }} viewBox="0 0 100 20">
              {[0,1,2,3,4].map((i) => (
                <polygon key={i}
                  points={`${10+i*20},0 ${12+i*20},7 ${20+i*20},7 ${14+i*20},12 ${16+i*20},19 ${10+i*20},15 ${4+i*20},19 ${6+i*20},12 ${i*20},7 ${8+i*20},7`}
                  fill="#F1C40F"
                />
              ))}
            </svg>
            &ldquo;¡El mejor pan de la zona!&rdquo;
          </div>
          <div className="hi-bubble hi-review hi-r2">&ldquo;Trato excelente.&rdquo;</div>
          <div className="hi-bubble hi-review hi-r3">
            <svg style={{ width: 60, display: "block", marginBottom: 5 }} viewBox="0 0 60 20">
              {[0,1,2].map((i) => (
                <polygon key={i}
                  points={`${10+i*20},0 ${12+i*20},7 ${20+i*20},7 ${14+i*20},12 ${16+i*20},19 ${10+i*20},15 ${4+i*20},19 ${6+i*20},12 ${i*20},7 ${8+i*20},7`}
                  fill="#F1C40F"
                />
              ))}
            </svg>
            &ldquo;Un poco caro...&rdquo;
          </div>

          {/* Reply bubbles */}
          <div className="hi-bubble hi-reply hi-p1">&ldquo;¡Gracias por tu visita!&rdquo;</div>
          <div className="hi-bubble hi-reply hi-p2">&ldquo;¡Nos alegra leer eso!&rdquo;</div>
          <div className="hi-bubble hi-reply hi-p3">&ldquo;Tomamos nota para mejorar.&rdquo;</div>
        </div>

        {/* ── Robot (right) ── */}
        <div style={{ position: "absolute", right: 0, top: 50, width: 180, textAlign: "center" }}>
          <svg
            className="robot-svg"
            style={{ width: 140, height: "auto", marginBottom: 10, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
            viewBox="0 0 100 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="40" r="25" fill="#2D5A27"/>
            <circle cx="40" cy="35" r="4" fill="white"/>
            <circle cx="60" cy="35" r="4" fill="white"/>
            <path d="M 40 50 Q 50 60 60 50" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <line x1="50" y1="15" x2="50" y2="5" stroke="#2D5A27" strokeWidth="4"/>
            <circle cx="50" cy="5" r="5" fill="#2D5A27"/>
            <rect x="30" y="65" width="40" height="50" rx="10" fill="#2D5A27"/>
            <circle cx="20" cy="80" r="8" fill="#2D5A27"/>
            <circle cx="80" cy="80" r="8" fill="#2D5A27"/>
          </svg>
          <span className="owner-chip">autoreplai IA</span>
        </div>

      </div>
    </>
  );
}
