import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", (req, res) => {
  db.query("SELECT * FROM Location ORDER BY location_id", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const q = "INSERT INTO Location (location_name, address, city, operating_hours) VALUES (?, ?, ?, ?)";
  db.query(q, [req.body.location_name, req.body.address, req.body.city, req.body.operating_hours], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ insertedId: result.insertId });
  });
});

router.put("/:id", (req, res) => {
  const q = "UPDATE Location SET location_name=?, address=?, city=?, operating_hours=? WHERE location_id=?";
  db.query(q, [req.body.location_name, req.body.address, req.body.city, req.body.operating_hours, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Location updated" });
  });
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Location WHERE location_id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Location deleted" });
  });
});

export default router;
