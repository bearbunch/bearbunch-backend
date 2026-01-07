require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// Nodemailer SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Contact endpoint
app.post("/contact", async (req, res) => {
  const { name, email, title, message, time } = req.body;

  if (!email || !message || !title) return res.status(400).json({ error: "Missing fields" });

  try {
    // 1️⃣ Email to admin
    await transporter.sendMail({
      from: `"Bearbunch" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact: ${title}`,
      html: `
        <div style="font-family: system-ui, sans-serif; font-size: 12px">
          <p><b>${name}</b> sent a message:</p>
          <p>${message}</p>
          <small>${time}</small>
        </div>
      `
    });

    // 2️⃣ Email to user
    await transporter.sendMail({
      from: `"Bearbunch" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "We received your message",
      html: `
        <div style="font-family: system-ui, sans-serif; font-size: 16px">
          <a href="https://bearbunch.github.io/home/">
            <img src="https://bearbunch.github.io/home/image.png" alt="logo" style="width:100%;height:auto"/>
          </a>
          <p>Hi ${name},</p>
          <p>Thank you for reaching out! We have received your request: "<strong>${title}</strong>"</p>
          <p>We'll respond within 3 business days.</p>
          <p>Best regards,<br/>The Bearbunch Team</p>
        </div>
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.error("SMTP failed:", err);

    // 3️⃣ Backup using EmailJS
    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ADMIN,
          user_id: process.env.EMAILJS_USER_ID,
          template_params: { name, email, title, message, time }
        })
      });

      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_USER,
          user_id: process.env.EMAILJS_USER_ID,
          template_params: { name, email, title, message, time }
        })
      });

      res.json({ success: true, fallback: true });

    } catch (backupErr) {
      console.error("EmailJS fallback failed:", backupErr);
      res.status(500).json({ error: "Both SMTP and EmailJS failed" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
