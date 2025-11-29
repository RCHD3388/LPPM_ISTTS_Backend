// File: src/services/emailService.js
const nodemailer = require('nodemailer');
const { Milis } = require("./../models")

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Fungsi serbaguna untuk mengirim email notifikasi menggunakan template HTML.
 * @param {string} recipientEmail - Alamat email penerima.
 * @param {object} content - Objek yang berisi data dinamis.
 * @param {string} content.tipe - Tipe notifikasi (misal: "Pengumuman", "File Penting").
 * @param {string} content.judul - Judul dari konten yang dikirim.
 */
const sendNotificationEmail = async ({ tipe, judul }) => {
  const subject = `[LPPM] Notifikasi Baru: ${tipe} - ${judul}`;

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="id">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${tipe} Baru</title></head>
  <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-collapse: collapse;">
          <tr>
              <td align="center" style="background-color: #003366; padding: 20px 0;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LPPM ISTTS</h1>
              </td>
          </tr>
          <tr>
              <td style="padding: 30px 25px;">
                  <h2 style="color: #333333; margin-top: 0;">Notifikasi Baru</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6;">Yth. Bapak/Ibu Dosen,</p>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6;">Sistem kami telah menerbitkan sebuah <strong>${tipe}</strong> baru.</p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-left: 4px solid #0056b3; margin: 20px 0; padding: 15px;">
                      <tr><td><p style="color: #333333; margin: 0; font-size: 16px; font-weight: bold;">${judul}</p></td></tr>
                  </table>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6;">Anda dapat melihat detail lebih lanjut dengan menekan tombol di bawah ini.</p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr_><td align="center" style="padding: 15px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" target="_blank" style="background-color: #0056b3; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Buka Aplikasi LPPM</a></td></tr_></table>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6;">Terima kasih atas perhatiannya.</p>
              </td>
          </tr>
          <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px; font-size: 12px; color: #888888;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} LPPM ISTTS. All rights reserved.</p>
                  <p style="margin: 5px 0 0 0;">Email ini dibuat secara otomatis oleh sistem.</p>
              </td>
          </tr>
      </table>
  </body>
  </html>`;

  let mail_list = (await Milis.findAll({ attributes: ['nama'] , raw: true })).map(m => m.nama);
  bcast = mail_list.join(', ');
  console.log(bcast);
  try {
    await transporter.sendMail({
      from: `"LPPM ISTTS" <${process.env.EMAIL_USER}>`,
      to: bcast,
      subject: subject,
      html: htmlContent,
    });
    console.log(`Email notifikasi berhasil dikirim ke: ${bcast}`);

  } catch (error) {
    console.error(`Gagal mengirim email notifikasi ke ${bcast}:`, error);
    // Disarankan untuk tidak melempar error di sini agar tidak mengganggu alur utama
    // Cukup log error-nya untuk diinvestigasi nanti
  }
};

module.exports = {
  sendNotificationEmail,
};