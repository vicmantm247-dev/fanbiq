import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.FROM_EMAIL || "support@fanbiq.com";
const APP_NAME = "fanbiQ";

export async function sendVerificationEmail(
  to: string,
  username: string,
  otp: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${otp} is your ${APP_NAME} verification code`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; background: #0a0a0f; color: #e5e5e5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #111118; border: 1px solid #2a2a3a; border-radius: 12px; padding: 40px;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Verify your email</h1>
            <p style="color: #888; margin: 0 0 32px;">Hi ${username}, enter this code to activate your ${APP_NAME} account.</p>
            <div style="background: #1a1a28; border: 1px solid #3a3a4a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-family: monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #ffffff;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 13px; margin: 0;">This code expires in <strong style="color: #888;">15 minutes</strong>. If you didn't create an account, ignore this email.</p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}