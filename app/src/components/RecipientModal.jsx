import React, { useState, useEffect } from 'react';

const RecipientModal = ({ isOpen, onClose, currentData }) => {
    const [users, setUsers] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (e) {
            console.error("Fetch failed:", e);
        }
    };

    const handleAddUser = async () => {
        if (!newEmail || !newEmail.includes('@')) return;
        try {
            const res = await fetch('/api/add-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
            });
            const data = await res.json();
            setUsers(data.users);
            setNewEmail('');
        } catch (e) {
            console.error("Add failed:", e);
        }
    };

    const handleToggleUser = async (email) => {
        const updated = users.map(u => u.email === email ? { ...u, active: !u.active } : u);
        setUsers(updated);
        
        // Persist the selection to the backend
        const selectedEmails = updated.filter(u => u.active).map(u => u.email);
        try {
            await fetch('/api/select-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedEmails })
            });
        } catch (e) {
            console.error("Toggle failed:", e);
        }
    };

    const handleDeleteUser = async (email) => {
        try {
            const res = await fetch('/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            setUsers(data.users);
        } catch (e) {
            console.error("Delete failed:", e);
        }
    };

    const handleTriggerReport = async () => {
        setStatus('loading');
        try {
            // 1. Sync the real-time data to ensure metrics are correct
            if (currentData) {
                await fetch('/api/save-dashboard-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dashboardData: currentData })
                });
            }

            // 2. Now trigger the email/slack generation
            const res = await fetch('/api/trigger', { method: 'POST' });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            
            <div style={{
                width: '100%',
                maxWidth: '500px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                
                <h2 style={{ color: 'var(--primary)', fontSize: '1.4rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    REPORT RECIPIENTS
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                    CHOOSE WHO RECEIVES THE EMAIL & SLACK DM
                </p>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                        <input 
                            type="email" 
                            placeholder="Add colleague's email..."
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '0.8rem 1rem',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                        <button 
                            onClick={handleAddUser}
                            className="premium-button"
                            style={{ padding: '0.8rem 1.5rem', fontSize: '0.75rem' }}
                        >
                            ADD
                        </button>
                    </div>

                    <div style={{ 
                        maxHeight: '250px', 
                        overflowY: 'auto', 
                        borderRadius: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.5rem'
                    }}>
                        {users.length > 0 ? users.map((u, i) => (
                            <div key={i} style={{
                                padding: '0.75rem 1rem',
                                borderBottom: i === users.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: u.active ? 'rgba(251, 191, 36, 0.03)' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handleToggleUser(u.email)}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '4px',
                                        border: `2px solid ${u.active ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                                        background: u.active ? 'var(--primary)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {u.active && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.85rem', 
                                        color: u.active ? '#fff' : '#64748b',
                                        fontWeight: u.active ? 'bold' : 'normal'
                                    }}>
                                        {u.email}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteUser(u.email)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f43f5e',
                                        cursor: 'pointer',
                                        fontSize: '0.6rem',
                                        fontWeight: 'bold',
                                        opacity: 0.5
                                    }}
                                >
                                    DELETE
                                </button>
                            </div>
                        )) : (
                            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No recipients configured.</p>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        onClick={handleTriggerReport}
                        disabled={status === 'loading'}
                        className="premium-button"
                        style={{ 
                            width: '100%', 
                            padding: '1rem',
                            background: status === 'success' ? '#10b981' : (status === 'error' ? '#ef4444' : undefined)
                        }}
                    >
                        {status === 'loading' ? 'SENDING...' : (status === 'success' ? 'REPORT SENT!' : (status === 'error' ? 'SEND FAILED' : 'SEND REPORT NOW'))}
                    </button>
                    <button 
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-muted)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipientModal;
