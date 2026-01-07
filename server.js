// server.js
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" })); // Allow all origins for testing
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.post("/contact", async (req, res) => {
  console.log("=== Received contact form ===");
  console.log(req.body);

  const { name, email, title, message, time } = req.body;

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: send.one.com,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // SSL for 465, TLS for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email to ADMIN
    const mailOptionsAdmin = {
      from: `"Bearbunch" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact: ${title}`,
      html: `
        <div style="font-family:system-ui,sans-serif;font-size:14px">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
      `,
    };

    // Email to USER
    const mailOptionsUser = {
      from: `"Bearbunch" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `We received your message: "${title}"`,
      html: `
        <div style="font-family:system-ui,sans-serif;font-size:14px">
          <p>Hi ${name || "there"},</p>
          <p>Thank you for reaching out! We received your message titled "<strong>${title}</strong>" and will respond within 3 business days.</p>
          <p>Best regards,<br/>The Bearbunch Team</p>
        </div>
      `,
    };

    // Send BOTH emails
    await transporter.sendMail(mailOptionsAdmin);
    await transporter.sendMail(mailOptionsUser);

    console.log("Emails sent successfully!");
    return res.json({ status: "success", message: "Emails sent!" });

  } catch (err) {
    console.error("SMTP failed:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
