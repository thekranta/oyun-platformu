import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { requireAdmin } from './_lib/auth';

// HTML'e gömülecek her kullanıcı/DB kaynaklı alanı kaçışlar (XSS/HTML-injection
// ve bu endpoint'in bir phishing/relay aracı olarak kötüye kullanılmasını önler).
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Yalnızca admin panelinden (app/admin.tsx) çağrılır; kimliksiz istekle
  // herhangi bir alıcıya keyfi HTML içerik gönderilmesini (phishing relay) engeller.
  const authed = await requireAdmin(req, res);
  if (!authed) return;

  const { email, subject, message, gameDetails } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const smtpUser = process.env.SMTP_USER || 'admin@childhoodtech.com';
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpPassword) {
      return res.status(500).json({ error: 'SMTP password not configured. Please set SMTP_PASSWORD environment variable.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const safeSubject = escapeHtml(subject || 'Oyun Raporu');
    const safeMessage = escapeHtml(message || '');
    const details = gameDetails || {};
    const safeAiComment = escapeHtml(details.aiComment).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    const mailOptions = {
      from: '"Okul Öncesi Akademi" <admin@childhoodtech.com>',
      to: email,
      subject: subject || 'Oyun Raporu',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4CAF50;">${safeSubject}</h2>
          <p>${safeMessage}</p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="color: #2196F3;">Oyun Detayları</h3>
            <p><strong>Oyun:</strong> ${escapeHtml(details.game)}</p>
            <p><strong>Süre:</strong> ${escapeHtml(details.duration)} saniye</p>
            <p><strong>Hamle:</strong> ${escapeHtml(details.moves)}</p>
            <p><strong>Hata:</strong> ${escapeHtml(details.errors)}</p>
          </div>

          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="color: #2E7D32;">Yapay Zeka Yorumu</h3>
            <p style="font-style: italic;">"${safeAiComment}"</p>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #999;">Bu e-posta otomatik olarak gönderilmiştir.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
