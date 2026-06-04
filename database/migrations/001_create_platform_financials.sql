-- Migration: create platform_financials table and default row
CREATE TABLE IF NOT EXISTS platform_financials (
  id INT PRIMARY KEY,
  admin_revenue DECIMAL(10,2) DEFAULT 0.00
);

-- Insert default row if not exists
INSERT INTO platform_financials (id, admin_revenue)
SELECT 1, 0.00
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM platform_financials WHERE id = 1);

COMMIT;
