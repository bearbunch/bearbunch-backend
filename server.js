const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");

const app = express();
app.use(cors());
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post("/contact", async (req, res) => {
  const { name, email, title, message, time } = req.body;

  if (!email || !message || !title) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    await sgMail.send([
      {
        to: process.env.ADMIN_EMAIL,
        from: process.env.FROM_EMAIL,
        subject: `New Contact: ${title}`,
        html: `<p><b>${name}</b>: ${message}</p><small>${time}</small>`
      },
      {
        to: email,
        from: process.env.FROM_EMAIL,
        subject: "We got your message",
        html: `<p>Hi ${name}, we received your message.</p>`
      }
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Email failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on", PORT));
