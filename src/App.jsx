import React, { useState, useEffect } from 'react';
import StudyInitiationForm from './components/StudyInitiationForm';
import WorkflowTracker from './components/WorkflowTracker';
import LagDashboard from './components/LagDashboard';
import SalesAuditDashboard from './components/SalesAuditDashboard';

function App() {
  const [studies, setStudies] = useState([]);
  const [activeStudyId, setActiveStudyId] = useState(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [currentView, setCurrentView] = useState('workflow'); // 'workflow' or 'audit'
  
  // Persistence
  useEffect(() => {
    const savedStudies = localStorage.getItem('mr_studies');
    if (savedStudies) {
        const parsed = JSON.parse(savedStudies);
        setStudies(parsed);
        if (parsed.length > 0) setActiveStudyId(parsed[0].id);
        else setIsInitiating(true);
    } else {
        setIsInitiating(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mr_studies', JSON.stringify(studies));
  }, [studies]);

  const activeStudy = studies.find(s => s.id === activeStudyId);

  const handleStudyCreated = (newStudy) => {
    setStudies([newStudy, ...studies]);
    setActiveStudyId(newStudy.id);
    setIsInitiating(false);
    setCurrentView('workflow');
  };

  const handleUpdateStudy = (updatedStudy) => {
    setStudies(studies.map(s => s.id === updatedStudy.id ? updatedStudy : s));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      
      {/* Refocused Premium Sidebar */}
      <nav style={{ 
          width: '300px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(251, 191, 36, 0.1)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          position: 'fixed',
          height: '100vh',
          zIndex: 1000,
          boxShadow: '20px 0 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ 
                color: 'var(--primary)', 
                fontSize: '1.4rem', 
                fontWeight: '900', 
                letterSpacing: '0.05em',
                margin: 0
            }}>ANALYTICS HUB</h2>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>CavinKare Intelligence</p>
        </div>

        {/* Global View Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
                onClick={() => setCurrentView('workflow')}
                style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid ' + (currentView === 'workflow' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                    background: currentView === 'workflow' ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                    color: currentView === 'workflow' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}
            >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentView === 'workflow' ? 'var(--primary)' : 'rgba(255,255,255,0.2)' }}></div>
                MR WORKFLOW
            </button>
            <button 
                onClick={() => setCurrentView('audit')}
                style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid ' + (currentView === 'audit' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                    background: currentView === 'audit' ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                    color: currentView === 'audit' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}
            >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentView === 'audit' ? 'var(--primary)' : 'rgba(255,255,255,0.2)' }}></div>
                SALES AUDIT
            </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1rem 0' }}></div>

        {currentView === 'workflow' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                <button 
                    className="premium-button"
                    onClick={() => setIsInitiating(true)}
                    style={{ 
                        width: '100%', 
                        padding: '1.2rem', 
                        background: isInitiating ? 'var(--primary)' : 'rgba(251, 191, 36, 0.05)',
                        color: isInitiating ? '#000' : 'var(--primary)',
                        border: '1px solid var(--primary)',
                        fontSize: '0.9rem'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    INITIATE STUDY
                </button>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Pipelines</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                        {studies.length > 0 ? studies.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => {
                                    setActiveStudyId(s.id);
                                    setIsInitiating(false);
                                }}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '14px',
                                    border: `1px solid ${activeStudyId === s.id && !isInitiating ? 'var(--primary)' : 'rgba(255,255,255,0.03)'}`,
                                    background: activeStudyId === s.id && !isInitiating ? 'rgba(251, 191, 36, 0.05)' : 'rgba(255,255,255,0.02)',
                                    color: activeStudyId === s.id && !isInitiating ? '#fff' : 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                            >
                                <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studyName}</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Step {s.currentStage} / {s.stages.length}</span>
                            </button>
                        )) : (
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>No active studies.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        {currentView === 'audit' && (
            <div className="fade-in" style={{ flex: 1 }}>
                <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.5rem' }}>ACTIVE MODULE</p>
                    <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '400', lineHeight: '1.4' }}>Productivity tracking for the Sales Audit team.</p>
                </div>
            </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5 }}>CavinKare Intelligence v2.0</p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, marginLeft: '300px', padding: 'clamp(1.5rem, 5vw, 4rem)', position: 'relative' }}>
        
        {currentView === 'workflow' ? (
            <>
                <header style={{ marginBottom: '3rem' }}>
                    <h1 style={{ 
                        fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
                        background: 'linear-gradient(to right, #fff, #94a3b8)', 
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent', 
                        fontWeight: '900', 
                        letterSpacing: '-0.03em',
                        lineHeight: 1
                    }}>
                        {isInitiating ? 'Initiate New Journey' : activeStudy?.studyName || 'MR Study Flow Master'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem', marginTop: '1rem' }}>
                        {isInitiating ? 'Deploying a new research pipeline' : `On-Track Workflow Management Dashboard`}
                    </p>
                </header>

                {isInitiating ? (
                    <div className="fade-in" style={{ maxWidth: '800px' }}>
                        <StudyInitiationForm onStudyCreated={handleStudyCreated} />
                    </div>
                ) : activeStudy ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem', alignItems: 'start' }}>
                        <div className="fade-in">
                            <WorkflowTracker study={activeStudy} onUpdateStage={handleUpdateStudy} />
                        </div>
                        <div style={{ position: 'sticky', top: '2rem' }}>
                            <LagDashboard study={activeStudy} />
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '10rem 0', textAlign: 'center' }}>
                        <h2 style={{ color: 'var(--text-muted)', fontWeight: '300' }}>Access an active pipeline or initiate a new study.</h2>
                    </div>
                )}
            </>
        ) : (
            <SalesAuditDashboard />
        )}
      </main>
    </div>
  );
}

export default App;
