-- Persist a separate gallery for every product colourway. The existing
-- `images` column remains as a flattened, backwards-compatible gallery used
-- by catalogue cards, order snapshots, and products created before this
-- feature was introduced.
--
-- schema.sql already contains this column for a fresh installation, so the
-- conditional statement also makes this migration safe in that case.
SET @kick_has_color_images = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'products'
    AND column_name = 'color_images'
);
SET @kick_color_images_ddl = IF(
  @kick_has_color_images = 0,
  'ALTER TABLE products ADD COLUMN color_images JSON DEFAULT NULL AFTER images',
  'SELECT 1'
);
PREPARE kick_color_images_stmt FROM @kick_color_images_ddl;
EXECUTE kick_color_images_stmt;
DEALLOCATE PREPARE kick_color_images_stmt;
