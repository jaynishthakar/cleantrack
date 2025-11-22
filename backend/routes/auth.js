import express from "express";
import db from "../db.js";
const router = express.Router();

// ✅ SIGNUP for both Consumer & Authority
router.post("/signup", (req, res) => {
  const { role, name, phone_no, email, address, locality_id, login_id, password } = req.body;

  if (role === "consumer") {
    const sql = `
      INSERT INTO Consumer (Name, phone_no, email, address, locality_id, login_id, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, phone_no, email, address, locality_id, login_id, password], (err, result) => {
      if (err) {
        console.error("❌ Consumer signup error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Consumer registered successfully!" });
    });

  } else if (role === "authority") {
    const sql = `
      INSERT INTO Authority (authority_type, officer_name, contact_no, email, address, Login_id, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, ["Municipal", name, phone_no, email, address, login_id, password], (err, result) => {
      if (err) {
        console.error("❌ Authority signup error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Authority registered successfully!" });
    });

  } else {
    res.status(400).json({ error: "Invalid role selected" });
  }
});

// ✅ LOGIN for both Consumer & Authority
router.post("/login", (req, res) => {
  const { role, login_id, password } = req.body;

  if (!role || !login_id || !password) {
    return res.status(400).json({ error: "Missing login credentials" });
  }

  if (role === "consumer") {
    const sql = `SELECT * FROM Consumer WHERE login_id = ? AND password = ?`;
    db.query(sql, [login_id, password], (err, results) => {
      if (err) {
        console.error("❌ Consumer login error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0)
        return res.status(401).json({ error: "Invalid login ID or password" });
      res.json({ message: "Login successful", role: "consumer", user: results[0] });
    });

  } else if (role === "authority") {
    const sql = `SELECT * FROM Authority WHERE Login_id = ? AND password = ?`;
    db.query(sql, [login_id, password], (err, results) => {
      if (err) {
        console.error("❌ Authority login error:", err);
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0)
        return res.status(401).json({ error: "Invalid login ID or password" });
      res.json({ message: "Login successful", role: "authority", user: results[0] });
    });

  } else {
    res.status(400).json({ error: "Invalid role selected" });
  }
});

export default router;
