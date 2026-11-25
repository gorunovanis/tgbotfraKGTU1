<?php
/**
 * Точка входа для корня сайта: отдаёт ответ API (проверка работы) или перенаправляет на Mini App.
 * Запросы к /profile, /water и т.д. обрабатывает .htaccess → php/api.php
 */
$_GET['path'] = $_GET['path'] ?? '';
require __DIR__ . '/php/api.php';
