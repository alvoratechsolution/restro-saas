const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const LOGO_PATH = path.join(__dirname, "../assets/logo.png");

const getLogoAttachment = () => {
  if (fs.existsSync(LOGO_PATH)) {
    return [
      {
        filename: "logo.png",
        path: LOGO_PATH,
        cid: "servedesk-logo",
      },
    ];
  }
  return [];
};

const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
  const host = process.env.SMTP_HOST || "smtp.gmail.com";

  if (host.includes("gmail") || (user && user.includes("gmail"))) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

const transporter = createTransporter();

function isSmtpConfigured() {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  return Boolean(
    user &&
    !user.includes("your_smtp") &&
    !user.includes("your_email") &&
    pass &&
    !pass.includes("your_smtp") &&
    !pass.includes("your_password")
  );
}

// Reusable Header Component
const renderEmailHeader = () => `
  <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <img src="cid:servedesk-logo" alt="ServeDesk" width="46" height="46" style="display: block; border-radius: 12px; border: 1px solid rgba(234, 88, 12, 0.25);" />
        </td>
        <td style="vertical-align: middle; text-align: left;">
          <div style="font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1.1; letter-spacing: -0.5px;">
            ServeDesk
          </div>
          <div style="font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">
            by Alvora Tech Solution
          </div>
        </td>
      </tr>
    </table>
  </div>
`;

// Reusable Footer Component
const renderEmailFooter = () => `
  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
    <p style="margin: 0; font-weight: 700; color: #334155;">ServeDesk • Enterprise Dining Platform</p>
    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px;">
      Developed &amp; Maintained by <strong>Alvora Tech Solution</strong>.
    </p>
    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 11px;">
      Need assistance? Contact our team at <a href="mailto:support@alvoratech.com" style="color: #ea580c; text-decoration: none; font-weight: 600;">support@alvoratech.com</a>
    </p>
    <p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 10px;">
      This is an automated system notification from ServeDesk. Please do not reply directly to this email.
    </p>
  </div>
`;

