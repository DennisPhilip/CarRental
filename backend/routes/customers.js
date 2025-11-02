import express from "express";
import { db } from "../db.js";
const router = express.Router();

// GET all customers
router.get("/", (req, res) => {
  db.query("SELECT * FROM Customer ORDER BY customer_id", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// GET single customer
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM Customer WHERE customer_id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]||null);
  });
});

// CREATE
router.post("/", (req, res) => {
  const q = `INSERT INTO Customer 
    (first_name, last_name, email, phone, license_number, date_of_birth, membership_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const vals = [
    req.body.first_name, req.body.last_name, req.body.email, req.body.phone,
    req.body.license_number, req.body.date_of_birth, req.body.membership_tier || "Regular"
  ];
  db.query(q, vals, (err, result) => {
    if (err) return res.status(500).json({ error: err.code || err.message });
    res.json({ insertedId: result.insertId });
  });
});

// UPDATE
router.put("/:id", (req, res) => {
  const q = `UPDATE Customer SET first_name=?, last_name=?, email=?, phone=?, license_number=?, date_of_birth=?, membership_tier=? WHERE customer_id=?`;
  const vals = [
    req.body.first_name, req.body.last_name, req.body.email, req.body.phone,
    req.body.license_number, req.body.date_of_birth, req.body.membership_tier, req.params.id
  ];
  db.query(q, vals, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Customer updated" });
  });
});

// DELETE
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Customer WHERE customer_id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Customer deleted" });
  });
});

export default router;
