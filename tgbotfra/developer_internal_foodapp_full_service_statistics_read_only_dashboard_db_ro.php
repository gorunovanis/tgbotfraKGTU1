<?php
/**
 * Страница агрегированной статистики сервиса для разработчика (открывается по прямому URL).
 */
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

require_once __DIR__ . '/php/db.php';

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function qcount(PDO $pdo, string $sql): int
{
    return (int) $pdo->query($sql)->fetchColumn();
}

$pdo = get_pdo();
$now = new DateTimeImmutable('now');
$errors = [];

$tables = [
    'ff_users' => 'Пользователи',
    'ff_meals' => 'Записи блюд',
    'ff_water' => 'Записи воды',
    'ff_steps' => 'Записи шагов',
    'ff_weight' => 'Записи веса',
    'ff_measurements' => 'Замеры тела',
    'ff_exercises' => 'Упражнения',
    'ff_workouts' => 'Тренировки',
    'ff_workout_plans' => 'Планы тренировок',
    'ff_coach_clients' => 'Связи тренер–клиент',
    'ff_ai_messages' => 'Сообщения AI-чата',
];

$counts = [];
foreach ($tables as $table => $label) {
    try {
        $safe = preg_replace('/[^a-z0-9_]/i', '', $table) ?: 'invalid';
        $counts[$table] = ['label' => $label, 'n' => qcount($pdo, 'SELECT COUNT(*) FROM `' . $safe . '`')];
    } catch (Throwable $e) {
        $counts[$table] = ['label' => $label, 'n' => null, 'err' => $e->getMessage()];
    }
}

$extras = [];
try {
    $extras['users_with_email'] = qcount($pdo, 'SELECT COUNT(*) FROM ff_users WHERE email IS NOT NULL AND email <> \'\'');
    $extras['users_with_password'] = qcount($pdo, 'SELECT COUNT(*) FROM ff_users WHERE password_hash IS NOT NULL AND password_hash <> \'\'');
    $extras['users_telegram_id'] = qcount($pdo, 'SELECT COUNT(*) FROM ff_users WHERE telegram_id IS NOT NULL');
} catch (Throwable $e) {
    $errors[] = 'users split: ' . $e->getMessage();
}

$newUsers7d = [];
try {
    $st = $pdo->query("SELECT DATE(created_at) AS d, COUNT(*) AS c FROM ff_users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY d");
    $newUsers7d = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $errors[] = 'new users 7d: ' . $e->getMessage();
}

$mealsBySource = [];
try {
    $st = $pdo->query('SELECT source, COUNT(*) AS c FROM ff_meals GROUP BY source ORDER BY c DESC');
    $mealsBySource = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $errors[] = 'meals by source: ' . $e->getMessage();
}

$mealsCreated7d = [];
try {
    $st = $pdo->query("SELECT DATE(created_at) AS d, COUNT(*) AS c FROM ff_meals WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY d");
    $mealsCreated7d = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $errors[] = 'meals created 7d: ' . $e->getMessage();
}

$recentUsers = [];
try {
    $st = $pdo->query('SELECT id, email, created_at FROM ff_users ORDER BY id DESC LIMIT 12');
    $recentUsers = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    $errors[] = 'recent users: ' . $e->getMessage();
}

$dbName = DB_NAME;
$phpVer = PHP_VERSION;
$host = h($_SERVER['HTTP_HOST'] ?? '');
$genAt = h($now->format('Y-m-d H:i:s T'));

