import express from "express";
import { db } from "../db.js";
const router = express.Router();

// get all cars (with category & location names)
router.get("/", (req, res) => {
  const q = `SELECT car.car_id, car.model, car.make, car.year, car.registration_number, car.status,
             cc.category_name, loc.location_name
             FROM Car car
             LEFT JOIN Car_Category cc ON car.category_id = cc.category_id
             LEFT JOIN Location loc ON car.location_id = loc.location_id
             ORDER BY car.car_id`;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// single car
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM Car WHERE car_id=?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]||null);
  });
});

// create car
router.post("/", (req, res) => {
  const q = `INSERT INTO Car (model, make, year, registration_number, status, location_id, category_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const vals = [req.body.model, req.body.make, req.body.year, req.body.registration_number, req.body.status || 'Available', req.body.location_id, req.body.category_id];
  db.query(q, vals, (err, result) => {
    if (err) return res.status(500).json({ error: err.code || err.sqlMessage });
    res.json({ insertedId: result.insertId });
  });
});

// update car
router.put("/:id", (req, res) => {
  const q = `UPDATE Car SET model=?, make=?, year=?, registration_number=?, status=?, location_id=?, category_id=? WHERE car_id=?`;
  const vals = [req.body.model, req.body.make, req.body.year, req.body.registration_number, req.body.status, req.body.location_id, req.body.category_id, req.params.id];
  db.query(q, vals, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Car updated" });
  });
});

// delete car
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Car WHERE car_id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Car deleted" });
  });
});

export default router;
