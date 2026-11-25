<?php
/**
 * Тестовый файл для проверки подключения к базе данных
 * Откройте этот файл в браузере для проверки
 */

require_once 'connect.php';

?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Тест подключения к БД</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
            color: #28a745;
            background: #d4edda;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .info {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        h1 {
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Тест подключения к базе данных</h1>
        
        <?php
        try {
            // Проверка подключения
            if (checkConnection()) {
                echo '<div class="success">✅ Подключение к базе данных успешно!</div>';
                
                // Получаем информацию о подключении
                $info = getConnectionInfo();
                echo '<div class="info">';
                echo '<h3>Информация о подключении:</h3>';
                echo '<table>';
                echo '<tr><th>Параметр</th><th>Значение</th></tr>';
                echo '<tr><td>Хост</td><td>' . htmlspecialchars($info['host']) . '</td></tr>';
                echo '<tr><td>База данных</td><td>' . htmlspecialchars($info['database']) . '</td></tr>';
                echo '<tr><td>Версия сервера</td><td>' . htmlspecialchars($info['server_info']) . '</td></tr>';
                echo '<tr><td>Версия клиента</td><td>' . htmlspecialchars($info['client_info']) . '</td></tr>';
                echo '<tr><td>Кодировка</td><td>' . htmlspecialchars($info['charset']) . '</td></tr>';
                echo '</table>';
                echo '</div>';
                
                // Проверяем существование таблиц
                echo '<div class="info">';
                echo '<h3>Проверка таблиц:</h3>';
                
                $tables = ['users', 'user_sessions', 'health_group_history', 'user_activity_log'];
                echo '<table>';
                echo '<tr><th>Таблица</th><th>Статус</th></tr>';
                
                foreach ($tables as $table) {
                    $result = executeQuery("SHOW TABLES LIKE ?", [$table]);
                    $exists = $result->num_rows > 0;
                    $status = $exists ? '✅ Существует' : '❌ Не найдена';
                    echo '<tr><td>' . htmlspecialchars($table) . '</td><td>' . $status . '</td></tr>';
                }
                echo '</table>';
                echo '</div>';
                
                // Пробуем получить количество пользователей
                try {
                    $countResult = executeQuery("SELECT COUNT(*) as count FROM users");
                    $count = $countResult->fetch_assoc()['count'];
                    echo '<div class="info">';
                    echo '<h3>Статистика:</h3>';
                    echo '<p>Количество пользователей в базе: <strong>' . $count . '</strong></p>';
                    echo '</div>';
                } catch (Exception $e) {
                    echo '<div class="error">⚠️ Не удалось получить статистику: ' . htmlspecialchars($e->getMessage()) . '</div>';
                }
                
            } else {
                echo '<div class="error">❌ Не удалось подключиться к базе данных!</div>';
            }
        } catch (Exception $e) {
            echo '<div class="error">';
            echo '<h3>❌ Ошибка подключения:</h3>';
            echo '<p>' . htmlspecialchars($e->getMessage()) . '</p>';
            echo '<p><strong>Проверьте:</strong></p>';
            echo '<ul>';
            echo '<li>Правильность настроек в файле config.php</li>';
            echo '<li>Существует ли база данных kuzbassmeg</li>';
            echo '<li>Правильность имени пользователя и пароля MySQL</li>';
            echo '<li>Запущен ли сервер MySQL/Percona</li>';
            echo '</ul>';
            echo '</div>';
        }
        ?>
        
        <div class="info" style="margin-top: 30px;">
            <h3>📝 Следующие шаги:</h3>
            <ol>
                <li>Если подключение успешно - можно использовать функции из connect.php</li>
                <li>Если есть ошибки - проверьте настройки в config.php</li>
                <li>Убедитесь, что база данных kuzbassmeg создана (выполните database.sql)</li>
            </ol>
        </div>
    </div>
</body>
</html>
