<?php
/**
 * Конфиг для PHP-версии (без Python).
 * Скопируйте в config.local.php и укажите свои значения (config.local.php не коммитить).
 */
function tgbotfra_load_env(): void {
    $paths = [
        dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env',
        __DIR__ . DIRECTORY_SEPARATOR . '.env',
    ];
    foreach ($paths as $path) {
        if (!is_readable($path)) {
            continue;
        }
        $lines = @file($path, FILE_IGNORE_NEW_LINES);
        if (!is_array($lines)) {
            continue;
        }
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }
            $eq = strpos($line, '=');
            if ($eq === false) {
                continue;
            }
            $k = trim(substr($line, 0, $eq));
            $v = trim(substr($line, $eq + 1));
            if ($v !== '' && ($v[0] === '"' || $v[0] === "'")) {
                $v = trim($v, $v[0]);
            }
            if ($k !== '' && getenv($k) === false) {
                putenv($k . '=' . $v);
                $_ENV[$k] = $v;
            }
        }
        break;
    }
}
tgbotfra_load_env();

/**
 * BASE_URL должен указывать на корень приложения на сайте (например https://домен.ru/tgbotfra),
 * без /static/app/index.html. Иначе path у cookie сессии получается слишком узким и вход «не держится».
 */
function tgbotfra_normalize_base_url(string $url): string {
    $url = rtrim(trim($url), '/');
    if ($url === '') {
        return '';
    }
    if (preg_match('#/static/app(?:/index\.html)?$#', $url)) {
        return (string) preg_replace('#/static/app(?:/index\.html)?$#', '', $url);
    }
    return $url;
}

$config = [
    'BASE_URL'   => 'https://anisim-site.ru/tgbotfra/',  // URL сайта, например https://ваш-домен.ru/tgbotfra (для cookie сессии)
    'DB_HOST'    => 'localhost',
    'DB_PORT'    => 3306,
    'DB_USER'    => 'u3422713_default',
    'DB_PASS'    => 'tPrv5X1QcRF84oei',
    'DB_NAME'    => 'u3422713_default',
    'DB_CHARSET' => 'utf8mb4',
];

if (is_file(__DIR__ . '/config.local.php')) {
    $local = require __DIR__ . '/config.local.php';
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}
// Можно задать через getenv (хостинг). Пустая строка из .env не должна затирать config.local.php (частая ошибка с DB_HOST=).
foreach (['BASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_CHARSET'] as $k) {
    $v = getenv($k);
    if ($v === false || $v === '') {
        continue;
    }
    $config[$k] = $v;
}
if (($config['DB_PASS'] ?? '') === '' && getenv('DB_PASSWORD') !== false && getenv('DB_PASSWORD') !== '') {
    $config['DB_PASS'] = getenv('DB_PASSWORD');
}

define('DB_HOST', $config['DB_HOST']);
define('DB_PORT', $config['DB_PORT'] ?? 3306);
define('DB_USER', $config['DB_USER']);
define('DB_PASS', $config['DB_PASS']);
define('DB_NAME', $config['DB_NAME']);
define('DB_CHARSET', $config['DB_CHARSET'] ?? 'utf8mb4');
define('DB_DSN', sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_CHARSET
));
define('BASE_URL', tgbotfra_normalize_base_url(rtrim($config['BASE_URL'] ?? '', '/')));
