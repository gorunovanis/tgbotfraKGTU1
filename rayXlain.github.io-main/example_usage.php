<?php
/**
 * Примеры использования подключения к базе данных
 */

require_once 'connect.php';

try {
    // Пример 1: Проверка подключения
    if (checkConnection()) {
        echo "✅ Подключение успешно!\n";
    }
    
    // Пример 2: Получение одного пользователя
    $user = fetchOne("SELECT * FROM users WHERE id = ?", [1]);
    if ($user) {
        echo "Пользователь найден: " . $user['email'] . "\n";
    }
    
    // Пример 3: Получение всех пользователей
    $users = fetchAll("SELECT id, email, health_group FROM users WHERE is_active = ?", [1]);
    echo "Найдено пользователей: " . count($users) . "\n";
    
    // Пример 4: Вставка нового пользователя
    $email = 'test@example.com';
    $passwordHash = password_hash('test123', PASSWORD_BCRYPT);
    
    executeQuery(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        [$email, $passwordHash]
    );
    
    echo "Пользователь добавлен!\n";
    
    // Пример 5: Обновление группы здоровья
    $userId = 1;
    $healthGroup = 'II';
    
    executeQuery(
        "UPDATE users SET health_group = ?, health_group_updated_at = NOW() WHERE id = ?",
        [$healthGroup, $userId]
    );
    
    echo "Группа здоровья обновлена!\n";
    
    // Пример 6: Использование хранимой процедуры
    $result = executeQuery("CALL sp_get_user_data(?)", [1]);
    $userData = $result->fetch_assoc();
    
    if ($userData) {
        echo "Данные пользователя получены через процедуру!\n";
    }
    
} catch (Exception $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
}