// 1. Welcome Registration Email (Sent to newly onboarded restaurant admin)
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

  const isConfigured = isSmtpConfigured();
  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://restro-saas-website.vercel.app") + "/login";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk" <noreply@servedesk.com>',
    to: email,
    subject: `Your ServeDesk Account is Ready – ${restaurantName}`,
    attachments: getLogoAttachment(),
    html: `
      <div style="background-color: #f8fafc; padding: 36px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Top Accent Bar -->
          <div style="height: 4px; background: linear-gradient(90deg, #ea580c, #f59e0b);"></div>

          <div style="padding: 32px 28px;">
            ${renderEmailHeader()}

            <div style="padding-top: 24px;">
              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; letter-spacing: -0.3px;">
                Welcome to ServeDesk
              </h2>

              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${name || "Restaurant Administrator"}</strong>,<br/>
                Your administrator account for <strong>${restaurantName}</strong> is now configured and active. Below are your login credentials to access the management portal.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ea580c; margin-bottom: 12px;">
                  Admin Access Details
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b; width: 140px;">Portal URL:</td>
                    <td style="padding: 6px 0;">
                      <a href="${loginUrl}" style="color: #ea580c; font-weight: 700; text-decoration: none;">${loginUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Initial Password:</td>
                    <td style="padding: 6px 0;">
                      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-weight: 700; letter-spacing: 0.5px;">
                        ${password || "•••••••• (As specified during onboarding)"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Assigned Role:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #16a34a;">Restaurant Administrator</td>
                  </tr>
                </table>
              </div>

              <!-- Primary CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
                  Sign In to Control Panel →
                </a>
              </div>

              <!-- Getting Started Steps -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                  Quick Setup Guide
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 13px; color: #475569;">
                  <tr>
                    <td style="padding: 6px 12px 6px 0; vertical-align: top; font-weight: 800; color: #ea580c;">1.</td>
                    <td style="padding: 6px 0; line-height: 1.5;">
                      <strong style="color: #0f172a;">Dining Tables &amp; QR Codes:</strong> Navigate to Tables to view and download high-resolution QR scanner signs for your dining tables.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 12px 6px 0; vertical-align: top; font-weight: 800; color: #ea580c;">2.</td>
                    <td style="padding: 6px 0; line-height: 1.5;">
                      <strong style="color: #0f172a;">Menu Management:</strong> Review your categories, dishes, prices, portions, and customization options.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 12px 6px 0; vertical-align: top; font-weight: 800; color: #ea580c;">3.</td>
                    <td style="padding: 6px 0; line-height: 1.5;">
                      <strong style="color: #0f172a;">Kitchen &amp; Floor Staff:</strong> Access the Kitchen Display System (KDS) and add staff members to manage live orders and table requests.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Plan Entitlements Details -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Subscription Plan Details:</div>
                <div>Plan: <strong style="color: #ea580c;">${plan?.name || "Trial Plan"}</strong> (${plan?.price ? "₹" + plan.price : "Free Trial"})</div>
                <div>Capacity: Up to ${plan?.maxTablesPerBranch || 35} Tables &bull; ${plan?.maxMenuItems || 200} Menu Items</div>
                <div>Modules Enabled: <strong>Admin</strong>${hasKitchen !== false ? ", Kitchen KDS" : ""}${hasStaff !== false ? ", Floor Staff" : ""}</div>
              </div>

              <!-- Security Note -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; line-height: 1.5;">
                <strong>Security Reminder:</strong> For security reasons, please change your temporary password after logging in by going to <em>Settings &gt; Profile</em>.
              </div>

              ${renderEmailFooter()}
            </div>
          </div>
        </div>
      </div>
    `,
  };

  if (!isConfigured) {
    console.log(`[SMTP Notice] Welcome email to ${email} skipped because SMTP_USER is not configured in .env.`);
    console.log(`[SMTP Email Prepared] Credentials email for ${restaurantName} (Login: ${email}, Pass: ${password}) ready to send when SMTP credentials are added.`);
    return {
      success: false,
      skipped: true,
      reason: "SMTP credentials not configured in backend/.env",
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Onboarding email with credentials sent to ${email} (MessageId: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.warn("[SMTP Error] Failed to send welcome email:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// 2. Staff Invite Email (Sent when an admin adds kitchen/waiter staff)
async function sendStaffInviteEmail(email, name, role, restaurantName, tempPassword) {
  if (!isSmtpConfigured()) {
    console.log(`[SMTP Notice] Staff invite email to ${email} skipped because SMTP_USER is not configured in .env.`);
    return;
  }

  const loginUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://restro-saas-website.vercel.app") + "/login";

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk" <noreply@servedesk.com>',
    to: email,
    subject: `Staff Access: You have been added to ${restaurantName} on ServeDesk`,
    attachments: getLogoAttachment(),
    html: `
      <div style="background-color: #f8fafc; padding: 36px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Top Accent Bar -->
          <div style="height: 4px; background: linear-gradient(90deg, #ea580c, #f59e0b);"></div>

          <div style="padding: 32px 28px;">
            ${renderEmailHeader()}

            <div style="padding-top: 24px;">
              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; letter-spacing: -0.3px;">
                Staff Portal Invitation
              </h2>

              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${name}</strong>,<br/>
                You have been registered as a <strong>${role}</strong> team member for <strong>${restaurantName}</strong> on the ServeDesk dining management platform.
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #ea580c; margin-bottom: 12px;">
                  Your Staff Login Credentials
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b; width: 140px;">Portal URL:</td>
                    <td style="padding: 6px 0;">
                      <a href="${loginUrl}" style="color: #ea580c; font-weight: 700; text-decoration: none;">${loginUrl}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Assigned Role:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #ea580c;">${role}</td>
                  </tr>
                  ${
                    tempPassword
                      ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Temporary Password:</td>
                    <td style="padding: 6px 0;">
                      <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-weight: 700; letter-spacing: 0.5px;">
                        ${tempPassword}
                      </span>
                    </td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
                  Sign In to Staff Portal →
                </a>
              </div>

              ${renderEmailFooter()}
            </div>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] Staff invite email sent to ${email}`);
  } catch (err) {
    console.warn("[SMTP Error] Failed to send staff invite email:", err.message);
  }
}

// 3. Password Reset OTP Email
async function sendOtpEmail(email, name, otp) {
  if (!isSmtpConfigured()) {
    console.log(`[SMTP Notice] OTP email to ${email} skipped because SMTP_USER is not configured in .env.`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ServeDesk" <noreply@servedesk.com>',
    to: email,
    subject: "Reset Your ServeDesk Password – Verification Code",
    attachments: getLogoAttachment(),
    html: `
      <div style="background-color: #f8fafc; padding: 36px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Top Accent Bar -->
          <div style="height: 4px; background: linear-gradient(90deg, #ea580c, #f59e0b);"></div>

          <div style="padding: 32px 28px;">
            ${renderEmailHeader()}

            <div style="padding-top: 24px;">
              <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0; letter-spacing: -0.3px;">
                Password Reset Request
              </h2>

              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${name}</strong>,<br/>
                We received a request to reset your password on ServeDesk. Use the verification code below to proceed:
              </p>

              <!-- OTP Code Display -->
              <div style="text-align: center; margin: 28px 0;">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c; border: 2px dashed #ea580c; padding: 12px 28px; border-radius: 12px; background-color: #fff7ed; display: inline-block;">
                  ${otp}
                </span>
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                  This code expires in <strong>10 minutes</strong>.
                </p>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                If you did not request a password reset, no action is needed. Your account remains secure.
              </div>

              ${renderEmailFooter()}
            </div>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Success] OTP email sent to ${email}`);
  } catch (err) {
    console.warn("[SMTP Error] Failed to send OTP email:", err.message);
  }
}

module.exports = {
  transporter,
  isSmtpConfigured,
  sendOtpEmail,
  sendWelcomeRegistrationEmail,
  sendStaffInviteEmail,
};
