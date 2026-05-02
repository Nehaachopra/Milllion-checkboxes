import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
})

export async function verifyMail() {
  try{
    await transporter.verify();
    console.log("Server is ready to take our messages");
  }
  catch (err) {
    console.error("Verification failed:", err);
    throw err;
  }
}

export async function sendMail(to:string, subject: string, text: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      text,
      html
    }) 
  }

  catch(err) {
    throw err;
  }
}