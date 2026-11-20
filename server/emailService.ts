/**
 * Server-side Transactional Email Delivery (Node/Express local & full-stack server)
 * Supports Resend (`RESEND_API_KEY`) and Brevo (`EMAIL_PROVIDER_API_KEY`) via native fetch().
 * Never exposes secrets to the frontend.
 */

export interface OtpEmailRequest {
  toEmail: string;
  recipientName: string;
  otpCode: string;
}

export interface OtpEmailResult {
  delivered: boolean;
  provider: 'resend' | 'brevo' | 'none';
  error?: string;
}

export function buildBilingualOtpHtml(recipientName: string, otpCode: string): string {
  const safeName = recipientName.replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#050914;color:#e2e8f0;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#0E1526;border:1px solid #1e293b;border-radius:14px;padding:32px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:#3B82F6;text-transform:uppercase;">
        LINGUAVERSE AI
      </div>
      <h1 style="margin:14px 0 8px;font-size:22px;color:#ffffff;">
        Verify Your Email • আপনার ইমেইল যাচাই করুন
      </h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hi ${safeName || 'Learner'}, use the 6-digit verification code below to activate your LINGUAVERSE AI account.
        <br/>
        প্রিয় ${safeName || 'শিক্ষার্থী'}, আপনার LINGUAVERSE AI অ্যাকাউন্ট সক্রিয় করতে নিচের ৬-সংখ্যার কোডটি ব্যবহার করুন।
      </p>
      <div style="background:#050914;border:1px solid #3B82F6;border-radius:10px;padding:18px;text-align:center;margin:20px 0;">
        <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#ffffff;">
          ${otpCode}
        </span>
      </div>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
        This code expires in 10 minutes (max 5 attempts). If you did not create this account, you can safely ignore this email.
        <br/>
        এই কোডটি ১০ মিনিট কার্যকর থাকবে। আপনি যদি অ্যাকাউন্ট তৈরি না করে থাকেন তবে এই ইমেইলটি উপেক্ষা করুন।
      </p>
    </div>
  </body>
</html>`;
}

export async function sendOtpEmailFromServer(
  req: OtpEmailRequest
): Promise<OtpEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const brevoKey = process.env.EMAIL_PROVIDER_API_KEY?.trim();
  const fromAddress =
    process.env.EMAIL_FROM?.trim() || 'LINGUAVERSE AI <noreply@linguaverse.ai>';
  const subject = `Your LINGUAVERSE AI verification code: ${req.otpCode}`;
  const html = buildBilingualOtpHtml(req.recipientName, req.otpCode);

  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [req.toEmail],
          subject,
          html,
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          delivered: false,
          provider: 'resend',
          error: `Resend HTTP ${response.status}: ${text.slice(0, 180)}`,
        };
      }
      return { delivered: true, provider: 'resend' };
    } catch (err) {
      return {
        delivered: false,
        provider: 'resend',
        error: err instanceof Error ? err.message : 'Resend delivery error',
      };
    }
  }

  if (brevoKey) {
    try {
      const fromEmailMatch = fromAddress.match(/<([^>]+)>/);
      const senderEmail = fromEmailMatch ? fromEmailMatch[1] : fromAddress;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'LINGUAVERSE AI', email: senderEmail },
          to: [{ email: req.toEmail, name: req.recipientName || 'Learner' }],
          subject,
          htmlContent: html,
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          delivered: false,
          provider: 'brevo',
          error: `Brevo HTTP ${response.status}: ${text.slice(0, 180)}`,
        };
      }
      return { delivered: true, provider: 'brevo' };
    } catch (err) {
      return {
        delivered: false,
        provider: 'brevo',
        error: err instanceof Error ? err.message : 'Brevo delivery error',
      };
    }
  }

  return { delivered: false, provider: 'none' };
}
