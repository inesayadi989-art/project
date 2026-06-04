-- Migration: Add missing fields to orders table for frontend compatibility

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE AFTER id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0.00 AFTER total;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0.00 AFTER subtotal;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT AFTER shipping_cost;

-- Generate order_number for existing orders if not already set
UPDATE orders SET order_number = CONCAT('ORD-', LPAD(id, 6, '0')) WHERE order_number IS NULL;
