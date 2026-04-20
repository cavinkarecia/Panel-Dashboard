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
        console.warn("SLACK_BOT_TOKEN not found. Skipping Slack dispatch.");
        return;
    }

    try {
        // 1. Look up User ID by Email
        const userLookup = await client.users.lookupByEmail({ email });
        if (!userLookup.ok) {
            console.error(`Slack Lookup Failed for ${email}: ${userLookup.error}`);
            return;
        }

        const userId = userLookup.user.id;

        // 2. Construct Block Kit Message
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
        await client.chat.postMessage({
            channel: userId,
            blocks: blocks,
            text: "CavinKare Panel Creation Performance Report"
        });

        return { success: true, email };
    } catch (err) {
        console.error(`Slack Delivery Failure for ${email}:`, err.message);
        return { success: false, email, error: err.message };
    }
}

module.exports = { sendSlackDM };
