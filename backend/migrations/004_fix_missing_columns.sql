-- 补齐 inbounds 表缺失的列
-- 使用 IF NOT EXISTS 的逻辑模拟（SQLite 不支持直接在 ADD COLUMN 时用 IF NOT EXISTS，所以我们直接运行，报错也没关系）
ALTER TABLE inbounds ADD COLUMN tag TEXT;
ALTER TABLE inbounds ADD COLUMN listen TEXT;
ALTER TABLE inbounds ADD COLUMN allocate TEXT;
