# Подключение к базе данных kuzbassmeg

## Информация о базе данных
- **Название БД**: `kuzbassmeg`
- **Хост**: `localhost`
- **Порт**: `3306` (по умолчанию)

## Быстрое подключение

### PHP
```php
require_once 'db_connection.php';

// Получить подключение
$db = getDBConnection();

// Выполнить запрос
$stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([1]);
$user = $stmt->fetch();
```

### Node.js
```javascript
const { query, checkConnection } = require('./db_connection');

// Проверить подключение
const isConnected = await checkConnection();

// Выполнить запрос
const users = await query('SELECT * FROM users WHERE id = ?', [1]);
```

### Python
```python
from db_connection import execute_query, check_connection

# Проверить подключение
if check_connection():
    print("Connected!")

# Выполнить запрос
users = execute_query("SELECT * FROM users WHERE id = %s", (1,))
```

## Настройка подключения

Перед использованием откройте файл подключения и укажите свои данные:

### db_connection.php
```php
define('DB_USER', 'root'); // Ваш пользователь MySQL
define('DB_PASS', '');     // Ваш пароль
```

### db_connection.js
```javascript
const dbConfig = {
    user: 'root',     // Ваш пользователь MySQL
    password: '',     // Ваш пароль
};
```

### db_connection.py
```python
DB_CONFIG = {
    'user': 'root',      # Ваш пользователь MySQL
    'password': '',      # Ваш пароль
}
```

## Проверка подключения

### PHP
```php
if (checkDBConnection()) {
    echo "Подключение успешно!";
} else {
    echo "Ошибка подключения!";
}
```

### Node.js
```javascript
const isConnected = await checkConnection();
console.log(isConnected ? "Connected!" : "Connection failed!");
```

### Python
```python
if check_connection():
    print("Connected!")
else:
    print("Connection failed!")
```

## Установка зависимостей

### Node.js
```bash
npm install mysql2
```

### Python
```bash
pip install mysql-connector-python
```

## Импорт базы данных

```bash
mysql -u root -p < database.sql
```

База данных `kuzbassmeg` будет создана автоматически.
