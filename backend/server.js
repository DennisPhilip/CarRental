import express from "express";
import cors from "cors";
import { db } from "./db.js";

// route imports
import customersRouter from "./routes/customers.js";
import carsRouter from "./routes/cars.js";
import categoriesRouter from "./routes/categories.js";
import locationsRouter from "./routes/locations.js";
import reservationsRouter from "./routes/reservations.js";
import paymentsRouter from "./routes/payments.js";
import maintenanceRouter from "./routes/maintenance.js";
import reviewsRouter from "./routes/reviews.js";
import reportsRouter from "./routes/reports.js";

const app = express();
app.use(cors());
app.use(express.json());

// base route
app.get("/", (req, res) => res.json({ status: "Car Rental API", time: new Date() }));

// mount routes
app.use("/api/customers", customersRouter);
app.use("/api/cars", carsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/reports", reportsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
