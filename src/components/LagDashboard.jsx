import React from 'react';

const LagDashboard = ({ study }) => {
    const calculateTotalDuration = () => {
        if (!study.initiatedDate || !study.expectedCompletionDate) return 'N/A';
        const start = new Date(study.initiatedDate);
        const end = new Date(study.expectedCompletionDate);
        const diff = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
        return `${diff} days`;
    };

    const getDelayStats = () => {
        const delayedStages = study.stages.filter(s => s.delayDetails);
        const responsibilityMap = {};
        const nextSteps = [];

        delayedStages.forEach(s => {
            const resp = s.delayDetails.responsible;
            responsibilityMap[resp] = (responsibilityMap[resp] || 0) + 1;
            if (s.delayDetails.nextStep) {
                nextSteps.push({ stage: s.name, step: s.delayDetails.nextStep });
            }
        });

        return {
            count: delayedStages.length,
            responsibilities: responsibilityMap,
            nextSteps
        };
    };

    const delayStats = getDelayStats();
    const activeStage = study.stages.find(s => s.status === 'in-progress');

    return (
        <div className="glass-card fade-in" style={{ background: 'rgba(36, 40, 59, 0.4)', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: '900', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1rem' }}>Study Lead/Lag Performance Dashboard</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Current Phase</p>
                    <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '900', margin: 0 }}>{activeStage?.phase || 'Completed'}</h2>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Total Delay Incidents</p>
                    <h2 style={{ color: delayStats.count > 0 ? '#f43f5e' : 'var(--success)', fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{delayStats.count}</h2>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Est. Total Duration</p>
                    <h2 style={{ color: 'var(--primary)', fontSize: '2.5rem', fontWeight: '900', margin: 0 }}>{calculateTotalDuration()}</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Responsibility Breakdown */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.3)' }}>
                    <h4 style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '900', marginBottom: '1rem', textTransform: 'uppercase' }}>Delay Responsibility</h4>
                    {Object.keys(delayStats.responsibilities).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.entries(delayStats.responsibilities).map(([resp, count]) => (
                                <div key={resp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#f1f5f9' }}>{resp}</span>
                                    <span style={{ background: '#f43f5e', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{count} Delayed</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontStyle: 'italic' }}>No delay accountability recorded yet.</p>
                    )}
                </div>

                {/* Next Steps to Avoid Lag */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.3)' }}>
                    <h4 style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '900', marginBottom: '1rem', textTransform: 'uppercase' }}>Recovery & Avoidance Steps</h4>
                    {delayStats.nextSteps.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {delayStats.nextSteps.map((item, idx) => (
                                <div key={idx} style={{ padding: '8px', background: 'rgba(192, 38, 211, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold', margin: '0 0 4px 0' }}>{item.stage}</p>
                                    <p style={{ fontSize: '0.8rem', color: '#f1f5f9', margin: 0 }}>Next: {item.step}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontStyle: 'italic' }}>No recovery steps pending.</p>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Workflow Integrity Progress:</p>
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
