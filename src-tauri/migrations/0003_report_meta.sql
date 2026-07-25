-- Rapor üretilirken seçilen tercihleri saklamak için kolonlar.
-- (SQLite ADD COLUMN sabit DEFAULT kabul eder; mevcut satırlar bu değerle dolar.)
ALTER TABLE reports ADD COLUMN period TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE reports ADD COLUMN length TEXT NOT NULL DEFAULT 'detailed';
ALTER TABLE reports ADD COLUMN tone TEXT NOT NULL DEFAULT '';
