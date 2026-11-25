<?php
/**
 * Проверка сессии (откройте в браузере после входа на сайте).
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth.php';
session_bootstrap();
$uid = $_SESSION['user_id'] ?? null;
echo json_encode([
    'session' => $uid ? 'ok' : 'none',
    'user_id' => $uid,
    'hint' => $uid ? 'Сессия активна.' : 'Войдите в приложении на сайте.',
], JSON_UNESCAPED_UNICODE);
