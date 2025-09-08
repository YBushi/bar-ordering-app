create_orders_table = """
CREATE TABLE IF NOT EXISTS orders (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status    TEXT NOT NULL
);
""" 

create_drinks_table = """
CREATE TABLE IF NOT EXISTS drinks (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
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
  qty      INTEGER NOT NULL CHECK (qty > 0),
  price    NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (order_id, drink_id)
);
"""