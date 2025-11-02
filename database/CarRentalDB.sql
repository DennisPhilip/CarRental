/* ============================================================
   STEP 12 – Car Rental System Project SQL Script
   ============================================================ */

-- ------------------------------------------------------------
-- 1. CREATE DATABASE
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS CarRentalDB;
USE CarRentalDB;

-- ------------------------------------------------------------
-- 2. CREATE TABLES (DDL)
-- ------------------------------------------------------------

CREATE TABLE Customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    license_number VARCHAR(30) UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    membership_tier ENUM('Regular','Premium','Corporate') DEFAULT 'Regular',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Car_Category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) NOT NULL
);

CREATE TABLE Location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    operating_hours VARCHAR(100)
);

CREATE TABLE Car (
    car_id INT AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('Available','Reserved','Maintenance') DEFAULT 'Available',
    location_id INT,
    category_id INT,
    FOREIGN KEY (location_id) REFERENCES Location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES Car_Category(category_id) ON DELETE SET NULL
);

CREATE TABLE Reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    car_id INT NOT NULL,
    pickup_location_id INT NOT NULL,
    dropoff_location_id INT NOT NULL,
    pickup_datetime DATETIME NOT NULL,
    return_datetime DATETIME NOT NULL,
    status ENUM('Pending','Confirmed','Active','Completed','Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES Car(car_id) ON DELETE CASCADE,
    FOREIGN KEY (pickup_location_id) REFERENCES Location(location_id),
    FOREIGN KEY (dropoff_location_id) REFERENCES Location(location_id),
    CHECK (TIMESTAMPDIFF(HOUR,pickup_datetime,return_datetime) >= 4)
);

CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    payment_type ENUM('Booking Deposit','Final Payment','Security Deposit','Penalty') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Credit Card','Debit Card','Wallet','Bank Transfer') NOT NULL,
    payment_status ENUM('Pending','Processed','Failed','Refunded') DEFAULT 'Pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE
);

CREATE TABLE Maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    service_date DATE NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    remarks VARCHAR(255),
    FOREIGN KEY (car_id) REFERENCES Car(car_id) ON DELETE CASCADE
);

CREATE TABLE Review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    reservation_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(255),
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. TRIGGERS
-- ------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER check_customer_age
BEFORE INSERT ON Customer
FOR EACH ROW
BEGIN
    IF TIMESTAMPDIFF(YEAR,NEW.date_of_birth,CURDATE()) < 21 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Customer must be at least 21 years old.';
    END IF;
END$$

CREATE TRIGGER prevent_booking_maintenance
BEFORE INSERT ON Reservation
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Maintenance
        WHERE car_id=NEW.car_id
          AND (service_date BETWEEN DATE(NEW.pickup_datetime) AND DATE(NEW.return_datetime))
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Car is under maintenance during this period';
    END IF;
END$$

CREATE TRIGGER update_car_status_after_reservation
AFTER INSERT ON Reservation
FOR EACH ROW
BEGIN
    UPDATE Car SET status='Reserved' WHERE car_id=NEW.car_id;
END$$

CREATE TRIGGER reset_car_status_after_completion
AFTER UPDATE ON Reservation
FOR EACH ROW
BEGIN
    IF NEW.status='Completed' THEN
        UPDATE Car SET status='Available' WHERE car_id=NEW.car_id;
    END IF;
END$$
DELIMITER ;

-- ------------------------------------------------------------
-- 4. STORED PROCEDURES & FUNCTIONS
-- ------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE CreateReservation(
    IN p_customer_id INT,
    IN p_car_id INT,
    IN p_pickup_loc INT,
    IN p_dropoff_loc INT,
    IN p_pickup DATETIME,
    IN p_return DATETIME
)
BEGIN
    INSERT INTO Reservation(customer_id,car_id,pickup_location_id,dropoff_location_id,pickup_datetime,return_datetime)
    VALUES(p_customer_id,p_car_id,p_pickup_loc,p_dropoff_loc,p_pickup,p_return);
END$$

CREATE PROCEDURE AddPayment(
    IN p_reservation_id INT,
    IN p_type ENUM('Booking Deposit','Final Payment','Security Deposit','Penalty'),
    IN p_amount DECIMAL(10,2),
    IN p_method ENUM('Credit Card','Debit Card','Wallet','Bank Transfer')
)
BEGIN
    INSERT INTO Payment(reservation_id,payment_type,amount,payment_method)
    VALUES(p_reservation_id,p_type,p_amount,p_method);
END$$

CREATE FUNCTION GetRentalHours(p_pickup DATETIME,p_return DATETIME)
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(HOUR,p_pickup,p_return);
END$$

