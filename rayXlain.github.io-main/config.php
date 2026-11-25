<?php
/**
 * Конфигурация подключения к базе данных
 * База данных: kuzbassmeg
 * Сервер: localhost (Percona Server 8.0.41)
 */

// Настройки подключения к базе данных
define('DB_HOST', 'localhost');
define('DB_NAME', 'kuzbassmeg');
define('DB_USER', 'root'); // Измените на вашего пользователя MySQL
define('DB_PASS', ''); // Укажите пароль от MySQL
define('DB_CHARSET', 'utf8mb4');

// Настройки для отображения ошибок (отключите в продакшене)
error_reporting(E_ALL);
ini_set('display_errors', 1);
