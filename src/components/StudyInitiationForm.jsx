import React, { useState } from 'react';

// 3×3 study category matrix
const MATRIX_COLS = ['Foundational', 'Developmental', 'Post Launched'];
const MATRIX_ROWS = ['Product', 'Brand', 'Creative'];

const teamOptions = {
    brand: [
        'Harinarayan P', 'Karthik K', 'Sharan Arun Sadanand',
        'Arjun Ranganath', 'Karthiban A', 'Premsagar Vurimi',
        'Apoorva Yadav', 'Deepan S', 'Heli Bhatt',
        'Aishwarya A', 'Shankar M', 'Soundaryaa TV'
    ],
    mr: ['Raunaq', 'Kandharp Karnataka', 'Anjani Swaraj', 'Chirag Behl', 'Rishab Jain', 'Mahalakshmi P'],
    pe: ['Saatvik Sridhar', 'Tanmay Bapat', 'John George'],
    analytics: ['Akhilesh NC', 'Kartik Dange', 'Sudharsan H', 'M Guhan', 'Rohan Adithya V']
};

const StudyInitiationForm = ({ onStudyCreated }) => {
    const [formData, setFormData] = useState({
        studyName: '',
        expectedCompletionDate: '',
        initiatedDate: new Date().toISOString().split('T')[0],
        brandPOCs: [],
        mrPOCs: [],
        pePOCs: [],
        analyticsPOCs: [],
        studyRow: 'Product',        // Product | Brand | Creative
        studyCol: 'Foundational',   // Foundational | Developmental | Post Launched
        methodology: 'Quantitative' // Quantitative | Qualitative
    });

    const studyTypeDisplay = `${formData.studyRow} — ${formData.studyCol}`;

    const handlePOCChange = (team, person) => {
        const current = formData[`${team}POCs`] || [];
        const updated = current.includes(person)
            ? current.filter(p => p !== person)
            : [...current, person];
        setFormData({ ...formData, [`${team}POCs`]: updated });
    };

    const calculateMilestoneDates = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDuration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        // 12 stages — P1: 4 (5%,8%,7%,5%), P2 parallel: 3 (same window ~18%), P3: 5 (12%,15%,12%,15%,3%)
        const weights = [0.05, 0.08, 0.07, 0.05, 0.18, 0.18, 0.18, 0.12, 0.15, 0.12, 0.15, 0.03];
        let cw = 0;
        return weights.map(w => {
            cw += w;
            const d = new Date(start);
            d.setDate(d.getDate() + Math.round(totalDuration * cw));
            return d.toISOString().split('T')[0];
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const m = calculateMilestoneDates(formData.initiatedDate, formData.expectedCompletionDate);
        const isQualitative = formData.methodology === 'Qualitative';

        // Reviewers for Phase 3 questionnaire check (simultaneous review)
        const qReviewers = [
            { name: 'Raunaq', team: 'MR', iterations: 0, status: 'pending' },
            { name: 'Akhilesh NC', team: 'Analytics', iterations: 0, status: 'pending' },
            ...(isQualitative ? [{ name: 'Saatvik Sridhar', team: 'PE', iterations: 0, status: 'pending' }] : [])
        ];

        const newStudy = {
            id: Date.now(),
            ...formData,
            studyTypeDisplay,
            methodology: formData.methodology,
            currentStage: 1,
            completionTime: null,
            stages: [
                // ── PHASE 2 — ALLOCATION & APPROVAL ──────────────────────────
                {
                    id: 1,
                    name: 'Study Allocation & POC Assignment',
                    phase: 'Phase 2 — Study Allocation & Vendor Briefing',
                    status: 'in-progress',
                    date: null,
                    expectedDate: m[0],
                    responsible: 'Raunaq, Akhilesh NC, Saatvik Sridhar',
                    subtasks: [
                        'Raunaq, Akhilesh NC and Saatvik decide study POC',
                        'Confirm who handles study from MR team'
                    ],
                    gate: 'MR POC confirmed',
                    delayDetails: null
                },
                {
                    id: 2,
                    name: 'Vendor Briefing — Centers, TG & Samples',
                    phase: 'Phase 2 — Study Allocation & Vendor Briefing',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[1],
                    responsible: 'MR POC (Raunaq\'s team)',
                    subtasks: [
                        'Fixed costing, methodology, timeline and quota',
                        'Brief vendor about center, samples and Target Group',
                        'Vendor shares estimate for costing, timeline, recruitment'
                    ],
                    gate: 'Vendor briefed and estimates received',
                    delayDetails: null
                },
                {
                    id: 3,
                    name: 'CIA Leads + Brand Approval — Costing & Timeline',
                    phase: 'Phase 2 — Study Allocation & Vendor Briefing',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[2],
                    responsible: 'Raunaq, Akhilesh, Saatvik → Brand Team',
                    subtasks: [
                        'Mutually decided by field team',
                        'CIA three leads approve costing/methodology',
                        'Brand team final approval',
                        'Timelines and costing locked'
                    ],
                    gate: 'All parties approved — Go-ahead given',
                    delayDetails: null
                },

                // ── PHASE 2 — PARALLEL EXECUTION ─────────────────────────────
                {
                    id: 4,
                    name: 'Field Team — Recruitment Go-Ahead',
                    phase: 'Phase 2 — Parallel Execution',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[3],
                    responsible: 'Field Team',
                    parallel: true,
                    parallelGroup: 'p2parallel',
                    subtasks: [
                        'Go-ahead given to field team',
                        'Start recruiting as per quota'
                    ],
                    gate: 'Recruitment started',
                    delayDetails: null
                },
                {
                    id: 5,
                    name: 'Brand Team — Materials Arrangement',
                    phase: 'Phase 2 — Parallel Execution',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[4],
                    responsible: 'Brand Team',
                    parallel: true,
                    parallelGroup: 'p2parallel',
                    subtasks: [
                        'Arrange ad/product/samples as per study type'
                    ],
                    gate: 'Materials confirmed',
                    delayDetails: null
                },
                {
                    id: 6,
                    name: 'MR Team — Questionnaire Creation',
                    phase: 'Phase 2 — Parallel Execution',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[5],
                    responsible: 'MR Team',
                    parallel: true,
                    parallelGroup: 'p2parallel',
                    subtasks: [
                        'Draft questionnaire workflow'
                    ],
                    gate: 'Draft ready for review',
                    delayDetails: null
                },

                // ── PHASE 3 — QUESTIONNAIRE & SCRIPTING ───────────────────────
                {
                    id: 7,
                    name: 'Vendor Profiles — Recruitment Approval',
                    phase: 'Phase 3 — Questionnaire & Scripting',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[6],
                    responsible: 'MR Team / Brand Team',
                    subtasks: [
                        'Vendor sends profiles post recruitment',
                        'MR Team Review',
                        'Brand Team Review & Approval'
                    ],
                    gate: 'Profiles approved',
                    delayDetails: null
                },
                {
                    id: 8,
                    name: 'Questionnaire Check — Simultaneous Review',
                    phase: 'Phase 3 — Questionnaire & Scripting',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[7],
                    responsible: `Raunaq + Akhilesh NC${isQualitative ? ' + Saatvik Sridhar' : ''}`,
                    subtasks: [
                        'Raunaq & team review (track iterations)',
                        'Akhilesh NC & team review (track iterations)',
                        ...(isQualitative ? ['Saatvik Sridhar (involved for Qualitative)'] : [])
                    ],
                    gate: 'All reviewers approved',
                    stageType: 'multi-review',
                    reviewers: qReviewers,
                    delayDetails: null
                },
                {
                    id: 9,
                    name: 'Brand Final Questionnaire Approval',
                    phase: 'Phase 3 — Questionnaire & Scripting',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[8],
                    responsible: 'Brand Team',
                    subtasks: [
                        'Final approval over email/portal',
                        'No further changes post seal',
                        'Upto 4 okay, >4 needs Shobha approval'
                    ],
                    rules: 'Brand team lag if >4 changes requested.',
                    stageType: 'brand-approval',
                    changeCount: 0,
                    gate: 'Questionnaire sealed',
                    delayDetails: null
                },
                {
                    id: 10,
                    name: 'Questionnaire Scripting — Ezhil',
                    phase: 'Phase 3 — Questionnaire & Scripting',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[9],
                    responsible: 'Ezhil',
                    subtasks: [
                        '1 day SLA for scripting',
                        'Check if scripted as per word doc',
                        'Flag missing word doc info in comment box'
                    ],
                    stageType: 'scripting',
                    ezhilNote: '',
                    rules: 'Delay goes to MR if word doc missing info.',
                    gate: 'Scripted & Test Link shared',
                    delayDetails: null
                },
                {
                    id: 11,
                    name: 'Link Testing & Sign-off',
                    phase: 'Phase 3 — Questionnaire & Scripting',
                    status: 'not-started',
                    date: null,
                    expectedDate: m[10],
                    responsible: 'Raunaq\'s Team',
                    subtasks: [
                        'MR team tests and signs off on test link'
                    ],
                    gate: 'Final Sign-off',
                    delayDetails: null
                }
            ]
        };
        onStudyCreated(newStudy);
    };

    const POCSelector = ({ team, title }) => (
        <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>{title} POCs</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {teamOptions[team].map(person => (
                    <button
                        key={person}
                        type="button"
                        onClick={() => handlePOCChange(team, person)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            border: `1px solid ${formData[`${team}POCs`].includes(person) ? 'var(--primary)' : 'rgba(251, 191, 36, 0.2)'}`,
                            backgroundColor: formData[`${team}POCs`].includes(person) ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
                            color: formData[`${team}POCs`].includes(person) ? '#1a1b26' : '#f8fafc',
                            transition: 'all 0.2s',
                            fontWeight: formData[`${team}POCs`].includes(person) ? '700' : '400',
                            boxShadow: formData[`${team}POCs`].includes(person) ? '0 0 15px rgba(251, 191, 36, 0.3)' : 'none'
                        }}
                    >
                        {person}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="glass-card fade-in">
            <h2 style={{ marginBottom: '1.5rem' }}>Initiate New Study</h2>
            <form onSubmit={handleSubmit}>

                {/* Study Name */}
                <div className="input-group">
                    <label>Study Name</label>
                    <input
                        type="text"
                        required
                        value={formData.studyName}
                        onChange={(e) => setFormData({ ...formData, studyName: e.target.value })}
                        placeholder="e.g., Project Nyle Product Study"
                    />
                </div>

                {/* Completion Date */}
                <div className="input-group">
                    <label>Expected Completion Date</label>
                    <input
                        type="date"
                        required
                        value={formData.expectedCompletionDate}
                        onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                        style={{ cursor: 'pointer' }}
                    />
                </div>

                {/* ── 3×3 Study Category Matrix ── */}
                <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Study Category
                    </p>

                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                        <div />
                        {MATRIX_COLS.map(col => (
                            <div key={col} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 0' }}>
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Matrix rows */}
                    {MATRIX_ROWS.map(row => (
                        <div key={row} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', paddingRight: '8px' }}>
                                {row}
                            </div>
                            {MATRIX_COLS.map(col => {
                                const isSelected = formData.studyRow === row && formData.studyCol === col;
                                return (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, studyRow: row, studyCol: col })}
                                        style={{
                                            padding: '10px 6px',
                                            borderRadius: '10px',
                                            fontSize: '0.7rem',
                                            fontWeight: isSelected ? '800' : '500',
                                            cursor: 'pointer',
                                            border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(251, 191, 36, 0.15)'}`,
                                            backgroundColor: isSelected ? 'var(--primary)' : 'rgba(30, 41, 59, 0.4)',
                                            color: isSelected ? '#1a1b26' : 'rgba(255,255,255,0.5)',
                                            transition: 'all 0.2s',
                                            boxShadow: isSelected ? '0 0 18px rgba(251, 191, 36, 0.3)' : 'none',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {row} ×<br />{col}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {/* Selected label */}
                    <div style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(251, 191, 36, 0.06)', borderRadius: '10px', border: '1px dashed var(--primary)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)' }}>
                            Selected: {studyTypeDisplay}
                        </span>
                    </div>
                </div>

                {/* ── Methodology ── */}
                <div className="input-group">
                    <label>Methodology</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {['Quantitative', 'Qualitative'].map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setFormData({ ...formData, methodology: m })}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: `1px solid ${formData.methodology === m ? 'var(--primary)' : 'rgba(251, 191, 36, 0.2)'}`,
                                    backgroundColor: formData.methodology === m ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
                                    color: formData.methodology === m ? '#1a1b26' : '#f8fafc',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                    boxShadow: formData.methodology === m ? '0 0 18px rgba(251, 191, 36, 0.25)' : 'none'
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    {formData.methodology === 'Qualitative' && (
                        <p style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '8px', fontWeight: '600' }}>
                            ℹ️ Saatvik Sridhar will be added as a questionnaire reviewer (Qualitative methodology)
                        </p>
                    )}
                </div>

                {/* ── Team Assignment ── */}
                <div style={{ margin: '2rem 0', padding: '2rem', background: 'rgba(251, 191, 36, 0.03)', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                    <p style={{ fontSize: '1rem', marginBottom: '1.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Team Assignment
                    </p>
                    <POCSelector team="brand" title="Brand Team" />
                    <POCSelector team="mr" title="Market Research" />
                    <POCSelector team="pe" title="Process Excellence" />
                    <POCSelector team="analytics" title="Analytics" />

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                        <p style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', margin: 0 }}>
                            Note: Study allocation (Raunaq, Akhilesh NC, Saatvik) is the first step — POC will be confirmed in Phase 1 Stage 1.
                        </p>
                    </div>
                </div>

                <button type="submit" className="premium-button" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                    Initiate Study Journey
                </button>
            </form>
        </div>
    );
};

export default StudyInitiationForm;