?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Статистика сервиса (разработчик)</title>
  <style>
    :root { --bg:#0f1210; --card:#171b18; --bd:#2a322c; --tx:#e8eee9; --muted:#8fa396; --acc:#3ecf8e; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui,Segoe UI,sans-serif; background:var(--bg); color:var(--tx); padding:24px 18px 48px; line-height:1.5; }
    h1 { font-size:1.15rem; margin:0 0 8px; font-weight:700; }
    .sub { color:var(--muted); font-size:.85rem; margin-bottom:22px; }
    .grid { display:grid; gap:16px; max-width:960px; }
    @media (min-width:720px) { .grid { grid-template-columns:1fr 1fr; } }
    section { background:var(--card); border:1px solid var(--bd); border-radius:12px; padding:16px 18px; }
    section h2 { margin:0 0 12px; font-size:.95rem; color:var(--acc); font-weight:600; }
    table { width:100%; border-collapse:collapse; font-size:.88rem; }
    th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--bd); }
    th { color:var(--muted); font-weight:600; }
    tr:last-child td { border-bottom:0; }
    td.num { text-align:right; font-variant-numeric:tabular-nums; }
    .err { color:#f09090; font-size:.85rem; margin-top:12px; }
    .mono { font-family:ui-monospace,Consolas,monospace; font-size:.8rem; word-break:break-all; }
  </style>
</head>
<body>
  <h1>Статистика сервиса FoodApp</h1>
  <p class="sub">Хост: <?= $host ?> · БД: <?= h($dbName) ?> · PHP <?= h($phpVer) ?> · Сгенерировано: <?= $genAt ?></p>
  <div class="grid">
    <section>
      <h2>Строки в таблицах</h2>
      <table>
        <thead><tr><th>Таблица</th><th class="num">Записей</th></tr></thead>
        <tbody>
<?php foreach ($counts as $table => $row): ?>
          <tr>
            <td><?= h($row['label']) ?> <span class="mono">(<?= h($table) ?>)</span></td>
            <td class="num"><?= isset($row['err']) ? '—' : h((string) $row['n']) ?></td>
          </tr>
<?php endforeach; ?>
        </tbody>
      </table>
    </section>
    <section>
      <h2>Пользователи (детализация)</h2>
      <table>
        <tbody>
          <tr><td>С email в БД</td><td class="num"><?= h((string) ($extras['users_with_email'] ?? '—')) ?></td></tr>
          <tr><td>С паролем (сайт)</td><td class="num"><?= h((string) ($extras['users_with_password'] ?? '—')) ?></td></tr>
          <tr><td>С telegram_id</td><td class="num"><?= h((string) ($extras['users_telegram_id'] ?? '—')) ?></td></tr>
        </tbody>
      </table>
    </section>
    <section>
      <h2>Блюда: источник (source)</h2>
      <table>
        <thead><tr><th>source</th><th class="num">Кол-во</th></tr></thead>
        <tbody>
<?php foreach ($mealsBySource as $r): ?>
          <tr><td class="mono"><?= h($r['source'] ?? '') ?></td><td class="num"><?= h((string) ($r['c'] ?? '')) ?></td></tr>
<?php endforeach; ?>
<?php if (!$mealsBySource): ?>
          <tr><td colspan="2">Нет данных</td></tr>
<?php endif; ?>
        </tbody>
      </table>
    </section>
    <section>
      <h2>Новые пользователи по дням (7 дней)</h2>
      <table>
        <thead><tr><th>Дата</th><th class="num">Регистраций</th></tr></thead>
        <tbody>
<?php foreach ($newUsers7d as $r): ?>
          <tr><td><?= h($r['d'] ?? '') ?></td><td class="num"><?= h((string) ($r['c'] ?? '')) ?></td></tr>
<?php endforeach; ?>
<?php if (!$newUsers7d): ?>
          <tr><td colspan="2">Нет записей за период</td></tr>
<?php endif; ?>
        </tbody>
      </table>
    </section>
    <section>
      <h2>Созданные блюда по дням (7 дней, по created_at)</h2>
      <table>
        <thead><tr><th>Дата</th><th class="num">Записей</th></tr></thead>
        <tbody>
<?php foreach ($mealsCreated7d as $r): ?>
          <tr><td><?= h($r['d'] ?? '') ?></td><td class="num"><?= h((string) ($r['c'] ?? '')) ?></td></tr>
<?php endforeach; ?>
<?php if (!$mealsCreated7d): ?>
          <tr><td colspan="2">Нет записей за период</td></tr>
<?php endif; ?>
        </tbody>
      </table>
    </section>
    <section style="grid-column:1/-1;">
      <h2>Последние пользователи (id, email)</h2>
      <table>
        <thead><tr><th>id</th><th>email</th><th>created_at</th></tr></thead>
        <tbody>
<?php foreach ($recentUsers as $r): ?>
          <tr>
            <td class="num"><?= h((string) ($r['id'] ?? '')) ?></td>
            <td class="mono"><?= h($r['email'] ?? '—') ?></td>
            <td><?= h($r['created_at'] ?? '') ?></td>
          </tr>
<?php endforeach; ?>
<?php if (!$recentUsers): ?>
          <tr><td colspan="3">Нет данных</td></tr>
<?php endif; ?>
        </tbody>
      </table>
    </section>
  </div>
<?php if ($errors): ?>
  <div class="err">Предупреждения: <?= h(implode(' | ', $errors)) ?></div>
<?php endif; ?>
</body>
</html>
