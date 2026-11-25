# Инструкция по настройке базы данных MySQL для FitHealth39

## Требования
- MySQL 5.7+ или MariaDB 10.3+
- Права на создание базы данных

## Установка

### 1. Импорт базы данных

```bash
mysql -u root -p < database.sql
```

База данных будет создана с именем **kuzbassmeg** на хосте **localhost**.

Или через MySQL Workbench:
1. Откройте MySQL Workbench
2. Подключитесь к серверу
3. File → Open SQL Script → выберите `database.sql`
4. Выполните скрипт (Execute)

### 2. Создание пользователя для приложения

```sql
CREATE USER 'fithealth_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT SELECT, INSERT, UPDATE ON kuzbassmeg.* TO 'fithealth_app'@'localhost';
FLUSH PRIVILEGES;
```

## Структура базы данных

### Таблица `users`
Основная таблица пользователей:
- `id` - уникальный идентификатор
- `email` - email пользователя (уникальный)
- `password_hash` - хеш пароля (bcrypt/argon2)
- `created_at` - дата регистрации
- `last_login` - последний вход
- `health_group` - выбранная группа здоровья (II или III)
- `health_group_updated_at` - дата последнего обновления группы
- `is_active` - активен ли пользователь

### Таблица `user_sessions`
Хранение сессий пользователей (опционально)

### Таблица `health_group_history`
История выбора групп здоровья

### Таблица `user_activity_log`
Логи активности пользователей

## Использование хранимых процедур

### Регистрация пользователя
```sql
CALL sp_register_user('user@example.com', '$2y$10$...');
```

### Вход пользователя
```sql
CALL sp_login_user('user@example.com');
```

### Сохранение группы здоровья
```sql
CALL sp_save_health_group(1, 'II');
```

### Получение данных пользователя
```sql
CALL sp_get_user_data(1);
```

## Подключение из приложения

### Пример подключения (Node.js)
```javascript
const mysql = require('mysql2/promise');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // или ваш пользователь
    password: '', // ваш пароль
    database: 'kuzbassmeg'
});
```

Или используйте готовый файл `db_connection.js`:
```javascript
const { query, checkConnection } = require('./db_connection');
const users = await query('SELECT * FROM users WHERE id = ?', [1]);
```

### Пример подключения (PHP)
```php
$pdo = new PDO(
    'mysql:host=localhost;dbname=kuzbassmeg;charset=utf8mb4',
    'root', // или ваш пользователь
    '', // ваш пароль
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
```

Или используйте готовый файл `db_connection.php`:
```php
require_once 'db_connection.php';
$db = getDBConnection();
```

## Полезные запросы

### Получить всех активных пользователей
```sql
SELECT * FROM v_active_users;
```

### Статистика по группам здоровья
```sql
SELECT * FROM v_health_group_stats;
```

### История выбора группы здоровья
```sql
SELECT * FROM health_group_history 
WHERE user_id = 1 
ORDER BY selected_at DESC;
```

### Активность пользователя
```sql
SELECT * FROM user_activity_log 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

## Безопасность

1. **Хеширование паролей**: Используйте bcrypt или argon2
2. **Подготовленные запросы**: Всегда используйте prepared statements
3. **Валидация данных**: Проверяйте все входные данные
4. **Ограничение прав**: Используйте пользователя с минимальными правами
5. **Регулярные бэкапы**: Настройте автоматическое резервное копирование

## Резервное копирование

```bash
# Создание бэкапа
mysqldump -u root -p kuzbassmeg > backup_$(date +%Y%m%d).sql

# Восстановление
mysql -u root -p kuzbassmeg < backup_20240101.sql
```

## Миграция с Firebase

Если нужно мигрировать данные из Firebase:
1. Экспортируйте данные из Firebase
2. Преобразуйте формат данных
3. Импортируйте в MySQL используя скрипт миграции
