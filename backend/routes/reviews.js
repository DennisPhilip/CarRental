import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", (req, res) => {
  const q = `SELECT rv.*, c.first_name, c.last_name, car.model FROM Review rv
             JOIN Customer c ON rv.customer_id = c.customer_id
             JOIN Reservation r ON rv.reservation_id = r.reservation_id
             JOIN Car car ON r.car_id = car.car_id ORDER BY rv.review_id`;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const q = "INSERT INTO Review (customer_id, reservation_id, rating, comment) VALUES (?, ?, ?, ?)";
  db.query(q, [req.body.customer_id, req.body.reservation_id, req.body.rating, req.body.comment], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ insertedId: result.insertId });
  });
});

router.put("/:id/status", (req, res) => {
  db.query("UPDATE Review SET status = ? WHERE review_id = ?", [req.body.status, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Review status updated" });
  });
});

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Review WHERE review_id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Review deleted" });
  });
});

export default router;
