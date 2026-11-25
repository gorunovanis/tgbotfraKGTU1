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

## FoodApp (`tgbotfra5/`, `tgbotfra/`, `tgbotfra1/`)

Веб-приложение для учёта питания (КБЖУ), воды, шагов, тренировок и профиля пользователя.

### Стек технологий
- **Backend:** PHP 7.4+ (`pdo_mysql`, `session`, `json`)
- **База данных:** MySQL / MariaDB
- **Frontend:** HTML, CSS, Vanilla JavaScript (`static/app/`)
- **Веб-сервер:** Apache с `mod_rewrite` (`.htaccess`)

### Быстрый старт (на примере `tgbotfra5/`)

1. **База данных:** создайте базу в MySQL и импортируйте `tgbotfra5/schema_mysql.sql` (при обновлении со старой схемы используйте `schema_migration_rename_tables_fra_to_ff.sql` и/или `schema_migration_site_auth.sql`).
2. **Конфигурация:** скопируйте `tgbotfra5/php/config.local.php.example` в `tgbotfra5/php/config.local.php` и укажите:
   - `BASE_URL` — URL проекта без пути к конкретной странице (например, `https://example.com/tgbotfra5`);
   - параметры подключения к MySQL (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`).
3. **Запуск:** загрузите папку на хостинг с Apache (`mod_rewrite`) и PHP, после чего откройте `static/app/` (или `static/index.html`) в браузере.

Подробная инструкция находится в файле `tgbotfra5/КАК_ЗАПУСТИТЬ.md`.

---

## FitHealth39 (`rayXlain.github.io-main/`)

Прототип клиентского интерфейса и набор модулей для работы с базой данных `kuzbassmeg`:
- `index.html`, `style.css`, `script.js` — интерфейс поиска и подбора;
- `database.sql`, `database_setup.md` — структура БД и инструкция по развёртыванию;
- `db_connection.php`, `db_connection.js`, `db_connection.py`, `api_example.php`, `api_example.js` — примеры подключения и API;
- `CONNECTION_README.md` — краткое руководство по подключению к БД.

---

## Безопасность

Файлы с локальными настройками и секретами (`.env`, `php/config.local.php`) исключены из репозитория через `.gitignore`. Перед развёртыванием создайте `config.local.php` из соответствующего `.example`-файла.
