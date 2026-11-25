<?php
/**
 * Авторизация через сессию (регистрация email + пароль на сайте).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_bootstrap.php';

function load_user_from_session(): ?array {
    session_bootstrap();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $pdo = get_pdo();
    $st = $pdo->prepare('SELECT * FROM ff_users WHERE id = ?');
    $st->execute([(int)$_SESSION['user_id']]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    return $u ?: null;
}

function require_user(): array {
    $u = load_user_from_session();
    if (!$u) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Требуется вход. Зарегистрируйтесь или войдите.']);
        exit;
    }
    return $u;
}

/** Поля профиля для API (GET /profile, /auth/me, ответы после входа). */
function user_profile_public(array $user): array {
    return [
        'email' => $user['email'] ?? null,
        'first_name' => $user['first_name'],
        'weight_kg' => $user['weight_kg'] !== null ? (float)$user['weight_kg'] : null,
        'height_cm' => $user['height_cm'] !== null ? (float)$user['height_cm'] : null,
        'goal' => $user['goal'],
        'activity_level' => $user['activity_level'],
        'water_goal_ml' => (int)($user['water_goal_ml'] ?? 2000),
        'steps_goal' => (int)($user['steps_goal'] ?? 10000),
        'steps_enabled' => !empty($user['steps_enabled']),
    ];
}
