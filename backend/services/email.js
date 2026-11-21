const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(email, name, otp) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("your_smtp") || process.env.SMTP_USER.includes("your_email")) {
    console.log(`[SMTP Notice] OTP email to ${email} skipped because SMTP_USER is not configured in .env.`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk - Alvora Tech" <noreply@servedesk.com>',
    to: email,
    subject: "Reset Your Password - ServeDesk OTP Verification",
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ea580c; font-size: 24px; font-weight: 800; margin: 0;">ServeDesk</h1>
          <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0;">Powered by Alvora Tech Solution</p>
        </div>
        <h2 style="color: #0f172a; text-align: center; font-weight: 800; font-size: 18px;">OTP Verification Code</h2>
        <p style="color: #334155; font-size: 14px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">You requested to reset your password on ServeDesk. Use the following 6-digit verification code to proceed. This code is valid for 10 minutes.</p>
        <div style="text-align: center; margin: 26px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ea580c; border: 2px dashed #ea580c; padding: 12px 28px; border-radius: 12px; background-color: #fff7ed; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you did not request this, please disregard this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
          <p style="margin: 0; font-weight: 700; color: #64748b;">ServeDesk Platform</p>
          <p style="margin: 2px 0 0 0;">Powered by <strong>Alvora Tech Solution</strong>. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.warn("[SMTP Error] Failed to send OTP email:", err.message);
  }
}

async function sendWelcomeRegistrationEmail(email, name, restaurantName) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("your_smtp") || process.env.SMTP_USER.includes("your_email")) {
    console.log(`[SMTP Notice] Welcome email to ${email} skipped because SMTP_USER is not configured in .env.`);
    return;
  }

  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://restro-saas-website.vercel.app") + "/login";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk - Alvora Tech" <noreply@servedesk.com>',
    to: email,
    subject: `🎉 Welcome to ServeDesk - ${restaurantName} is Activated!`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f97316); padding: 10px 24px; border-radius: 12px; color: #ffffff; font-weight: 900; font-size: 22px;">
            ServeDesk
          </div>
          <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px;">
            Powered by Alvora Tech Solution
          </p>
        </div>

        <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-bottom: 12px; text-align: center;">
          🎉 You Are Now an Admin Member of ServeDesk!
        </h2>

        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Congratulations! Your restaurant account for <strong>${restaurantName}</strong> has been successfully registered and activated on <strong>ServeDesk</strong> (powered by <strong>Alvora Tech Solution</strong>).
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0;">
          <h4 style="color: #0f172a; margin: 0 0 10px 0; font-size: 14px; font-weight: 800;">⚡ Your Account Details:</h4>
          <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Restaurant Name:</strong> ${restaurantName}</p>
          <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Role:</strong> Restaurant Administrator</p>
          <p style="margin: 6px 0; color: #16a34a; font-size: 13px;"><strong>Platform Status:</strong> Active (14-Day Free Trial)</p>
          <p style="margin: 6px 0; color: #ea580c; font-size: 13px;"><strong>Solution Partner:</strong> Alvora Tech Solution</p>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          You can now sign in to your restaurant dashboard to set up your digital menu, download table QR scanners, and configure real-time kitchen KDS screens.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
            Sign In to Admin Console &rarr;
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
        <div style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          <p style="margin: 0; font-weight: 700; color: #475569;">ServeDesk Dining Operating System</p>
          <p style="margin: 2px 0 0 0;">Proudly powered by <strong>Alvora Tech Solution</strong>.</p>
          <p style="margin: 2px 0 0 0;">Need support? Contact support@alvoratech.com</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.warn("[SMTP Error] Failed to send welcome email:", err.message);
  }
}

async function sendStaffInviteEmail(email, name, role, restaurantName, tempPassword) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("your_smtp") || process.env.SMTP_USER.includes("your_email")) {
    console.log(`[SMTP Notice] Staff invite email to ${email} skipped because SMTP_USER is not configured in .env.`);
    return;
  }

  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://restro-saas-website.vercel.app") + "/login";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk - Alvora Tech" <noreply@servedesk.com>',
    to: email,
    subject: `🛎️ You are added as ${role} at ${restaurantName} - ServeDesk`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f97316); padding: 10px 24px; border-radius: 12px; color: #ffffff; font-weight: 900; font-size: 22px;">
            ServeDesk
          </div>
          <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px;">
            Powered by Alvora Tech Solution
          </p>
        </div>

        <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 12px; text-align: center;">
          Welcome to the Team!
        </h2>

        <p style="color: #475569; font-size: 14px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          You have been added as a <strong>${role}</strong> member for <strong>${restaurantName}</strong> on the <strong>ServeDesk</strong> platform (Powered by <strong>Alvora Tech Solution</strong>).
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin: 20px 0;">
          <h4 style="color: #0f172a; margin: 0 0 8px 0; font-size: 13px; font-weight: 800;">🔑 Your Login Credentials:</h4>
          <p style="margin: 4px 0; color: #475569; font-size: 13px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0; color: #475569; font-size: 13px;"><strong>Role:</strong> ${role}</p>
          ${tempPassword ? `<p style="margin: 4px 0; color: #475569; font-size: 13px;"><strong>Temporary Password:</strong> ${tempPassword}</p>` : ""}
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 12px; display: inline-block;">
            Sign In Now &rarr;
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0; font-weight: 700; color: #64748b;">ServeDesk · Powered by Alvora Tech Solution</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.warn("[SMTP Error] Failed to send staff invite email:", err.message);
  }
}

module.exports = {
  transporter,
  sendOtpEmail,
  sendWelcomeRegistrationEmail,
  sendStaffInviteEmail,
};
