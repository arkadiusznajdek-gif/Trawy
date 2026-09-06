CREATE DATABASE IF NOT EXISTS szkolka_traw
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE szkolka_traw;

CREATE TABLE IF NOT EXISTS plant_varieties (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  botanical_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plant_variety_botanical_name (botanical_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS container_sizes (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  label VARCHAR(80) NOT NULL,
  capacity_liters DECIMAL(8,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_container_size_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS batches (
  id CHAR(36) PRIMARY KEY,
  batch_number VARCHAR(64) NOT NULL,
  variety_id CHAR(36) NOT NULL,
  container_size_id CHAR(36),
  location VARCHAR(160),
  quantity INT NOT NULL DEFAULT 0,
  status ENUM('active','reserved','sold_out','archived') NOT NULL DEFAULT 'active',
  planted_at DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batch_number (batch_number),
  KEY idx_batches_variety (variety_id),
  CONSTRAINT fk_batches_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id),
  CONSTRAINT fk_batches_container FOREIGN KEY (container_size_id) REFERENCES container_sizes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id CHAR(36) PRIMARY KEY,
  batch_id CHAR(36),
  variety_id CHAR(36),
  movement_type ENUM('purchase','division','repotting','sale','loss','inventory_adjustment','transfer') NOT NULL,
  quantity INT NOT NULL,
  source_batch_id CHAR(36),
  target_batch_id CHAR(36),
  reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_movements_batch (batch_id),
  KEY idx_stock_movements_variety (variety_id),
  CONSTRAINT fk_stock_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_source_batch FOREIGN KEY (source_batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_target_batch FOREIGN KEY (target_batch_id) REFERENCES batches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplies (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  minimum_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supply_purchases (
  id CHAR(36) PRIMARY KEY,
  supply_id CHAR(36) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  purchased_at DATE NOT NULL,
  supplier VARCHAR(160),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_supply_purchases_supply (supply_id),
  CONSTRAINT fk_supply_purchases_supply FOREIGN KEY (supply_id) REFERENCES supplies(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160),
  phone VARCHAR(64),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS price_list (
  id CHAR(36) PRIMARY KEY,
  variety_id CHAR(36) NOT NULL,
  container_size_id CHAR(36) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_price_list_item (variety_id, container_size_id),
  CONSTRAINT fk_price_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id) ON DELETE CASCADE,
  CONSTRAINT fk_price_container FOREIGN KEY (container_size_id) REFERENCES container_sizes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bundles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id CHAR(36) NOT NULL,
  variety_id CHAR(36) NOT NULL,
  container_size_id CHAR(36),
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (bundle_id, variety_id, container_size_id),
  CONSTRAINT fk_bundle_items_bundle FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
  CONSTRAINT fk_bundle_items_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id),
  CONSTRAINT fk_bundle_items_container FOREIGN KEY (container_size_id) REFERENCES container_sizes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  customer_id CHAR(36),
  order_number VARCHAR(64) NOT NULL,
  status ENUM('draft','confirmed','fulfilled','cancelled') NOT NULL DEFAULT 'draft',
  ordered_at DATE NOT NULL,
  fulfilled_at DATE,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_orders_customer (customer_id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  variety_id CHAR(36),
  container_size_id CHAR(36),
  bundle_id CHAR(36),
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_items_container FOREIGN KEY (container_size_id) REFERENCES container_sizes(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_items_bundle FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS losses (
  id CHAR(36) PRIMARY KEY,
  batch_id CHAR(36),
  variety_id CHAR(36),
  quantity INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  lost_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_losses_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_losses_variety FOREIGN KEY (variety_id) REFERENCES plant_varieties(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status ENUM('todo','in_progress','done','cancelled') NOT NULL DEFAULT 'todo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_log (
  id CHAR(36) PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL,
  entity_id CHAR(36),
  action VARCHAR(64) NOT NULL,
  details JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO container_sizes (id, code, label, capacity_liters)
VALUES
  (UUID(), 'P9', 'P9', 0.50),
  (UUID(), 'C3', 'C3', 3.00),
  (UUID(), 'C5', 'C5', 5.00),
  (UUID(), 'GRUNT', 'Grunt', NULL);