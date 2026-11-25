<?php
/**
 * Подключение к базе данных kuzbassmeg
 * Использует mysqli для совместимости с Percona Server
 */

require_once 'config.php';

// Глобальная переменная для хранения подключения
$mysqli = null;

/**
 * Получение подключения к базе данных
 * @return mysqli Объект подключения
 * @throws Exception Если не удалось подключиться
 */
function getDBConnection() {
    global $mysqli;
    
    // Если подключение уже существует, возвращаем его
    if ($mysqli !== null && $mysqli->ping()) {
        return $mysqli;
    }
    
    // Создаем новое подключение
    try {
        $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        // Проверяем на ошибки подключения
        if ($mysqli->connect_error) {
            throw new Exception("Ошибка подключения: " . $mysqli->connect_error);
        }
        
        // Устанавливаем кодировку
        $mysqli->set_charset(DB_CHARSET);
        
        return $mysqli;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        throw new Exception("Не удалось подключиться к базе данных. Проверьте настройки в config.php");
    }
}

/**
 * Закрытие подключения к базе данных
 */
function closeDBConnection() {
    global $mysqli;
    
    if ($mysqli !== null) {
        $mysqli->close();
        $mysqli = null;
    }
}

/**
 * Выполнение SQL запроса с подготовленными выражениями
 * @param string $query SQL запрос с плейсхолдерами (?)
 * @param array $params Параметры для подстановки
 * @return mysqli_result|bool Результат запроса
 */
function executeQuery($query, $params = []) {
    $mysqli = getDBConnection();
    
    // Подготавливаем запрос
    $stmt = $mysqli->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Ошибка подготовки запроса: " . $mysqli->error);
    }
    
    // Если есть параметры, привязываем их
    if (!empty($params)) {
        $types = '';
        foreach ($params as $param) {
            if (is_int($param)) {
                $types .= 'i'; // integer
            } elseif (is_float($param)) {
                $types .= 'd'; // double
            } elseif (is_string($param)) {
                $types .= 's'; // string
            } else {
                $types .= 'b'; // blob
            }
        }
        
        $stmt->bind_param($types, ...$params);
    }
    
    // Выполняем запрос
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        throw new Exception("Ошибка выполнения запроса: " . $error);
    }
    
    // Получаем результат
    $result = $stmt->get_result();
    $stmt->close();
    
    return $result;
}

/**
 * Получение одной строки из результата запроса
 * @param string $query SQL запрос
 * @param array $params Параметры
 * @return array|null Ассоциативный массив или null
 */
function fetchOne($query, $params = []) {
    $result = executeQuery($query, $params);
    return $result->fetch_assoc();
}

/**
 * Получение всех строк из результата запроса
 * @param string $query SQL запрос
 * @param array $params Параметры
 * @return array Массив ассоциативных массивов
 */
function fetchAll($query, $params = []) {
    $result = executeQuery($query, $params);
    $rows = [];
    
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    
    return $rows;
}

/**
 * Проверка подключения к базе данных
 * @return bool
 */
function checkConnection() {
    try {
        $mysqli = getDBConnection();
        return $mysqli->ping();
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Получение информации о подключении
 * @return array
 */
function getConnectionInfo() {
    try {
        $mysqli = getDBConnection();
        return [
            'host' => DB_HOST,
            'database' => DB_NAME,
            'server_info' => $mysqli->server_info,
            'client_info' => $mysqli->client_info,
            'charset' => $mysqli->character_set_name()
        ];
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// Автоматическое закрытие подключения при завершении скрипта
register_shutdown_function('closeDBConnection');
