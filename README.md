# tgbotfraKGTU1

Репозиторий содержит веб-приложение **FoodApp** (дневник питания, воды, шагов и тренировок) в нескольких версиях, а также ранний прототип **FitHealth39**.

## Состав репозитория

| Папка | Описание |
| --- | --- |
| `tgbotfra5/` | Основная / актуальная версия **FoodApp** (PHP + MySQL, фронтенд в `static/app/`, SQL-схемы и миграции, read-only дашборд статистики). |
| `tgbotfra/` | Версия **FoodApp** (PHP + MySQL, с дашбордом статистики). |
| `tgbotfra1/` | Промежуточная версия **FoodApp** (PHP + MySQL, без файла read-only дашборда). |
| `rayXlain.github.io-main/` | Прототип **FitHealth39** (HTML/CSS/JS с поиском на `Fuse.js`, примеры подключения к БД `kuzbassmeg` на PHP, Node.js и Python, `database.sql`, документация). |

---

## Быстрый старт (FoodApp — `tgbotfra5/`)

### Требования
- **PHP 7.4+** с расширениями `pdo_mysql`, `session`, `json`
- **MySQL / MariaDB**
- **Apache** с включённым `mod_rewrite` (для работы `.htaccess`, например XAMPP / OpenServer / хостинг)

### Пошаговый запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/gorunovanis/tgbotfraKGTU1.git
   cd tgbotfraKGTU1/tgbotfra5
   ```

2. **Создайте базу данных и импортируйте таблицы:**
   Создайте БД в MySQL (например, `foodapp`) и выполните `schema_mysql.sql`:
   ```bash
   mysql -u root -p -e "CREATE DATABASE foodapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p foodapp < schema_mysql.sql
   ```
   *(Если обновляете старую базу с таблицами `*_fra` или без авторизации по email, выполните также `schema_migration_rename_tables_fra_to_ff.sql` и `schema_migration_site_auth.sql`.)*

3. **Настройте `php/config.local.php`:**
   Скопируйте шаблон `php/config.local.php.example` в `php/config.local.php`:
   ```bash
   cp php/config.local.php.example php/config.local.php
   ```
   И укажите свои данные:
   ```php
   <?php
   return [
       // Корень проекта без /static/app/... (для локального сервера: http://localhost/tgbotfra5)
       'BASE_URL'   => 'https://ваш-домен.ru/tgbotfra5',
       'DB_HOST'    => 'localhost',
       'DB_PORT'    => 3306,
       'DB_USER'    => 'root',
       'DB_PASS'    => 'ваш_пароль',
       'DB_NAME'    => 'foodapp',
       'DB_CHARSET' => 'utf8mb4',
   ];
   ```

4. **Разместите на сервере и откройте приложение:**
   - Скопируйте содержимое `tgbotfra5/` в папку веб-сервера (Apache с `.htaccess` и `mod_rewrite`).
   - Для проверки конфигурации откройте `.../php/check_setup.php` (после проверки удалите этот файл с продакшена).
   - Откройте приложение в браузере: `.../static/app/` (или лендинг `.../static/index.html`).

Подробности и разбор возможных проблем с сессией — в файле [`tgbotfra5/КАК_ЗАПУСТИТЬ.md`](tgbotfra5/КАК_ЗАПУСТИТЬ.md).

---

## Быстрый старт (FitHealth39 — `rayXlain.github.io-main/`)

1. Откройте `rayXlain.github.io-main/index.html` в браузере (или через локальный сервер) для просмотра клиентского интерфейса.
2. Для работы с БД `kuzbassmeg` импортируйте `rayXlain.github.io-main/database.sql` в MySQL и настройте подключение в `config.php`, `db_connection.php`, `db_connection.js` или `db_connection.py` (см. [`rayXlain.github.io-main/CONNECTION_README.md`](rayXlain.github.io-main/CONNECTION_README.md)).

---

## Безопасность

Файлы с локальными настройками и секретами (`.env`, `php/config.local.php`) исключены из репозитория через `.gitignore`. Перед развёртыванием создайте `config.local.php` из соответствующего `.example`-файла.
