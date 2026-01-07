// server.js
const express = require("express");
const cors = require("cors");
// const nodemailer = require("nodemailer"); // Uncomment when ready to use SMTP
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ===== Route to receive contact form =====
app.post("/contact", async (req, res) => {
  console.log("=== Received contact form ===");
  console.log(req.body); // Logs form data for testing

  // ===== Nodemailer setup (commented out for testing) =====
  /*
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptionsAdmin = {
      from: `"Bearbunch" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact: ${req.body.title}`,
      html: `
        <div>
          <p><strong>Name:</strong> ${req.body.name}</p>
          <p><strong>Email:</strong> ${req.body.email}</p>
          <p><strong>Title:</strong> ${req.body.title}</p>
          <p><strong>Message:</strong> ${req.body.message}</p>
          <p><strong>Time:</strong> ${req.body.time}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptionsAdmin);

    res.json({ status: "success", message: "Email sent to admin" });

  } catch (err) {
    console.error("SMTP failed:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
  */

  // ===== Temporary response for testing without SMTP =====
  res.json({ status: "success", message: "Form received and logged!" });
});

// ===== Start server =====
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
