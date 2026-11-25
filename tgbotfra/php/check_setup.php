<?php
/**
 * Диагностика: конфиг, БД, таблицы. После проверки удалите с сервера.
 */
header('Content-Type: text/html; charset=utf-8');
echo "<pre style='font-family:sans-serif; background:#1a1a2e; color:#eee; padding:16px;'>\n";
echo "=== Проверка настроек FoodApp (PHP) ===\n\n";

$localConfig = __DIR__ . '/config.local.php';
$hasLocal = is_file($localConfig);
echo "1. config.local.php: " . ($hasLocal ? "есть" : "нет — скопируйте из config.local.php.example") . "\n\n";

require_once __DIR__ . '/config.php';

echo "2. BASE_URL: " . (BASE_URL !== '' ? BASE_URL : "(не задан, для cookie сессии укажите URL сайта)") . "\n";
echo "   DB: " . DB_HOST . " / " . DB_NAME . " (" . DB_USER . ")\n\n";

echo "3. MySQL: ";
try {
    require_once __DIR__ . '/db.php';
    $pdo = get_pdo();
    echo "OK\n\n";
} catch (Throwable $e) {
    echo "ОШИБКА: " . htmlspecialchars($e->getMessage()) . "\n";
    echo "</pre>";
    exit;
}

echo "4. Таблицы с префиксом ff_:\n";
$tables = $pdo->query("SHOW TABLES LIKE 'ff\_%'")->fetchAll(PDO::FETCH_COLUMN);
if (empty($tables)) {
    echo "   нет. Выполните schema_mysql.sql\n\n";
} else {
    foreach ($tables as $t) {
        $n = $pdo->query("SELECT COUNT(*) FROM `" . str_replace('`', '``', $t) . "`")->fetchColumn();
        echo "   - $t: $n\n";
    }
    $cols = $pdo->query("SHOW COLUMNS FROM ff_users LIKE 'email'")->fetch();
    echo "\n5. Колонка ff_users.email: " . ($cols ? "есть" : "нет — выполните schema_migration_site_auth.sql или schema_mysql.sql") . "\n";
}

echo "\nУдалите этот файл с сервера: php/check_setup.php\n";
echo "</pre>";
