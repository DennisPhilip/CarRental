import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", (req, res) => {
  db.query("SELECT * FROM Car_Category ORDER BY category_id", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const q = "INSERT INTO Car_Category (category_name, daily_rate, security_deposit) VALUES (?, ?, ?)";
  db.query(q, [req.body.category_name, req.body.daily_rate, req.body.security_deposit], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ insertedId: result.insertId });
  });
});

router.put("/:id", (req, res) => {
  const q = "UPDATE Car_Category SET category_name=?, daily_rate=?, security_deposit=? WHERE category_id=?";
  db.query(q, [req.body.category_name, req.body.daily_rate, req.body.security_deposit, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Category updated" });
  });
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Car_Category WHERE category_id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Category deleted" });
  });
});

export default router;
