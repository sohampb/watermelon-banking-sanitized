import nodemailer from "nodemailer";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendMailArgs = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL ?? "noreply@example.com";

  return { host, port, user, pass, fromEmail };
}

async function sendMail({ to, subject, text, html, attachments }: SendMailArgs) {
  const { host, port, user, pass, fromEmail } = getSmtpConfig();
  const recipientList = Array.isArray(to) ? to.join(", ") : to;

  if (!host || !user || !pass) {
    console.log(`[EMAIL FALLBACK] ${subject} -> ${recipientList}`);
    return {
      delivered: false,
      mode: "console" as const
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  await transporter.sendMail({
    from: fromEmail,
    to: recipientList,
    subject,
    text,
    html,
    attachments
  });

  return {
    delivered: true,
    mode: "smtp" as const
  };
}

export async function sendBankingTransferOtpEmail(args: {
  otp: string;
  recipientEmail: string;
  transactionId: string;
  amountDisplay: string;
  destinationUsername: string;
}) {
  return sendMail({
    to: args.recipientEmail,
    subject: `Watermelon Banking OTP for transaction ${args.transactionId}`,
    text:
      `Your Watermelon Banking OTP is ${args.otp}. ` +
      `Use it to transfer ${args.amountDisplay} to ${args.destinationUsername}.`,
    html:
      `<p>Your Watermelon Banking OTP is <strong>${args.otp}</strong>.</p>` +
      `<p>Use it to transfer <strong>${args.amountDisplay}</strong> to ` +
      `<strong>${args.destinationUsername}</strong>.</p>`
  });
}

export async function sendBankingStatementEmail(args: {
  recipientEmail: string;
  username: string;
  fileName: string;
  workbookBuffer: Buffer;
  transactionCount: number;
}) {
  return sendMail({
    to: args.recipientEmail,
    subject: `Watermelon Banking statement for ${args.username}`,
    text:
      `Attached is your Watermelon Banking statement containing the last ` +
      `${args.transactionCount} transactions.`,
    html:
      `<p>Attached is your Watermelon Banking statement containing the last ` +
      `<strong>${args.transactionCount}</strong> transactions.</p>`,
    attachments: [
      {
        filename: args.fileName,
        content: args.workbookBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    ]
  });
}
