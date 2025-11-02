import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", (req, res) => {
  const q = `SELECT m.*, c.model FROM Maintenance m LEFT JOIN Car c ON m.car_id = c.car_id ORDER BY maintenance_id`;
  db.query(q, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { car_id, service_type, service_date, cost, remarks } = req.body;
  const q = "INSERT INTO Maintenance (car_id, service_type, service_date, cost, remarks) VALUES (?, ?, ?, ?, ?)";
  db.query(q, [car_id, service_type, service_date, cost, remarks], (err, result) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    // After successful insert, update the car status to 'Maintenance'
    db.query("UPDATE Car SET status = 'Maintenance' WHERE car_id = ?", [car_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.sqlMessage || err2.message });
      res.json({ insertedId: result.insertId, message: "Maintenance scheduled and car status updated" });
    });
  });
});

router.delete("/:id", (req, res) => {
  // when deleting maintenance, optionally reset car status if there are no other maintenance overlapping or reservations - here we simply delete
  db.query("SELECT car_id FROM Maintenance WHERE maintenance_id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    const carId = rows && rows[0] ? rows[0].car_id : null;
    db.query("DELETE FROM Maintenance WHERE maintenance_id=?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json(err2);
      // attempt to reset car to 'Available' if no active reservations (simple heuristic)
      if (carId) {
        // if there exists an active reservation for that car (status != Completed/Cancelled), keep as Reserved else set Available
        db.query("SELECT COUNT(*) AS cnt FROM Reservation WHERE car_id = ? AND status IN ('Pending','Confirmed','Active')", [carId], (err3, rows3) => {
          if (!err3 && rows3 && rows3[0] && rows3[0].cnt === 0) {
            db.query("UPDATE Car SET status = 'Available' WHERE car_id = ?", [carId], () => {
              return res.json({ message: "Maintenance removed and car status reset as applicable" });
            });
          } else {
            return res.json({ message: "Maintenance removed" });
          }
        });
      } else {
        return res.json({ message: "Maintenance removed" });
      }
    });
  });
});

export default router;
