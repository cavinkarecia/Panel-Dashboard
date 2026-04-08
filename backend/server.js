require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { runReport } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

const USERS_FILE = path.join(__dirname, "users.json");

const loadUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            const defaults = [
                { email: "tanmay.v@cavinkare.com", active: true },
                { email: "saatvik.s@cavinkare.com", active: true }
            ];
            fs.writeFileSync(USERS_FILE, JSON.stringify(defaults, null, 2));
        }
        return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    } catch(e) {
        return [];
    }
};

const saveUsers = (data) => fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

let users = loadUsers();
let lastDashboardUrl = "http://localhost:5000";

/* API Endpoints */

app.get("/api/report-config", (req, res) => res.json({ lastDashboardUrl }));

app.post("/api/save-dashboard-url", (req, res) => {
    const { url } = req.body;
    if (url) {
        lastDashboardUrl = url;
        try {
            fs.writeFileSync(path.join(__dirname, "last_dashboard_url.txt"), url);
        } catch(e) {
            console.error("Failed to persist dashboard URL:", e);
        }
    }
    res.json({ success: true, url: lastDashboardUrl });
});

app.post("/api/save-dashboard-data", (req, res) => {
    try {
        fs.writeFileSync(path.join(__dirname, "last_dashboard_state.json"), JSON.stringify(req.body));
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get("/api/load-dashboard-data", (req, res) => {
    try {
        const filePath = path.join(__dirname, "last_dashboard_state.json");
        if (fs.existsSync(filePath)) {
            res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } else {
            res.json(null);
        }
    } catch(e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.get("/api/users", (req, res) => res.json(users));

app.post("/api/add-user", (req, res) => {
    const { email } = req.body;
    if (email && !users.find(u => u.email === email)) {
        users.push({ email, active: true });
        saveUsers(users);
    }
    res.json({ success: true, users });
});

app.post("/api/delete-user", (req, res) => {
    const { email } = req.body;
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
        users.splice(index, 1);
        saveUsers(users);
    }
    res.json({ success: true, users });
});

app.post("/api/select-users", (req, res) => {
    const { selectedEmails } = req.body;
    users.forEach(user => user.active = selectedEmails.includes(user.email));
    saveUsers(users);
    res.json({ success: true });
});

app.post("/api/trigger", async (req, res) => {
    try {
        await runReport(users);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: e.toString() });
    }
});

/* Unified Static Hosting */
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// Alternative catch-all to avoid RouteError issues
app.use((req, res, next) => {
    if (req.url.startsWith("/api")) return res.status(404).json({ error: "Not Found" });
    res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next(); // Fallback if file missing
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
