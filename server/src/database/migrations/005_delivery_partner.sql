-- 005_delivery_partner.sql
-- Widen orders.status ENUM to include delivery lifecycle statuses
ALTER TABLE orders
  MODIFY COLUMN status
    ENUM('pending','processing','ready_for_pickup','assigned','shipping','delivered','cancelled','returned')
    NOT NULL DEFAULT 'pending';

-- Add delivery_partner_id FK on orders (nullable, set when assigned)
ALTER TABLE orders
  ADD COLUMN delivery_partner_id BIGINT UNSIGNED DEFAULT NULL AFTER user_id,
  ADD KEY idx_orders_delivery_partner (delivery_partner_id);

-- New table: delivery_partners
CREATE TABLE IF NOT EXISTS delivery_partners (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     CHAR(26) NOT NULL,
  first_name    VARCHAR(60) NOT NULL,
  last_name     VARCHAR(60) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(24) DEFAULT NULL,
  vehicle_type  ENUM('bike','scooter','car') NOT NULL DEFAULT 'bike',
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat   DECIMAL(10,8) DEFAULT NULL,
  current_lng   DECIMAL(11,8) DEFAULT NULL,
  status        ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dp_public_id (public_id),
  UNIQUE KEY uq_dp_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK constraint after table exists
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_delivery_partner
    FOREIGN KEY (delivery_partner_id) REFERENCES delivery_partners (id) ON DELETE SET NULL;
