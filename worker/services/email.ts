import type { WorkerEnv } from '../types';

/**
 * Cloudflare Workers Transactional Email Service (Zero Node-only deps; native fetch)
 * Supports Resend (`RESEND_API_KEY`) and Brevo (`EMAIL_PROVIDER_API_KEY`).
 */

export interface WorkerEmailResult {
  delivered: boolean;
  provider: 'resend' | 'brevo' | 'none';
  error?: string;
}

export function buildWorkerOtpHtml(recipientName: string, otpCode: string): string {
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
        Hi ${safeName || 'Learner'}, enter the 6-digit code below to verify your email and unlock your LINGUAVERSE AI workspace.
        <br/>
        প্রিয় ${safeName || 'শিক্ষার্থী'}, আপনার LINGUAVERSE AI ওয়ার্কস্পেস আনলক করতে নিচের ৬-সংখ্যার কোডটি লিখুন।
      </p>
      <div style="background:#050914;border:1px solid #3B82F6;border-radius:10px;padding:18px;text-align:center;margin:20px 0;">
        <span style="font-family:monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#ffffff;">
          ${otpCode}
        </span>
      </div>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
        Expires in 10 minutes (max 5 attempts). Ignore this email if you did not register.
        <br/>
        মেয়াদ ১০ মিনিট (সর্বোচ্চ ৫ বার চেষ্টা)। আপনি নিবন্ধন না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।
      </p>
    </div>
  </body>
</html>`;
}

export async function sendWorkerOtpEmail(
  env: WorkerEnv,
  params: { toEmail: string; recipientName: string; otpCode: string }
): Promise<WorkerEmailResult> {
  const resendKey = env.RESEND_API_KEY?.trim();
  const brevoKey = env.EMAIL_PROVIDER_API_KEY?.trim();
  const fromAddress =
    env.EMAIL_FROM?.trim() || 'LINGUAVERSE AI <noreply@linguaverse.ai>';
  const subject = `Your LINGUAVERSE AI verification code: ${params.otpCode}`;
  const html = buildWorkerOtpHtml(params.recipientName, params.otpCode);

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.toEmail],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        return {
          delivered: false,
          provider: 'resend',
          error: `Resend HTTP ${res.status}`,
        };
      }
      return { delivered: true, provider: 'resend' };
    } catch (err) {
      return {
        delivered: false,
        provider: 'resend',
        error: err instanceof Error ? err.message : 'Resend error',
      };
    }
  }

  if (brevoKey) {
    try {
      const emailMatch = fromAddress.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : fromAddress;
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'LINGUAVERSE AI', email: senderEmail },
          to: [{ email: params.toEmail, name: params.recipientName || 'Learner' }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        return {
          delivered: false,
          provider: 'brevo',
          error: `Brevo HTTP ${res.status}`,
        };
      }
      return { delivered: true, provider: 'brevo' };
    } catch (err) {
      return {
        delivered: false,
        provider: 'brevo',
        error: err instanceof Error ? err.message : 'Brevo error',
      };
    }
  }

  return { delivered: false, provider: 'none' };
}
