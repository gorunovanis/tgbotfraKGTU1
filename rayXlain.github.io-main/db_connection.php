<?php
/**
 * Подключение к базе данных MySQL
 * База данных: kuzbassmeg
 * Хост: localhost
 */

// Конфигурация подключения
define('DB_HOST', 'localhost');
define('DB_NAME', 'kuzbassmeg');
define('DB_USER', 'root'); // Измените на вашего пользователя
define('DB_PASS', ''); // Укажите пароль
define('DB_CHARSET', 'utf8mb4');

/**
 * Создание подключения к базе данных
 * @return PDO Объект подключения
 */
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Не удалось подключиться к базе данных");
        }
    }
    
    return $pdo;
}

/**
 * Проверка подключения к базе данных
 * @return bool
 */
function checkDBConnection() {
    try {
        $pdo = getDBConnection();
        $pdo->query("SELECT 1");
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// Пример использования:
// $db = getDBConnection();
// $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
// $stmt->execute([1]);
// $user = $stmt->fetch();
