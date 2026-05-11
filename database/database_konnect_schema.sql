-- Konnect Payment Integration Schema
-- Tables for storing payment information

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TND',
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  konnect_payment_id VARCHAR(255) UNIQUE,
  konnect_session_id VARCHAR(255) UNIQUE,
  merchant_reference VARCHAR(255),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  payment_url TEXT,
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_konnect_payment_id (konnect_payment_id),
  INDEX idx_created_at (created_at)
);

-- Payment attempts tracking (for retry logic)
CREATE TABLE IF NOT EXISTS payment_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL,
  attempt_number INT DEFAULT 1,
  status VARCHAR(50),
  error_message TEXT,
  response_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_payment_id (payment_id),
  INDEX idx_created_at (created_at)
);

-- Add payment columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid', 'pending', 'paid', 'failed') DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_id INT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL,
ADD FOREIGN KEY IF NOT EXISTS (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Add indexes for Konnect tracking
ALTER TABLE subscriptions 
ADD INDEX IF NOT EXISTS idx_konnect_session_id (konnect_session_id),
ADD INDEX IF NOT EXISTS idx_merchant_reference (merchant_reference);
