import express from "express";
import { db } from "../db.js";
const router = express.Router();

/* -------------------------------------------------------------------------- */
/* GET all reservations with customer & car details + computed rental hours   */
/* -------------------------------------------------------------------------- */
router.get("/", (req, res) => {
  const q = `
    SELECT 
      r.*,
      c.first_name,
      c.last_name,
      car.model,
      car.registration_number,
      IFNULL(TIMESTAMPDIFF(HOUR, r.pickup_datetime, r.return_datetime), 0) AS hours
    FROM Reservation r
    JOIN Customer c ON r.customer_id = c.customer_id
    JOIN Car car ON r.car_id = car.car_id
    ORDER BY r.reservation_id;
  `;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    res.json(rows);
  });
});

/* -------------------------------------------------------------------------- */
/* GET specific reservation by ID                                             */
/* -------------------------------------------------------------------------- */
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM Reservation WHERE reservation_id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    res.json(rows[0] || null);
  });
});

/* -------------------------------------------------------------------------- */
/* CREATE reservation via stored procedure CreateReservation                  */
/* -------------------------------------------------------------------------- */
router.post("/", (req, res) => {
  const { customer_id, car_id, pickup_location_id, dropoff_location_id, pickup_datetime, return_datetime } = req.body;
  const sql = `CALL CreateReservation(?, ?, ?, ?, ?, ?)`;

  db.query(sql, [customer_id, car_id, pickup_location_id, dropoff_location_id, pickup_datetime, return_datetime], (err) => {
    if (err) {
      return res.status(400).json({ error: err.sqlMessage || err.message, code: err.code });
    }

    // Fetch the created reservation and updated car status
    db.query(
      "SELECT * FROM Reservation WHERE customer_id = ? AND car_id = ? ORDER BY reservation_id DESC LIMIT 1",
      [customer_id, car_id],
      (err2, rows2) => {
        if (err2) return res.status(500).json({ warning: "Reservation created but failed to fetch", error: err2.sqlMessage });
        db.query("SELECT car_id, status FROM Car WHERE car_id = ?", [car_id], (err3, rows3) => {
          if (err3) return res.json({ reservation: rows2[0] || null });
          res.json({ reservation: rows2[0] || null, carStatus: rows3[0] || null });
        });
      }
    );
  });
});

/* -------------------------------------------------------------------------- */
/* UPDATE reservation status (e.g., Completed, Pending, Cancelled)            */
/* -------------------------------------------------------------------------- */
router.put("/:id/status", (req, res) => {
  const q = "UPDATE Reservation SET status = ? WHERE reservation_id = ?";
  db.query(q, [req.body.status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });

    // Fetch updated car status after reservation completion
    db.query("SELECT car_id FROM Reservation WHERE reservation_id = ?", [req.params.id], (err2, rows) => {
      if (err2) return res.json({ message: "Reservation status updated" });

      const carId = rows?.[0]?.car_id;
      if (carId) {
        db.query("SELECT status FROM Car WHERE car_id = ?", [carId], (err3, rows3) => {
          if (err3) return res.json({ message: "Reservation status updated" });
          return res.json({
            message: "Reservation status updated",
            carStatus: rows3?.[0]?.status || null,
          });
        });
      } else {
        return res.json({ message: "Reservation status updated" });
      }
    });
  });
});

/* -------------------------------------------------------------------------- */
/* DELETE reservation                                                         */
/* -------------------------------------------------------------------------- */
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM Reservation WHERE reservation_id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    res.json({ message: "Reservation deleted" });
  });
});

/* -------------------------------------------------------------------------- */
/* GET rental hours for a specific reservation (uses GetRentalHours function) */
/* -------------------------------------------------------------------------- */
router.get("/hours/:reservationId", (req, res) => {
  const reservationId = req.params.reservationId;
  const sql = `
    SELECT GetRentalHours(pickup_datetime, return_datetime) AS hours
    FROM Reservation WHERE reservation_id = ?;
  `;
  db.query(sql, [reservationId], (err, result) => {
    if (err) {
      console.error("Error fetching rental hours:", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    res.json({ hours: result?.[0]?.hours || 0 });
  });
});

export default router;
