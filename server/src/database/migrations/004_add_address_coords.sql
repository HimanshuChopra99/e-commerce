-- Persist geocoded address coordinates so they are resolved once (when the
-- customer picks/saves their address) and reused at tracking time instead of
-- calling Nominatim on every "mark shipped" / tracking update.
--
-- schema.sql already contains these columns for a fresh installation, so the
-- conditional statements below also make this migration safe in that case
-- (mirrors 002_add_product_color_images.sql).

-- users.address_lat
SET @kick_has_addr_lat = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'address_lat'
);
SET @kick_addr_lat_ddl = IF(
  @kick_has_addr_lat = 0,
  'ALTER TABLE users ADD COLUMN address_lat DECIMAL(10, 8) NULL AFTER address_country',
  'SELECT 1'
);
PREPARE kick_addr_lat_stmt FROM @kick_addr_lat_ddl;
EXECUTE kick_addr_lat_stmt;
DEALLOCATE PREPARE kick_addr_lat_stmt;

-- users.address_lng
SET @kick_has_addr_lng = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'address_lng'
);
SET @kick_addr_lng_ddl = IF(
  @kick_has_addr_lng = 0,
  'ALTER TABLE users ADD COLUMN address_lng DECIMAL(11, 8) NULL AFTER address_lat',
  'SELECT 1'
);
PREPARE kick_addr_lng_stmt FROM @kick_addr_lng_ddl;
EXECUTE kick_addr_lng_stmt;
DEALLOCATE PREPARE kick_addr_lng_stmt;

-- orders.shipping_lat
SET @kick_has_ship_lat = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'shipping_lat'
);
SET @kick_ship_lat_ddl = IF(
  @kick_has_ship_lat = 0,
  'ALTER TABLE orders ADD COLUMN shipping_lat DECIMAL(10, 8) NULL AFTER shipping_country',
  'SELECT 1'
);
PREPARE kick_ship_lat_stmt FROM @kick_ship_lat_ddl;
EXECUTE kick_ship_lat_stmt;
DEALLOCATE PREPARE kick_ship_lat_stmt;

-- orders.shipping_lng
SET @kick_has_ship_lng = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'shipping_lng'
);
SET @kick_ship_lng_ddl = IF(
  @kick_has_ship_lng = 0,
  'ALTER TABLE orders ADD COLUMN shipping_lng DECIMAL(11, 8) NULL AFTER shipping_lat',
  'SELECT 1'
);
PREPARE kick_ship_lng_stmt FROM @kick_ship_lng_ddl;
EXECUTE kick_ship_lng_stmt;
DEALLOCATE PREPARE kick_ship_lng_stmt;
