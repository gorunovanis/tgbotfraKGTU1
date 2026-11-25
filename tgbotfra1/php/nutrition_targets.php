<?php
/**
 * Ориентировочные суточные нормы КБЖУ (Mifflin–St Jeor, нейтральный пол, возраст 30 лет).
 */
declare(strict_types=1);

function nutrition_targets_for_user(array $user): ?array {
    $w = (float)($user['weight_kg'] ?? 0);
    $h = (float)($user['height_cm'] ?? 0);
    if ($w < 35 || $h < 120) {
        return null;
    }
    $goal = (string)($user['goal'] ?? 'maintain');
    $act = (string)($user['activity_level'] ?? 'moderate');
    $age = 30;
    $bmr = 10 * $w + 6.25 * $h - 5 * $age - 78;
    $mult = [
        'sedentary' => 1.2,
        'light' => 1.375,
        'moderate' => 1.55,
        'active' => 1.725,
        'very_active' => 1.9,
    ];
    $m = $mult[$act] ?? 1.55;
    $tdee = $bmr * $m;
    if ($goal === 'lose') {
        $tdee -= 400;
    } elseif ($goal === 'gain') {
        $tdee += 300;
    }
    $cal = (int)round(max(1400, $tdee));
    $protein = (int)round($goal === 'gain' ? 2.0 * $w : ($goal === 'lose' ? 1.8 * $w : 1.4 * $w));
    $fatK = (int)round($cal * 0.28 / 9);
    $carbs = (int)round(max(0, ($cal - $protein * 4 - $fatK * 9) / 4));
    return [
        'calories' => $cal,
        'protein_g' => $protein,
        'fat_g' => $fatK,
        'carbs_g' => $carbs,
    ];
}
