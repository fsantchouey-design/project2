const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  verification: (name, verificationUrl) => ({
    subject: 'Verify Your CraftyCrib Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #00ff88, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .card { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; }
          h1 { color: #ffffff; margin: 0 0 20px; font-size: 24px; }
          p { color: #a0a0a0; line-height: 1.6; margin: 0 0 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #00ff88, #00d4ff); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠 CraftyCrib</div>
          </div>
          <div class="card">
            <h1>Welcome, ${name}! 🎉</h1>
            <p>Thank you for joining CraftyCrib. You're one step away from transforming your living spaces with AI-powered design.</p>
            <p>Click the button below to verify your email address:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </center>
            <p>This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CraftyCrib. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'Reset Your CraftyCrib Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #00ff88, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .card { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; }
          h1 { color: #ffffff; margin: 0 0 20px; font-size: 24px; }
          p { color: #a0a0a0; line-height: 1.6; margin: 0 0 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠 CraftyCrib</div>
          </div>
          <div class="card">
            <h1>Password Reset Request</h1>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CraftyCrib. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  proApplicationAdmin: (app) => ({
    subject: '[CraftyCrib] Nouvelle demande pro — ' + (app.companyName || (app.firstName + ' ' + app.lastName)),
    html: '<!DOCTYPE html><html><head><style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;background:#0a0a0f;color:#ffffff;margin:0;padding:0;}' +
      '.container{max-width:640px;margin:0 auto;padding:40px 20px;}' +
      '.logo{font-size:28px;font-weight:bold;background:linear-gradient(135deg,#00ff88,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px;display:block;text-align:center;}' +
      '.card{background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:36px;}' +
      'h1{color:#ffffff;font-size:22px;margin:0 0 24px;}' +
      '.section-title{color:#00ff88;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;}' +
      '.field{display:flex;gap:12px;margin-bottom:10px;}' +
      '.field-label{color:#888;font-size:13px;min-width:160px;flex-shrink:0;}' +
      '.field-value{color:#e0e0e0;font-size:13px;word-break:break-all;}' +
      '.badge{display:inline-block;background:rgba(0,255,136,0.15);color:#00ff88;border:1px solid rgba(0,255,136,0.3);border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 3px;}' +
      '.action-row{display:flex;gap:16px;margin-top:32px;justify-content:center;}' +
      '.btn-approve{display:inline-block;background:linear-gradient(135deg,#00ff88,#00d4ff);color:#000;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;}' +
      '.btn-reject{display:inline-block;background:linear-gradient(135deg,#ff4444,#ff6b6b);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;}' +
      '.footer{text-align:center;color:#555;font-size:12px;margin-top:32px;}' +
      '</style></head><body>' +
      '<div class="container">' +
      '<span class="logo">CraftyCrib — Admin</span>' +
      '<div class="card">' +
      '<h1>Nouvelle demande d\'inscription professionnelle</h1>' +
      '<div class="section-title">Identité</div>' +
      '<div class="field"><span class="field-label">Prénom</span><span class="field-value">' + (app.firstName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Nom</span><span class="field-value">' + (app.lastName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Entreprise</span><span class="field-value">' + (app.companyName || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Email</span><span class="field-value">' + (app.email || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Téléphone</span><span class="field-value">' + (app.phone || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Numéro d\'entreprise</span><span class="field-value">' + (app.businessNumber || '—') + '</span></div>' +
      '<div class="section-title">Adresse</div>' +
      '<div class="field"><span class="field-label">Adresse</span><span class="field-value">' + (app.address || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Ville</span><span class="field-value">' + (app.city || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Code postal</span><span class="field-value">' + (app.postalCode || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Pays</span><span class="field-value">' + (app.country || '—') + '</span></div>' +
      '<div class="section-title">Métier</div>' +
      '<div class="field"><span class="field-label">Catégories</span><span class="field-value">' + (app.categories && app.categories.length ? app.categories.map(function(c){ return '<span class="badge">' + c + '</span>'; }).join('') : '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Années d\'expérience</span><span class="field-value">' + (app.yearsExperience || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Zones de service</span><span class="field-value">' + (app.serviceAreas || '—') + '</span></div>' +
      '<div class="section-title">Présentation</div>' +
      '<div class="field"><span class="field-label">Description</span><span class="field-value">' + (app.description || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Site web</span><span class="field-value">' + (app.website || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Instagram</span><span class="field-value">' + (app.socialInstagram || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Facebook</span><span class="field-value">' + (app.socialFacebook || '—') + '</span></div>' +
      '<div class="field"><span class="field-label">Logo</span><span class="field-value">' + (app.logo ? 'Oui' : 'Non') + '</span></div>' +
      '<div class="field"><span class="field-label">Photos</span><span class="field-value">' + (app.photos && app.photos.length ? app.photos.length + ' photo(s)' : 'Aucune') + '</span></div>' +
      '<div class="section-title">Actions</div>' +
      '<div class="action-row">' +
      '<a href="' + process.env.APP_URL + '/pro/admin/applications/' + app._id + '/approve/' + app.approvalToken + '" class="btn-approve">Approuver</a>' +
      '<a href="' + process.env.APP_URL + '/pro/admin/applications/' + app._id + '/reject/' + app.approvalToken + '" class="btn-reject">Rejeter</a>' +
      '</div>' +
      '</div>' +
      '<div class="footer"><p>CraftyCrib &copy; ' + new Date().getFullYear() + '</p></div>' +
      '</div></body></html>'
  }),

  projectNotification: (name, projectTitle, message) => ({
    subject: `Update on Your Project: ${projectTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #00ff88, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .card { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; }
          h1 { color: #ffffff; margin: 0 0 20px; font-size: 24px; }
          p { color: #a0a0a0; line-height: 1.6; margin: 0 0 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #00ff88, #00d4ff); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠 CraftyCrib</div>
          </div>
          <div class="card">
            <h1>Project Update</h1>
            <p>Hi ${name},</p>
            <p>${message}</p>
            <center>
              <a href="${process.env.APP_URL}/dashboard" class="button">View Project</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CraftyCrib. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const emailContent = templates[template](...data);
    
    await transporter.sendMail({
      from: `"CraftyCrib" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    });
    
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
};

// Send raw email (subject + html directly)
const sendRawEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"CraftyCrib" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Raw email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Raw email error:', error);
    return false;
  }
};

module.exports = { sendEmail, sendRawEmail, transporter };

