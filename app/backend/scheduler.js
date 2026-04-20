const cron = require("node-cron");
const sendEmail = require("./email");
const { sendSlackDM } = require("./slack");
const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

const runReport = async (providedUsers = null) => {
  console.log("Running simplified performance report...");

  // 1. Load active users
  let activeUsers = [];
  if (providedUsers) {
      activeUsers = providedUsers.filter(u => u.active);
  } else {
      try {
          if (fs.existsSync(USERS_FILE)) {
              const allUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
              activeUsers = allUsers.filter(u => u.active);
          }
      } catch(e) {
          console.error("Error reading users.json during cron:", e);
      }
  }

  if (activeUsers.length === 0) {
      console.log("No active users. Skipping dispatch task.");
      return;
  }

  // 2. Load latest metrics from dashboard cache
  let metrics = {
      totalRecords: 0,
      acceptedRecords: 0,
      qualityScore: 0,
      productivityScore: 0,
      integrityScore: 100
  };

  const STATE_FILE = path.join(__dirname, "last_dashboard_state.json");
  if (fs.existsSync(STATE_FILE)) {
      try {
          const stateData = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
          const dbData = stateData.dashboardData;
          if (dbData) {
              const integ = dbData.acceptedEntries > 0 
                  ? Math.max(0, Math.round(((dbData.acceptedEntries - dbData.teamTotalIntegrityErrors) / dbData.acceptedEntries) * 100))
                  : 100;

              metrics = {
                  totalRecords: dbData.totalEntries || 0,
                  acceptedRecords: dbData.acceptedEntries || 0,
                  qualityScore: dbData.teamAvgQual || 0,
                  productivityScore: dbData.teamAvgProd || 0,
                  integrityScore: integ
              };
          }
      } catch (e) {
          console.error("Failed to parse last_dashboard_state.json:", e);
      }
  }

  // 3. Dispatch Reports (Email & Slack)
  let dashboardUrl = "https://panel-creation-dashboard.onrender.com"; // Fallback
  
  const URL_FILE = path.join(__dirname, "last_dashboard_url.txt");
  if (fs.existsSync(URL_FILE)) {
      try {
          dashboardUrl = fs.readFileSync(URL_FILE, "utf8").trim();
      } catch (e) {
          console.error("Failed to read last_dashboard_url.txt:", e);
      }
  }
  
  for (const user of activeUsers) {
    // 3a. Outlook Dispatch
    try {
      await sendEmail(user.email, metrics, dashboardUrl);
      console.log("Outlook report dispatched to:", user.email);
    } catch (err) {
      console.error("Failed executing outlook mailer to:", user.email, err);
    }

    // 3b. Slack Dispatch
    try {
      await sendSlackDM(user.email, metrics, dashboardUrl);
      console.log("Slack DM report dispatched to:", user.email);
    } catch (err) {
      console.error("Failed executing slack delivery to:", user.email, err);
    }
  }
};

cron.schedule("0 9 * * *", () => runReport());

module.exports = { runReport };
