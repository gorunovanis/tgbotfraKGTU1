<?php
/**
 * Пример API для работы с базой данных MySQL
 * FitHealth39 Backend API
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Конфигурация базы данных
define('DB_HOST', 'localhost');
define('DB_NAME', 'kuzbassmeg');
define('DB_USER', 'root'); // Измените на вашего пользователя
define('DB_PASS', ''); // Укажите пароль

// Подключение к базе данных
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Получение метода и пути
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);

// Получение данных из запроса
$input = json_decode(file_get_contents('php://input'), true);

// Маршрутизация
switch ($method) {
    case 'POST':
        if ($path === '/register') {
            registerUser($pdo, $input);
        } elseif ($path === '/login') {
            loginUser($pdo, $input);
        } elseif ($path === '/save-health-group') {
            saveHealthGroup($pdo, $input);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        if (preg_match('/^\/user\/(\d+)$/', $path, $matches)) {
            getUserData($pdo, $matches[1]);
        } elseif ($path === '/health-group-stats') {
            getHealthGroupStats($pdo);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

/**
 * Регистрация пользователя
 */
function registerUser($pdo, $data) {
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        return;
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $password = $data['password'];
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        return;
    }
    
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    
    try {
        $stmt = $pdo->prepare("CALL sp_register_user(?, ?)");
        $stmt->execute([$email, $passwordHash]);
        $user = $stmt->fetch();
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'created_at' => $user['created_at']
            ]
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already exists']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed']);
        }
    }
}

/**
 * Вход пользователя
 */
function loginUser($pdo, $data) {
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        return;
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $password = $data['password'];
    
    try {
        // Получаем пользователя
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND is_active = TRUE");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }
        
        // Обновляем last_login
        $stmt = $pdo->prepare("CALL sp_login_user(?)");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        // Создаем сессию (опционально)
        $sessionToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $pdo->prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $sessionToken, $expiresAt]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'health_group' => $user['health_group'],
                'last_login' => $user['last_login']
            ],
            'session_token' => $sessionToken
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Login failed']);
    }
}

/**
 * Сохранение группы здоровья
 */
function saveHealthGroup($pdo, $data) {
    if (!isset($data['user_id']) || !isset($data['health_group'])) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID and health group are required']);
        return;
    }
    
    $userId = (int)$data['user_id'];
    $healthGroup = $data['health_group'];
    
    if (!in_array($healthGroup, ['II', 'III'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid health group']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("CALL sp_save_health_group(?, ?)");
        $stmt->execute([$userId, $healthGroup]);
        $user = $stmt->fetch();
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'health_group' => $user['health_group'],
                'health_group_updated_at' => $user['health_group_updated_at']
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save health group']);
    }
}

/**
 * Получение данных пользователя
 */
function getUserData($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("CALL sp_get_user_data(?)");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }
        
        // Убираем пароль из ответа
        unset($user['password_hash']);
        
        http_response_code(200);
        echo json_encode(['success' => true, 'user' => $user]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get user data']);
    }
}

/**
 * Получение статистики по группам здоровья
 */
function getHealthGroupStats($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM v_health_group_stats");
        $stats = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode(['success' => true, 'stats' => $stats]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to get statistics']);
    }
}
