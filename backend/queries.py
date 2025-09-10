create_orders_table = """
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tab_id TEXT NOT NULL REFERENCES tabs(id),
  device_id TEXT NOT NULL REFERENCES devices(id),
  status TEXT NOT NULL DEFAULT 'pending'
);
""" 

create_drinks_table = """
CREATE TABLE IF NOT EXISTS drinks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);
INSERT INTO drinks (id, name, price) VALUES
  ('small_beer', 'Small Beer', 2.70),
  ('large_beer', 'Large Beer', 3.20),
  ('whiskey', 'Whiskey', 3.00),
  ('wine', 'Wine', 4.00),
  ('vodka', 'Vodka', 2.50),
  ('borovicka', 'Borovicka', 2.00)
ON CONFLICT (id) DO NOTHING;
"""

create_orderItems_table = """
CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  drink_id TEXT NOT NULL REFERENCES drinks(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  price NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (order_id, drink_id)
);
"""

create_rooms_table = """
CREATE TABLE IF NOT EXISTS rooms (
id TEXT PRIMARY KEY,
number TEXT UNIQUE NOT NULL
);
INSERT INTO rooms (id, number) VALUES
('a11', 'A1.1'),
('a21', 'A2.1'),
('a22', 'A2.2'),
('a23', 'A2.3');
"""

create_devices_table = """
CREATE TABLE IF NOT EXISTS devices (
id TEXT PRIMARY KEY,
guest_id TEXT NOT NULL REFERENCES guests(id),
room_id TEXT NOT NULL REFERENCES rooms(id),
token_hash TEXT NOT NULL
);
"""

create_tabs_table = """
CREATE TABLE IF NOT EXISTS tabs (
id TEXT PRIMARY KEY,
room_id TEXT NOT NULL REFERENCES rooms(id),
is_open INTEGER NOT NULL DEFAULT 1,
opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
closed_at TEXT
);
"""
