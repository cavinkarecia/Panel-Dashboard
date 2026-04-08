const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || "cavinkarecia@gmail.com",
    pass: process.env.EMAIL_PASS || "gtonpvcmvieycmcd",
  }
});

async function sendEmail(to, metrics = {}, dashboardUrl = "https://your-dashboard-link.com") {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0f172a; padding: 25px; text-align: center;">
            <h2 style="color: #fbbf24; margin: 0; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em;">Daily Performance Report</h2>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 0.9rem;">Panel Creation Dashboard & Audit Results</p>
        </div>

        <div style="padding: 30px;">
            <p>Hello Team,</p>
            <p>Here is the automated summary of the latest project performance and data integrity metrics:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #f1f5f9;">
                <tr style="background: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Metric</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.8rem; text-transform: uppercase;">Current Value</th>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: bold;">Total number of records</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-weight: 900; font-size: 1.1rem;">${metrics.totalRecords || 0}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: bold;">Total number of Accepted records</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #10b981; font-weight: 900; font-size: 1.1rem;">${metrics.acceptedRecords || 0}</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: bold;">Quality score</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #10b981; font-weight: 900; font-size: 1.1rem;">${metrics.qualityScore || 0}%</td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: bold;">Productivity score</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #38bdf8; font-weight: 900; font-size: 1.1rem;">${metrics.productivityScore || 0} <span style="font-size: 0.7rem; color: #64748b; font-weight: normal;">/ day</span></td>
                </tr>
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: bold;">Integrity score</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #f43f5e; font-weight: 900; font-size: 1.1rem;">${metrics.integrityScore || 0}%</td>
                </tr>
            </table>

            <p style="text-align: center; margin: 40px 0;">
                <a href="${dashboardUrl}" style="background: #fbbf24; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; border: 1px solid #d97706; display: inline-block;">ACCESS LIVE DASHBOARD</a>
            </p>

            <p style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                <span style="font-size: 1.1rem; font-weight: 900; color: #475569; display: block; margin-bottom: 2px;">Tanmay Bapat</span>
                <span style="font-size: 0.95rem; font-weight: 700; color: #64748b; display: block; margin-bottom: 12px;">Process Excellence Manager | CIA</span>
            </p>
        </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER || "cavinkarecia@gmail.com",
    to,
    subject: "📈 Daily Performance Summary: Panel Creation Dashboard",
    html
  };

  try {
    await transporter.verify();
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    throw err;
  }
}

module.exports = sendEmail;
