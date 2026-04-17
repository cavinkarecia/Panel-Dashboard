import React from 'react';

const WorkflowTracker = ({ study, onUpdateStage }) => {
    // Per-stage local UI state (notes, delay forms)
    const [stageNotes, setStageNotes] = React.useState({});
    const [delayInfo, setDelayInfo] = React.useState({});

    const getNote = (id) => stageNotes[id] || '';
    const setNote = (id, val) => setStageNotes(prev => ({ ...prev, [id]: val }));
    const getDelay = (id) => delayInfo[id] || { responsible: '', reason: '', avoidance: '', nextStep: '' };
    const setDelay = (id, val) => setDelayInfo(prev => ({ ...prev, [id]: val }));

    const checkIsDelayed = (expectedDate) => {
        if (!expectedDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today > new Date(expectedDate);
    };

    /* ──────────────────────────────────────────────────────────────
       Update stage data mid-stage (for iterative/partial updates)
       ────────────────────────────────────────────────────────────── */
    const updateStageData = (stageId, updates) => {
        const updatedStages = study.stages.map(s =>
            s.id === stageId ? { ...s, ...updates } : s
        );
        onUpdateStage({ ...study, stages: updatedStages });
    };

    /* ──────────────────────────────────────────────────────────────
       Complete a stage and advance to the next
       ────────────────────────────────────────────────────────────── */
    const advanceStage = (stageId, outcome = 'accepted') => {
        const stage = study.stages.find(s => s.id === stageId);
        const isDelayed = checkIsDelayed(stage.expectedDate);
        const note = getNote(stageId);
        const dInfo = getDelay(stageId);

        const completedStage = {
            ...stage,
            status: 'completed',
            date: new Date().toISOString().split('T')[0],
            details: note + (outcome === 'objected' ? ' [BRAND OBJECTED: Escalated to Shobha Venugopal]' : ''),
            delayDetails: isDelayed ? { ...dInfo } : null
        };

        let updatedStages = study.stages.map(s =>
            s.id === stageId ? completedStage : s
        );

        // Advancement logic: parallel vs linear
        if (stage.parallel && stage.parallelGroup) {
            const siblings = updatedStages.filter(s => s.parallelGroup === stage.parallelGroup);
            const allComplete = siblings.every(s => s.status === 'completed');
            if (allComplete) {
                const maxId = Math.max(...siblings.map(s => s.id));
                updatedStages = updatedStages.map(s =>
                    s.id === maxId + 1 ? { ...s, status: 'in-progress' } : s
                );
            }
        } else {
            updatedStages = updatedStages.map(s =>
                s.id === stageId + 1 ? { ...s, status: 'in-progress' } : s
            );
        }

        // Determine currentStage
        const nextInProgress = updatedStages.find(s => s.status === 'in-progress');
        const newCurrentStage = nextInProgress ? nextInProgress.id : study.stages.length;

        // Study-level completion time
        let completionTime = study.completionTime;
        if (updatedStages.every(s => s.status === 'completed')) {
            const diff = Math.floor((new Date() - new Date(study.initiatedDate)) / (1000 * 60 * 60 * 24));
            completionTime = `${diff} days`;
        }

        onUpdateStage({
            ...study,
            currentStage: newCurrentStage,
            stages: updatedStages,
            completionTime,
            isObjected: study.isObjected || outcome === 'objected'
        });

        setNote(stageId, '');
        setDelay(stageId, { responsible: '', reason: '', avoidance: '', nextStep: '' });
    };

    const getStatusClass = (status) => {
        if (status === 'completed') return 'status-completed';
        if (status === 'in-progress') return 'status-in-progress';
        return 'status-not-started';
    };

    /* ──────────────────────────────────────────────────────────────
       Delay Accountability Form
       ────────────────────────────────────────────────────────────── */
    const renderDelayForm = (stage) => {
        if (!checkIsDelayed(stage.expectedDate) || stage.status === 'completed') return null;
        const dInfo = getDelay(stage.id);
        const inputStyle = { width: '100%', marginBottom: '0.5rem', background: '#0f172a', color: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #334155', boxSizing: 'border-box' };
        return (
            <div style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.2)', marginBottom: '1.2rem' }}>
                <p style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase' }}>⚠️ Delay Accountability Form</p>
                <select value={dInfo.responsible} onChange={(e) => setDelay(stage.id, { ...dInfo, responsible: e.target.value })} style={inputStyle}>
                    <option value="">Who is responsible?</option>
                    <option value="Brand Team">Brand Team</option>
                    <option value="MR Team">MR Team</option>
                    <option value="PE Team">PE Team</option>
                    <option value="Analytics Team">Analytics Team</option>
                    <option value="External Agency">External Agency</option>
                    <option value="Field Vendor">Field Vendor</option>
                </select>
                <input type="text" placeholder="Why did the delay happen?" value={dInfo.reason} onChange={(e) => setDelay(stage.id, { ...dInfo, reason: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="How to avoid in future?" value={dInfo.avoidance} onChange={(e) => setDelay(stage.id, { ...dInfo, avoidance: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="Next step to recover?" value={dInfo.nextStep} onChange={(e) => setDelay(stage.id, { ...dInfo, nextStep: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       SPECIAL: Multi-Reviewer Questionnaire Check (Stage 9)
       ────────────────────────────────────────────────────────────── */
    const renderMultiReview = (stage) => {
        const reviewers = stage.reviewers || [];
        const allApproved = reviewers.every(r => r.status === 'approved');
        return (
            <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🔍 Simultaneous Review — All reviewers must approve
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${reviewers.length}, 1fr)`, gap: '10px', marginBottom: '1.2rem' }}>
                    {reviewers.map((reviewer, idx) => (
                        <div key={idx} style={{
                            padding: '1rem',
                            background: reviewer.status === 'approved' ? 'rgba(52, 211, 153, 0.07)' : 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: `1px solid ${reviewer.status === 'approved' ? 'var(--success)' : 'rgba(255,255,255,0.1)'}`,
                            opacity: reviewer.status === 'approved' ? 0.75 : 1,
                            transition: 'all 0.2s'
                        }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '800', margin: '0 0 2px 0', color: reviewer.status === 'approved' ? 'var(--success)' : '#fff' }}>
                                {reviewer.status === 'approved' ? '✓ ' : ''}{reviewer.name}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>{reviewer.team}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Iterations</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: reviewer.iterations > 0 ? '#fbbf24' : 'var(--text-muted)' }}>{reviewer.iterations}</span>
                            </div>
                            {reviewer.status !== 'approved' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button
                                        onClick={() => {
                                            const updated = reviewers.map((r, i) => i === idx ? { ...r, iterations: r.iterations + 1 } : r);
                                            updateStageData(stage.id, { reviewers: updated });
                                        }}
                                        style={{ padding: '5px 8px', fontSize: '0.72rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', color: '#fbbf24', cursor: 'pointer', fontWeight: '700' }}>
                                        +1 Iteration
                                    </button>
                                    <button
                                        onClick={() => {
                                            const updated = reviewers.map((r, i) => i === idx ? { ...r, status: 'approved' } : r);
                                            updateStageData(stage.id, { reviewers: updated });
                                        }}
                                        style={{ padding: '5px 8px', fontSize: '0.72rem', background: 'rgba(52,211,153,0.08)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', cursor: 'pointer', fontWeight: '700' }}>
                                        ✓ Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    className="premium-button"
                    style={{ width: '100%', padding: '0.9rem', opacity: allApproved ? 1 : 0.4, cursor: allApproved ? 'pointer' : 'not-allowed' }}
                    onClick={() => allApproved && advanceStage(stage.id)}
                    disabled={!allApproved}
                >
                    {allApproved ? '✓ All Reviewers Approved — Complete Stage' : 'Waiting for all reviewers to approve…'}
                </button>
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       SPECIAL: Brand Final Questionnaire Approval (Stage 10)
       ────────────────────────────────────────────────────────────── */
    const renderBrandApproval = (stage, note) => {
        const changeCount = stage.changeCount || 0;
        const needsShobha = changeCount >= 5;
        return (
            <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Change counter row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: needsShobha ? 'rgba(244,63,94,0.07)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${needsShobha ? 'rgba(244,63,94,0.35)' : 'rgba(255,255,255,0.08)'}`, marginBottom: '0.8rem' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Changes Requested by Brand</p>
                        <p style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: needsShobha ? '#f43f5e' : changeCount >= 3 ? '#fbbf24' : 'var(--success)' }}>{changeCount}</p>
                    </div>
                    <button
                        onClick={() => updateStageData(stage.id, { changeCount: changeCount + 1 })}
                        style={{ padding: '10px 18px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', color: '#f43f5e', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}>
                        + Request Change
                    </button>
                </div>

                {/* Shobha escalation warning */}
                {needsShobha && (
                    <div style={{ padding: '0.8rem 1rem', background: 'rgba(244,63,94,0.07)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', marginBottom: '0.8rem' }}>
                        <p style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: '800', margin: 0 }}>
                            ⛔ Shobha Venugopal approval required — changes exceed limit of 4. Lag attributed to Brand Team.
                        </p>
                    </div>
                )}

                {/* Remaining changes warning */}
                {changeCount > 0 && changeCount < 5 && (
                    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(251,191,36,0.05)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)', marginBottom: '0.8rem' }}>
                        <p style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '600', margin: 0 }}>
                            ⚠️ {4 - changeCount} change{4 - changeCount === 1 ? '' : 's'} remaining before Shobha approval is needed. Lag on Brand Team.
                        </p>
                    </div>
                )}

                <textarea
                    value={note}
                    onChange={(e) => setNote(stage.id, e.target.value)}
                    placeholder="Approval notes / email reference..."
                    style={{ width: '100%', minHeight: '60px', marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(251, 191, 36, 0.1)', borderRadius: '10px', padding: '12px', fontSize: '0.85rem', color: '#ffffff', boxSizing: 'border-box' }}
                />
                <button
                    className="premium-button"
                    style={{ width: '100%', padding: '0.9rem', background: 'var(--success)', border: 'none' }}
                    onClick={() => advanceStage(stage.id)}
                >
                    ✓ Final Approval — Questionnaire Sealed
                </button>
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       SPECIAL: Ezhil Scripting (Stage 11)
       ────────────────────────────────────────────────────────────── */
    const renderScripting = (stage) => {
        const ezhilNote = stage.ezhilNote || '';
        const hasNote = ezhilNote.trim().length > 0;
        return (
            <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#a78bfa', marginBottom: '0.6rem' }}>
                    📝 Ezhil's Note — Flag missing/unclear items from Word doc
                </p>
                <textarea
                    value={ezhilNote}
                    onChange={(e) => updateStageData(stage.id, { ezhilNote: e.target.value })}
                    placeholder="If any section in the Word doc is missing or unclear, note it here. Delay will be attributed to MR team."
                    style={{ width: '100%', minHeight: '80px', marginBottom: '0.8rem', background: 'rgba(15, 23, 42, 0.4)', border: `1px solid ${hasNote ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '12px', fontSize: '0.85rem', color: '#ffffff', boxSizing: 'border-box' }}
                />
                {hasNote && (
                    <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(251,191,36,0.05)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.25)', marginBottom: '0.8rem' }}>
                        <p style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '700', margin: 0 }}>
                            ⚠️ Delay attributed to MR Team — Word doc was incomplete or unclear.
                        </p>
                    </div>
                )}
                <button
                    className="premium-button"
                    style={{ width: '100%', padding: '0.9rem' }}
                    onClick={() => advanceStage(stage.id)}
                >
                    ✓ Scripted &amp; Test Link Shared with Raunaq's Team
                </button>
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       Standard Stage Action Panel
       ────────────────────────────────────────────────────────────── */
    const renderStandardActions = (stage) => {
        const isDelayed = checkIsDelayed(stage.expectedDate);
        const dInfo = getDelay(stage.id);
        const note = getNote(stage.id);
        const isDelayBlocking = isDelayed && (!dInfo.responsible || !dInfo.reason);

        return (
            <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {renderDelayForm(stage)}
                <textarea
                    value={note}
                    onChange={(e) => setNote(stage.id, e.target.value)}
                    placeholder="Add comments or handover notes..."
                    style={{ width: '100%', minHeight: '60px', marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(251, 191, 36, 0.1)', borderRadius: '10px', padding: '12px', fontSize: '0.85rem', color: '#ffffff', boxSizing: 'border-box' }}
                />
                {/* Stage 4 — CIA + Brand Approval has a two-path button */}
                {stage.id === 4 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button className="premium-button" style={{ padding: '0.8rem', background: 'var(--success)', border: 'none' }} onClick={() => advanceStage(stage.id, 'accepted')}>✓ All Approved</button>
                        <button className="premium-button" style={{ padding: '0.8rem', background: '#f43f5e', border: 'none' }} onClick={() => advanceStage(stage.id, 'objected')}>✗ Object / Escalate</button>
                    </div>
                ) : (
                    <button
                        className="premium-button"
                        style={{ width: '100%', padding: '0.9rem', opacity: isDelayBlocking ? 0.4 : 1, cursor: isDelayBlocking ? 'not-allowed' : 'pointer' }}
                        onClick={() => !isDelayBlocking && advanceStage(stage.id)}
                        disabled={isDelayBlocking}
                    >
                        {isDelayBlocking ? 'Fill Delay Form to Continue' : 'Mark Complete'}
                    </button>
                )}
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       Single Stage Card
       ────────────────────────────────────────────────────────────── */
    const renderStageCard = (stage, isParallel = false) => {
        const isCompleted = stage.status === 'completed';
        const isInProgress = stage.status === 'in-progress';
        const isDelayed = checkIsDelayed(stage.expectedDate) && !isCompleted;
        const note = getNote(stage.id);

        const borderColor = isCompleted ? 'var(--success)' : isInProgress ? 'var(--warning)' : 'var(--glass-border)';

        return (
            <div
                key={stage.id}
                className="glass-card"
                style={{
                    padding: '1.5rem',
                    borderLeft: `4px solid ${borderColor}`,
                    opacity: stage.status === 'not-started' ? 0.6 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isDelayed ? '0 0 20px rgba(244, 63, 94, 0.18)' : 'none',
                    ...(isParallel ? { background: 'rgba(88, 130, 255, 0.025)', border: `1px solid rgba(88, 130, 255, 0.12)`, borderLeft: `4px solid ${borderColor}` } : {})
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`status-dot ${getStatusClass(stage.status)}`} style={{ boxShadow: `0 0 10px ${isCompleted ? 'var(--success)' : isInProgress ? 'var(--warning)' : 'rgba(255,255,255,0.1)'}` }} />
                        <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: '800', color: stage.status === 'not-started' ? 'var(--text-muted)' : '#ffffff' }}>{stage.name}</h4>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: '900', color: 'var(--primary)', background: 'rgba(251, 191, 36, 0.05)', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.2)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px' }}>
                        #{stage.id}
                    </span>
                </div>

                {/* Responsible */}
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    <strong>Responsible:</strong> {stage.responsible}
                </p>

                {/* Dates */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.72rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                        <span style={{ color: isDelayed ? '#f43f5e' : 'var(--primary)', fontWeight: '600' }}>
                            {stage.expectedDate}{isDelayed ? ' ⚠️' : ''}
                        </span>
                    </div>
                    {stage.date && (
                        <div style={{ fontSize: '0.72rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Actual: </span>
                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>{stage.date}</span>
                        </div>
                    )}
                </div>

                {/* Subtasks */}
                {stage.subtasks && (
                    <ul style={{ paddingLeft: '1.1rem', margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                        {stage.subtasks.map((task, idx) => <li key={idx} style={{ marginBottom: '3px' }}>{task}</li>)}
                    </ul>
                )}

                {/* Gate */}
                {stage.gate && (
                    <div style={{ padding: '0.5rem 0.8rem', background: isCompleted ? 'rgba(52, 211, 153, 0.05)' : 'rgba(192, 38, 211, 0.05)', borderRadius: '8px', border: `1px dashed ${isCompleted ? 'var(--success)' : 'var(--accent)'}`, marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.72rem', margin: 0, color: isCompleted ? 'var(--success)' : 'var(--accent)', fontWeight: '700' }}>
                            GATE: {stage.gate}
                        </p>
                    </div>
                )}

                {/* Rules */}
                {stage.rules && (
                    <div style={{ padding: '0.5rem 0.8rem', background: 'rgba(251,191,36,0.04)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.15)', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', margin: 0, color: '#fbbf24', fontWeight: '600' }}>{stage.rules}</p>
                    </div>
                )}

                {/* In-progress action panel */}
                {isInProgress && (
                    stage.stageType === 'multi-review' ? renderMultiReview(stage) :
                    stage.stageType === 'brand-approval' ? renderBrandApproval(stage, note) :
                    stage.stageType === 'scripting' ? renderScripting(stage) :
                    renderStandardActions(stage)
                )}

                {/* Completed summary */}
                {(stage.details || stage.delayDetails) && (
                    <div style={{ fontSize: '0.75rem', marginTop: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {stage.details && <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.8)' }}><strong style={{ color: 'var(--primary)' }}>Notes:</strong> {stage.details}</p>}
                        {stage.delayDetails && (
                            <div style={{ color: '#f87171', borderTop: '1px solid rgba(244,63,94,0.1)', paddingTop: '8px', marginTop: '4px' }}>
                                <p style={{ margin: '0 0 3px 0' }}><strong>Delay Resp:</strong> {stage.delayDetails.responsible}</p>
                                <p style={{ margin: '0 0 3px 0' }}><strong>Reason:</strong> {stage.delayDetails.reason}</p>
                                <p style={{ margin: 0 }}><strong>Next Step:</strong> {stage.delayDetails.nextStep}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────
       Render a phase's stages, grouping parallel tracks together
       ────────────────────────────────────────────────────────────── */
    const renderPhaseStages = (stages) => {
        const rendered = [];
        const handled = new Set();

        for (const stage of stages) {
            if (handled.has(stage.id)) continue;

            if (stage.parallel && stage.parallelGroup) {
                const group = stages.filter(s => s.parallelGroup === stage.parallelGroup);
                group.forEach(s => handled.add(s.id));

                rendered.push(
                    <div key={`parallel-${stage.parallelGroup}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem', padding: '0.5rem 1rem', background: 'rgba(88, 130, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(88, 130, 255, 0.15)' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                ⚡ Parallel Tracks — Running Simultaneously
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem' }}>
                            {group.map(s => renderStageCard(s, true))}
                        </div>
                    </div>
                );
            } else {
                handled.add(stage.id);
                rendered.push(<div key={stage.id}>{renderStageCard(stage)}</div>);
            }
        }

        return rendered;
    };

    // Group stages by phase label
    const phases = study.stages.reduce((acc, stage) => {
        if (!acc[stage.phase]) acc[stage.phase] = [];
        acc[stage.phase].push(stage);
        return acc;
    }, {});

    /* ──────────────────────────────────────────────────────────────
       Main Render
       ────────────────────────────────────────────────────────────── */
    return (
        <div className="fade-in" style={{ marginTop: '2rem' }}>

            {/* Study Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{study.studyName}</h2>
                <div className="glass-card" style={{ padding: '0.4rem 1rem', border: '1px solid var(--primary)' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Step {study.currentStage} / {study.stages.length}</span>
                </div>
            </div>

            {/* Objection banner */}
            {study.isObjected && (
                <div className="glass-card" style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid #f43f5e', marginBottom: '1.5rem', padding: '1rem' }}>
                    <p style={{ color: '#f43f5e', fontWeight: 'bold', margin: 0 }}>
                        ⚠️ REJECTED BY BRAND: Resolved by Shobha Venugopal (Head of CIA)
                    </p>
                </div>
            )}

            {/* Study meta badges */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span className="glass-card" style={{ padding: '8px 20px', fontSize: '0.88rem', color: '#1a1b26', background: 'var(--primary)', borderRadius: '30px', boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)', fontWeight: '900', textTransform: 'uppercase' }}>
                    {study.studyTypeDisplay}
                </span>
                {study.methodology && (
                    <span style={{ padding: '6px 14px', fontSize: '0.82rem', color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '30px', fontWeight: '700' }}>
                        {study.methodology}
                    </span>
                )}
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Expected: <span style={{ color: 'var(--primary)' }}>{study.expectedCompletionDate}</span>
                </span>
                {study.completionTime && (
                    <span style={{ padding: '6px 14px', fontSize: '0.82rem', color: 'var(--success)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '30px', fontWeight: '700' }}>
                        ✓ Completed in {study.completionTime}
                    </span>
                )}
            </div>

            {/* Phases */}
            {Object.entries(phases).map(([phaseName, stages]) => (
                <div key={phaseName} style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800' }}>
                        <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px', flexShrink: 0 }} />
                        {phaseName}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {renderPhaseStages(stages)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WorkflowTracker;
