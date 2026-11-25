<?php
/**
 * Единая точка входа API (PHP). Маршрут задаётся через GET path= или REQUEST_URI.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = $_GET['path'] ?? '';
if ($path === '' && isset($_SERVER['REQUEST_URI'])) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = trim($uri, '/');
    if (strpos($path, 'api.php') !== false) $path = '';
}
$path = trim($path, '/');
// Если запрос пришёл как /tgbotfra/profile — убрать первый сегмент (префикс папки)
if ($path !== '' && strpos($path, '/') !== false) {
    $first = strpos($path, '/');
    $segment = substr($path, 0, $first);
    if (in_array($segment, ['tgbotfra', 'php', 'api'], true)) {
        $path = trim(substr($path, $first + 1), '/');
    }
}
$method = $_SERVER['REQUEST_METHOD'];

// Health / root — без подключения к БД
if ($path === '' || $path === 'api.php') {
    echo json_encode(['ok' => true, 'app' => 'FoodApp (PHP)']);
    return;
}

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/integrations.php';
session_bootstrap();
$pdo = get_pdo();

// --- Публичные маршруты авторизации ---
if ($path === 'auth/register' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $first_name = trim($body['first_name'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Некорректный email']);
        return;
    }
    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'Пароль не менее 8 символов']);
        return;
    }
    $st = $pdo->prepare('SELECT id FROM ff_users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Этот email уже зарегистрирован']);
        return;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $pdo->prepare('
            INSERT INTO ff_users (email, password_hash, first_name, water_goal_ml, steps_goal, created_at, updated_at)
            VALUES (?, ?, ?, 2000, 10000, NOW(), NOW())
        ')->execute([$email, $hash, $first_name !== '' ? $first_name : null]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка БД. Выполните schema_mysql.sql и миграцию schema_migration_site_auth.sql. ' . $e->getMessage()]);
        return;
    }
    $uid = (int)$pdo->lastInsertId();
    $_SESSION['user_id'] = $uid;
    session_regenerate_id(true);
    $st = $pdo->prepare('SELECT * FROM ff_users WHERE id = ?');
    $st->execute([$uid]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    echo json_encode(user_profile_public($user));
    return;
}

if ($path === 'auth/login' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $st = $pdo->prepare('SELECT * FROM ff_users WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user || empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Неверный email или пароль']);
        return;
    }
    $_SESSION['user_id'] = (int)$user['id'];
    session_regenerate_id(true);
    echo json_encode(user_profile_public($user));
    return;
}

if ($path === 'auth/logout' && $method === 'POST') {
    $_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    echo json_encode(['ok' => true]);
    return;
}

if ($path === 'auth/me' && $method === 'GET') {
    $user = load_user_from_session();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Не авторизован']);
        return;
    }
    echo json_encode(user_profile_public($user));
    return;
}

// Остальные маршруты — только для вошедших пользователей
$user = require_user();
$userId = (int)$user['id'];
$pdo = get_pdo();

// --- Profile ---
if ($path === 'profile' && $method === 'GET') {
    echo json_encode(user_profile_public($user));
    return;
}

if ($path === 'profile' && ($method === 'POST' || $method === 'PATCH')) {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    if (isset($body['first_name'])) $user['first_name'] = trim($body['first_name'] ?? '') ?: $user['first_name'];
    if (array_key_exists('weight_kg', $body) && $body['weight_kg'] !== null) {
        $user['weight_kg'] = (float)$body['weight_kg'];
        $user['water_goal_ml'] = (int)($user['weight_kg'] * 30);
    }
    if (array_key_exists('height_cm', $body)) $user['height_cm'] = $body['height_cm'] === null ? null : (float)$body['height_cm'];
    if (array_key_exists('goal', $body)) $user['goal'] = $body['goal'];
    if (array_key_exists('activity_level', $body)) $user['activity_level'] = $body['activity_level'];
    if (array_key_exists('steps_goal', $body)) $user['steps_goal'] = (int)$body['steps_goal'];
    if (array_key_exists('steps_enabled', $body)) $user['steps_enabled'] = !empty($body['steps_enabled']);
    if (array_key_exists('water_goal_ml', $body)) $user['water_goal_ml'] = (int)$body['water_goal_ml'];
    try {
        $st = $pdo->prepare('UPDATE ff_users SET first_name=?, weight_kg=?, height_cm=?, goal=?, activity_level=?, steps_goal=?, steps_enabled=?, water_goal_ml=?, updated_at=NOW() WHERE id=?');
        $st->execute([
            $user['first_name'], $user['weight_kg'], $user['height_cm'], $user['goal'], $user['activity_level'],
            (int)($user['steps_goal'] ?? 10000), !empty($user['steps_enabled']) ? 1 : 0, (int)($user['water_goal_ml'] ?? 2000), $userId
        ]);
        // История веса: при изменении веса добавляем/обновляем запись в ff_weight (для графика в Статистике)
        if (array_key_exists('weight_kg', $body) && $body['weight_kg'] !== null && $body['weight_kg'] > 0) {
            $day = date('Y-m-d');
            $w = (float)$body['weight_kg'];
            $up = $pdo->prepare('UPDATE ff_weight SET weight_kg = ? WHERE user_id = ? AND date = ?');
            $up->execute([$w, $userId, $day]);
            if ($up->rowCount() === 0) {
                $pdo->prepare('INSERT INTO ff_weight (user_id, date, weight_kg) VALUES (?, ?, ?)')->execute([$userId, $day, $w]);
            }
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка записи в БД. Проверьте, что выполнена схема schema_mysql.sql и таблицы ff_users, ff_weight существуют. ' . $e->getMessage()]);
        return;
    }
    $st = $pdo->prepare('SELECT * FROM ff_users WHERE id = ?');
    $st->execute([$userId]);
    $fresh = $st->fetch(PDO::FETCH_ASSOC);
    echo json_encode(user_profile_public($fresh ?: $user));
    return;
}

if (preg_match('#^profile/weight$#', $path) && $method === 'GET') {
    $days = (int)($_GET['days'] ?? 31);
    $end = date('Y-m-d');
    $start = date('Y-m-d', strtotime("-$days days"));
    $st = $pdo->prepare('SELECT date, weight_kg FROM ff_weight WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date');
    $st->execute([$userId, $start, $end]);
    $data = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) $data[] = ['date' => $r['date'], 'weight_kg' => (float)$r['weight_kg']];
    echo json_encode(['data' => $data]);
    return;
}

// --- Water ---
if ($path === 'water' && $method === 'GET') {
    $day = $_GET['day'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT COALESCE(SUM(ml), 0) AS ml FROM ff_water WHERE user_id = ? AND date = ?');
    $st->execute([$userId, $day]);
    $ml = (int)$st->fetchColumn();
    echo json_encode(['date' => $day, 'ml' => $ml]);
    return;
}

if ($path === 'water' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $ml = (int)($body['ml'] ?? 0);
    $day = $body['day'] ?? date('Y-m-d');
    $pdo->prepare('INSERT INTO ff_water (user_id, date, ml) VALUES (?, ?, ?)')->execute([$userId, $day, $ml]);
    $st = $pdo->prepare('SELECT COALESCE(SUM(ml), 0) FROM ff_water WHERE user_id = ? AND date = ?');
    $st->execute([$userId, $day]);
    echo json_encode(['date' => $day, 'ml' => (int)$st->fetchColumn()]);
    return;
}

if (preg_match('#^water/stats$#', $path) && $method === 'GET') {
    $days = (int)($_GET['days'] ?? 31);
    $end = date('Y-m-d');
    $start = date('Y-m-d', strtotime("-$days days"));
    $st = $pdo->prepare('SELECT date, SUM(ml) AS ml FROM ff_water WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date');
    $st->execute([$userId, $start, $end]);
    $data = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) $data[] = ['date' => $r['date'], 'ml' => (int)$r['ml']];
    echo json_encode(['goal_ml' => (int)($user['water_goal_ml'] ?? 2000), 'data' => $data]);
    return;
}

// --- Meals ---
if ($path === 'meals' && $method === 'GET') {
    $day = $_GET['day'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT id, date, name, calories, protein, fat, carbs, source FROM ff_meals WHERE user_id = ? AND date = ? ORDER BY created_at DESC');
    $st->execute([$userId, $day]);
    $list = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $list[] = [
            'id' => (int)$r['id'],
            'date' => $r['date'],
            'name' => $r['name'],
            'calories' => (float)$r['calories'],
            'protein' => (float)$r['protein'],
            'fat' => (float)$r['fat'],
            'carbs' => (float)$r['carbs'],
            'source' => $r['source'],
        ];
    }
    echo json_encode($list);
    return;
}

if ($path === 'meals' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $name = trim($body['name'] ?? '');
    $calories = (float)($body['calories'] ?? 0);
    $protein = (float)($body['protein'] ?? 0);
    $fat = (float)($body['fat'] ?? 0);
    $carbs = (float)($body['carbs'] ?? 0);
    $source = $body['source'] ?? 'manual';
    $day = $body['date'] ?? date('Y-m-d');
    $pdo->prepare('INSERT INTO ff_meals (user_id, date, name, calories, protein, fat, carbs, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$userId, $day, $name ?: 'Блюдо', $calories, $protein, $fat, $carbs, $source]);
    $id = (int)$pdo->lastInsertId();
    echo json_encode(['id' => $id, 'date' => $day, 'name' => $name ?: 'Блюдо', 'calories' => $calories, 'protein' => $protein, 'fat' => $fat, 'carbs' => $carbs, 'source' => $source]);
    return;
}

if (preg_match('#^meals/barcode/(.+)$#', $path, $m) && $method === 'GET') {
    $code = rawurldecode($m[1]);
    $out = integrations_barcode_lookup($code);
    if (!$out) {
        http_response_code(404);
        echo json_encode(['error' => 'Продукт не найден в базе Open Food Facts. Добавьте блюдо вручную.']);
        return;
    }
    echo json_encode([
        'name' => $out['name'],
        'calories' => $out['calories'],
        'protein' => $out['protein'],
        'fat' => $out['fat'],
        'carbs' => $out['carbs'],
    ]);
    return;
}

// --- Steps ---
if ($path === 'steps' && $method === 'GET') {
    $day = $_GET['day'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT steps FROM ff_steps WHERE user_id = ? AND date = ?');
    $st->execute([$userId, $day]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    $steps = $row ? (int)$row['steps'] : 0;
    echo json_encode(['date' => $day, 'steps' => $steps]);
    return;
}

if ($path === 'steps' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $steps = (int)($body['steps'] ?? 0);
    $day = $body['date'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT id FROM ff_steps WHERE user_id = ? AND date = ?');
    $st->execute([$userId, $day]);
    if ($st->fetch()) {
        $pdo->prepare('UPDATE ff_steps SET steps = ? WHERE user_id = ? AND date = ?')->execute([$steps, $userId, $day]);
    } else {
        $pdo->prepare('INSERT INTO ff_steps (user_id, date, steps) VALUES (?, ?, ?)')->execute([$userId, $day, $steps]);
    }
    echo json_encode(['date' => $day, 'steps' => $steps]);
    return;
}

if (preg_match('#^steps/stats$#', $path) && $method === 'GET') {
    $days = (int)($_GET['days'] ?? 31);
    $end = date('Y-m-d');
    $start = date('Y-m-d', strtotime("-$days days"));
    $st = $pdo->prepare('SELECT date, steps FROM ff_steps WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date');
    $st->execute([$userId, $start, $end]);
    $data = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) $data[] = ['date' => $r['date'], 'steps' => (int)$r['steps']];
    echo json_encode(['goal' => (int)($user['steps_goal'] ?? 10000), 'data' => $data]);
    return;
}

// --- Stats ---
if ($path === 'stats/summary' && $method === 'GET') {
    require_once __DIR__ . '/nutrition_targets.php';
    $day = $_GET['day'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT COALESCE(SUM(calories),0), COALESCE(SUM(protein),0), COALESCE(SUM(fat),0), COALESCE(SUM(carbs),0) FROM ff_meals WHERE user_id = ? AND date = ?');
    $st->execute([$userId, $day]);
    $row = $st->fetch(PDO::FETCH_NUM);
    $st2 = $pdo->prepare('SELECT COALESCE(SUM(ml),0) FROM ff_water WHERE user_id = ? AND date = ?');
    $st2->execute([$userId, $day]);
    $water = (int)$st2->fetchColumn();
    $st3 = $pdo->prepare('SELECT steps FROM ff_steps WHERE user_id = ? AND date = ?');
    $st3->execute([$userId, $day]);
    $stepsRow = $st3->fetchColumn();
    $steps = $stepsRow !== false ? (int)$stepsRow : 0;
    $targets = nutrition_targets_for_user($user);
    echo json_encode([
        'date' => $day,
        'calories' => round((float)$row[0], 1),
        'protein' => round((float)$row[1], 1),
        'fat' => round((float)$row[2], 1),
        'carbs' => round((float)$row[3], 1),
        'water_ml' => $water,
        'water_goal_ml' => (int)($user['water_goal_ml'] ?? 2000),
        'steps' => $steps,
        'steps_goal' => (int)($user['steps_goal'] ?? 10000),
        'goal' => $user['goal'] ?? null,
        'targets' => $targets,
    ]);
    return;
}

if ($path === 'stats/meals' && $method === 'GET') {
    $days = (int)($_GET['days'] ?? 31);
    $end = date('Y-m-d');
    $start = date('Y-m-d', strtotime("-$days days"));
    $st = $pdo->prepare('SELECT date, SUM(calories) AS calories, SUM(protein) AS protein, SUM(fat) AS fat, SUM(carbs) AS carbs FROM ff_meals WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date');
    $st->execute([$userId, $start, $end]);
    $data = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $data[] = [
            'date' => $r['date'],
            'calories' => round((float)$r['calories'], 1),
            'protein' => round((float)$r['protein'], 1),
            'fat' => round((float)$r['fat'], 1),
            'carbs' => round((float)$r['carbs'], 1),
        ];
    }
    echo json_encode(['data' => $data]);
    return;
}

// --- Workouts ---
require_once __DIR__ . '/exercises_data.php';
if ($path === 'workouts/exercises' && $method === 'GET') {
    seed_exercises_if_needed($pdo);
    $goal = $_GET['goal'] ?? '';
    $activity = $_GET['activity'] ?? '';
    $st = $pdo->query('SELECT id, name, category, is_builtin FROM ff_exercises ORDER BY category, name');
    $all = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $all[] = ['id' => (int)$r['id'], 'name' => $r['name'], 'category' => $r['category'], 'is_builtin' => (bool)$r['is_builtin']];
    }
    $list = filter_exercises_by_goal($all, $goal);
    if (($activity === 'sedentary' || $activity === 'light') && count($list) > 0) {
        $list = filter_exercises_for_low_activity($list);
    }
    if (count($list) === 0) {
        $list = $all;
    }
    echo json_encode([
        'exercises' => $list,
        'hint' => workout_hint_for_goal($goal ?: 'maintain', $activity),
    ]);
    return;
}

if ($path === 'workouts' && $method === 'GET') {
    $day = $_GET['day'] ?? date('Y-m-d');
    $st = $pdo->prepare('SELECT w.id, w.exercise_id, w.date, w.sets, w.note, e.name AS exercise_name FROM ff_workouts w JOIN ff_exercises e ON e.id = w.exercise_id WHERE w.user_id = ? AND w.date = ? ORDER BY w.id');
    $st->execute([$userId, $day]);
    $list = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $sets = is_string($r['sets']) ? json_decode($r['sets'], true) : $r['sets'];
        $list[] = ['id' => (int)$r['id'], 'exercise_id' => (int)$r['exercise_id'], 'exercise_name' => $r['exercise_name'], 'date' => $r['date'], 'sets' => $sets ?: [], 'note' => $r['note']];
    }
    echo json_encode($list);
    return;
}

if ($path === 'workouts/records' && $method === 'GET') {
    $st = $pdo->prepare('SELECT w.sets, e.name FROM ff_workouts w JOIN ff_exercises e ON e.id = w.exercise_id WHERE w.user_id = ?');
    $st->execute([$userId]);
    $records = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $sets = is_string($r['sets']) ? json_decode($r['sets'], true) : ($r['sets'] ?: []);
        foreach ($sets ?: [] as $s) {
            $w = (float)($s['weight'] ?? 0);
            $rep = (int)($s['reps'] ?? 0);
            $name = $r['name'];
            if (!isset($records[$name]) || $w > ($records[$name]['weight'] ?? 0)) {
                $records[$name] = ['weight' => $w, 'reps' => $rep, 'exercise' => $name];
            }
        }
    }
    echo json_encode(['records' => array_values($records)]);
    return;
}

if ($path === 'workouts' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $exerciseId = (int)($body['exercise_id'] ?? 0);
    $sets = $body['sets'] ?? [];
    $day = $body['date'] ?? date('Y-m-d');
    $note = $body['note'] ?? null;
    $st = $pdo->prepare('SELECT id FROM ff_exercises WHERE id = ?');
    $st->execute([$exerciseId]);
    if (!$st->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Exercise not found']);
        return;
    }
    $setsJson = json_encode($sets);
    $pdo->prepare('INSERT INTO ff_workouts (user_id, exercise_id, date, sets, note) VALUES (?, ?, ?, ?, ?)')->execute([$userId, $exerciseId, $day, $setsJson, $note]);
    $id = (int)$pdo->lastInsertId();
    $st = $pdo->prepare('SELECT name FROM ff_exercises WHERE id = ?');
    $st->execute([$exerciseId]);
    $exName = $st->fetchColumn();
    echo json_encode(['id' => $id, 'exercise_id' => $exerciseId, 'exercise_name' => $exName, 'date' => $day, 'sets' => $sets, 'note' => $note]);
    return;
}

// --- Coach ---
if ($path === 'coach/clients' && $method === 'GET') {
    $st = $pdo->prepare('SELECT u.id, u.email, u.username, u.first_name FROM ff_users u JOIN ff_coach_clients c ON c.client_id = u.id WHERE c.coach_id = ?');
    $st->execute([$userId]);
    $clients = [];
    while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
        $clients[] = ['id' => (int)$r['id'], 'email' => $r['email'], 'username' => $r['username'], 'first_name' => $r['first_name']];
    }
    echo json_encode(['clients' => $clients]);
    return;
}

if ($path === 'coach/clients' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $clientEmail = strtolower(trim($body['client_email'] ?? ''));
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Укажите email подопечного']);
        return;
    }
    $st = $pdo->prepare('SELECT id FROM ff_users WHERE email = ?');
    $st->execute([$clientEmail]);
    $client = $st->fetch(PDO::FETCH_ASSOC);
    if (!$client) {
        http_response_code(404);
        echo json_encode(['error' => 'Пользователь с таким email не найден. Он должен зарегистрироваться на сайте.']);
        return;
    }
    $clientId = (int)$client['id'];
    if ($clientId === $userId) {
        http_response_code(400);
        echo json_encode(['error' => 'Нельзя добавить себя']);
        return;
    }
    $st = $pdo->prepare('SELECT id FROM ff_coach_clients WHERE coach_id = ? AND client_id = ?');
    $st->execute([$userId, $clientId]);
    if ($st->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Уже добавлен']);
        return;
    }
    $pdo->prepare('INSERT INTO ff_coach_clients (coach_id, client_id) VALUES (?, ?)')->execute([$userId, $clientId]);
    echo json_encode(['ok' => true]);
    return;
}

http_response_code(404);
echo json_encode(['error' => 'Not found', 'path' => $path]);
