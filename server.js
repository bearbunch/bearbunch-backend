import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ===========================
   KEEP ALIVE
   =========================== */
app.post("/ping", (req, res) => {
  res.sendStatus(200);
});

/* ===========================
   SAVE ENCRYPTED VOTE
   =========================== */
app.post("/save-vote", (req, res) => {
  const { vote } = req.body;
  if (!vote || typeof vote !== "string") {
    return res.status(400).json({ error: "Invalid vote" });
  }
  try {
    fs.appendFileSync("votes.txt", vote + "\n");
    res.sendStatus(200);
  } catch {
    res.status(500).json({ error: "Save failed" });
  }
});

/* ===========================
   LOAD ENCRYPTED VOTES
   =========================== */
app.get("/votes", (req, res) => {
  try {
    if (!fs.existsSync("votes.txt")) return res.json([]);
    const lines = fs.readFileSync("votes.txt", "utf8")
      .split("\n")
      .filter(Boolean);
    res.json(lines);
  } catch {
    res.status(500).json({ error: "Read failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
