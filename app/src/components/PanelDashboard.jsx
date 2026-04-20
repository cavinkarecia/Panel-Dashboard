import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Label,
    Cell
} from 'recharts';

// Utility to convert Array Index to Excel Column Letter (0 -> 'A')
function indexToLetter(i) {
    let letter = '';
    let temp = i + 1;
    while (temp > 0) {
        let remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - remainder) / 26);
    }
    return letter;
}

// Utility to parse duration (Column D) from various formats: seconds, HH:MM:SS, or Excel time fraction
function parseDurationToSeconds(val) {
    if (val === null || val === undefined || val === '') return 0;

    // If it's already a number (seconds or Excel fraction)
    if (typeof val === 'number') {
        // Excel stores time as a fraction of a day (1 = 24h). 
        // If the number is small (e.g. < 1), it's likely an Excel time fraction.
        // If it's a large integer, it might be raw seconds.
        if (val < 1) {
            return Math.round(val * 24 * 60 * 60);
        }
        return Math.round(val);
    }

    // If it's a string like "00:05:20" or "05:20"
    const str = val.toString().trim();
    const parts = str.split(':').map(Number);
    if (parts.length === 3) { // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS
        return parts[0] * 60 + parts[1];
    }

    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : Math.round(parsed);
}

// Format long survey questions into short, readable titles
const formatHeaderTitle = (rawTitle) => {
    if (!rawTitle) return "Unknown Question";

    const toCamel = (s) => s.replace(/\b\w/g, c => c.toUpperCase());

    let match = rawTitle.match(/(?:which|what)\s+(.*?)\s+(?:brand\s+)?do\s+you\s+use\s+most\s+often/i);
    if (match) return `Most Often used ${toCamel(match[1].trim())} Brand`;

    match = rawTitle.match(/tell\s+me\s+which\s+(.*?)\s+(?:brand\s+)?you\s+(?:are\s+using|use)\s+currently/i);
    if (match) return `Currently using ${toCamel(match[1].trim())} brand`;

    match = rawTitle.match(/which\s+type\s+of\s+(.*?)\s+skus/i);
    if (match) return `${toCamel(match[1].trim())} SKU Types Purchased`;

    match = rawTitle.match(/^(.*?)_Where\s+do\s+you\s+typically\s+purchase\s+different\s+products\s+from\?/i);
    if (match) return `${toCamel(match[1].trim())} - Purchase Platform`;

    return rawTitle;
};

const sectionConfig = [
    { title: "Shampoo Deep Dive", cols: ["AD", "AG", "AH", "BC"], color: "#38bdf8" },
    { title: "Hair Oil Deep Dive", cols: ["AL", "AN", "AO", "BD"], color: "#f59e0b" },
    { title: "Hair Serum Deep Dive", cols: ["AQ", "AR", "BE"], color: "#a855f7" },
    { title: "Hair Mask Deep Dive", cols: ["AT", "AU", "BF"], color: "#10b981" },
    { title: "Hair Gel Deep Dive", cols: ["AW", "AX", "BG"], color: "#f43f5e" },
    { title: "Skin Care Products", cols: ["BJ", "BK", "BH"], color: "#0ea5e9" },
    { title: "Fairness Cream", cols: ["BL", "BM", "BO", "BP", "BI"], color: "#fb7185" },
    { title: "Talcum Powder", cols: ["BQ", "BS", "BT"], color: "#c084fc" },
    { title: "Facewash", cols: ["BU", "BW", "BX"], color: "#2dd4bf" },
    { title: "BB Cream", cols: ["BY", "CA", "CB"], color: "#fcd34d" },
    { title: "BB Powder", cols: ["CC", "CE", "CF"], color: "#fdba74" },
    { title: "Moisturizer", cols: ["CG", "CH", "CI"], color: "#818cf8" },
    { title: "Sunscreen", cols: ["CK", "CL"], color: "#fb923c" },
    { title: "Face Cream", cols: ["CN", "CO"], color: "#ec4899" },
    { title: "Body Wash", cols: ["CQ", "CR"], color: "#14b8a6" },
    { title: "Body Lotion", cols: ["CT", "CU"], color: "#8b5cf6" },
    { title: "Body Moisturizer", cols: ["CW", "CX"], color: "#06b6d4" },
    { title: "Hair Colour", cols: ["DK", "DL", "DM", "DO"], color: "#eab308" },
    { title: "Pickle", cols: ["EN", "EO", "ER"], color: "#84cc16" }
];



// Helper to consolidate fragmented purchase platforms into standard groups
const getClubbedPlatform = (raw) => {
    if (!raw) return null;
    const s = raw.toString().toLowerCase().trim();

    // Filter out survey artifacts
    if (s === "etc." || s === "etc" || s === "etc.)") return null;

    // General/ Traditional Trade Store
    if (s.includes("kirana") || s.includes("local outlet")) {
        return "General/ Traditional Trade Store";
    }

    // Modern Trade Store
    if (s.includes("super market") || s.includes("hypermarket") || s.includes("supermarket")) {
        return "Modern Trade Store";
    }

    // E-Com
    if (s.includes("nyka") || s.includes("amazon") || s.includes("flipkart") || s.includes("brand website")) {
        // Double check for Flipkart Minutes which is Quick-Com
        if (s.includes("minutes")) return "Quick Comm";
        return "E Com";
    }

    // Quick-Com
    if (s.includes("instamart") || s.includes("blinkit") || s.includes("zepto") || s.includes("big basket") || s.includes("bigbasket") || s.includes("minutes")) {
        return "Quick Comm";
    }

    return raw; // Return original if no match
};

// --- Geo-Audit Mapping for Major Indian Cities ---
const CITY_COORDS = {
    "Mumbai": { lat: 19.0760, lon: 72.8777 },
    "Delhi": { lat: 28.6139, lon: 77.2090 },
    "Bangalore": { lat: 12.9716, lon: 77.5946 },
    "Hyderabad": { lat: 17.3850, lon: 78.4867 },
    "Ahmedabad": { lat: 23.0225, lon: 72.5714 },
    "Chennai": { lat: 13.0827, lon: 80.2707 },
    "Kolkata": { lat: 22.5726, lon: 88.3639 },
    "Surat": { lat: 21.1702, lon: 72.8311 },
    "Pune": { lat: 18.5204, lon: 73.8567 },
    "Jaipur": { lat: 26.9124, lon: 75.7873 },
    "Lucknow": { lat: 26.8467, lon: 80.9462 },
    "Kanpur": { lat: 26.4499, lon: 80.3319 },
    "Nagpur": { lat: 21.1458, lon: 79.0882 }
};

const CITY_COORDS_EXT = {
    ...CITY_COORDS,
    "Indore": { lat: 22.7196, lon: 75.8577 },
    "Thane": { lat: 19.2183, lon: 72.9781 },
    "Bhopal": { lat: 23.2599, lon: 77.4126 },
    "Visakhapatnam": { lat: 17.6868, lon: 83.2185 },
    "Patna": { lat: 25.5941, lon: 85.1376 },
    "Vadodara": { lat: 22.3072, lon: 73.1812 },
    "Ghaziabad": { lat: 28.6692, lon: 77.4538 },
    "Ludhiana": { lat: 30.9010, lon: 75.8573 },
    "Coimbatore": { lat: 11.0168, lon: 76.9558 },
    "Agra": { lat: 27.1767, lon: 78.0081 },
    "Madurai": { lat: 9.9252, lon: 78.1198 },
    "Nashik": { lat: 19.9975, lon: 73.7898 },
    "Vijayawada": { lat: 16.5062, lon: 80.6480 },
    "Faridabad": { lat: 28.4089, lon: 77.3178 },
    "Meerut": { lat: 28.9845, lon: 77.7064 },
    "Rajkot": { lat: 22.3039, lon: 70.8022 },
    "Kochi": { lat: 9.9312, lon: 76.2673 },
    "Gurgoan": { lat: 28.4595, lon: 77.0266 },
    "Gurugram": { lat: 28.4595, lon: 77.0266 },
    "Noida": { lat: 28.5355, lon: 77.3910 },
    "Chandigarh": { lat: 30.7333, lon: 76.7794 }
};

