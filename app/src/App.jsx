import React, { useState } from 'react';
import PanelDashboard from './components/PanelDashboard';
import RecipientModal from './components/RecipientModal';

function App() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Premium Header */}
      <header style={{ 
          padding: '2rem 4rem', 
          background: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(251, 191, 36, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
      }}>
        <div>
            <h1 style={{ 
                color: 'var(--primary)', 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                letterSpacing: '0.05em',
                margin: 0
            }}>PANEL CREATION DASHBOARD</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Analytics & Integrity Platform</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
            <button 
                className="premium-button"
                onClick={() => setIsShareModalOpen(true)}
                style={{ 
                    padding: '0.8rem 1.5rem', 
                    fontSize: '0.75rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '8px' }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                SHARE REPORT
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>SYSTEM STATUS</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold', margin: 0 }}>LIVE / OPERATIONAL</p>
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: 'clamp(1rem, 5vw, 3rem)' }}>
        <PanelDashboard />
      </main>

      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', opacity: 0.5 }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CavinKare Intelligence Panel Analytics v2.5</p>
      </footer>

      <RecipientModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </div>
  );
}

export default App;
