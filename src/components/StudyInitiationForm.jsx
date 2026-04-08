import React, { useState } from 'react';

const StudyInitiationForm = ({ onStudyCreated }) => {
    const [formData, setFormData] = useState({
        studyName: '',
        expectedCompletionDate: '',
        initiatedDate: new Date().toISOString().split('T')[0],
        brandPOCs: [],
        mrPOCs: [],
        pePOCs: [],
        studyMainType: 'Quantitative', // 'Quantitative' or 'Qualitative'
        studyPurpose: 'Foundational',
        studyObject: 'Product/Service',
        qualitativeType: 'Focus Group Discussions'
    });

    const quantMatrix = {
        'Foundational': {
            'Product/Service': 'Concept Testing',
            'Brand': 'Brand Exploration',
            'Advertising/Creative': 'Ad Concept Pre-testing'
        },
        'Development / Innovation': {
            'Product/Service': 'Product Development Testing',
            'Brand': 'Brand Development',
            'Advertising/Creative': 'Copy Testing'
        },
        'Diagnostic / Tracking': {
            'Product/Service': 'Post-Launch Product Tracking',
            'Brand': 'Brand Health Tracking',
            'Advertising/Creative': 'Campaign Post-Testing'
        }
    };

    const teamOptions = {
        brand: ['Aparna', 'Karthik', 'Hari'],
        mr: ['Rishab', 'Mahalakshmi', 'Anjani', 'Kandharp', 'Chirag', 'Raunaq'],
        pe: ['John', 'Tanmay', 'Saatvik']
    };

    const handlePOCChange = (team, person) => {
        const current = formData[`${team}POCs`];
        const updated = current.includes(person)
            ? current.filter(p => p !== person)
            : [...current, person];

        setFormData({ ...formData, [`${team}POCs`]: updated });
    };

    const calculateMilestoneDates = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDuration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));

        // Weights for 5 steps:
        // 1. Brief Dev (15%), 2. Q Creation (25%), 3. Scripting (15%), 4. Testing (35%), 5. Quality (10%)
        const weights = [0.15, 0.25, 0.15, 0.35, 0.10];
        let currentWeight = 0;
        const milestoneDates = [];

        for (let i = 0; i < 5; i++) {
            currentWeight += weights[i];
            const targetDate = new Date(start);
            targetDate.setDate(targetDate.getDate() + Math.round(totalDuration * currentWeight));
            milestoneDates.push(targetDate.toISOString().split('T')[0]);
        }
        return milestoneDates;
    };

    const getSelectedStudyType = () => {
        if (formData.studyMainType === 'Qualitative') {
            return `Qualitative - ${formData.qualitativeType}`;
        }
        return `Quantitative - ${quantMatrix[formData.studyPurpose][formData.studyObject]}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const milestoneDates = calculateMilestoneDates(formData.initiatedDate, formData.expectedCompletionDate);
        const fullStudyType = getSelectedStudyType();

        const newStudy = {
            id: Date.now(),
            ...formData,
            studyTypeDisplay: fullStudyType,
            currentStage: 1,
            completionTime: null,
            stages: [
                {
                    id: 1,
                    name: 'Initial Brief Development',
                    phase: 'Brief & Approval Phase',
                    status: 'completed',
                    date: formData.initiatedDate,
                    expectedDate: milestoneDates[0],
                    responsible: `CIA / ${formData.brandPOCs.length > 0 ? formData.brandPOCs.join(', ') : 'Brand Team'}`,
                    subtasks: ['Review brief', 'Align internally', 'Clarify with Brand'],
                    gate: 'PO Raised (Approval Gate)'
                },
                {
                    id: 2,
                    name: 'Questionnaire Creation',
                    phase: 'Questionnaire Development Phase',
                    status: 'in-progress',
                    expectedDate: milestoneDates[1],
                    responsible: `${formData.mrPOCs.join(', ')} / ${formData.brandPOCs.join(', ')} / ${formData.pePOCs.join(', ')}`,
                    subtasks: ['Word questionnaire', 'Internal review', 'Pre-screening'],
                    gate: 'Final Brand Approval (Word Doc)',
                    rules: 'No changes post final approval. Email PE team from here. >5 changes need Shobha approval.'
                },
                {
                    id: 3,
                    name: 'Scripting',
                    phase: 'Execution Phase – Scripting & Testing',
                    status: 'not-started',
                    expectedDate: milestoneDates[2],
                    responsible: formData.pePOCs.length > 0 ? formData.pePOCs.join(', ') : 'PE Team',
                    subtasks: ['Script survey', 'Check logic/routing/stimuli'],
                    gate: 'Internal Alignment Check'
                },
                {
                    id: 4,
                    name: 'Testing',
                    phase: 'Execution Phase – Scripting & Testing',
                    status: 'not-started',
                    expectedDate: milestoneDates[3],
                    responsible: `${formData.pePOCs.join(', ')} / ${formData.mrPOCs.join(', ')}`,
                    subtasks: ['Link testing', 'Routing validation', 'Sense check'],
                    gate: 'MR Sign-off to PE'
                },
                {
                    id: 5,
                    name: 'Brand Quality Review',
                    phase: 'Quality Check & Handoff',
                    status: 'not-started',
                    expectedDate: milestoneDates[4],
                    responsible: `${formData.brandPOCs.join(', ')} / ${formData.mrPOCs.join(', ')}`,
                    subtasks: ['Final quality review', 'Clear dummy responses'],
                    gate: 'Go-Live (No changes after)',
                    rules: 'Post-live changes need Shobha approval.'
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

                <div className="input-group">
                    <label>Completion Date</label>
                    <input
                        type="date"
                        required
                        value={formData.expectedCompletionDate}
                        onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                        style={{ cursor: 'pointer' }}
                    />
                </div>

                {/* Study Type Matrix */}
                <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '600' }}>Market Research Study Type</p>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                        {['Quantitative', 'Qualitative'].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, studyMainType: type })}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '12px',
                                    border: `1px solid ${formData.studyMainType === type ? 'var(--primary)' : 'rgba(251, 191, 36, 0.2)'}`,
                                    backgroundColor: formData.studyMainType === type ? 'var(--primary)' : 'rgba(30, 41, 59, 0.3)',
                                    color: formData.studyMainType === type ? '#1a1b26' : '#f8fafc',
                                    cursor: 'pointer',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.3s',
                                    boxShadow: formData.studyMainType === type ? '0 0 20px rgba(251, 191, 36, 0.25)' : 'none'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {formData.studyMainType === 'Quantitative' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Study Purpose</label>
                                <select
                                    value={formData.studyPurpose}
                                    onChange={(e) => setFormData({ ...formData, studyPurpose: e.target.value })}
                                >
                                    <option value="Foundational">Foundational</option>
                                    <option value="Development / Innovation">Development / Innovation</option>
                                    <option value="Diagnostic / Tracking">Diagnostic / Tracking</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Study Object</label>
                                <select
                                    value={formData.studyObject}
                                    onChange={(e) => setFormData({ ...formData, studyObject: e.target.value })}
                                >
                                    <option value="Product/Service">Product/Service</option>
                                    <option value="Brand">Brand</option>
                                    <option value="Advertising/Creative">Advertising/Creative</option>
                                </select>
                            </div>
                            <div style={{
                                gridColumn: 'span 2',
                                marginTop: '15px',
                                padding: '15px',
                                background: 'rgba(251, 191, 36, 0.05)',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px dashed var(--primary)',
                                color: 'var(--primary)'
                            }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: '800' }}>
                                    Target Category: {quantMatrix[formData.studyPurpose][formData.studyObject]}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Methodology</label>
                            <select
                                value={formData.qualitativeType}
                                onChange={(e) => setFormData({ ...formData, qualitativeType: e.target.value })}
                            >
                                <option value="Focus Group Discussions">Focus Group Discussions</option>
                                <option value="In Depth Interview">In Depth Interview</option>
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ margin: '2rem 0', padding: '2rem', background: 'rgba(251, 191, 36, 0.03)', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                    <p style={{ fontSize: '1rem', marginBottom: '1.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Team Assignment (Email Triggers)</p>
                    <POCSelector team="brand" title="Brand" />
                    <POCSelector team="mr" title="Market Research" />
                    <POCSelector team="pe" title="Process Excellence" />
                </div>

                <button type="submit" className="premium-button" style={{ width: '100%', padding: '1rem' }}>
                    Start Study Workflow
                </button>
            </form>
        </div>
    );
};

export default StudyInitiationForm;
