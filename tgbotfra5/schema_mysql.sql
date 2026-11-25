-- Схема БД FoodApp (MySQL / MariaDB). Все таблицы с префиксом ff_
-- Выполните в phpMyAdmin в выбранной базе (вкладка «SQL»).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ff_users — пользователи (email + пароль на сайте)
CREATE TABLE IF NOT EXISTS `ff_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `telegram_id` INT NULL UNIQUE,
    `email` VARCHAR(255) NULL,
    `password_hash` VARCHAR(255) NULL,
    `username` VARCHAR(255) DEFAULT NULL,
    `first_name` VARCHAR(255) DEFAULT NULL,
    `last_name` VARCHAR(255) DEFAULT NULL,
    `weight_kg` DOUBLE DEFAULT NULL,
    `height_cm` DOUBLE DEFAULT NULL,
    `birth_date` DATE DEFAULT NULL,
    `goal` VARCHAR(50) DEFAULT NULL,
    `activity_level` VARCHAR(50) DEFAULT NULL,
    `water_goal_ml` INT DEFAULT 2000,
    `steps_goal` INT DEFAULT 10000,
    `steps_enabled` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `ff_users_email_uq` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_meals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `name` VARCHAR(500) NOT NULL,
    `calories` DOUBLE DEFAULT 0,
    `protein` DOUBLE DEFAULT 0,
    `fat` DOUBLE DEFAULT 0,
    `carbs` DOUBLE DEFAULT 0,
    `source` VARCHAR(20) NOT NULL,
    `photo_file_id` VARCHAR(255) DEFAULT NULL,
    `barcode` VARCHAR(100) DEFAULT NULL,
    `raw_data` JSON DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_water` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `ml` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_steps` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `steps` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_weight` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_measurements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `neck_cm` DOUBLE DEFAULT NULL,
    `chest_cm` DOUBLE DEFAULT NULL,
    `waist_cm` DOUBLE DEFAULT NULL,
    `hip_cm` DOUBLE DEFAULT NULL,
    `bicep_cm` DOUBLE DEFAULT NULL,
    `thigh_cm` DOUBLE DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_exercises` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) DEFAULT NULL,
    `is_builtin` TINYINT(1) DEFAULT 0,
    `user_id` INT DEFAULT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_workouts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `exercise_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `sets` JSON NOT NULL,
    `note` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`),
    FOREIGN KEY (`exercise_id`) REFERENCES `ff_exercises`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_coach_clients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `coach_id` INT NOT NULL,
    `client_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`coach_id`) REFERENCES `ff_users`(`id`),
    FOREIGN KEY (`client_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_workout_plans` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `coach_id` INT NOT NULL,
    `client_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `exercises` JSON NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`coach_id`) REFERENCES `ff_users`(`id`),
    FOREIGN KEY (`client_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ff_ai_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `ff_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
