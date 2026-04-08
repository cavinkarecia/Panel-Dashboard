import React from 'react';

const WorkflowTracker = ({ study, onUpdateStage }) => {
    const [stageNotes, setStageNotes] = React.useState('');

    const getStatusClass = (status) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'in-progress': return 'status-in-progress';
            default: return 'status-not-started';
        }
    };

    const advanceStage = (stageId) => {
        const updatedStages = study.stages.map(s => {
            if (s.id === stageId) return {
                ...s,
                status: 'completed',
                date: new Date().toISOString().split('T')[0],
                details: stageNotes
            };
            if (s.id === stageId + 1) return { ...s, status: 'in-progress' };
            return s;
        });

        let completionTime = study.completionTime;
        if (stageId === 5) {
            const start = new Date(study.initiatedDate);
            const end = new Date();
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            completionTime = `${diff} days`;
        }

        onUpdateStage({ ...study, currentStage: stageId === 5 ? 5 : stageId + 1, stages: updatedStages, completionTime });
        setStageNotes('');
    };

    // Group stages by phase
    const phases = study.stages.reduce((acc, stage) => {
        if (!acc[stage.phase]) acc[stage.phase] = [];
        acc[stage.phase].push(stage);
        return acc;
    }, {});

    return (
        <div className="fade-in" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{study.studyName}</h2>
                <div className="glass-card" style={{ padding: '0.4rem 1rem', border: '1px solid var(--primary)' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Progress: {study.currentStage} / 5 Steps</span>
                </div>
            </div>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className="glass-card" style={{ padding: '8px 20px', fontSize: '0.9rem', color: '#1a1b26', background: 'var(--primary)', borderRadius: '30px', boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)', fontWeight: '900', textTransform: 'uppercase' }}>
                    {study.studyTypeDisplay}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                    SAMPLE SIZE: <span style={{ color: 'var(--primary)' }}>{study.sampleSize}</span>
                </span>
            </div>

            {Object.entries(phases).map(([phaseName, stages]) => (
                <div key={phaseName} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        color: 'var(--text)',
                        marginBottom: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontWeight: '800'
                    }}>
                        <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        {phaseName}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {stages.map((stage) => (
                            <div
                                key={stage.id}
                                className="glass-card"
                                style={{
                                    padding: '1.5rem',
                                    borderLeft: `4px solid ${stage.status === 'completed' ? 'var(--success)' : stage.status === 'in-progress' ? 'var(--warning)' : 'var(--glass-border)'}`,
                                    opacity: stage.status === 'not-started' ? 0.6 : 1,
                                    position: 'relative',
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`status-dot ${getStatusClass(stage.status)}`} style={{ boxShadow: `0 0 10px ${stage.status === 'completed' ? 'var(--success)' : stage.status === 'in-progress' ? 'var(--warning)' : 'rgba(255,255,255,0.1)'}` }}></span>
                                        <h4 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '800', color: stage.status === 'not-started' ? 'var(--text-muted)' : '#ffffff' }}>{stage.name}</h4>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--primary)', background: 'rgba(251, 191, 36, 0.05)', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                        #{stage.id}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                                        <strong>Responsible:</strong> {stage.responsible}
                                    </p>
                                    <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
                                        <div style={{ fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{stage.expectedDate}</span>
                                        </div>
                                        {stage.date && (
                                            <div style={{ fontSize: '0.75rem' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Actual: </span>
                                                <span style={{ color: 'var(--success)', fontWeight: '600' }}>{stage.date}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {stage.subtasks && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>Tasks:</p>
                                        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.75rem' }}>
                                            {stage.subtasks.map((task, idx) => (
                                                <li key={idx} style={{ marginBottom: '2px' }}>{task}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {stage.gate && (
                                    <div style={{
                                        padding: '0.8rem',
                                        background: stage.status === 'completed' ? 'rgba(52, 211, 153, 0.05)' : 'rgba(192, 38, 211, 0.05)',
                                        borderRadius: '12px',
                                        border: `1px dashed ${stage.status === 'completed' ? 'var(--success)' : 'var(--accent)'}`,
                                        marginBottom: '1rem'
                                    }}>
                                        <p style={{ fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: stage.status === 'completed' ? 'var(--success)' : 'var(--accent)' }}>
                                            <span style={{ fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gate</span>
                                            <span style={{ opacity: 0.3 }}>|</span>
                                            {stage.gate}
                                            {stage.status === 'completed' && ' ✅'}
                                        </p>
                                    </div>
                                )}

                                {stage.rules && (
                                    <p style={{ fontSize: '0.7rem', color: 'var(--warning)', fontStyle: 'italic', background: 'rgba(245, 158, 11, 0.05)', padding: '6px', borderRadius: '4px' }}>
                                        ⚠️ {stage.rules}
                                    </p>
                                )}

                                {stage.status === 'in-progress' && (
                                    <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <textarea
                                            value={stageNotes}
                                            onChange={(e) => setStageNotes(e.target.value)}
                                            placeholder="Add final comments or confirmation details..."
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                marginBottom: '1rem',
                                                background: 'rgba(15, 23, 42, 0.4)',
                                                border: '1px solid rgba(251, 191, 36, 0.1)',
                                                borderRadius: '10px',
                                                padding: '12px',
                                                fontSize: '0.9rem',
                                                color: '#ffffff'
                                            }}
                                        />
                                        <button
                                            className="premium-button"
                                            style={{ width: '100%', padding: '0.9rem' }}
                                            onClick={() => advanceStage(stage.id)}
                                        >
                                            Complete Step & Pass Gate
                                        </button>
                                    </div>
                                )}

                                {stage.details && (
                                    <div style={{ fontSize: '0.8rem', marginTop: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ margin: 0, color: 'var(--text-muted)' }}><span style={{ fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>Completion Note: </span>{stage.details}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WorkflowTracker;