// Haversine Distance Helper (Returns KM)
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const PanelDashboard = ({ onDataUpdate }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState('');

    // App State Data
    const [headersMap, setHeadersMap] = useState({});
    const [dashboardData, setDashboardData] = useState(null);
    const [activeCategoryIdx, setActiveCategoryIdx] = useState(null);
    const [expandedNode, setExpandedNode] = useState(null);
    const [expandedSubNode, setExpandedSubNode] = useState(null);
    const [clickedData, setClickedData] = useState(null);
    const [activeCardDrilldown, setActiveCardDrilldown] = useState(null); // { title, rows, color }
    const [expandedInterviewer, setExpandedInterviewer] = useState(null);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, success

    // Synchronize Dashboard Link and Data on Mount
    useEffect(() => {
        // 1. Sync the current URL to the backend for the "Daily Update" email link
        const currentUrl = window.location.origin;
        if (currentUrl && !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
            fetch('/api/save-dashboard-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentUrl })
            }).catch(e => console.error("URL-Sync Failure:", e));
        }

        // 2. Load the last successfully uploaded data 
        fetch('/api/load-dashboard-data')
            .then(res => res.json())
            .then(data => {
                if (data && data.dashboardData) {
                    setDashboardData(data.dashboardData);
                    setHeadersMap(data.headersMap || {});
                    if (onDataUpdate) onDataUpdate(data.dashboardData);
                }
            }).catch(e => console.error("Data-Load Failure:", e));
    }, []);

    const getRowObj = (rowArr) => {
        const obj = {};
        rowArr.forEach((val, i) => {
            obj[indexToLetter(i)] = val;
        });
        return obj;
    };
    const isAcceptedRow = (row) => {
        return (row['I'] || "").trim().toLowerCase() === 'yes' && (row['J'] || "").trim().toLowerCase() === 'yes';
    };


    const processData = (dataArray) => { // dataArray is Array of Arrays
        if (!dataArray || dataArray.length < 2) return;

        const rawHeaders = dataArray[0];
        const localHeadersMap = {};
        rawHeaders.forEach((h, i) => {
            const letter = indexToLetter(i);
            const text = h ? h.toString().trim() : '';
            localHeadersMap[letter] = text;
        });

        const excludedIds = new Set([
            103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6
        ]);

        // Filter out rows that are entirely empty OR have an excluded response ID (Column A)
        const rows = dataArray.slice(1).filter(rowArr => {
            if (!rowArr || rowArr.length === 0) return false;

            // Check for empty row
            const hasData = rowArr.some(cell => cell !== null && cell !== "" && cell !== undefined);
            if (!hasData) return false;

            // Check for excluded ID in Column A (Index 0)
            const rowId = parseInt(rowArr[0], 10);
            if (!isNaN(rowId) && excludedIds.has(rowId)) return false;

            return true;
        });

        // Core Aggregators
        let total = rows.length;
        let accepted = 0;
        let incomplete = 0;
        let minDate = null;
        let maxDate = null;
        const cities = {};
        const ages = { "18-24": 0, "25-34": 0, "35-44": 0, "44+": 0, "Other/Unknown": 0 };
        const genders = { "Male": 0, "Female": 0, "Other": 0 };
        let haircare = 0;
        const prods = { "Shampoo": 0, "Hair Oil": 0, "Conditioner": 0, "Hair Serum": 0 };
        const platforms = { "General Trade": 0, "Modern Trade": 0, "E Comm": 0, "Quick Comm": 0 };

        // Dynamic Section Tallies
        const tallies = {};
        sectionConfig.forEach(section => {
            section.cols.forEach(col => tallies[col] = {});
        });

        // Integrity Audit Trackers
        const phoneFreq = {};
        let geoMismatchTotal = 0;
        const geoFencing = { "Within City Limits": 0, "Outside City Limits": 0, "Unknown": 0 };

        // --- DYNAMIC HEADER DISCOVERY (Intelligent Column Mapping) ---
        let dateKey = 'B';
        let cityKey = 'K';
        let ageKey = 'O';
        let genderKey = 'T';
        let haircareKey = 'AA';
        let productsKey = 'AB';
        let consentKey1 = 'I';
        let consentKey2 = 'J';
        let interviewerKey = 'EU';
        let durationKey = 'D';

        // Scan headers for matches
        Object.keys(localHeadersMap).forEach(key => {
            const h = localHeadersMap[key].toLowerCase();
            if (h.includes("interviewer") || h.includes("agent") || h.includes("enumerat")) interviewerKey = key;
            if (h.includes("city") || (h.includes("town") && !h.includes("village"))) cityKey = key;
            if (h.includes("age") && !h.includes("group") && !h.includes("bracket")) ageKey = key;
            if (h.includes("gender") || h.includes("sex")) genderKey = key;
            if (h.includes("duration") || h.includes("time taken")) durationKey = key;
            if (h.includes("consent") || h.includes("agree")) {
                if (consentKey1 === 'I') consentKey1 = key;
                else if (consentKey2 === 'J') consentKey2 = key;
            }
        });

        console.log("Detected Column Mapping:", { interviewerKey, cityKey, ageKey, genderKey, durationKey });

        const interviewerStats = {};

        rows.forEach(rowArr => {
            const rowObj = {};
            rowArr.forEach((val, i) => {
                rowObj[indexToLetter(i)] = val;
            });

            // 0. Interviewer QC Logic (Run for ALL entries regardless of consent)
            // --- INTERVIEWER NAME CONSOLIDATION (Normalization) ---
            let rawName = (rowObj[interviewerKey] || "Unknown").toString().trim();
            const lowerName = rawName.toLowerCase();

            if (lowerName === 'mtidul' || lowerName === 'mumbai' || lowerName === 'mridul') {
                rawName = 'Mridul';
            } else if (lowerName === 'rajesh' || lowerName === 'rajesh pandey' || lowerName === 'rajesh kumar pandey' || lowerName === 'rajeah') {
                rawName = 'Rajesh Pandey';
            } else if (lowerName === 'harish' || lowerName === 'harish a') {
                rawName = 'Harish';
            } else if (lowerName === 'afi') {
                rawName = 'Adi';
            }

            const name = rawName;
            if (!interviewerStats[name]) {
                interviewerStats[name] = { total: 0, accepted: 0, short: 0, long: 0, integrityErrors: 0 };
            }
            interviewerStats[name].total++;

            const durationSec = parseDurationToSeconds(rowObj[durationKey]);

            // 1. Accepted Logic (Strictly Column I & J as requested)
            const a1 = (rowObj[consentKey1] || "").toString().trim().toLowerCase();
            const a2 = (rowObj[consentKey2] || "").toString().trim().toLowerCase();
            const isAccepted = (a1 === 'yes' && a2 === 'yes');

            if (isAccepted) {
                accepted++;
                interviewerStats[name].accepted++;

                if (durationSec > 0) {
                    if (durationSec < 15) interviewerStats[name].short++;
                    if (durationSec > 900) interviewerStats[name].long++; // 15 mins
                }

                // 2. Date (Only for accepted)
                if (rowObj[dateKey]) {
                    let dateVal = rowObj[dateKey];
                    let dateObj = null;
                    if (typeof dateVal === 'number') {
                        dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                    } else {
                        dateObj = new Date(dateVal);
                    }
                    if (dateObj && !isNaN(dateObj)) {
                        if (!minDate || dateObj < minDate) minDate = dateObj;
                        if (!maxDate || dateObj > maxDate) maxDate = dateObj;
                    }
                }

                // 3. City (Till ID 113 use M, otherwise use K)
                const cityK = (rowObj['K'] || "").toString().trim();
                const cityM = (rowObj['M'] || "").toString().trim();
                const rowId = parseInt(rowObj['A'], 10);
                let finalCity = "";
                if (!isNaN(rowId) && rowId <= 113) {
                    finalCity = cityM || cityK;
                } else {
                    finalCity = cityK || cityM;
                }

                if (finalCity) {
                    cities[finalCity] = (cities[finalCity] || 0) + 1;
                } else {
                    cities["Unknown/Not Provided"] = (cities["Unknown/Not Provided"] || 0) + 1;
                }

                // 4. Data Integrity Check (Penalties for Missing Fields)
                const isMissingCity = !finalCity || finalCity === "Unknown/Not Provided";
                const isMissingAge = !rowObj[ageKey];
                const isMissingGender = !rowObj[genderKey];
                const isMissingDuration = durationSec === 0;

                if (isMissingCity || isMissingAge || isMissingGender || isMissingDuration) {
                    interviewerStats[name].integrityErrors++;
                }

                // 5. Age
                if (rowObj[ageKey]) {
                    const age = parseInt(rowObj[ageKey], 10);
                    const ageStr = rowObj[ageKey].toString().trim();
                    if (!isNaN(age)) {
                        if (age >= 18 && age <= 24) ages["18-24"]++;
                        else if (age >= 25 && age <= 34) ages["25-34"]++;
                        else if (age >= 35 && age <= 44) ages["35-44"]++;
                        else if (age > 44) ages["44+"]++;
                        else ages["Other/Unknown"]++;
                    } else {
                        if (ageStr && ages.hasOwnProperty(ageStr)) {
                            ages[ageStr]++;
                        } else {
                            ages["Other/Unknown"]++;
                        }
                    }
                } else {
                    ages["Other/Unknown"]++;
                }

                // 5. Gender
                if (rowObj[genderKey]) {
                    const gender = rowObj[genderKey].toString().trim().toLowerCase();
                    if (gender.startsWith('m')) genders["Male"]++;
                    else if (gender.startsWith('f')) genders["Female"]++;
                    else if (gender) genders["Other"]++;
                    else genders["Other/Unknown"]++;
                } else {
                    genders["Other/Unknown"]++;
                }

                // 6. Haircare User Basic
                if (rowObj[haircareKey]) {
                    const hc = rowObj[haircareKey].toString().trim().toLowerCase();
                    if (hc === 'yes') haircare++;
                }

                // 7. Haircare Products Multi-Select
                if (productsKey && rowObj[productsKey]) {
                    const pVal = rowObj[productsKey].toString().toLowerCase();
                    if (pVal.includes('shampoo')) prods["Shampoo"]++;
                    if (pVal.includes('hair oil') || pVal.includes('hairoil')) prods["Hair Oil"]++;
                    if (pVal.includes('conditioner')) prods["Conditioner"]++;
                    if (pVal.includes('serum')) prods["Hair Serum"]++;
                }

                // 7.5 Overall Purchase Platforms (BC-BI)
                const rowPlatforms = new Set();
                ["BC", "BD", "BE", "BF", "BG", "BH", "BI"].forEach(col => {
                    const cVal = rowObj[col];
                    if (cVal) {
                        const items = cVal.toString().split(',').map(i => i.trim()).filter(i => i !== "");
                        items.forEach(item => {
                            let p = getClubbedPlatform(item);
                            if (p === "General/ Traditional Trade Store") rowPlatforms.add("General Trade");
                            else if (p === "Modern Trade Store") rowPlatforms.add("Modern Trade");
                            else if (p === "E Com") rowPlatforms.add("E Comm");
                            else if (p === "Quick Comm") rowPlatforms.add("Quick Comm");
                        });
                    }
                });
                rowPlatforms.forEach(p => platforms[p]++);

                // 8. Check for Incomplete (Accepted but missing core demographics)
                const isCityEmpty = !rowObj[cityKey] || rowObj[cityKey].toString().trim() === "";
                const isAgeEmpty = !rowObj[ageKey] || rowObj[ageKey].toString().trim() === "";
                const isGenderEmpty = !rowObj[genderKey] || rowObj[genderKey].toString().trim() === "";

                if (isCityEmpty || isAgeEmpty || isGenderEmpty) {
                    incomplete++;
                }

                // DYNAMIC SECTIONS (Shampoo, Fairness Cream, Pickle, etc.)
                sectionConfig.forEach(section => {
                    section.cols.forEach(col => {
                        const val = rowObj[col];
                        if (val) {
                            const strVal = val.toString().trim();
                            if (strVal) {
                                // Split by comma to handle multi-select responses
                                const rawItems = strVal.split(',').map(i => i.trim()).filter(i => i !== "");

                                // To prevent double-counting of clubbed categories in a single row
                                const rowCategories = new Set();

                                rawItems.forEach(item => {
                                    let finalItem = item;
                                    // Apply clubbing/consolidation for Purchase Platform columns (BC-BI)
                                    if (["BC", "BD", "BE", "BF", "BG", "BH", "BI"].includes(col)) {
                                        finalItem = getClubbedPlatform(item);
                                    }
                                    if (finalItem) rowCategories.add(finalItem);
                                });

                                // Increment tally for each unique category identified in this row
                                rowCategories.forEach(category => {
                                    tallies[col][category] = (tallies[col][category] || 0) + 1;
                                });
                            }
                        }
                    });
                });
                // --- INTEGRITY AUDITS (Duplicate Phone & Geo-Mismatch) ---
                // Phone Duplicate Check (Column P)
                const phone = (rowObj['P'] || "").toString().trim();
                if (phone) {
                    phoneFreq[phone] = (phoneFreq[phone] || 0) + 1;
                }

                // Geo-Mismatch Check (Column L vs K)
                const latLong = (rowObj['L'] || "").toString().trim();
                const coordsArr = latLong.split(',').map(c => parseFloat(c.trim()));

                if (coordsArr.length === 2 && !isNaN(coordsArr[0]) && !isNaN(coordsArr[1]) && finalCity && CITY_COORDS[finalCity]) {
                    const dist = getDistance(coordsArr[0], coordsArr[1], CITY_COORDS[finalCity].lat, CITY_COORDS[finalCity].lon);
                    // If respondent is more than 100km away from the stated city center, flag it as a mismatch
                    if (dist > 100) {
                        geoMismatchTotal++;
                        geoFencing["Outside City Limits"]++;
                    } else {
                        geoFencing["Within City Limits"]++;
                    }
                } else {
                    geoFencing["Unknown"]++;
                }
            }
        });

        let days = 0;
        if (minDate && maxDate) {
            const diffTime = Math.abs(maxDate - minDate);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else if (minDate || maxDate) {
            days = 1;
        }

        setHeadersMap(localHeadersMap);

        const statsArray = Object.values(interviewerStats);
        const teamSize = statsArray.length;
        const teamTotalShort = statsArray.reduce((acc, s) => acc + s.short, 0);
        const teamTotalLong = statsArray.reduce((acc, s) => acc + s.long, 0);
        const teamTotalIntegrityErrors = statsArray.reduce((acc, s) => acc + s.integrityErrors, 0);

        const teamAvgProd = accepted / (days || 1);
        const teamAvgQual = teamSize > 0 ? statsArray.reduce((acc, s) => acc + (s.total > 0 ? (s.accepted / s.total) * 100 : 0), 0) / teamSize : 0;
        const panelReady = accepted - incomplete;
        const integrityScore = accepted > 0 ? Math.max(0, Math.round(((accepted - teamTotalIntegrityErrors) / accepted) * 100)) : 100;

        const finalizedData = {
            totalEntries: total,
            acceptedEntries: accepted,
            acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : 0,
            consentRate: total > 0 ? ((accepted / total) * 100).toFixed(1) : 0,
            incompleteEntries: incomplete,
            panelReadyCount: panelReady,
            panelReadinessScore: total > 0 ? ((panelReady / total) * 100).toFixed(1) : 0,
            teamAvgQual: teamAvgQual.toFixed(1),
            teamAvgProd: teamAvgProd.toFixed(1),
            integrityScore: integrityScore, // Add this line
            daysCount: days,
            teamSize: teamSize,
            teamTotalShort: teamTotalShort,
            teamTotalLong: teamTotalLong,
            teamTotalIntegrityErrors: teamTotalIntegrityErrors,

            // New Integrity Metrics
            duplicatePhoneEntries: Object.values(phoneFreq).reduce((acc, freq) => (freq > 1 ? acc + freq : acc), 0),
            geoMismatchEntries: geoMismatchTotal,
            geoFencingStats: geoFencing,
            phoneFreq: phoneFreq, 
            haircareUsers: haircare,
            cityStats: cities,
            ageStats: ages,
            genderStats: genders,
            productUsers: prods,
            platformStats: platforms,
            tallies: tallies,
            interviewerStats: interviewerStats,
            rawRows: rows, 
            objRows: rows.map(r => getRowObj(r)) 
        };

        setDashboardData(finalizedData);
        if (onDataUpdate) onDataUpdate(finalizedData);

        // Save Data to Server for Daily Snapshot
        setSaveStatus('saving');
        fetch('/api/save-dashboard-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dashboardData: finalizedData, headersMap: localHeadersMap })
        }).then(() => setSaveStatus('success'))
            .catch(e => {
                console.error("Auto-Save Failure:", e);
                setSaveStatus('idle');
            });

        // Default to first category after upload
        setActiveCategoryIdx(0);
        setIsProcessing(false);
    };

    const toggleCardDrilldown = (title, color, filterFn) => {
        if (activeCardDrilldown?.title === title) {
            setActiveCardDrilldown(null);
            return;
        }

        const filteredRows = dashboardData.objRows.filter(filterFn);
        setActiveCardDrilldown({ title, rows: filteredRows, color });
    };

    const onFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessing(true);

        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'csv') {
            Papa.parse(file, {
                header: false, // Ensures we get An Array of Arrays 
                skipEmptyLines: true,
                complete: (results) => {
                    processData(results.data);
                    // Reset the input value 
                    e.target.value = '';
                },
                error: (error) => {
                    console.error("Error parsing CSV:", error);
                    setIsProcessing(false);
                    // Also reset on error
                    e.target.value = '';
                }
            });
        } else if (['xls', 'xlsx'].includes(extension)) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target.result;
                // header: 1 means generate an Array of Arrays
                const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                processData(data);

                // Reset the input value so the same file name can be re-uploaded to trigger onChange
                e.target.value = '';
            };
            reader.readAsBinaryString(file);
        } else {
            alert("Unsupported file format. Please upload a CSV or Excel file.");
            setIsProcessing(false);
            // Also reset on error
            e.target.value = '';
        }
    };


    const renderInlineRawTable = (dataRows, isObjRows = false) => (
        <div style={{ marginTop: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.95)', cursor: 'default', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {/* Header block with fixed layout */}
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.05)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem' }}>INLINE EXPLORER (Showing {Math.min(dataRows.length, 500)} records)</span>
                <button onClick={() => setClickedData(null)} style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(16,185,129,0.5)', color: '#10b981', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', transition: 'all 0.2s', zIndex: 20 }}>CLOSE ⨉</button>
            </div>
            {/* Scrollable area exclusively for the wide table */}
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '350px', padding: '1rem' }}>
                <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: '0', fontSize: '0.75rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: '#0f172a' }}>
                            {Object.keys(headersMap).map(letter => (
                                <th key={letter} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #fbbf24', borderRight: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                                    <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '0.75rem', marginBottom: '0.15rem' }}>COL {letter}</div>
                                    <div style={{ color: '#f1f5f9', fontWeight: '500', fontSize: '0.6rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{headersMap[letter]}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dataRows.slice(0, 500).map((row, rIdx) => (
                            <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                {Object.keys(headersMap).map((letter, cIdx) => (
                                    <td key={cIdx} style={{ padding: '0.5rem', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)', color: '#94a3b8' }}>{(isObjRows ? row[letter] : row[cIdx])?.toString() || <span style={{ opacity: 0.2 }}>—</span>}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTable = (dataObj, title, total, drilldownConfig = null, customLayerOpts = null) => {
        if (!dataObj) return null;
        const keys = Object.keys(dataObj).filter(k => dataObj[k] > 0);
        if (keys.length === 0) return null;

        // Sort by value descending
        keys.sort((a, b) => dataObj[b] - dataObj[a]);

        return (
            <div style={{ marginBottom: '1.5rem', flex: 1, minWidth: '300px' }}>
                <div style={{
                    color: 'var(--primary)',
                    borderBottom: '1px solid rgba(251, 191, 36, 0.25)',
                    paddingBottom: '1rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    height: '2.5rem'
                }}>
                    <span style={{
                        flex: 1,
                        maxWidth: '65%',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.2'
                    }}>{title}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', opacity: 0.8 }}>COUNT (%)</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {keys.map((k, i) => {
                        const count = dataObj[k];
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        const nodeId = `${title}_${k}`;
                        const isExpanded = expandedNode === nodeId;

                        return (
                            <li
                                key={i}
                                style={{
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-color)',
                                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    borderRadius: '0.5rem',
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {/* Visible Row Header */}
                                <div
                                    className="drilldown-action"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem 0.75rem',
                                        cursor: drilldownConfig ? 'pointer' : 'default',
                                        background: isExpanded ? 'rgba(251, 191, 36, 0.08)' : 'transparent',
                                        borderLeft: isExpanded ? '3px solid #fbbf24' : '3px solid transparent'
                                    }}
                                    onMouseEnter={e => { if (drilldownConfig && !isExpanded) e.currentTarget.style.background = 'rgba(251, 191, 36, 0.05)'; }}
                                    onMouseLeave={e => { if (drilldownConfig && !isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                    onClick={() => {
                                        if (drilldownConfig) {
                                            if (isExpanded) {
                                                setExpandedNode(null);
                                                setExpandedSubNode(null);
                                                setClickedData(null);
                                            } else {
                                                setExpandedNode(nodeId);
                                                setExpandedSubNode(null);
                                                if (customLayerOpts?.type === 'globalProducts') {
                                                    // For Global Products, L1 click only expands L2. No raw table.
                                                    setClickedData(null);
                                                } else {
                                                    // For all other sections (Age, City, Gender, etc.), L1 click shows raw table.
                                                    const filtered = dashboardData.objRows.filter(rowObj => drilldownConfig(rowObj, k));
                                                    setClickedData({ nodeId, rows: filtered });
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem', color: isExpanded ? '#fbbf24' : 'inherit', fontWeight: isExpanded ? 'bold' : 'normal' }} title={k}>
                                        {k}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                                        <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem', minWidth: '2.5rem' }}>{count}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', minWidth: '3.5rem', opacity: 0.9 }}>({percent}%)</span>
                                    </div>
                                </div>

                                {/* Inline Nested Aggregations (L2 Packaging / L3 Platform) */}
                                {isExpanded && customLayerOpts?.type === 'globalProducts' && (
                                    (() => {
                                        const parentFiltered = dashboardData.objRows.filter(rowObj => drilldownConfig(rowObj, k));
                                        const catLC = k.toLowerCase();
                                        const packCol = catLC.includes('shampoo') ? 'AD' : (catLC.includes('hair oil') ? 'AL' : null);

                                        if (!packCol) {
                                            // Skip to Platform Layer
                                            let pCol = 'BI';
                                            if (catLC.includes('conditioner')) pCol = 'BD';
                                            else if (catLC.includes('serum')) pCol = 'BF';
                                            else if (catLC.includes('mask')) pCol = 'BG';
                                            else if (catLC.includes('gel')) pCol = 'BH';

                                            const stats = { "General Trade": 0, "Modern Trade": 0, "E Comm": 0, "Quick Comm": 0 };
                                            parentFiltered.forEach(rowObj => {
                                                const cVal = rowObj[pCol];
                                                if (!cVal) return;
                                                const uniquePlatforms = new Set();
                                                cVal.toString().split(',').forEach(item => {
                                                    let p = getClubbedPlatform(item.trim());
                                                    uniquePlatforms.add(p);
                                                });
                                                if (uniquePlatforms.has("General/ Traditional Trade Store")) stats["General Trade"]++;
                                                if (uniquePlatforms.has("Modern Trade Store")) stats["Modern Trade"]++;
                                                if (uniquePlatforms.has("E Com")) stats["E Comm"]++;
                                                if (uniquePlatforms.has("Quick Comm")) stats["Quick Comm"]++;
                                            });

                                            return (
                                                <ul style={{ listStyle: 'none', padding: '0.5rem 1rem 0.5rem 2rem', margin: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {Object.entries(stats).map(([pK, pCount]) => {
                                                        if (pCount === 0) return null;
                                                        const pPercent = parentFiltered.length > 0 ? Math.round((pCount / parentFiltered.length) * 100) : 0;
                                                        const subNodeId = `${nodeId}_${pK}`;
                                                        const isSubClicked = clickedData?.nodeId === subNodeId;
                                                        return (
                                                            <li key={pK} style={{ marginBottom: '0.25rem' }}>
                                                                <div onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isSubClicked) {
                                                                        setClickedData(null);
                                                                    }
                                                                    else {
                                                                        const platformRows = parentFiltered.filter(rowObj => {
                                                                            const rowVal = rowObj[pCol];
                                                                            if (!rowVal) return false;
                                                                            return rowVal.toString().split(',').some(item => {
                                                                                let p = getClubbedPlatform(item.trim());
                                                                                let mapped = p === "General/ Traditional Trade Store" ? "General Trade" : (p === "Modern Trade Store" ? "Modern Trade" : (p === "E Com" ? "E Comm" : (p === "Quick Comm" ? "Quick Comm" : "")));
                                                                                return mapped === pK;
                                                                            });
                                                                        });
                                                                        setClickedData({ nodeId: subNodeId, rows: platformRows });
                                                                    }
                                                                }} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.8rem', color: isSubClicked ? '#fbbf24' : '#94a3b8', cursor: 'pointer', fontWeight: isSubClicked ? 'bold' : 'normal' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = isSubClicked ? '#fbbf24' : '#94a3b8'}>
                                                                    <span>{pK}</span>
                                                                    <span>{pCount} <span style={{ color: 'var(--primary)', opacity: 0.8 }}>({pPercent}%)</span></span>
                                                                </div>
                                                                {isSubClicked && renderInlineRawTable(clickedData.rows, true)}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            );
                                        } else {
                                            // Show Packaging Layer
                                            const stats = { "Bottle": 0, "Sachet": 0 };
                                            parentFiltered.forEach(rowObj => {
                                                const val = (rowObj[packCol] || "").toString().toLowerCase();
                                                if (val.includes('bottle')) stats["Bottle"]++;
                                                else if (val.includes('sachet')) stats["Sachet"]++;
                                            });

                                            return (
                                                <ul style={{ listStyle: 'none', padding: '0.5rem 1rem 0.5rem 2rem', margin: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {Object.entries(stats).map(([packK, packCount]) => {
                                                        if (packCount === 0) return null;
                                                        const packPercent = parentFiltered.length > 0 ? Math.round((packCount / parentFiltered.length) * 100) : 0;
                                                        const subNodeId = `${nodeId}_${packK}`;
                                                        const isSubExpanded = expandedSubNode === subNodeId;

                                                        return (
                                                            <li key={packK} style={{ marginBottom: '0.25rem' }}>
                                                                <div onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isSubExpanded) {
                                                                        setExpandedSubNode(null);
                                                                        setClickedData(null);
                                                                    }
                                                                    else {
                                                                        setExpandedSubNode(subNodeId);
                                                                        setClickedData(null);
                                                                    }
                                                                }} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.8rem', color: isSubExpanded ? '#fbbf24' : '#94a3b8', cursor: 'pointer', transition: 'color 0.2s', fontWeight: isSubExpanded ? 'bold' : 'normal' }}>
                                                                    <span>{packK} (Click for Platform)</span>
                                                                    <span>{packCount} <span style={{ opacity: 0.8 }}>({packPercent}%)</span></span>
                                                                </div>

                                                                {/* Level 3 Platform Split via Click */}
                                                                {isSubExpanded && (
                                                                    (() => {
                                                                        const packRows = parentFiltered.filter(rowObj => (rowObj[packCol] || "").toString().toLowerCase().includes(packK.toLowerCase()));
                                                                        let pCol = catLC.includes('shampoo') ? 'BC' : 'BE';
                                                                        const pStats = { "General Trade": 0, "Modern Trade": 0, "E Comm": 0, "Quick Comm": 0 };
                                                                        packRows.forEach(rowObj => {
                                                                            const cVal = rowObj[pCol];
                                                                            if (!cVal) return;
                                                                            const uniquePlatforms = new Set();
                                                                            cVal.toString().split(',').forEach(item => {
                                                                                let p = getClubbedPlatform(item.trim());
                                                                                uniquePlatforms.add(p);
                                                                            });
                                                                            if (uniquePlatforms.has("General/ Traditional Trade Store")) pStats["General Trade"]++;
                                                                            if (uniquePlatforms.has("Modern Trade Store")) pStats["Modern Trade"]++;
                                                                            if (uniquePlatforms.has("E Com")) pStats["E Comm"]++;
                                                                            if (uniquePlatforms.has("Quick Comm")) pStats["Quick Comm"]++;
                                                                        });
                                                                        return (
                                                                            <ul style={{ listStyle: 'none', padding: '0.2rem 0 0.2rem 1.5rem', margin: 0 }}>
                                                                                {Object.entries(pStats).map(([pK, pCount]) => {
                                                                                    if (pCount === 0) return null;
                                                                                    const pPercent = packRows.length > 0 ? Math.round((pCount / packRows.length) * 100) : 0;
                                                                                    const tier3Id = `${subNodeId}_${pK}`;
                                                                                    const isTier3Clicked = clickedData?.nodeId === tier3Id;
                                                                                    return (
                                                                                        <li key={pK}>
                                                                                            <div onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (isTier3Clicked) {
                                                                                                    setClickedData(null);
                                                                                                }
                                                                                                else {
                                                                                                    const platformRows = packRows.filter(rowObj => {
                                                                                                        const rowVal = rowObj[pCol];
                                                                                                        if (!rowVal) return false;
                                                                                                        return rowVal.toString().split(',').some(item => {
                                                                                                            let p = getClubbedPlatform(item.trim());
                                                                                                            let mapped = p === "General/ Traditional Trade Store" ? "General Trade" : (p === "Modern Trade Store" ? "Modern Trade" : (p === "E Com" ? "E Comm" : (p === "Quick Comm" ? "Quick Comm" : "")));
                                                                                                            return mapped === pK;
                                                                                                        });
                                                                                                    });
                                                                                                    setClickedData({ nodeId: tier3Id, rows: platformRows });
                                                                                                }
                                                                                            }} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.75rem', color: isTier3Clicked ? '#fbbf24' : '#64748b', cursor: 'pointer', fontWeight: isTier3Clicked ? 'bold' : 'normal' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = isTier3Clicked ? '#fbbf24' : '#64748b'}>
                                                                                                <span>{pK} {isTier3Clicked && <span style={{ fontSize: '0.65rem', fontWeight: 'normal', fontStyle: 'italic', opacity: 0.7 }}>(Click to close)</span>}</span>
                                                                                                <span>{pCount} <span style={{ opacity: 0.8 }}>({pPercent}%)</span></span>
                                                                                            </div>
                                                                                            {isTier3Clicked && renderInlineRawTable(clickedData.rows, true)}
                                                                                        </li>
                                                                                    )
                                                                                })}
                                                                            </ul>
                                                                        )
                                                                    })()
                                                                )}

                                                                {(clickedData?.nodeId === subNodeId) && renderInlineRawTable(clickedData.rows, true)}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            );
                                        }
                                    })()
                                )}

                                {/* Inline Raw Data Table rendering for exactly the parent node clicks */}
                                {(clickedData?.nodeId === nodeId) && renderInlineRawTable(clickedData.rows, true)}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    return (
        <div className="glass-card" style={{ padding: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '0.5rem' }}>Panel Creation Analytics</h2>
                <p style={{ color: 'var(--text-muted)' }}>Upload your GoSurvey export (CSV/Excel) to instantly calculate respondent statistics.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                    <button
                        className="premium-button"
                        style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            padding: '1rem 2rem',
                            fontSize: '1rem'
                        }}
                    >
                        {isProcessing ? 'Processing Data...' : 'Upload Survey Data'}
                    </button>
                    <input
                        type="file"
                        accept=".csv, .xls, .xlsx"
                        onChange={onFileUpload}
                        style={{ position: 'absolute', left: 0, top: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                </div>
                {fileName && (
                    <div style={{ alignSelf: 'center', marginLeft: '1rem', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                        Loaded: <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{fileName}</span>
                    </div>
                )}
            </div>

            {dashboardData && (
                <>
                    {/* Module A: Project Pulse */}
                    <div id="project-pulse-section" style={{ padding: '2.5rem', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '2.5rem', marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '800', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: '40px', height: '1.5px', background: 'var(--primary)', opacity: 0.5 }}></span>
                            PROJECT PULSE & CORE METRICS
                        </h3>
                        
                        {(() => {
                            const renderDrilldownInline = () => {
                                if (!activeCardDrilldown) return null;
                                return (
                                    <div className="glass-card" style={{ 
                                        gridColumn: '1 / -1',
                                        padding: '2rem', 
                                        marginTop: '1rem',
                                        marginBottom: '2rem', 
                                        border: `2px solid ${activeCardDrilldown.color}44`, 
                                        background: `${activeCardDrilldown.color}08`,
                                        animation: 'fadeIn 0.3s ease-out',
                                        zIndex: 10
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <h4 style={{ color: activeCardDrilldown.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900' }}>
                                                EXPLORING {activeCardDrilldown.title} <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 'normal' }}>({activeCardDrilldown.rows.length} records)</span>
                                            </h4>
                                            <button 
                                                onClick={() => setActiveCardDrilldown(null)}
                                                style={{ background: 'transparent', border: `1px solid ${activeCardDrilldown.color}44`, color: activeCardDrilldown.color, padding: '0.4rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}
                                            >
                                                CLOSE [X]
                                            </button>
                                        </div>
                                        {renderInlineRawTable(activeCardDrilldown.rows, true)}
                                    </div>
                                );
                            };

                            const isCurrentRowActive = (titles) => activeCardDrilldown && titles.includes(activeCardDrilldown.title);

                            const row1Titles = ["Total Entries", "Accepted Entries", "Days Running", "Hair Care Users"];
                            const row2Titles = ["Duplicate Entries", "Geo Mismatch", "Team Conversion", "Team Quality"];
                            const row3Titles = ["Team Productivity", "Team Integrity", "Team Performance Index"];

                            const teamConv = dashboardData.totalEntries > 0 ? (dashboardData.acceptedEntries / dashboardData.totalEntries) * 100 : 0;
                            const teamValid = dashboardData.acceptedEntries - (dashboardData.teamTotalShort + dashboardData.teamTotalLong);
                            const teamQual = dashboardData.acceptedEntries > 0 ? (teamValid / dashboardData.acceptedEntries) * 100 : 0;
                            const teamProdRaw = dashboardData.acceptedEntries / (dashboardData.daysCount || 1);
                            const teamProd = (teamProdRaw / (dashboardData.teamSize * 10)) * 100;
                            const teamInteg = dashboardData.acceptedEntries > 0 ? (1 - (dashboardData.teamTotalIntegrityErrors / dashboardData.acceptedEntries)) * 100 : 0;
                            const teamPerfIndex = (teamConv + teamQual + Math.min(100, teamProd) + teamInteg) / 4;

                            return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {/* Row 1 cards */}
                                    <div className="glass-card drilldown-action" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(241, 245, 249, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: activeCardDrilldown?.title === "Total Entries" ? '1px solid #fff' : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => toggleCardDrilldown("Total Entries", "var(--text)", (r) => true)}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Entries</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#fff', margin: '0.5rem 0' }}>{dashboardData.totalEntries}</div>
                                    </div>
                                    <div className="glass-card drilldown-action" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: activeCardDrilldown?.title === "Accepted Entries" ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.2)', cursor: 'pointer' }} onClick={() => toggleCardDrilldown("Accepted Entries", "#10b981", (r) => isAcceptedRow(r))}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Accepted Entries</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#10b981', margin: '0.5rem 0' }}>{dashboardData.acceptedEntries}</div>
                                    </div>
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Days Running</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#38bdf8', margin: '0.5rem 0' }}>{dashboardData.daysCount}</div>
                                    </div>
                                    <div className="glass-card drilldown-action" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: activeCardDrilldown?.title === "Hair Care Users" ? '1px solid #ec4899' : '1px solid rgba(236, 72, 153, 0.2)', cursor: 'pointer' }} onClick={() => toggleCardDrilldown("Hair Care Users", "#ec4899", (r) => isAcceptedRow(r) && (r['AA'] || "").toString().toLowerCase().trim() === 'yes')}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hair Care Users</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#ec4899', margin: '0.5rem 0' }}>{dashboardData.haircareUsers}</div>
                                    </div>

                                    {/* Drilldown for Row 1 */}
                                    {isCurrentRowActive(row1Titles) && renderDrilldownInline()}

                                    {/* Row 2 cards */}
                                    <div className="glass-card drilldown-action" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: activeCardDrilldown?.title === "Duplicate Entries" ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.2)', cursor: 'pointer' }} onClick={() => toggleCardDrilldown("Duplicate Entries", "#f59e0b", (r) => {
                                        const p = (r['P'] || "").toString().trim();
                                        return p && (dashboardData.phoneFreq || {})[p] > 1;
                                    })}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Duplicate Entries</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#f59e0b', margin: '0.5rem 0' }}>{dashboardData.duplicatePhoneEntries || 0}</div>
                                    </div>
                                    <div className="glass-card drilldown-action" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)', border: activeCardDrilldown?.title === "Geo Mismatch" ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }} onClick={() => toggleCardDrilldown("Geo Mismatch", "#ef4444", (r) => {
                                        const latLong = (r['L'] || "").toString().trim();
                                        const coords = latLong.split(',').map(c => parseFloat(c.trim()));
                                        const cityK = (r['K'] || "").toString().trim();
                                        const cityM = (r['M'] || "").toString().trim();
                                        const rowId = parseInt(r['A'], 10);
                                        const checkCity = (!isNaN(rowId) && rowId <= 113) ? (cityM || cityK) : (cityK || cityM);
                                        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]) && checkCity && CITY_COORDS[checkCity]) {
                                            return getDistance(coords[0], coords[1], CITY_COORDS[checkCity].lat, CITY_COORDS[checkCity].lon) > 100;
                                        }
                                        return false;
                                    })}>
                                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Geo Mismatch</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#ef4444', margin: '0.5rem 0' }}>{dashboardData.geoMismatchEntries || 0}</div>
                                    </div>
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }} title="Overall Team Conversion Rate">
                                        <h3 style={{ color: '#38bdf8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team Conversion</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#38bdf8', margin: '0.5rem 0' }}>{Math.round(teamConv)}%</div>
                                    </div>
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }} title="Overall Team Execution Quality (No Outliers)">
                                        <h3 style={{ color: '#10b981', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team Quality</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#10b981', margin: '0.5rem 0' }}>{Math.round(teamQual)}%</div>
                                    </div>

                                    {/* Drilldown for Row 2 */}
                                    {isCurrentRowActive(row2Titles) && renderDrilldownInline()}

                                    {/* Row 3 cards */}
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.1)' }} title={`Team Productivity vs Target 10/day/per person\nAverage Output: ${teamProdRaw.toFixed(1)}/day`}>
                                        <h3 style={{ color: '#fbbf24', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team Productivity</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#fbbf24', margin: '0.5rem 0' }}>{Math.min(100, Math.round(teamProd))}%</div>
                                    </div>
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)' }} title={`Team Data Integrity\nTotal Errors: ${dashboardData.teamTotalIntegrityErrors}`}>
                                        <h3 style={{ color: '#f43f5e', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team Integrity</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#f43f5e', margin: '0.5rem 0' }}>{Math.max(0, Math.round(teamInteg))}%</div>
                                    </div>
                                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(251, 191, 36, 0.3)', boxShadow: '0 0 30px rgba(251, 191, 36, 0.1)' }} title="Team's Overall Performance Weightage (Avg of all Core Metrics)">
                                        <h3 style={{ color: '#fbbf24', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900' }}>Team's Performance Index</h3>
                                        <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '900', color: '#fbbf24', margin: '0.5rem 0', textShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}>{Math.round(teamPerfIndex)}%</div>
                                    </div>

                                    {/* Drilldown for Row 3 */}
                                    {isCurrentRowActive(row3Titles) && renderDrilldownInline()}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Module B: Respondent Insights */}
                    <div style={{ padding: 'clamp(1rem, 5vw, 2.5rem)', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '2.5rem', marginBottom: '4rem', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '800', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: '40px', height: '1.5px', background: 'var(--primary)', opacity: 0.5 }}></span>
                            RESPONDENT DEMOGRAPHICS & USAGE
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)', // FORCED 3-Column Layout
                            gridAutoRows: '1fr',
                            gap: '2.5rem',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.cityStats, "City Breakdown", dashboardData.acceptedEntries, (row, val) => {
                                    const cityK = (row['K'] || "").toString().trim();
                                    const cityM = (row['M'] || "").toString().trim();

                                    const rowId = parseInt(row['A'], 10);
                                    let finalCity = "";
                                    if (!isNaN(rowId) && rowId <= 113) {
                                        finalCity = cityM || cityK;
                                    } else {
                                        finalCity = cityK || cityM;
                                    }

                                    if (val === "Unknown/Not Provided") return isAcceptedRow(row) && !finalCity;
                                    return isAcceptedRow(row) && finalCity === val;
                                })}
                            </div>
                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.ageStats, "Age Demographics", dashboardData.acceptedEntries, (row, val) => {
                                    const ageRaw = (row['O'] || "").trim();
                                    const age = parseInt(ageRaw, 10);
                                    if (val === "Other/Unknown") return isAcceptedRow(row) && (!ageRaw || isNaN(age));
                                    let ageMatch = false;
                                    if (val === "18-24") ageMatch = age >= 18 && age <= 24;
                                    else if (val === "25-34") ageMatch = age >= 25 && age <= 34;
                                    else if (val === "35-44") ageMatch = age >= 35 && age <= 44;
                                    else if (val === "44+") ageMatch = age > 44;
                                    else ageMatch = ageRaw === val;
                                    return isAcceptedRow(row) && ageMatch;
                                })}
                            </div>
                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.genderStats, "Gender Distribution", dashboardData.acceptedEntries, (row, val) => {
                                    const genRaw = (row['T'] || "").trim().toLowerCase();
                                    if (val === "Other/Unknown") return isAcceptedRow(row) && !genRaw;
                                    if (val === "Other") return isAcceptedRow(row) && genRaw && !genRaw.startsWith('m') && !genRaw.startsWith('f');
                                    return isAcceptedRow(row) && genRaw.startsWith(val.toLowerCase().charAt(0));
                                })}
                            </div>
                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.productUsers, "Global Products Used", dashboardData.acceptedEntries, (row, val) => isAcceptedRow(row) && (row['AB'] || "").trim().toLowerCase().includes(val.toLowerCase()), { type: 'globalProducts' })}
                            </div>

                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.platformStats, "Overall Purchase Platforms", dashboardData.acceptedEntries, (row, val) => {
                                    if (!isAcceptedRow(row)) return false;
                                    const cols = ["BC", "BD", "BE", "BF", "BG", "BH", "BI"];
                                    return cols.some(c => {
                                        const cVal = row[c];
                                        if (!cVal) return false;
                                        const items = cVal.toString().split(',').map(i => i.trim()).filter(i => i !== "");
                                        return items.some(item => {
                                            let p = getClubbedPlatform(item);
                                            let mapped = "";
                                            if (p === "General/ Traditional Trade Store") mapped = "General Trade";
                                            else if (p === "Modern Trade Store") mapped = "Modern Trade";
                                            else if (p === "E Com") mapped = "E Comm";
                                            else if (p === "Quick Comm") mapped = "Quick Comm";
                                            return mapped === val;
                                        });
                                    });
                                })}
                            </div>

                            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {renderTable(dashboardData.geoFencingStats, "Geo Fencing Status", dashboardData.acceptedEntries, (row, val) => {
                                    const latLong = (row['L'] || "").toString().trim();
                                    const coords = latLong.split(',').map(c => parseFloat(c.trim()));
                                    const cityK = (row['K'] || "").toString().trim();
                                    const cityM = (row['M'] || "").toString().trim();
                                    const rowId = parseInt(row['A'], 10);
                                    const checkCity = (!isNaN(rowId) && rowId <= 113) ? (cityM || cityK) : (cityK || cityM);

                                    const hasCoords = coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]);
                                    const hasCityMap = checkCity && CITY_COORDS[checkCity];

                                    if (val === "Unknown") {
                                        return isAcceptedRow(row) && (!hasCoords || !hasCityMap);
                                    }

                                    if (hasCoords && hasCityMap) {
                                        const dist = getDistance(coords[0], coords[1], CITY_COORDS[checkCity].lat, CITY_COORDS[checkCity].lon);
                                        if (val === "Outside City Limits") return isAcceptedRow(row) && dist > 100;
                                        if (val === "Within City Limits") return isAcceptedRow(row) && dist <= 100;
                                    }
                                    return false;
                                })}
                            </div>
                        </div>
                    </div>



                    {/* Category selection header */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', padding: '1.5rem', borderRadius: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1rem', textAlign: 'center', fontWeight: '800', letterSpacing: '0.1em' }}>CATEGORY DEEP DIVES</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '0.75rem',
                            padding: '0.5rem',
                        }}>
                            {sectionConfig.map((section, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveCategoryIdx(idx)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.75rem',
                                        border: `1px solid ${activeCategoryIdx === idx ? section.color : 'rgba(255,255,255,0.1)'}`,
                                        background: activeCategoryIdx === idx ? `${section.color}22` : 'transparent',
                                        color: activeCategoryIdx === idx ? section.color : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: activeCategoryIdx === idx ? 'bold' : 'normal',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeCategoryIdx !== idx) {
                                            e.currentTarget.style.border = `1px solid ${section.color}88`;
                                            e.currentTarget.style.color = section.color;
                                            e.currentTarget.style.background = `${section.color}11`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeCategoryIdx !== idx) {
                                            e.currentTarget.style.border = '1px solid rgba(0,0,0,0.1)';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {section.title.replace(' Deep Dive', '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Render Only Selected Category */}
                    {activeCategoryIdx !== null && (
                        <div className="glass-card" style={{
                            padding: '2.5rem',
                            borderTop: `4px solid ${sectionConfig[activeCategoryIdx].color}`,
                            animation: 'fadeIn 0.4s ease-out'
                        }}>
                            <h3 style={{ margin: '0 0 2rem 0', color: sectionConfig[activeCategoryIdx].color, fontSize: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{sectionConfig[activeCategoryIdx].title}</span>
                                <div style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', background: `${sectionConfig[activeCategoryIdx].color}22`, fontSize: '0.8rem', border: `1px solid ${sectionConfig[activeCategoryIdx].color}44` }}>
                                    {sectionConfig[activeCategoryIdx].cols.length} Columns tracked
                                </div>
                            </h3>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gridAutoRows: '1fr', 
                                gap: '1.5rem'
                            }}>
                                {sectionConfig[activeCategoryIdx].cols.map(colLetter => (
                                    <div key={colLetter} style={{ width: '100%' }}>
                                        {renderTable(
                                            dashboardData.tallies[colLetter],
                                            formatHeaderTitle(headersMap[colLetter] || `Column ${colLetter}`),
                                            dashboardData.acceptedEntries,
                                            (row, val) => {
                                                const raw = (row[colLetter] || "").toString().toLowerCase();
                                                let match = false;
                                                // Handle clubbing logic in reverse/matching
                                                if (["BC", "BD", "BE", "BF", "BG", "BH", "BI"].includes(colLetter)) {
                                                    match = getClubbedPlatform(raw) === val;
                                                } else {
                                                    match = raw.includes(val.toLowerCase());
                                                }
                                                return isAcceptedRow(row) && match;
                                            }
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Module C: Field Operations */}
                    <div style={{ padding: 'clamp(1rem, 5vw, 2.5rem)', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '2.5rem', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                        <h2 style={{ color: 'var(--primary)', fontSize: 'clamp(1rem, 4vw, 1.4rem)', fontWeight: '900', textAlign: 'center', marginBottom: 'clamp(1.5rem, 5vw, 3rem)', letterSpacing: '0.15em' }}>FIELD TEAM PERFORMANCE RADAR</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '3.5rem', maxWidth: '900px', margin: '0 auto 3.5rem auto' }}>
                            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Team's Quality</div>
                                <div style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '0.25rem' }}>Target: 50%</div>
                                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900', color: dashboardData.teamAvgQual >= 50 ? '#10b981' : '#f87171' }}>{dashboardData.teamAvgQual}%</div>
                            </div>

                            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.05)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Team's Productivity</div>
                                <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '0.25rem' }}>Target: 50 rec/day</div>
                                <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '900', color: dashboardData.teamAvgProd >= 50 ? '#10b981' : '#f87171' }}>{dashboardData.teamAvgProd}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '3rem' }}>
                            {/* Team Standing Scatter Chart */}
                            <div className="glass-card" style={{ padding: '2.5rem', background: 'rgba(15, 23, 42, 0.3)' }}>
                                <h3 style={{ color: 'var(--primary)', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                                    <span>TEAM VELOCITY MAP</span>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.7rem', opacity: 0.8 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div> High Performers
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></div> Action Required
                                        </span>
                                    </div>
                                </h3>

                                <div style={{ height: 400, width: '100%', position: 'relative' }}>
                                    {/* Quadrant Labels */}
                                    <div style={{ position: 'absolute', top: 5, right: 60, fontSize: '0.7rem', color: '#10b981', opacity: 0.6, fontWeight: 'bold' }}>STARS (HIGH SPEED & QUALITY)</div>
                                    <div style={{ position: 'absolute', bottom: 60, left: 60, fontSize: '0.7rem', color: '#f87171', opacity: 0.6, fontWeight: 'bold' }}>NEEDS QC SUPPORT</div>

                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis
                                                type="number"
                                                dataKey="productivity"
                                                name="Records/Day"
                                                unit=""
                                                stroke="var(--text-muted)"
                                                label={{ value: 'Productivity (Records/Day)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 12 }}
                                            />
                                            <YAxis
                                                type="number"
                                                dataKey="quality"
                                                name="Quality"
                                                unit="%"
                                                domain={[0, 100]}
                                                stroke="var(--text-muted)"
                                                label={{ value: 'Quality (Accepted %)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
                                            />
                                            <ZAxis type="number" dataKey="total" range={[50, 400]} />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                                                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: 'var(--primary)' }}>{data.name}</p>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)' }}>Productivity: <span style={{ fontWeight: 'bold', color: '#fff' }}>{data.productivity} rec/day</span></p>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)' }}>Quality Score: <span style={{ color: data.quality >= 50 ? '#10b981' : '#f87171', fontWeight: 'bold' }}>{data.quality}%</span></p>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Records: <span>{data.total}</span></p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            {/* Targets */}
                                            <ReferenceLine x={50} stroke="#f87171" strokeDasharray="5 5" strokeWidth={2}>
                                                <Label value="Target: 50" position="top" fill="#f87171" fontSize={10} />
                                            </ReferenceLine>
                                            <ReferenceLine y={50} stroke="var(--secondary)" strokeDasharray="5 5" strokeWidth={2}>
                                                <Label value="Target: 50%" position="right" fill="var(--secondary)" fontSize={10} />
                                            </ReferenceLine>

                                            {/* Team Average Marker */}
                                            {(() => {
                                                const statsArray = Object.values(dashboardData.interviewerStats);
                                                const avgProd = statsArray.reduce((acc, s) => acc + (s.total / (dashboardData.daysCount || 1)), 0) / statsArray.length;
                                                const avgQual = statsArray.reduce((acc, s) => acc + ((s.accepted / s.total) * 100), 0) / statsArray.length;
                                                return (
                                                    <Scatter
                                                        data={[{ productivity: avgProd, quality: avgQual, name: 'TEAM AVERAGE' }]}
                                                        fill="var(--primary)"
                                                        shape="diamond"
                                                    />
                                                );
                                            })()}

                                            <Scatter
                                                name="Interviewers"
                                                data={Object.entries(dashboardData.interviewerStats).map(([name, stats]) => ({
                                                    name,
                                                    productivity: parseFloat((stats.total / (dashboardData.daysCount || 1)).toFixed(2)),
                                                    quality: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
                                                    total: stats.total
                                                }))}
                                            >
                                                {Object.entries(dashboardData.interviewerStats).map((entry, index) => {
                                                    const stats = entry[1];
                                                    const prod = stats.accepted / (dashboardData.daysCount || 1);
                                                    const qual = stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0;
                                                    const isStar = prod >= 50 && qual >= 50;
                                                    return <Cell key={`cell-${index}`} fill={isStar ? '#10b981' : (qual < 50 ? '#f87171' : '#38bdf8')} />;
                                                })}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Interviewer Performance Section */}
                            <div id="performance-scorecard-section" className="glass-card" style={{ padding: '2.5rem', background: 'rgba(15, 23, 42, 0.3)' }}>
                                <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.1em' }}>
                                    <span>INDIVIDUAL PERFORMANCE SCORECARD</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>* Click 'Accepted' counts to view specific records</span>
                                </h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', textAlign: 'left', fontWeight: '900' }}>Interviewer</th>
                                                <th style={{ padding: '1.2rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '900' }}>Total</th>
                                                <th style={{ padding: '1.2rem', color: 'var(--primary)', textAlign: 'center', fontWeight: '900' }}>Accepted</th>
                                                <th style={{ padding: '1.2rem', color: '#38bdf8', textAlign: 'center', fontWeight: '900' }} title={`Logic: (Accepted / Total Attempts) * 30%`}>Conversion (30%)</th>
                                                <th style={{ padding: '1.2rem', color: '#10b981', textAlign: 'center', fontWeight: '900' }} title={`Logic: (Valid / Accepted) * 30%\nValid = No outliers (<15s or >15m)`}>Quality (30%)</th>
                                                <th style={{ padding: '1.2rem', color: '#fbbf24', textAlign: 'center', fontWeight: '900' }} title={`Logic: (Accepted per Day / Target 10) * 20%`}>Productivity (20%)</th>
                                                <th style={{ padding: '1.2rem', color: '#f43f5e', textAlign: 'center', fontWeight: '900' }} title={`Logic: (100 - Error Rate) * 20%\nErrors = Missing City, Age, Gender, or Duration`}>Integrity (20%)</th>
                                                <th style={{ padding: '1.2rem', color: '#fff', textAlign: 'right', fontWeight: '900' }}>Performance Index</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(dashboardData.interviewerStats)
                                                .sort((a, b) => b[1].accepted - a[1].accepted)
                                                .map(([name, stats]) => {
                                                    const days = dashboardData.daysCount || 1;

                                                    // 1. Conversion Score (30%)
                                                    const convBase = stats.total > 0 ? (stats.accepted / stats.total) : 0;
                                                    const convScore = convBase * 30;

                                                    // 2. Execution Quality (30%)
                                                    const validCount = stats.accepted - (stats.short + stats.long);
                                                    const qualBase = stats.accepted > 0 ? (validCount / stats.accepted) : 0;
                                                    const qualScore = qualBase * 30;

                                                    // 3. Productivity Score (20%) - Target 10/day
                                                    const recPerDay = stats.accepted / days;
                                                    const prodBase = Math.min(1, recPerDay / 10);
                                                    const prodScore = prodBase * 20;

                                                    // 4. Integrity Score (20%)
                                                    const errorsBase = stats.accepted > 0 ? (stats.integrityErrors / stats.accepted) : 0;
                                                    const integBase = Math.max(0, 1 - errorsBase);
                                                    const integScore = integBase * 20;

                                                    const totalScore = Math.round(convScore + qualScore + prodScore + integScore);
                                                    const isExpanded = expandedInterviewer === name;

                                                    return (
                                                        <React.Fragment key={name}>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isExpanded ? 'rgba(16, 185, 129, 0.05)' : 'transparent', transition: 'background 0.2s' }} onMouseEnter={e => !isExpanded && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => !isExpanded && (e.currentTarget.style.background = 'transparent')}>
                                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{name}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{stats.total}</td>
                                                                <td
                                                                    style={{ padding: '1rem', textAlign: 'center', color: '#10b981', fontWeight: '900', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px', textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedInterviewer(isExpanded ? null : name);
                                                                    }}
                                                                    title={isExpanded ? "Click to collapse" : "Click to expand data below"}
                                                                >
                                                                    {stats.accepted}
                                                                </td>

                                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#38bdf8', fontWeight: '700' }} title={`Raw Conv: ${Math.round(convBase * 100)}% | Weighted: ${convScore.toFixed(1)}/30`}>
                                                                    {Math.round(convScore)}%
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#10b981', fontWeight: '700' }} title={`Raw Qual: ${Math.round(qualBase * 100)}% | Weighted: ${qualScore.toFixed(1)}/30`}>
                                                                    {Math.round(qualScore)}%
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#fbbf24', fontWeight: '700' }} title={`Accepted/Day: ${recPerDay.toFixed(1)} | Weighted: ${prodScore.toFixed(1)}/20`}>
                                                                    {Math.round(prodScore)}%
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#f43f5e', fontWeight: '700' }} title={`Errors: ${stats.integrityErrors} | Weighted: ${integScore.toFixed(1)}/20`}>
                                                                    {Math.round(integScore)}%
                                                                </td>

                                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: totalScore >= 80 ? 'rgba(16, 185, 129, 0.2)' : totalScore >= 50 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(244, 63, 94, 0.2)', border: `1px solid ${totalScore >= 80 ? '#10b981' : totalScore >= 50 ? '#fbbf24' : '#f43f5e'}`, color: '#fff' }}>
                                                                        <span style={{ fontWeight: '900' }}>{totalScore}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr style={{ background: 'rgba(2, 6, 23, 0.4)' }}>
                                                                    <td colSpan={8} style={{ padding: '0' }}>
                                                                        <div className="inline-explorer-wrapper fade-in" style={{
                                                                            padding: '1rem',
                                                                            background: 'rgba(6, 78, 59, 0.15)',
                                                                            borderTop: '2px solid #10b981',
                                                                            borderBottom: '2px solid #10b981',
                                                                            width: '100%',
                                                                            maxWidth: 'calc(100vw - 4rem)',
                                                                            boxSizing: 'border-box'
                                                                        }}>
                                                                            {/* Header with High-Visibility Close Button */}
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                marginBottom: '1rem',
                                                                                position: 'sticky',
                                                                                left: 0,
                                                                                padding: '0.5rem 0',
                                                                                borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                                                                            }}>
                                                                                <div>
                                                                                    <h4 style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '900', letterSpacing: '0.05em', margin: 0 }}>INLINE EXPLORER: {name.toUpperCase()} (ACCEPTED RECORDS)</h4>
                                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Reviewing verified field data directly below scorecard</div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setExpandedInterviewer(null)}
                                                                                    className="premium-button"
                                                                                    style={{ padding: '0.4rem 1.2rem', fontSize: '0.7rem', fontWeight: 'bold' }}
                                                                                >
                                                                                    CLOSE DATA DRAWER ⨉
                                                                                </button>
                                                                            </div>

                                                                            <div style={{
                                                                                overflowX: 'auto',
                                                                                maxHeight: '450px',
                                                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                                                borderRadius: '8px',
                                                                                background: 'rgba(15, 23, 42, 0.6)',
                                                                                scrollbarWidth: 'thin',
                                                                                scrollbarColor: '#10b981 rgba(0,0,0,0.1)'
                                                                            }}>
                                                                                <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: '0', fontSize: '0.7rem' }}>
                                                                                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                                                                                        <tr style={{ background: '#0f172a' }}>
                                                                                            {Object.keys(headersMap).map(letter => (
                                                                                                <th key={letter} style={{
                                                                                                    padding: '1rem',
                                                                                                    textAlign: 'left',
                                                                                                    borderBottom: '2px solid #fbbf24',
                                                                                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                                                                                    background: '#0f172a'
                                                                                                }}>
                                                                                                    <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '0.75rem', textShadow: '0 0 10px rgba(251, 191, 36, 0.6)' }}>COL {letter}</div>
                                                                                                    <div style={{ color: '#f1f5f9', fontWeight: '500', fontSize: '0.65rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{headersMap[letter]}</div>
                                                                                                </th>
                                                                                            ))}
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {dashboardData.rawRows
                                                                                            .filter(rowArr => {
                                                                                                const row = getRowObj(rowArr);
                                                                                                if (!isAcceptedRow(row)) return false;
                                                                                                let rName = (row['EU'] || "").toString().trim();
                                                                                                const lName = rName.toLowerCase();
                                                                                                if (lName === 'rajeah' || lName === 'rajesh' || lName === 'rajesh pandey') rName = 'Rajesh Pandey';
                                                                                                if (lName === 'harish') rName = 'Harish';
                                                                                                if (lName === 'afi') rName = 'Adi';
                                                                                                return rName === name;
                                                                                            })
                                                                                            .slice(0, 500)
                                                                                            .map((rowArr, ridx) => (
                                                                                                <tr key={ridx} style={{ background: ridx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = ridx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                                                                    {rowArr.map((cell, cidx) => (
                                                                                                        <td key={cidx} style={{
                                                                                                            padding: '0.8rem 1rem',
                                                                                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                                                                            borderRight: '1px solid rgba(255,255,255,0.03)',
                                                                                                            color: '#94a3b8',
                                                                                                            whiteSpace: 'nowrap',
                                                                                                            maxWidth: '250px',
                                                                                                            overflow: 'hidden',
                                                                                                            textOverflow: 'ellipsis'
                                                                                                        }}>
                                                                                                            {cell?.toString() || <span style={{ opacity: 0.1 }}>—</span>}
                                                                                                        </td>
                                                                                                    ))}
                                                                                                </tr>
                                                                                            ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal deleted to embrace full inline-accordion architecture */}
        </div>
    );
};

export default PanelDashboard;
