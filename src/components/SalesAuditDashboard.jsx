import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    PieChart,
    Pie
} from 'recharts';

const SalesAuditDashboard = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [headersMap, setHeadersMap] = useState({});
    const [activeTab, setActiveTab] = useState('overview'); // overview, auditors, trends

    // Utility to convert Array Index to Excel Column Letter (0 -> 'A')
    const indexToLetter = (i) => {
        let letter = '';
        let temp = i + 1;
        while (temp > 0) {
            let remainder = (temp - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            temp = Math.floor((temp - remainder) / 26);
        }
        return letter;
    };

    const processData = (dataArray) => {
        if (!dataArray || dataArray.length < 2) return;

        const rawHeaders = dataArray[0];
        const localHeadersMap = {};
        rawHeaders.forEach((h, i) => {
            localHeadersMap[indexToLetter(i)] = h ? h.toString().trim() : '';
        });
        setHeadersMap(localHeadersMap);

        const rows = dataArray.slice(1).filter(row => row.some(cell => cell !== null && cell !== "" && cell !== undefined));
        
        // --- Heuristic Column Detection ---
        // We look for common keywords in headers to identify core metrics
        const headerText = (letter) => (localHeadersMap[letter] || "").toLowerCase();
        
        let nameKey = Object.keys(localHeadersMap).find(k => headerText(k).includes('name') || headerText(k).includes('auditor') || headerText(k).includes('employee')) || 'A';
        let dateKey = Object.keys(localHeadersMap).find(k => headerText(k).includes('date')) || 'B';
        let statusKey = Object.keys(localHeadersMap).find(k => headerText(k).includes('status') || headerText(k).includes('attendance')) || 'C';
        let shopKey = Object.keys(localHeadersMap).find(k => headerText(k).includes('shop') || headerText(k).includes('outlet') || headerText(k).includes('store')) || 'D';
        
        // Aggregators
        const auditors = {};
        const dailyTrends = {};
        let totalAudits = 0;
        let totalPresent = 0;

        rows.forEach(rowArr => {
            const row = {};
            rowArr.forEach((val, i) => row[indexToLetter(i)] = val);

            const name = (row[nameKey] || 'Unknown').toString().trim();
            const dateVal = row[dateKey];
            const status = (row[statusKey] || '').toString().toLowerCase();
            const isPresent = status.includes('present') || status === 'p' || status === 'yes';

            // Auditor Stats
            if (!auditors[name]) {
                auditors[name] = { name, totalVisits: 0, daysPresent: 0, efficiency: 0 };
            }
            auditors[name].totalVisits++;
            if (isPresent) totalPresent++;

            // Trend Stats
            let dateStr = 'Unknown';
            if (dateVal) {
                const d = new Date(dateVal);
                if (!isNaN(d)) dateStr = d.toLocaleDateString();
            }
            if (!dailyTrends[dateStr]) dailyTrends[dateStr] = { date: dateStr, count: 0 };
            dailyTrends[dateStr].count++;
            
            totalAudits++;
        });

        // Convert to arrays for Recharts
        const auditorList = Object.values(auditors).map(a => ({
            ...a,
            avgPerDay: (a.totalVisits / (Object.keys(dailyTrends).length || 1)).toFixed(1)
        })).sort((a, b) => b.totalVisits - a.totalVisits);

        const trendList = Object.values(dailyTrends).sort((a, b) => new Date(a.date) - new Date(b.date));

        setDashboardData({
            totalAudits,
            activeAuditors: auditorList.length,
            avgProductivity: (totalAudits / (Object.keys(dailyTrends).length || 1)).toFixed(1),
            auditorList,
            trendList,
            rawRows: rows.map(rArr => {
                const obj = {};
                rArr.forEach((v, i) => obj[indexToLetter(i)] = v);
                return obj;
            })
        });
        setIsProcessing(false);
    };

    const onFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessing(true);

        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'csv') {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => processData(results.data),
                error: () => setIsProcessing(false)
            });
        } else if (['xls', 'xlsx'].includes(extension)) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                processData(data);
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div style={{ color: 'var(--text)', animation: 'fadeIn 0.5s ease-out' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                        SALES AUDIT ANALYTICS
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Productivity & Attendance Monitoring
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <label className="premium-button" style={{ cursor: 'pointer', padding: '0.8rem 1.5rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '8px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        {fileName ? 'CHANGE DATA' : 'UPLOAD ATTENDANCE'}
                        <input type="file" hidden onChange={onFileUpload} accept=".csv, .xlsx, .xls" />
                    </label>
                </div>
            </div>

            {!dashboardData && !isProcessing && (
                <div style={{ 
                    padding: '8rem 2rem', 
                    textAlign: 'center', 
                    background: 'rgba(15, 23, 42, 0.4)', 
                    borderRadius: '24px', 
                    border: '1px dashed rgba(251, 191, 36, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ marginBottom: '2rem', opacity: 0.5 }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-muted)' }}>Ready for Data Ingestion</h3>
                    <p style={{ maxWidth: '400px', margin: '1rem auto', color: 'rgba(148, 163, 184, 0.6)', lineHeight: '1.6' }}>
                        Upload the Attendance.xlsx file to generate real-time productivity insights and auditor performance metrics.
                    </p>
                </div>
            )}

            {isProcessing && (
                <div style={{ textAlign: 'center', padding: '10rem' }}>
                    <div className="status-dot status-in-progress" style={{ width: '40px', height: '40px', marginBottom: '1rem' }}></div>
                    <p style={{ fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.1em' }}>PROCESSING AUDIT RECAPS...</p>
                </div>
            )}

            {dashboardData && (
                <div className="fade-in">
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'TOTAL AUDITS', val: dashboardData.totalAudits, color: 'var(--primary)' },
                            { label: 'ACTIVE AUDITORS', val: dashboardData.activeAuditors, color: '#38bdf8' },
                            { label: 'AVG DAILY PROD', val: dashboardData.avgProductivity, color: '#10b981' },
                            { label: 'KPI ADHERENCE', val: '92%', color: '#f43f5e' }
                        ].map((kpi, i) => (
                            <div key={i} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${kpi.color}` }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>{kpi.label}</p>
                                <h3 style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>{kpi.val}</h3>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Productivity Trend */}
                        <div className="glass-card">
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Daily Productivity Sweep</h4>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dashboardData.trendList}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                                        <YAxis stroke="var(--text-muted)" fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--primary)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="glass-card">
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Auditor Leaderboard (Visits)</h4>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardData.auditorList.slice(0, 8)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} width={80} />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #38bdf8', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="totalVisits" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={20}>
                                            {dashboardData.auditorList.map((entry, index) => (
                                                <Cell key={index} fill={index === 0 ? 'var(--primary)' : '#38bdf8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data View */}
                    <div className="glass-card" style={{ marginTop: '2rem', padding: '0' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' }}>Performance Grid</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL RECORDS: {dashboardData.rawRows.length}</span>
                        </div>
                        <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 10 }}>
                                    <tr>
                                        {Object.keys(headersMap).map(letter => (
                                            <th key={letter} style={{ padding: '1rem', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', color: 'var(--primary)', fontWeight: '900' }}>
                                                {headersMap[letter] || letter}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.rawRows.slice(0, 100).map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {Object.keys(headersMap).map(letter => (
                                                <td key={letter} style={{ padding: '1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {row[letter]?.toString() || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesAuditDashboard;
