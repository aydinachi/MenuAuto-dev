-- Add size and variation columns to order_items table
USE menuauto_db;

-- Check if columns exist first
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'menuauto_db' 
     AND TABLE_NAME = 'order_items' 
     AND COLUMN_NAME = 'size') = 0,
    'ALTER TABLE order_items ADD COLUMN size VARCHAR(50) NULL',
    'SELECT "size column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'menuauto_db' 
     AND TABLE_NAME = 'order_items' 
     AND COLUMN_NAME = 'variation') = 0,
    'ALTER TABLE order_items ADD COLUMN variation VARCHAR(100) NULL',
    'SELECT "variation column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE order_items; 