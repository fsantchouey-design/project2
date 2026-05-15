const { Resend } = require('resend');

let resend;
function getClient() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function sendEmail({ to, subject, html }) {
  try {
    const data = await getClient().emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    return data;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

function adminHtml(title, rows) {
  const rowsHtml = rows.map(([label, value]) =>
    `<tr><td style="color:#888;font-size:13px;padding:6px 12px 6px 0;white-space:nowrap">${label}</td><td style="color:#e0e0e0;font-size:13px;padding:6px 0;word-break:break-all">${value || '—'}</td></tr>`
  ).join('');
  return `<!DOCTYPE html><html><head><style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0f;color:#fff;margin:0;padding:0}
    .c{max-width:560px;margin:0 auto;padding:36px 20px}
    .logo{font-size:22px;font-weight:bold;color:#00ff88;text-align:center;display:block;margin-bottom:24px}
    .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:28px}
    h1{color:#fff;font-size:17px;margin:0 0 20px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:12px}
    .footer{text-align:center;color:#555;font-size:11px;margin-top:24px}
  </style></head><body>
  <div class="c">
    <span class="logo">CraftyCrib Admin</span>
    <div class="card">
      <h1>${title}</h1>
      <table style="border-collapse:collapse;width:100%">${rowsHtml}</table>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} CraftyCrib</p></div>
  </div>
</body></html>`;
}

async function sendAdminEmail({ subject, title, rows }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  return sendEmail({ to: adminEmail, subject, html: adminHtml(title, rows) });
}

module.exports = { sendEmail, sendAdminEmail };
