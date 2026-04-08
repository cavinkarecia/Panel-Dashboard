import React from 'react';

const LagDashboard = ({ study }) => {
    const calculateTotalDuration = () => {
        if (!study.initiatedDate || !study.expectedCompletionDate) return 'N/A';
        const start = new Date(study.initiatedDate);
        const end = new Date(study.expectedCompletionDate);
        const diff = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
        return `${diff} days`;
    };

    const getLagStatus = (stageId) => {
        const stage = study.stages.find(s => s.id === stageId);
        if (stage.status === 'in-progress' || stage.status === 'not-started') {
            const start = new Date(study.initiatedDate);
            const now = new Date();
            const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            // Assuming 10 days threshold for the more detailed steps
            if (diff > 10) return { text: `Lag: ${diff - 10} days over SOP`, type: 'error' };
        }
        return { text: 'On Track', type: 'success' };
    };

    const activeStage = study.stages.find(s => s.status === 'in-progress');

    return (
        <div className="glass-card fade-in" style={{ background: 'rgba(36, 40, 59, 0.4)', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1rem' }}>Process Metrics & Premium Lag Detection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{
                    padding: '1.8rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    borderRadius: '20px',
                    border: '1px solid rgba(251, 191, 36, 0.15)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Total Cycle Time</p>
                    <h2 style={{ color: 'var(--primary)', fontSize: '2.8rem', fontWeight: '900', margin: 0, textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>{calculateTotalDuration()}</h2>
                </div>

                <div style={{
                    padding: '1.8rem',
                    textAlign: 'center',
                    background: getLagStatus(study.currentStage).type === 'error' ? 'rgba(248, 113, 113, 0.05)' : 'rgba(52, 211, 153, 0.05)',
                    borderRadius: '20px',
                    border: `1px solid ${getLagStatus(study.currentStage).type === 'error' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>System Health</p>
                    <h4 style={{ color: getLagStatus(study.currentStage).type === 'error' ? 'var(--error)' : 'var(--success)', fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>
                        {getLagStatus(study.currentStage).text}
                    </h4>
                </div>

                <div style={{
                    padding: '1.8rem',
                    textAlign: 'center',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: '20px',
                    border: '1px solid rgba(192, 38, 211, 0.2)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <p style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Active Stage Bottleneck</p>
                    {activeStage ? (
                        <>
                            <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '900', margin: '0 0 5px 0' }}>{activeStage.name}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600', margin: 0 }}>
                                RESPONSIBLE: <span style={{ color: 'var(--primary)' }}>{activeStage.responsible}</span>
                            </p>
                        </>
                    ) : (
                        <h4 style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>All Stages Ready</h4>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '2.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workflow Timeline (SOP Execution):</p>
                <div style={{ display: 'flex', gap: '8px', height: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '30px', overflow: 'hidden', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {study.stages.map(s => (
                        <div
                            key={s.id}
                            style={{
                                flex: 1,
                                borderRadius: '10px',
                                backgroundColor: s.status === 'completed' ? 'var(--success)' : s.status === 'in-progress' ? 'var(--warning)' : 'rgba(255,255,255,0.05)',
                                boxShadow: s.status !== 'not-started' ? `0 0 10px ${s.status === 'completed' ? 'var(--success)' : 'var(--warning)'}` : 'none',
                                opacity: s.status === 'not-started' ? 0.3 : 1
                            }}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LagDashboard;