CREATE FUNCTION CalculateTotalPayment(p_reservation_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT SUM(amount) INTO total
    FROM Payment
    WHERE reservation_id=p_reservation_id AND payment_status='Processed';
    RETURN IFNULL(total,0);
END$$
DELIMITER ;

-- ------------------------------------------------------------
-- 5. INSERT SAMPLE DATA (DML)
-- ------------------------------------------------------------
INSERT INTO Car_Category(category_name,daily_rate,security_deposit) VALUES
('Economy',1200.00,5000.00),
('SUV',2500.00,8000.00),
('Luxury',4000.00,12000.00);

INSERT INTO Location(location_name,address,city,operating_hours) VALUES
('MG Road Branch','12 MG Road','Bangalore','8 AM - 8 PM'),
('Airport Branch','1 Airport Rd','Bangalore','24 Hours');

INSERT INTO Customer(first_name,last_name,email,phone,license_number,date_of_birth,membership_tier) VALUES
('John','Doe','john@example.com','9991112222','DL12345','1995-06-10','Regular'),
('Emma','Brown','emma@example.com','9993334444','DL67890','1990-08-21','Premium'),
('Aviyakth','R','avi@example.com','9995557777','KA55555','1999-04-12','Regular'),
('Ravi','Kumar','ravi@example.com','9999999999','MH12345','2000-05-10','Regular');

INSERT INTO Car(model,make,year,registration_number,status,location_id,category_id) VALUES
('Baleno','Maruti',2023,'KA05AB1122','Available',1,1),
('Creta','Hyundai',2023,'KA02CD5678','Available',2,2),
('BMW X5','BMW',2021,'KA03EF9999','Available',1,3),
('Swift','Maruti',2022,'KA07XY3344','Available',1,1),
('Ertiga','Maruti',2023,'KA05AB1231','Available',2,2);

INSERT INTO Maintenance(car_id,service_type,service_date,cost,remarks) VALUES
(2,'Engine Check','2025-10-05',3500.00,'Routine service'),
(3,'Brake Repair','2025-10-08',4200.00,'Replaced pads');

-- ------------------------------------------------------------
-- 6. DEMONSTRATION / TEST OF CRUD AND TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------
CALL CreateReservation(1,1,1,2,'2025-10-06 10:00:00','2025-10-06 18:00:00');  -- auto-sets car Reserved
UPDATE Reservation SET status='Completed' WHERE reservation_id=1;             -- trigger makes car Available again

CALL AddPayment(1,'Final Payment',5500.00,'Wallet');
UPDATE Payment SET payment_status='Processed' WHERE reservation_id=1;

SELECT CalculateTotalPayment(1) AS TotalPayment;
SELECT GetRentalHours('2025-11-10 10:00:00','2025-11-11 10:00:00') AS ExampleHours;

-- ------------------------------------------------------------
-- 7. JOIN QUERIES (EXAMPLES)
-- ------------------------------------------------------------
SELECT r.reservation_id, c.first_name, car.model,
       r.pickup_datetime, r.return_datetime, r.status
FROM Reservation r
JOIN Customer c ON r.customer_id = c.customer_id
JOIN Car car ON r.car_id = car.car_id;

SELECT p.payment_id, c.first_name, car.model,
       p.amount, p.payment_method, p.payment_status
FROM Payment p
JOIN Reservation r ON p.reservation_id = r.reservation_id
JOIN Customer c ON r.customer_id = c.customer_id
JOIN Car car ON r.car_id = car.car_id;

-- ------------------------------------------------------------
-- 8. NESTED QUERIES
-- ------------------------------------------------------------
-- Customers who spent above average
SELECT c.first_name, c.last_name
FROM Customer c
WHERE c.customer_id IN (
    SELECT r.customer_id
    FROM Reservation r
    JOIN Payment p ON r.reservation_id = p.reservation_id
    GROUP BY r.customer_id
    HAVING SUM(p.amount) > (SELECT AVG(amount) FROM Payment)
);

-- Cars never booked
SELECT model, make FROM Car
WHERE car_id NOT IN (SELECT DISTINCT car_id FROM Reservation);

-- ------------------------------------------------------------
-- 9. AGGREGATE QUERIES
-- ------------------------------------------------------------
-- Total revenue per car
SELECT car.model, SUM(p.amount) AS total_revenue
FROM Payment p
JOIN Reservation r ON p.reservation_id = r.reservation_id
JOIN Car car ON r.car_id = car.car_id
WHERE p.payment_status='Processed'
GROUP BY car.model;

-- Most rented car
SELECT car.model, COUNT(r.reservation_id) AS total_rentals
FROM Car car
JOIN Reservation r ON car.car_id = r.car_id
GROUP BY car.model
ORDER BY total_rentals DESC
LIMIT 1;

-- ------------------------------------------------------------
-- END OF FILE
-- ------------------------------------------------------------
