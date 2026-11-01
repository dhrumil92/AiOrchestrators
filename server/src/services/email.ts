// Outgoing email. With RESEND_API_KEY set it sends through Resend; otherwise it prints the
// message to the server console, so password reset still works on a laptop during the demo.

const isConfigured = (key: string | undefined): boolean => Boolean(key) && key !== 'your_key';

export interface Email {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!isConfigured(apiKey)) {
    console.log(`\n--- Email (not sent, RESEND_API_KEY is not set) ---\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n---\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'RoofSolar <onboarding@resend.dev>',
      to: email.to,
      subject: email.subject,
      text: email.text,
    }),
  });
  if (!res.ok) throw new Error(`Email failed with status ${res.status}`);
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your RoofSolar password',
    text:
      `Hello ${name},\n\n` +
      `Someone asked to reset the password for your RoofSolar account. ` +
      `Open this link within 1 hour to choose a new password:\n\n${link}\n\n` +
      `If you did not ask for this, you can ignore this email. Your password will not change.`,
  });
}
