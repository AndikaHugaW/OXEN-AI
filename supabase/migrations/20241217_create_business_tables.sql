-- 1. Skema Tabel Utama (Penjualan)
-- Tabel untuk data penjualan bisnis
CREATE TABLE IF NOT EXISTS sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  product_name text NOT NULL,
  category text,
  amount numeric NOT NULL, -- Revenue/Total Harga
  quantity integer NOT NULL,
  region text
);

-- Tambahkan RLS (Row Level Security) agar aman (sesuai tips no 4)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Kebijakan contoh: Semua orang bisa baca (untuk demo), nanti bisa diperketat per user_id
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);

-- Insert Dummy Data agar view tidak kosong
INSERT INTO sales (created_at, product_name, category, amount, quantity, region) VALUES
(now() - interval '1 month', 'Laptop Pro X', 'Electronics', 25000000, 2, 'Jakarta'),
(now() - interval '1 month', 'Mouse Wireless', 'Electronics', 500000, 10, 'Bandung'),
(now() - interval '1 month', 'Meja Kantor', 'Furniture', 3000000, 5, 'Jakarta'),
(now() - interval '2 months', 'Laptop Pro X', 'Electronics', 12500000, 1, 'Surabaya'),
(now() - interval '2 months', 'Monitor 4K', 'Electronics', 8000000, 3, 'Jakarta'),
(now() - interval '2 months', 'Kursi Ergonomis', 'Furniture', 4500000, 3, 'Medan'),
(now() - interval '3 months', 'Server Rack', 'Infrastructure', 50000000, 1, 'Jakarta'),
(now() - interval '3 months', 'Kabel LAN 100m', 'Infrastructure', 2000000, 4, 'Bandung'),
(now() - interval '4 months', 'Laptop Student', 'Electronics', 15000000, 3, 'Yogyakarta'),
(now() - interval '5 months', 'Headset Gaming', 'Electronics', 2500000, 5, 'Jakarta');


-- 2. Membuat "View" untuk Efisiensi Token
-- View untuk ringkasan penjualan per bulan dan kategori
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
  date_trunc('month', created_at) as month,
  category,
  sum(amount) as total_revenue,
  sum(quantity) as total_items_sold
FROM sales
GROUP BY 1, 2
ORDER BY month DESC;
