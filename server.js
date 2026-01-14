require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

/* ================= SESSIONS ================= */

const sessions = {};

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
  console.log("Database ready");
}

initDB().catch(console.error);

/* ================= AUTH ================= */

function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.user = sessions[token];
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/* ================= ROUTES ================= */

/* ---- REGISTER ---- */
app.post("/register", async (req, res) => {
  const { username, email, password, adminKey } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const role =
    adminKey === process.env.ADMIN_KEY ? "admin" : "user";

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, role`,
      [username, email, hash, role]
    );

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---- LOGIN ---- */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions[token] = {
      id: user.id,
      username: user.username,
      role: user.role,
      created: Date.now()
    };

    res.json({
      token,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---- LOGOUT ---- */
app.post("/logout", requireAuth, (req, res) => {
  delete sessions[req.headers.authorization];
  res.json({ success: true });
});

/* ---- CURRENT USER ---- */
app.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

/* ---- ADMIN ONLY ---- */
app.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, created_at FROM users"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
