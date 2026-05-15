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

module.exports = { sendEmail };
