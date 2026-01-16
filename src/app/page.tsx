"use client";

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";

interface Question {
  word: string;
  options: Record<string, string>;
  answer: string;
  year: number;
  term: string;
}

type GameMode = 'stora' | 'snabb' | 'maraton' | 'ai';

export default function Home() {
  const { data: session } = useSession();
  const [view, setView] = useState<'home' | 'game' | 'results' | 'leaderboard'>('home');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('stora');
  const [leaderboardMode, setLeaderboardMode] = useState<GameMode>('maraton');
  const [guestName, setGuestName] = useState('');

  // Persist guest name in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('hp_guest_name');
    if (savedName) setGuestName(savedName);
  }, []);

  const saveGuestName = (name: string) => {
    setGuestName(name);
    localStorage.setItem('hp_guest_name', name);
  };

  const startMode = (mode: GameMode) => {
    setLoading(true);
    setGameMode(mode);
    const limit = mode === 'stora' ? 40 : mode === 'snabb' ? 10 : 1000;
    fetch(`/api/questions?limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setScore(0);
          setCurrentIndex(0);
          setSelectedOption(null);
          setShowResult(false);
          setView('game');
        } else {
          alert("Kunde inte hämta frågor. Försök igen!");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        alert("Ett fel uppstod. Kontrollera din anslutning.");
        setLoading(false);
      });
  };

  const startAIMode = () => {
    setLoading(true);
    setGameMode('ai');
    fetch('/api/ai-questions?count=10')
      .then(res => res.json())
      .then(data => {
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setScore(0);
          setCurrentIndex(0);
          setSelectedOption(null);
          setShowResult(false);
          setView('game');
        } else {
          alert('Kunde inte generera AI-frågor. Försök igen!');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        alert('Ett fel uppstod vid AI-generering.');
        setLoading(false);
      });
  };

  const showLeaderboardView = (mode: GameMode = 'maraton') => {
    setLoading(true);
    setLeaderboardMode(mode);
    fetch(`/api/scores?mode=${mode}`)
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setView('leaderboard');
        setLoading(false);
      });
  };

  const handleOptionClick = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    if (option === questions[currentIndex].answer) {
      setScore(score + 1);
    }
  };

  const finishGame = async () => {
    setView('results');
    const total = currentIndex + 1;
    const percentage = (score / total) * 100;

    // Save score
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score,
        total,
        percentage,
        time: 0,
        guestName: session ? null : guestName,
        mode: gameMode
      })
    });
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      finishGame();
    }
  };

  if (loading) return <div className="container">Laddar...</div>;

  if (view === 'home') {
    return (
      <div className="container">
        <h1>Högskoleprovet ORD</h1>

        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          {session ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0 }}>Inloggad som <strong>{session.user?.name}</strong></p>
              </div>
              <button
                className="next-btn"
                style={{ background: '#64748b', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                onClick={() => signOut()}
              >
                Logga ut
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>Skriv ditt namn för att synas på topplistan:</p>
              <input
                type="text"
                placeholder="Ditt namn..."
                value={guestName}
                onChange={(e) => saveGuestName(e.target.value)}
                className="option-btn"
                style={{ width: '100%', marginBottom: '1rem', padding: '1rem', background: 'var(--card-bg)', textAlign: 'left', cursor: 'text' }}
              />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Eller </span>
                <button
                  onClick={() => signIn('google')}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  logga in med Google
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="options-grid">
          <button className="option-btn" onClick={() => startMode('maraton')}>
            <span className="option-label">🏃‍♂️</span>
            <div>
              <strong>Maraton</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Kör så långt du orkar, tävla i % rätt!</div>
            </div>
          </button>
          <button className="option-btn" onClick={() => startMode('stora')}>
            <span className="option-label">🚀</span>
            <div>
              <strong>Stora Provet</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>40 ord (klassisk)</div>
            </div>
          </button>
          <button className="option-btn" onClick={() => startMode('snabb')}>
            <span className="option-label">⚡</span>
            <div>
              <strong>Snabbträning</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>10 ord</div>
            </div>
          </button>
          <button className="option-btn" onClick={startAIMode} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none' }}>
            <span className="option-label">🤖</span>
            <div>
              <strong>AI-Läge</strong>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>Nya ord genererade av AI!</div>
            </div>
          </button>
          <button className="option-btn" onClick={() => showLeaderboardView('maraton')}>
            <span className="option-label">🏆</span>
            <div>
              <strong>Topplista</strong>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Se vem som är bäst</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'leaderboard') {
    return (
      <div className="container">
        <h1>Topplista</h1>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['maraton', 'stora', 'snabb', 'ai'] as GameMode[]).map(m => (
            <button
              key={m}
              onClick={() => showLeaderboardView(m)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: leaderboardMode === m ? (m === 'ai' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'var(--foreground)') : 'transparent',
                color: leaderboardMode === m ? 'var(--background)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {m === 'ai' ? '🤖 AI' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontWeight: 'bold', borderBottom: '2px solid var(--border)' }}>
            <span>Namn</span>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <span>Totalt</span>
              <span>Precision</span>
            </div>
          </div>
          {leaderboard.length > 0 ? (
            leaderboard.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i + 1}. {item.userName}</span>
                <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                  <span style={{ minWidth: '3rem' }}>{item.total} ord</span>
                  <strong style={{ minWidth: '4rem', color: '#10b981' }}>{Math.round(item.percentage)}%</strong>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Här var det tomt än så länge...</p>
          )}
        </div>
        <button className="next-btn" onClick={() => setView('home')}>Tillbaka till menyn</button>
      </div>
    );
  }

  if (view === 'results') {
    const total = currentIndex + 1;
    const percentage = Math.round((score / total) * 100);
    return (
      <div className="container">
        <h1>Resultat</h1>
        <div className="word" style={{ fontSize: '4rem', margin: '0.5rem 0' }}>{percentage}%</div>
        <div style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.2rem' }}>
          {score} rätt av {total} ord ({gameMode})
        </div>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Ditt resultat har sparats under namnet: <strong>{session?.user?.name || guestName || "Anonym"}</strong>
        </p>
        <button className="next-btn" onClick={() => setView('home')}>Spela igen</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        <span>{currentQuestion.year} {currentQuestion.term.toUpperCase()}</span>
        <span>{currentIndex + 1} ord körda ({gameMode})</span>
      </div>

      <div className="word-card">
        <div className="word">{currentQuestion.word}</div>
      </div>

      <div className="options-grid">
        {Object.entries(currentQuestion.options).map(([key, value]) => {
          let className = "option-btn";
          if (showResult) {
            if (key === currentQuestion.answer) className += " correct";
            else if (key === selectedOption) className += " wrong";
          } else if (key === selectedOption) {
            className += " selected";
          }

          return (
            <button
              key={key}
              className={className}
              onClick={() => handleOptionClick(key)}
              disabled={showResult}
            >
              <span className="option-label">{key}</span>
              {value}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {showResult && (
          <button className="next-btn" onClick={handleNext} style={{ flex: 2 }}>
            Nästa ord
          </button>
        )}
        <button
          className="next-btn"
          onClick={finishGame}
          style={{ flex: 1, background: '#ef4444', opacity: showResult ? 1 : 0.5 }}
        >
          Avsluta
        </button>
      </div>

      <div className="progress-container" style={{ marginTop: '2.5rem' }}>
        <div
          className="progress-bar"
          style={{
            width: gameMode === 'maraton' ? '100%' : `${questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0}%`,
            background: gameMode === 'maraton' ? 'linear-gradient(90deg, #10b981, #3b82f6)' : undefined
          }}
        ></div>
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
          Precision: {currentIndex > 0 || showResult ? Math.round((score / (currentIndex + (showResult ? 1 : 0))) * 100) : 0}%
        </div>
      </div>
    </div>
  );
}
