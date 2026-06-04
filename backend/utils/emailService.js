const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail(to, subject, html) {
  const info = await transporter.sendMail({
    from: `${process.env.EMAIL_USER}`,
    to,
    subject,
    html,
  });
  return info;
}

async function sendVerificationEmail(email, code) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Confirmez votre adresse e-mail</h2>
      <p>Voici votre code de vérification :</p>
      <p style="font-size: 22px; letter-spacing: 4px;"><strong>${code}</strong></p>
      <p>Ou cliquez ici pour accéder à la page de vérification :</p>
      <p><a href="${frontend}/verify-email">${frontend}/verify-email</a></p>
      <p>Le code expire dans 15 minutes.</p>
    </div>
  `;
  return sendMail(email, 'Code de vérification - Souk.tn', html);
}

async function sendResetPasswordEmail(email, code) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2>Réinitialisation du mot de passe</h2>
      <p>Voici votre code de réinitialisation :</p>
      <p style="font-size: 22px; letter-spacing: 4px;"><strong>${code}</strong></p>
      <p>Accédez à la page suivante pour entrer le code et définir un nouveau mot de passe :</p>
      <p><a href="${frontend}/reset-password">${frontend}/reset-password</a></p>
      <p>Le code expire dans 15 minutes.</p>
    </div>
  `;
  return sendMail(email, 'Réinitialisation de mot de passe - Souk.tn', html);
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
