<?php
// 37 встроенных упражнений (как в data/exercises.py)
function get_builtin_exercises(): array {
    return [
        ['name' => 'Жим штанги лёжа', 'category' => 'Грудь'],
        ['name' => 'Жим гантелей на наклонной', 'category' => 'Грудь'],
        ['name' => 'Разводка гантелей', 'category' => 'Грудь'],
        ['name' => 'Отжимания от пола', 'category' => 'Грудь'],
        ['name' => 'Отжимания на брусьях', 'category' => 'Грудь'],
        ['name' => 'Сведение рук в кроссовере', 'category' => 'Грудь'],
        ['name' => 'Пуловер', 'category' => 'Грудь'],
        ['name' => 'Подтягивания', 'category' => 'Спина'],
        ['name' => 'Тяга штанги в наклоне', 'category' => 'Спина'],
        ['name' => 'Тяга гантели одной рукой', 'category' => 'Спина'],
        ['name' => 'Тяга вертикального блока', 'category' => 'Спина'],
        ['name' => 'Тяга горизонтального блока', 'category' => 'Спина'],
        ['name' => 'Гиперэкстензия', 'category' => 'Спина'],
        ['name' => 'Становая тяга', 'category' => 'Спина'],
        ['name' => 'Приседания со штангой', 'category' => 'Ноги'],
        ['name' => 'Жим ногами', 'category' => 'Ноги'],
        ['name' => 'Выпады', 'category' => 'Ноги'],
        ['name' => 'Румынская тяга', 'category' => 'Ноги'],
        ['name' => 'Разгибания ног в тренажёре', 'category' => 'Ноги'],
        ['name' => 'Сгибания ног лёжа', 'category' => 'Ноги'],
        ['name' => 'Подъёмы на носки стоя', 'category' => 'Ноги'],
        ['name' => 'Подъёмы на носки сидя', 'category' => 'Ноги'],
        ['name' => 'Жим штанги стоя', 'category' => 'Плечи'],
        ['name' => 'Жим гантелей сидя', 'category' => 'Плечи'],
        ['name' => 'Махи гантелей в стороны', 'category' => 'Плечи'],
        ['name' => 'Махи в наклоне (задняя дельта)', 'category' => 'Плечи'],
        ['name' => 'Тяга к подбородку', 'category' => 'Плечи'],
        ['name' => 'Армейский жим', 'category' => 'Плечи'],
        ['name' => 'Подъём штанги на бицепс', 'category' => 'Руки'],
        ['name' => 'Подъём гантелей на бицепс', 'category' => 'Руки'],
        ['name' => 'Молотки', 'category' => 'Руки'],
        ['name' => 'Разгибания на трицепс на блоке', 'category' => 'Руки'],
        ['name' => 'Французский жим', 'category' => 'Руки'],
        ['name' => 'Отжимания на брусьях (трицепс)', 'category' => 'Руки'],
        ['name' => 'Скручивания', 'category' => 'Пресс'],
        ['name' => 'Подъём ног в висе', 'category' => 'Пресс'],
        ['name' => 'Планка', 'category' => 'Пресс'],
    ];
}

function seed_exercises_if_needed(PDO $pdo): void {
    $st = $pdo->query('SELECT 1 FROM ff_exercises WHERE is_builtin = 1 LIMIT 1');
    if ($st->fetch()) return;
    $ins = $pdo->prepare('INSERT INTO ff_exercises (name, category, is_builtin, user_id) VALUES (?, ?, 1, NULL)');
    foreach (get_builtin_exercises() as $ex) {
        $ins->execute([$ex['name'], $ex['category']]);
    }
}

/**
 * @param array<int, array{id:int,name:string,category:?string,is_builtin:bool}> $rows
 * @return array<int, array{id:int,name:string,category:?string,is_builtin:bool}>
 */
function filter_exercises_by_goal(array $rows, string $goal): array {
    $goal = $goal === '' ? 'maintain' : $goal;
    if ($goal === 'maintain') {
        return $rows;
    }
    if ($goal === 'gain') {
        return array_values(array_filter($rows, static function ($e) {
            return in_array($e['category'] ?? '', ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки'], true);
        }));
    }
    if ($goal === 'lose') {
        $loseCats = ['Пресс', 'Ноги'];
        $loseNames = ['Отжимания от пола', 'Отжимания на брусьях'];

        return array_values(array_filter($rows, static function ($e) use ($loseCats, $loseNames) {
            return in_array($e['category'] ?? '', $loseCats, true) || in_array($e['name'] ?? '', $loseNames, true);
        }));
    }

    return $rows;
}

/**
 * @param array<int, array{id:int,name:string,category:?string,is_builtin:bool}> $rows
 * @return array<int, array{id:int,name:string,category:?string,is_builtin:bool}>
 */
function filter_exercises_for_low_activity(array $rows): array {
    $light = array_values(array_filter($rows, static function ($e) {
        if (in_array($e['category'] ?? '', ['Пресс', 'Ноги'], true)) {
            return true;
        }
        return in_array($e['name'] ?? '', ['Отжимания от пола', 'Планка'], true);
    }));

    return count($light) > 0 ? $light : $rows;
}

function workout_hint_for_goal(string $goal, string $activity): string {
    $goal = $goal === '' ? 'maintain' : $goal;
    $hints = [
        'lose' => 'Цель — похудение. Тренировки: ноги, пресс, отжимания (список уже отфильтрован) — 3–4 подхода по 12–15 повторов, 3–4 раза в неделю; вне зала цель 8–12 тыс. шагов или 20–30 мин ходьбы/эллипса 2–3 раза. Питание: калории ниже ориентира на главной на ~300–500 ккал, белок ~1,6–2 г/кг веса; на тарелке примерно половина овощей + белок (рыба, яйца, курица, творог) в каждом приёме.',
        'maintain' => 'Цель — поддержание. Тренировки: чередуйте группы (верх/низ или фулбоди) 2–3 раза в неделю, 3 подхода по 8–12 повторов, вес штанги/гантелей поднимайте маленькими шагами. Питание: калории около ориентира на главной (допустимо ±100–150 ккал в день), белок ~1,4–1,8 г/кг; без «загрузочных» выходных — стабильность важнее идеала каждый день.',
        'gain' => 'Цель — набор массы. Тренировки: база — присед, становая/тяга, жим лёжа или аналоги — 3–5 подходов по 6–12 повторов, 3–4 раза в неделю; каждую неделю добавляйте по 1–2 повтору или 1–2,5 кг, если техника чистая. Питание: к ориентиру калорий на главной добавьте ~250–400 ккал (профицит), белок ~1,8–2,2 г/кг и в каждом приёме; углеводы до и после тренировки: овсянка, рис, банан, макароны цельнозерновые.',
    ];
    $text = $hints[$goal] ?? $hints['maintain'];
    if ($activity === 'sedentary' || $activity === 'light') {
        $text .= ' При сидячей работе: начните с 2–3 подходов, не гонитесь за весом; в течение дня вставайте каждый час на 3–5 минут ходьбы.';
    }

    return $text;
}
