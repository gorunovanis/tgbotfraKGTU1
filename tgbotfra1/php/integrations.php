<?php
/**
 * Внешние API: Open Food Facts (штрих-код). Облачные нейросети не используются.
 */
declare(strict_types=1);

/**
 * HTTP GET JSON.
 */
function http_get_json(string $url, int $timeoutSec = 20): ?array {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeoutSec,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $res = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false || $code >= 400) {
            return null;
        }
        $j = json_decode($res, true);
        return is_array($j) ? $j : null;
    }
    $res = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => $timeoutSec]]));
    if ($res === false) {
        return null;
    }
    $j = json_decode($res, true);
    return is_array($j) ? $j : null;
}

/**
 * Open Food Facts: продукт по штрих-коду (кБЖУ на 100 г).
 * @return array{name: string, calories: float, protein: float, fat: float, carbs: float}|null
 */
function integrations_barcode_lookup(string $code): ?array {
    $code = preg_replace('/\s+/', '', $code);
    $code = trim($code);
    if ($code === '' || strlen($code) > 32) {
        return null;
    }
    $url = 'https://world.openfoodfacts.org/api/v0/product/' . rawurlencode($code) . '.json';
    $data = http_get_json($url, 25);
    if (!$data || empty($data['status']) || (int)$data['status'] !== 1 || empty($data['product'])) {
        return null;
    }
    $p = $data['product'];
    $name = $p['product_name'] ?? $p['product_name_ru'] ?? $p['generic_name'] ?? 'Продукт';
    $name = trim((string)$name);
    $n = $p['nutriments'] ?? [];
    if (!is_array($n)) {
        $n = [];
    }
    $kcal = null;
    if (isset($n['energy-kcal_100g'])) {
        $kcal = (float)$n['energy-kcal_100g'];
    } elseif (isset($n['energy-kcal'])) {
        $kcal = (float)$n['energy-kcal'];
    } elseif (isset($n['energy-kj_100g'])) {
        $kcal = (float)$n['energy-kj_100g'] / 4.184;
    } elseif (isset($n['energy-kj'])) {
        $kcal = (float)$n['energy-kj'] / 4.184;
    }
    if ($kcal === null) {
        $kcal = 0.0;
    }
    $prot = isset($n['proteins_100g']) ? (float)$n['proteins_100g'] : (isset($n['proteins']) ? (float)$n['proteins'] : 0.0);
    $fat = isset($n['fat_100g']) ? (float)$n['fat_100g'] : (isset($n['fat']) ? (float)$n['fat'] : 0.0);
    $carbs = isset($n['carbohydrates_100g']) ? (float)$n['carbohydrates_100g'] : (isset($n['carbohydrates']) ? (float)$n['carbohydrates'] : 0.0);

    return [
        'name' => $name . ' (на 100 г)',
        'calories' => round(max(0, $kcal), 1),
        'protein' => round(max(0, $prot), 1),
        'fat' => round(max(0, $fat), 1),
        'carbs' => round(max(0, $carbs), 1),
    ];
}
