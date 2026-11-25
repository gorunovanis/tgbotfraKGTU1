# FoodApp — дневник питания и тренировок

Стек: **PHP** (API + MySQL), статика в `static/app/`. Python и Telegram-бот в проект **не входят**.

## Быстрый старт

См. **[КАК_ЗАПУСТИТЬ.md](КАК_ЗАПУСТИТЬ.md)** — конфиг `php/config.local.php`, схема `schema_mysql.sql`, открыть `static/app/` в браузере.

## Структура

| Путь | Назначение |
|------|------------|
| `php/api.php` | API (регистрация, профиль, блюда, вода, шаги, статистика, тренировки) |
| `php/config.local.php` | Создайте из `config.local.php.example` (не коммитить) |
| `static/app/` | Интерфейс (`index.html`, `app.js`) |
| `.htaccess` | Маршрутизация запросов к `php/api.php` |
