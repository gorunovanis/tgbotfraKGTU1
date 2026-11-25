-- ============================================
-- База данных для FitHealth39
-- MySQL Database Schema
-- База данных: kuzbassmeg
-- ============================================

-- Создание базы данных
CREATE DATABASE IF NOT EXISTS kuzbassmeg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kuzbassmeg;

-- ============================================
-- Таблица пользователей
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    health_group VARCHAR(10) NULL DEFAULT NULL COMMENT 'II или III',
    health_group_updated_at TIMESTAMP NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_health_group (health_group),
    INDEX idx_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Таблица сессий пользователей (опционально)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Таблица истории выбора групп здоровья
-- ============================================
CREATE TABLE IF NOT EXISTS health_group_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    health_group VARCHAR(10) NOT NULL,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_selected_at (selected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Таблица активности пользователей (логи)
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL COMMENT 'login, logout, health_group_selected, etc.',
    activity_data JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Представления (Views) для удобства
-- ============================================

-- Представление активных пользователей
CREATE OR REPLACE VIEW v_active_users AS
SELECT 
    id,
    email,
    created_at,
    last_login,
    health_group,
    health_group_updated_at,
    TIMESTAMPDIFF(DAY, last_login, NOW()) AS days_since_last_login
FROM users
WHERE is_active = TRUE;

-- Представление статистики по группам здоровья
CREATE OR REPLACE VIEW v_health_group_stats AS
SELECT 
    health_group,
    COUNT(*) AS user_count,
    MAX(health_group_updated_at) AS last_update
FROM users
WHERE health_group IS NOT NULL AND is_active = TRUE
GROUP BY health_group;

-- ============================================
-- Хранимые процедуры
-- ============================================

DELIMITER //

-- Процедура для регистрации нового пользователя
CREATE PROCEDURE IF NOT EXISTS sp_register_user(
    IN p_email VARCHAR(255),
    IN p_password_hash VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    INSERT INTO users (email, password_hash, created_at, last_login)
    VALUES (p_email, p_password_hash, NOW(), NOW())
    ON DUPLICATE KEY UPDATE 
        last_login = NOW();
    
    INSERT INTO user_activity_log (user_id, activity_type, created_at)
    SELECT id, 'registration', NOW()
    FROM users
    WHERE email = p_email;
    
    COMMIT;
    
    SELECT id, email, created_at, last_login, health_group
    FROM users
    WHERE email = p_email;
END //

-- Процедура для входа пользователя
CREATE PROCEDURE IF NOT EXISTS sp_login_user(
    IN p_email VARCHAR(255)
)
BEGIN
    UPDATE users
    SET last_login = NOW()
    WHERE email = p_email AND is_active = TRUE;
    
    INSERT INTO user_activity_log (user_id, activity_type, created_at)
    SELECT id, 'login', NOW()
    FROM users
    WHERE email = p_email;
    
    SELECT id, email, created_at, last_login, health_group, health_group_updated_at
    FROM users
    WHERE email = p_email AND is_active = TRUE;
END //

-- Процедура для сохранения группы здоровья
CREATE PROCEDURE IF NOT EXISTS sp_save_health_group(
    IN p_user_id INT,
    IN p_health_group VARCHAR(10)
)
BEGIN
    DECLARE v_current_group VARCHAR(10);
    
    -- Получаем текущую группу
    SELECT health_group INTO v_current_group
    FROM users
    WHERE id = p_user_id;
    
    -- Обновляем только если группа изменилась
    IF v_current_group != p_health_group OR v_current_group IS NULL THEN
        UPDATE users
        SET health_group = p_health_group,
            health_group_updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Сохраняем в историю
        INSERT INTO health_group_history (user_id, health_group, selected_at)
        VALUES (p_user_id, p_health_group, NOW());
        
        -- Логируем активность
        INSERT INTO user_activity_log (user_id, activity_type, activity_data, created_at)
        VALUES (p_user_id, 'health_group_selected', JSON_OBJECT('health_group', p_health_group), NOW());
    END IF;
    
    SELECT id, email, health_group, health_group_updated_at
    FROM users
    WHERE id = p_user_id;
END //

-- Процедура для получения данных пользователя
CREATE PROCEDURE IF NOT EXISTS sp_get_user_data(
    IN p_user_id INT
)
BEGIN
    SELECT 
        id,
        email,
        created_at,
        last_login,
        health_group,
        health_group_updated_at,
        is_active
    FROM users
    WHERE id = p_user_id AND is_active = TRUE;
END //

DELIMITER ;

-- ============================================
-- Триггеры
-- ============================================

DELIMITER //

-- Триггер для автоматического логирования изменений группы здоровья
CREATE TRIGGER IF NOT EXISTS trg_health_group_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.health_group != NEW.health_group THEN
        INSERT INTO health_group_history (user_id, health_group, selected_at)
        VALUES (NEW.id, NEW.health_group, NOW());
    END IF;
END //

DELIMITER ;

-- ============================================
-- Индексы для оптимизации (дополнительные)
-- ============================================

-- Составной индекс для частых запросов
-- Примечание: IF NOT EXISTS не поддерживается для индексов в MySQL
-- Если нужно безопасно создать индекс, используйте следующий подход:
-- SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
--                WHERE table_schema = 'kuzbassmeg' 
--                AND table_name = 'users' 
--                AND index_name = 'idx_user_health_active');
-- SET @sqlstmt := IF(@exist = 0, 'CREATE INDEX idx_user_health_active ON users(health_group, is_active)', 'SELECT ''Index already exists''');
-- PREPARE stmt FROM @sqlstmt;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- Простое создание индекса (раскомментируйте, если индекс еще не создан)
-- Если индекс уже существует, сначала удалите его: DROP INDEX idx_user_health_active ON users;
CREATE INDEX idx_user_health_active ON users(health_group, is_active);

-- ============================================
-- Начальные данные (опционально)
-- ============================================

-- Можно добавить тестового пользователя (пароль: test123 - хеш bcrypt)
-- Раскомментируйте следующие строки для создания тестового пользователя:
-- INSERT INTO users (email, password_hash) 
-- VALUES ('test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
-- ON DUPLICATE KEY UPDATE email = email;

-- ============================================
-- Права доступа (пример)
-- ============================================
-- Создайте пользователя для приложения:
-- CREATE USER 'fithealth_app'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE ON kuzbassmeg.* TO 'fithealth_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================
-- Полезные запросы
-- ============================================

-- Получить всех пользователей с их группами здоровья
-- SELECT id, email, health_group, last_login FROM users WHERE is_active = TRUE;

-- Получить статистику по группам здоровья
-- SELECT * FROM v_health_group_stats;

-- Получить историю выбора группы здоровья для пользователя
-- SELECT * FROM health_group_history WHERE user_id = 1 ORDER BY selected_at DESC;

-- Получить активность пользователя
-- SELECT * FROM user_activity_log WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10;

-- Очистить старые сессии (старше 30 дней)
-- DELETE FROM user_sessions WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Очистить старые логи (старше 90 дней)
-- DELETE FROM user_activity_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
