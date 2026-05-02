type VerificationMailParams = {
  name?: string;
  verificationLink: URL;
  appName?: string;
};

export function verificationMailContent({
  name = "there",
  verificationLink,
  appName = "Million checkboxes"
}: VerificationMailParams) {
  const html = `
  <!DOCTYPE html>
  <html>
    <body style="
      margin:0;
      padding:0;
      background:#0a0a0b;
      font-family:Inter, Arial, sans-serif;
      color:#e8e8ea;
    ">
      <div style="
        max-width:500px;
        margin:40px auto;
        padding:24px;
        background:#111114;
        border:1px solid #1f1f24;
        border-radius:10px;
      ">

        <h2 style="margin-bottom:8px;">
          Verify your email
        </h2>

        <p style="color:#a0a0a8; font-size:14px;">
          Hi ${name},
        </p>

        <p style="color:#a0a0a8; font-size:14px;">
          Thanks for signing up for <strong>${appName}</strong>.  
          Please verify your email address to continue.
        </p>

        <a href="${verificationLink}" style="
          display:inline-block;
          margin:20px 0;
          padding:12px 18px;
          background:linear-gradient(135deg, #8b5cf6, #ec4899);
          color:white;
          text-decoration:none;
          border-radius:6px;
          font-size:14px;
          font-weight:600;
        ">
          Verify Email
        </a>

        <p style="color:#6b6b73; font-size:12px;">
          If you didn’t create an account, you can safely ignore this email.
        </p>

      </div>
    </body>
  </html>
  `;

  const text = `
Hi ${name},

Thanks for signing up for ${appName}.

Please verify your email using the link below:
${verificationLink}

If you didn’t create an account, you can ignore this email.
`;

  return { html, text };
}