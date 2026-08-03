-- Category colors are presentation metadata. Keep them flexible instead of
-- failing seeds/admin edits for a color that was not predeclared in an ENUM.
ALTER TABLE categories
  MODIFY COLUMN color VARCHAR(32) NOT NULL DEFAULT 'slate';
