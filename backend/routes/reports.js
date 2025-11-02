import express from "express";
import { db } from "../db.js";
const router = express.Router();

/* ----------------------------- JOIN QUERIES ----------------------------- */

// Reservation Summary (Join)
router.get("/reservations-summary", (req, res) => {
  const q = `
    SELECT r.reservation_id, c.first_name, car.model,
           r.pickup_datetime, r.return_datetime, r.status
    FROM Reservation r
    JOIN Customer c ON r.customer_id = c.customer_id
    JOIN Car car ON r.car_id = car.car_id
    ORDER BY r.reservation_id;
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

// Payment Report (Join)
router.get("/payment-report", (req, res) => {
  const q = `
    SELECT p.payment_id, c.first_name, car.model, p.amount,
           p.payment_method, p.payment_status
    FROM Payment p
    JOIN Reservation r ON p.reservation_id = r.reservation_id
    JOIN Customer c ON r.customer_id = c.customer_id
    JOIN Car car ON r.car_id = car.car_id;
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

/* ---------------------------- AGGREGATE QUERIES ---------------------------- */

// Total revenue per car
router.get("/total-revenue", (req, res) => {
  const q = `
    SELECT car.model, SUM(p.amount) AS total_revenue
    FROM Payment p
    JOIN Reservation r ON p.reservation_id = r.reservation_id
    JOIN Car car ON r.car_id = car.car_id
    WHERE p.payment_status='Processed'
    GROUP BY car.model;
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

// Most rented car
router.get("/most-rented", (req, res) => {
  const q = `
    SELECT car.model, COUNT(r.reservation_id) AS total_rentals
    FROM Car car
    JOIN Reservation r ON car.car_id = r.car_id
    GROUP BY car.model
    ORDER BY total_rentals DESC
    LIMIT 1;
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows[0] || {});
  });
});

/* ----------------------------- NESTED QUERIES ----------------------------- */

// Customers who spent above average
router.get("/top-customers", (req, res) => {
  const q = `
    SELECT c.first_name, c.last_name
    FROM Customer c
    WHERE c.customer_id IN (
      SELECT r.customer_id
      FROM Reservation r
      JOIN Payment p ON r.reservation_id = p.reservation_id
      GROUP BY r.customer_id
      HAVING SUM(p.amount) > (SELECT AVG(amount) FROM Payment)
    );
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

// Cars never booked
router.get("/unused-cars", (req, res) => {
  const q = `
    SELECT model, make FROM Car
    WHERE car_id NOT IN (
      SELECT DISTINCT car_id FROM Reservation
    );
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage });
    res.json(rows);
  });
});

export default router;
