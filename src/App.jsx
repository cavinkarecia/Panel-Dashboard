import React, { useState, useEffect } from 'react';
import PanelDashboard from './components/PanelDashboard';

function App() {
  const [reportSummary, setReportSummary] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle'); // idle, sending, success
  const [cronUsers, setCronUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (isShareModalOpen) {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setCronUsers(data || []);
            })
            .catch(err => console.error("Backend Error:", err));
    }
  }, [isShareModalOpen]);

  return (
    <div style={{ padding: 'clamp(1rem, 5vw, 2rem)', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* Global Page Share Option (Floating Button) */}
      <button 
          className="premium-button" 
          onClick={() => {
              setShareStatus('idle');
              setIsShareModalOpen(true);
          }}
          style={{ 
              position: 'fixed',
              top: 'clamp(1rem, 5vw, 2.5rem)',
              right: 'clamp(1rem, 5vw, 2.5rem)',
              zIndex: 1000,
              padding: '0.75rem 1.5rem', 
              fontSize: '0.8rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 40px rgba(251, 191, 36, 0.25)',
              animation: 'slideInRight 0.5s ease-out'
          }}
      >
          <span>EMAIL RECIPIENTS</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
      </button>

      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
            fontSize: 'clamp(2rem, 8vw, 3.5rem)', 
            background: 'linear-gradient(to right, var(--primary), var(--secondary))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            fontWeight: '900', 
            letterSpacing: '-0.02em',
            lineHeight: 1.1
        }}>
          Panel Creation Dashboard
        </h1>
        <p style={{ 
            color: 'var(--text-muted)', 
            fontWeight: '600', 
            textTransform: 'uppercase', 
            letterSpacing: '0.15em', 
            fontSize: 'clamp(0.6rem, 2vw, 0.8rem)',
            marginTop: '0.5rem'
        }}>
          Visual Analytics & Integrity Platform
        </p>
      </header>

      <PanelDashboard onDataUpdate={setReportSummary} />

      {/* Real Share Report Auto-Cron Schedule Modal (Global Overlay) */}
      {isShareModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(20px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div className="glass-card fade-in" style={{ width: 'min(500px, 95vw)', background: 'rgba(6, 78, 59, 0.95)', border: '1px solid #fbbf24', padding: 'clamp(1.5rem, 5vw, 2.5rem)', textAlign: 'left', boxShadow: '0 0 80px rgba(16, 185, 129, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(251, 191, 36, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>Recipient List</h3>
                    </div>
                </div>
                
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '2rem' }}>Configure active users for the automated daily performance summary.</p>

                {/* Recipient List */}
                <h4 style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipients</h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                        type="email" 
                        placeholder="Enter email address..." 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.85rem' }} 
                    />
                    <button 
                        onClick={async () => {
                            if (!newEmail) return;
                            try {
                                const res = await fetch("/api/add-user", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email: newEmail })
                                });
                                const data = await res.json();
                                setCronUsers(data.users);
                                setNewEmail('');
                            } catch(e) {
                                console.error("Error adding user:", e);
                            }
                        }}
                        style={{ padding: '0.5rem 1.25rem', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                    >
                        ADD
                    </button>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                    {cronUsers.map(user => (
                        <div key={user.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <input 
                                type="checkbox" 
                                checked={user.active}
                                onChange={(e) => {
                                    const active = e.target.checked;
                                    setCronUsers(cronUsers.map(u => u.email === user.email ? {...u, active} : u));
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#fbbf24' }} 
                            />
                            <span style={{ flex: 1, color: user.active ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: '0.9rem', fontWeight: user.active ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email}
                            </span>
                            
                            <button 
                                onClick={async () => {
                                    if(!window.confirm(`Permanently remove ${user.email}?`)) return;
                                    try {
                                        const res = await fetch("/api/delete-user", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ email: user.email })
                                        });
                                        const data = await res.json();
                                        setCronUsers(data.users);
                                    } catch(e) {
                                        console.error("Delete Error:", e);
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6, display: 'flex' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button 
                            type="button"
                            onClick={async () => {
                                 const selectedEmails = cronUsers.filter(u => u.active).map(u => u.email);
                                 await fetch("/api/select-users", {
                                     method: "POST",
                                     headers: { "Content-Type": "application/json" },
                                     body: JSON.stringify({ selectedEmails })
                                 });
                                 alert("Settings saved!");
                                 setIsShareModalOpen(false);
                            }}
                            style={{ padding: '0.75rem', background: 'var(--primary)', color: '#0f172a', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '900', fontSize: '0.8rem' }}>
                            SAVE
                        </button>
                        
                        <button 
                            type="button"
                            onClick={async () => {
                                 setShareStatus('sending');
                                 try {
                                     const selectedEmails = cronUsers.filter(u => u.active).map(u => u.email);
                                     await fetch("/api/select-users", {
                                         method: "POST",
                                         headers: { "Content-Type": "application/json" },
                                         body: JSON.stringify({ selectedEmails })
                                     });
                                     await fetch("/api/trigger", { method: "POST" });
                                     alert("Manual Report Sent!");
                                 } catch(e) {
                                     alert("Error: " + e.message);     
                                 }
                                 setShareStatus('idle');
                            }}
                            style={{ padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '900', fontSize: '0.8rem' }}>
                            {shareStatus === 'sending' ? 'WAIT...' : 'SEND NOW'}
                        </button>
                    </div>

                    <button type="button" onClick={() => setIsShareModalOpen(false)} style={{ padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>CLOSE</button>
                </div>

            </div>
        </div>
      )}
    </div>
  );
}

export default App;
