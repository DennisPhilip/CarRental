import express from "express";
import { db } from "../db.js";
const router = express.Router();

// get payments
router.get("/", (req, res) => {
  const q = `SELECT p.*, r.pickup_datetime, r.return_datetime
             FROM Payment p
             LEFT JOIN Reservation r ON p.reservation_id=r.reservation_id
             ORDER BY p.payment_id`;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// add payment (direct INSERT so we can control payment_status and return total)
router.post("/", (req, res) => {
  const { reservation_id, payment_type, amount, payment_method, payment_status } = req.body;
  const status = payment_status || "Processed"; // default to Processed for demo
  const q = `INSERT INTO Payment (reservation_id, payment_type, amount, payment_method, payment_status)
             VALUES (?, ?, ?, ?, ?)`;
  db.query(q, [reservation_id, payment_type, amount, payment_method, status], (err, result) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    // after insert, return the inserted row id and the updated total for that reservation
    const insertedId = result.insertId;
    db.query("SELECT CalculateTotalPayment(?) AS total", [reservation_id], (err2, rows2) => {
      if (err2) return res.status(500).json({ error: err2.sqlMessage || err2.message });
      const total = rows2 && rows2[0] ? rows2[0].total : 0;
      res.json({ insertedId, total });
    });
  });
});

// set payment_status (Processed/Failed/Refunded)
router.put("/:id/status", (req, res) => {
  db.query("UPDATE Payment SET payment_status = ? WHERE payment_id = ?", [req.body.payment_status, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Payment status updated" });
  });
});

// get total processed payments for a reservation using function
// ---------------------------------------------------------------------------
//  Get total processed payment for a given reservation
// ---------------------------------------------------------------------------
router.get("/total/:reservationId", (req, res) => {
  const reservationId = req.params.reservationId;
  const q = `SELECT CalculateTotalPayment(?) AS total;`;

  db.query(q, [reservationId], (err, result) => {
    if (err) {
      console.error("Error fetching total payment:", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    res.json({ total: result?.[0]?.total || 0 });
  });
});

// Calculate total rental cost based on car rate * rental hours
router.get("/estimate/:reservationId", (req, res) => {
  const { reservationId } = req.params;

  const q = `
    SELECT 
      r.reservation_id,
      r.pickup_datetime,
      r.return_datetime,
      c.model,
      cat.daily_rate,
      GetRentalHours(r.pickup_datetime, r.return_datetime) AS hours,
      (cat.daily_rate * GetRentalHours(r.pickup_datetime, r.return_datetime)) AS estimated_cost
    FROM Reservation r
    JOIN Car c ON r.car_id = c.car_id
    JOIN car_category cat ON c.category_id = cat.category_id
    WHERE r.reservation_id = ?;
  `;

  db.query(q, [reservationId], (err, result) => {
    if (err) {
      console.error("Error calculating estimate:", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    if (!result.length) return res.status(404).json({ error: "Reservation not found" });
    res.json(result[0]);
  });
});

export default router;
