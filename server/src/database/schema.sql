-- =====================================================================
-- Kick — MySQL 8 / MariaDB 10.6+ schema
-- 9 tables. Run: mysql -u root -p Kick < schema.sql
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id         CHAR(26)     NOT NULL,            -- ULID, used in the API
  role              ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  first_name        VARCHAR(60)  NOT NULL,
  last_name         VARCHAR(60)  NOT NULL,
  email             VARCHAR(160) NOT NULL,            -- stored lowercased
  password_hash     VARCHAR(255) NOT NULL,            -- bcrypt cost 12
  phone             VARCHAR(24)  DEFAULT NULL,
  status            ENUM('active','blocked') NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP    NULL DEFAULT NULL,

  -- Default shipping address
  address_line1     VARCHAR(200) DEFAULT NULL,
  address_line2     VARCHAR(200) DEFAULT NULL,
  address_city      VARCHAR(80)  DEFAULT NULL,
  address_state     VARCHAR(80)  DEFAULT NULL,
  address_postal    VARCHAR(20)  DEFAULT NULL,
  address_country   VARCHAR(80)  DEFAULT NULL,

  preferred_size    VARCHAR(8)   DEFAULT NULL,
  marketing_opt_in  BOOLEAN      NOT NULL DEFAULT FALSE,
  notes             TEXT         DEFAULT NULL,        -- admin-only
  last_login_at     TIMESTAMP    NULL DEFAULT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. auth_tokens
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       ENUM('refresh','password_reset','email_verify') NOT NULL,
  token_hash CHAR(64)  NOT NULL,      -- SHA-256 hex
  user_agent VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45)  DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tokens_hash (token_hash),
  KEY idx_tokens_user_type (user_id, type),
  KEY idx_tokens_expires (expires_at),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id   CHAR(26)     NOT NULL,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  color       VARCHAR(32) NOT NULL DEFAULT 'slate',
  image_url   VARCHAR(500) DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_public_id (public_id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. products
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id        CHAR(26)     NOT NULL,
  category_id      BIGINT UNSIGNED DEFAULT NULL,
  name             VARCHAR(200) NOT NULL,
  slug             VARCHAR(220) NOT NULL,
  sku              VARCHAR(60)  NOT NULL,
  description      TEXT         NOT NULL,
  brand            VARCHAR(80)  NOT NULL DEFAULT 'Kick',
  gender           ENUM('men','women','unisex','kids') NOT NULL DEFAULT 'unisex',
  material         VARCHAR(80)  DEFAULT NULL,

  price            DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2) DEFAULT NULL,
  cost_per_item    DECIMAL(10,2) DEFAULT NULL,

  status           ENUM('active','draft','archived','out_of_stock')
                   NOT NULL DEFAULT 'draft',
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,

  total_stock      INT NOT NULL DEFAULT 0,
  units_sold       INT NOT NULL DEFAULT 0,
  rating_avg       DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count     INT NOT NULL DEFAULT 0,

  images           JSON DEFAULT NULL,
  color_images     JSON DEFAULT NULL,
  tags             JSON DEFAULT NULL,

  deleted_at       TIMESTAMP NULL DEFAULT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_public_id (public_id),
  UNIQUE KEY uq_products_slug (slug),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category (category_id),
  KEY idx_products_live (status, deleted_at),
  KEY idx_products_price (price),
  KEY idx_products_featured (is_featured, status),
  KEY idx_products_created (created_at),
  FULLTEXT KEY ft_products_search (name, description, brand),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. product_variants
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id  CHAR(26)    NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  size       VARCHAR(8)  NOT NULL,
  color      VARCHAR(40) NOT NULL,
  sku        VARCHAR(70) NOT NULL,
  stock      INT UNSIGNED NOT NULL DEFAULT 0,
  reserved   INT UNSIGNED NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variants_public_id (public_id),
  UNIQUE KEY uq_variants_sku (sku),
  UNIQUE KEY uq_variants_combo (product_id, size, color),
  KEY idx_variants_product (product_id),
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT chk_variants_reserved CHECK (reserved <= stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. orders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id      CHAR(26)    NOT NULL,
  order_number   VARCHAR(20) NOT NULL,
  user_id        BIGINT UNSIGNED DEFAULT NULL,

  customer_email VARCHAR(160) NOT NULL,
  customer_name  VARCHAR(140) NOT NULL,
  customer_phone VARCHAR(24)  DEFAULT NULL,

  status         ENUM('pending','processing','shipped','delivered',
                      'cancelled','returned') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending','paid','failed','refunded')
                 NOT NULL DEFAULT 'pending',
  payment_method ENUM('card','upi','paypal','cod','net_banking')
                 NOT NULL DEFAULT 'card',

  subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency       CHAR(3) NOT NULL DEFAULT 'USD',

  stripe_payment_intent_id VARCHAR(120) DEFAULT NULL,
  stripe_charge_id         VARCHAR(120) DEFAULT NULL,
  refunded_amount          DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  shipping_name    VARCHAR(120) NOT NULL,
  shipping_phone   VARCHAR(24)  DEFAULT NULL,
  shipping_line1   VARCHAR(200) NOT NULL,
  shipping_line2   VARCHAR(200) DEFAULT NULL,
  shipping_city    VARCHAR(80)  NOT NULL,
  shipping_state   VARCHAR(80)  NOT NULL,
  shipping_postal  VARCHAR(20)  NOT NULL,
  shipping_country VARCHAR(80)  NOT NULL,

  courier         VARCHAR(60) DEFAULT NULL,
  tracking_number VARCHAR(80) DEFAULT NULL,
  customer_note   TEXT DEFAULT NULL,
  admin_note      TEXT DEFAULT NULL,

  placed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at      TIMESTAMP NULL DEFAULT NULL,
  shipped_at   TIMESTAMP NULL DEFAULT NULL,
  delivered_at TIMESTAMP NULL DEFAULT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  UNIQUE KEY uq_orders_number (order_number),
  UNIQUE KEY uq_orders_intent (stripe_payment_intent_id),
  KEY idx_orders_user (user_id, placed_at),
  KEY idx_orders_status_placed (status, placed_at),
  KEY idx_orders_payment_status (payment_status),
  KEY idx_orders_placed (placed_at),
  KEY idx_orders_email (customer_email),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. order_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED DEFAULT NULL,
  variant_id    BIGINT UNSIGNED DEFAULT NULL,
  product_name  VARCHAR(200) NOT NULL,
  product_slug  VARCHAR(220) DEFAULT NULL,
  product_sku   VARCHAR(70)  NOT NULL,
  product_image VARCHAR(500) DEFAULT NULL,
  size          VARCHAR(8)   NOT NULL,
  color         VARCHAR(40)  NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  quantity      INT UNSIGNED  NOT NULL,
  line_total    DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_order (order_id),
  KEY idx_items_product (product_id),
  KEY idx_items_variant (variant_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT fk_items_variant FOREIGN KEY (variant_id)
    REFERENCES product_variants (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. stripe_events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id     VARCHAR(120) NOT NULL,
  type         VARCHAR(80)  NOT NULL,
  processed_at TIMESTAMP    NULL DEFAULT NULL,
  error        TEXT         DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stripe_event (event_id),
  KEY idx_stripe_unprocessed (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. schema_migrations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(200) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;