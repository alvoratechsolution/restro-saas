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

async function sendWelcomeRegistrationEmail(dataOrEmail, legacyName, legacyRestaurantName, legacyPassword, legacyPlan, legacyHasKitchen, legacyHasStaff) {
  let email, name, restaurantName, password, plan, hasKitchen, hasStaff;

  if (typeof dataOrEmail === "object" && dataOrEmail !== null) {
    email = dataOrEmail.email;
    name = dataOrEmail.name;
    restaurantName = dataOrEmail.restaurantName;
    password = dataOrEmail.password;
    plan = dataOrEmail.plan;
    hasKitchen = dataOrEmail.hasKitchen;
    hasStaff = dataOrEmail.hasStaff;
  } else {
    email = dataOrEmail;
    name = legacyName;
    restaurantName = legacyRestaurantName;
    password = legacyPassword;
    plan = legacyPlan;
    hasKitchen = legacyHasKitchen;
    hasStaff = legacyHasStaff;
  }

  const isConfigured =
    process.env.SMTP_USER &&
    !process.env.SMTP_USER.includes("your_smtp") &&
    !process.env.SMTP_USER.includes("your_email");

  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://restro-saas-website.vercel.app") + "/login";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk - Alvora Tech" <noreply@servedesk.com>',
    to: email,
    subject: `🎉 Welcome to ServeDesk - ${restaurantName} is Activated!`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
        <!-- Header Branding -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f97316); padding: 12px 28px; border-radius: 14px; color: #ffffff; font-weight: 900; font-size: 24px; letter-spacing: -0.5px; box-shadow: 0 8px 16px rgba(234, 88, 12, 0.25);">
            ServeDesk
          </div>
          <p style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 8px 0 0 0;">
            Powered by Alvora Tech Solution
          </p>
        </div>

        <!-- Warm Greeting & Wishes -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; line-height: 1.3;">
            🎉 Welcome & Best Wishes!
          </h2>
          <p style="color: #ea580c; font-size: 14px; font-weight: 700; margin: 0;">
            ${restaurantName} is officially activated on ServeDesk
          </p>
        </div>

        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0;">
          Hello <strong>${name || restaurantName + " Admin"}</strong>,
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0 0 20px 0;">
          We extend our warmest greetings and heartfelt wishes on onboarding your restaurant to the <strong>ServeDesk</strong> intelligent dining platform (proudly developed & powered by <strong>Alvora Tech Solution</strong>). We wish you tremendous business growth, bustling dining halls, and delighted customers every single day! 🚀🍽️
        </p>

        <!-- Login Credentials Card -->
        <div style="background: linear-gradient(135deg, #0b0f19, #161c2d); border: 1px solid #334155; border-radius: 16px; padding: 22px; margin: 0 0 22px 0; color: #ffffff;">
          <div style="margin-bottom: 14px;">
            <span style="background-color: rgba(234, 88, 12, 0.2); color: #fb923c; border: 1px solid rgba(234, 88, 12, 0.4); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 8px;">
              🔑 Your Admin Access Credentials
            </span>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
            <tr>
              <td style="padding: 7px 0; width: 130px; font-weight: 600; color: #94a3b8;">Portal Login:</td>
              <td style="padding: 7px 0;"><a href="${loginUrl}" style="color: #38bdf8; text-decoration: underline; font-weight: 700;">${loginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding: 7px 0; font-weight: 600; color: #94a3b8;">Admin Email / ID:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #ffffff;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; font-weight: 600; color: #94a3b8;">Password:</td>
              <td style="padding: 7px 0;">
                <span style="font-family: monospace; font-size: 14px; background-color: #1e293b; color: #fbbf24; border: 1px dashed #475569; padding: 3px 9px; border-radius: 6px; font-weight: 700; letter-spacing: 1px;">
                  ${password || "•••••••• (As specified during onboarding)"}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 7px 0; font-weight: 600; color: #94a3b8;">User Role:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #4ade80;">Restaurant Administrator</td>
            </tr>
          </table>
        </div>

        <!-- Subscription Plan & Quota Details -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 0 0 24px 0;">
          <h4 style="color: #0f172a; margin: 0 0 12px 0; font-size: 14px; font-weight: 800;">
            📦 Subscription Plan & Quota Entitlements
          </h4>
          <div style="font-size: 13px; color: #475569; line-height: 1.8;">
            <div><strong>Active Plan:</strong> <span style="color: #ea580c; font-weight: 700;">${plan?.name || "Trial Plan"}</span> (${plan?.price ? "₹" + plan.price : "Free Trial"} / ${plan?.billingCycle || "monthly"})</div>
            <div><strong>Max Branches Allowed:</strong> Up to ${plan?.maxBranches || 1} Branch(es)</div>
            <div><strong>Seating Table Capacity:</strong> Up to ${plan?.maxTablesPerBranch || 10} Tables per branch</div>
            <div><strong>Digital Menu Capacity:</strong> Up to ${plan?.maxMenuItems || 50} Dishes</div>
          </div>

          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #475569;">
            <strong>Assigned Operational Roles & Modules:</strong>
            <div style="margin-top: 8px;">
              <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 700; margin-right: 6px; margin-bottom: 4px;">
                ✓ Admin Console
              </span>
              <span style="display: inline-block; ${hasKitchen !== false ? "background-color: #fef3c7; color: #92400e;" : "background-color: #f1f5f9; color: #94a3b8; text-decoration: line-through;"} padding: 4px 10px; border-radius: 6px; font-weight: 700; margin-right: 6px; margin-bottom: 4px;">
                ${hasKitchen !== false ? "✓" : "✗"} Kitchen Display System (KDS)
              </span>
              <span style="display: inline-block; ${hasStaff !== false ? "background-color: #dcfce7; color: #166534;" : "background-color: #f1f5f9; color: #94a3b8; text-decoration: line-through;"} padding: 4px 10px; border-radius: 6px; font-weight: 700; margin-right: 6px; margin-bottom: 4px;">
                ${hasStaff !== false ? "✓" : "✗"} Staff & Waiter Portal
              </span>
            </div>
          </div>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 15px 36px; border-radius: 12px; display: inline-block; box-shadow: 0 6px 18px rgba(234, 88, 12, 0.35);">
            Sign In to Restaurant Console &rarr;
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
          For security, you can change your password at any time via Settings &gt; Profile.
        </p>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        
        <!-- Footer & Alvora Tech Solution Details -->
        <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
          <p style="margin: 0; font-weight: 800; color: #475569; font-size: 12px;">ServeDesk Intelligent Dining Suite</p>
          <p style="margin: 3px 0 0 0;">Proudly developed & managed by <strong>Alvora Tech Solution</strong>.</p>
          <p style="margin: 3px 0 0 0;">Technical Support & Inquiries: <a href="mailto:support@alvoratech.com" style="color: #ea580c; text-decoration: none; font-weight: 600;">support@alvoratech.com</a></p>
        </div>
      </div>
    `,
  };

  if (!isConfigured) {
    console.log(`[SMTP Notice] Welcome email to ${email} skipped because SMTP_USER is not configured in .env.`);
    console.log(`[SMTP Email Prepared] Credentials email for ${restaurantName} (Login: ${email}, Pass: ${password}) ready to send when SMTP credentials are added.`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Onboarding email with credentials sent to ${email}`);
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
