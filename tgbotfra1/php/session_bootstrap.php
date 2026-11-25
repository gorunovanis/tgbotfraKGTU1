<?php
/**
 * Сессия PHP: cookie с path=/ на всём домене, чтобы вход не ломался из‑за неверного BASE_URL
 * или запросов к API с разных префиксов (/tgbotfra/profile, /tgbotfra/static/app/…).
 */
function session_bootstrap(): void {
    if (session_status() !== PHP_SESSION_NONE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
    session_start();
}
