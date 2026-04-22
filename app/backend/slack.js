const { WebClient } = require("@slack/web-api");
require("dotenv").config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Sends a Performance Summary as a Direct Message to a user.
 * @param {string} email - Recipient email (to look up Slack ID)
 * @param {object} metrics - Dashboard metrics object
 * @param {string} dashboardUrl - Live dashboard URL
 */
async function sendSlackDM(email, metrics = {}, dashboardUrl = "") {
    if (!process.env.SLACK_BOT_TOKEN) {
        console.warn("[Slack Debug] SLACK_BOT_TOKEN not found in environment. Skipping dispatch.");
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Slack Debug] Attempting DM for: ${normalizedEmail}`);

    try {
        // 1. Look up User ID by Email
        const userLookup = await client.users.lookupByEmail({ email: normalizedEmail });
        
        if (!userLookup.ok) {
            console.error(`[Slack Debug] Lookup Failed for ${normalizedEmail}:`, userLookup.error);
            if (userLookup.error === 'users_not_found') {
                console.warn(`[Slack Debug] Advice: Ensure '${normalizedEmail}' is the primary email on their Slack profile.`);
            } else if (userLookup.error === 'missing_scope') {
                console.warn(`[Slack Debug] Advice: Ensure your Slack App has the 'users:read.email' scope enabled.`);
            }
            return { success: false, error: userLookup.error };
        }

        const userId = userLookup.user.id;
        console.log(`[Slack Debug] Found User ID: ${userId} for ${normalizedEmail}`);

        // 2. Construct Block Kit Message (Keep existing blocks logic...)
        const blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📊 Daily Performance Report",
                    "emoji": true
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Hello <@${userId}>!* Here is the latest summary from the *Panel Creation Dashboard*:`
                }
            },
            {
                "type": "divider"
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Total Records:* \n${metrics.totalRecords || 0}`
                    },
                    {
                        "type": "mrkdwn",
                        "text": `*Accepted Records:* \n${metrics.acceptedRecords || 0}`
                    }
                ]
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Performance Index avg:* \n${metrics.qualityScore || 0}%`
                    },
                    {
                        "type": "mrkdwn",
                        "text": `*Productivity Score:* \n${metrics.productivityScore || 0} / day`
                    }
                ]
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": `*Integrity Score:* \n${metrics.integrityScore || 0}%`
                    }
                ]
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Access Live Dashboard",
                            "emoji": true
                        },
                        "url": dashboardUrl || "https://panel-creation-dashboard.onrender.com",
                        "style": "primary",
                        "action_id": "view_dashboard"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Download PDF Report",
                            "emoji": true
                        },
                        "url": `${dashboardUrl}?autoPrint=true` || "https://panel-creation-dashboard.onrender.com?autoPrint=true",
                        "action_id": "download_pdf"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Sent by: *CavinKare CIA Intelligence Platform*"
                    }
                ]
            }
        ];

        // 3. Post Message
        const result = await client.chat.postMessage({
            channel: userId,
            blocks: blocks,
            text: "CavinKare Panel Creation Performance Report"
        });

        if (result.ok) {
            console.log(`[Slack Debug] DM successfully delivered to ${normalizedEmail}`);
            return { success: true, email: normalizedEmail };
        } else {
            console.error(`[Slack Debug] PostMessage failed for ${normalizedEmail}:`, result.error);
            return { success: false, error: result.error };
        }

    } catch (err) {
        console.error(`[Slack Debug] Critical Error for ${normalizedEmail}:`, err.message);
        return { success: false, email: normalizedEmail, error: err.message };
    }
}

module.exports = { sendSlackDM };
