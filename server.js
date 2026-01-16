require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 10000;

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

/* ================= SESSIONS ================= */

const sessions = {}; // token → user

/* ================= DATABASE INIT ================= */

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("DB ready");
}
initDB().catch(console.error);

/* ================= AUTH HELPERS ================= */

function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !sessions[token])
    return res.status(401).json({ error: "Not authenticated" });

  req.user = sessions[token];
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}

/* ================= REGISTER ================= */

app.post("/register", async (req, res) => {
  let { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  let role = "user";

  // ADMINKEY,password format
  if (password.includes(",")) {
    const [key, realPass] = password.split(",", 2);
    if (key === process.env.ADMIN_KEY) {
      role = "admin";
      password = realPass;
    }
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (username,email,password,role)
       VALUES ($1,$2,$3,$4)
       RETURNING id,username,role`,
      [username, email, hash, role]
    );
    res.json({ success: true, user: r.rows[0] });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "User exists" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LOGIN ================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = crypto.randomBytes(32).toString("hex");
    sessions[token] = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({ token, username: user.username, role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LOGOUT ================= */

app.post("/logout", requireAuth, (req, res) => {
  delete sessions[req.headers.authorization];
  res.json({ success: true });
});

/* ================= ADMIN ================= */

app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const r = await pool.query(
    "SELECT username,email,role,created_at FROM users ORDER BY created_at"
  );
  res.json(r.rows);
});

/* RESET PASSWORD */
app.post("/admin/reset-password", requireAuth, requireAdmin, async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword)
    return res.status(400).json({ error: "Missing fields" });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password=$1 WHERE username=$2",
    [hash, username]
  );
  res.json({ success: true });
});

/* TERMINATE USER */
app.post("/admin/terminate-user", requireAuth, requireAdmin, async (req, res) => {
  const { username } = req.body;
  if (!username)
    return res.status(400).json({ error: "Missing username" });

  // Prevent deleting self
  if (username === req.user.username)
    return res.status(400).json({ error: "Cannot delete yourself" });

  await pool.query("DELETE FROM users WHERE username=$1", [username]);

  // Remove sessions
  Object.keys(sessions).forEach(t => {
    if (sessions[t].username === username) delete sessions[t];
  });

  res.json({ success: true });
});

/* ================= KEEP ALIVE ================= */

app.post("/ping", (req, res) => {
  res.json({ ok: true });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
