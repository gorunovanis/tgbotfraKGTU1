-- Доработка старой таблицы ff_users (telegram_id, email, password).
-- Если таблица ещё называется ff_users_fra — сначала: schema_migration_rename_tables_fra_to_ff.sql
-- Если колонки email/password уже есть — пропустите соответствующие ALTER.

SET NAMES utf8mb4;

ALTER TABLE `ff_users` MODIFY `telegram_id` INT NULL;

ALTER TABLE `ff_users` ADD COLUMN `email` VARCHAR(255) NULL AFTER `telegram_id`;
ALTER TABLE `ff_users` ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `email`;

CREATE UNIQUE INDEX `ff_users_email_uq` ON `ff_users` (`email`);
