import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, subject, message, gameDetails } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'admin@childhoodtech.com',
        pass: 'Muhammed-282828', // Note: In production, use process.env.SMTP_PASSWORD
      },
    });

    const mailOptions = {
      from: '"Okul Öncesi Akademi" <admin@childhoodtech.com>',
      to: email,
      subject: subject || 'Oyun Raporu',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4CAF50;">${subject}</h2>
          <p>${message}</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="color: #2196F3;">Oyun Detayları</h3>
            <p><strong>Oyun:</strong> ${gameDetails.game}</p>
            <p><strong>Süre:</strong> ${gameDetails.duration} saniye</p>
            <p><strong>Hamle:</strong> ${gameDetails.moves}</p>
            <p><strong>Hata:</strong> ${gameDetails.errors}</p>
          </div>

          <div style="background-color: #E8F5E9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h3 style="color: #2E7D32;">Yapay Zeka Yorumu</h3>
            <p style="font-style: italic;">"${gameDetails.aiComment?.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}"</p>
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
