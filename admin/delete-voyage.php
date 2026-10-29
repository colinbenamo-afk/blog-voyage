<?php
/* =========================================================
   ADMIN — backend de suppression pour admin.php
   Reçoit un id de voyage, le retire de data/voyages.json et
   supprime ses photos dans assets/images/. Même structure que
   save-voyage.php (auth, garde-fou JSON, clé d'accès).
   ========================================================= */

declare(strict_types=1);

require __DIR__ . '/auth.php';
requireAdminAuth(true);

header('Content-Type: application/json; charset=utf-8');

// Filet de sécurité : voir save-voyage.php pour le détail (évite une
// page vide "Unexpected end of JSON input" côté navigateur en cas
// d'erreur PHP fatale imprévue).
ob_start();
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error === null || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'errors' => ["Erreur serveur : {$error['message']} (ligne {$error['line']})"],
    ], JSON_UNESCAPED_UNICODE);
});

define('ACCESS_KEY', $adminConfig['access_key']);
define('ROOT_DIR', dirname(__DIR__));
define('DATA_DIR', ROOT_DIR . '/data');
define('DATA_FILE', DATA_DIR . '/voyages.json');

function fail(array $errors, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

try {

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(['Méthode non autorisée.'], 405);
}

if (($_POST['access_key'] ?? '') !== ACCESS_KEY) {
    fail(["Clé d'accès invalide."], 403);
}

$id = trim((string) ($_POST['id'] ?? ''));
if ($id === '') {
    fail(["Identifiant du voyage manquant."]);
}

if (!is_file(DATA_FILE)) {
    fail(['Aucun voyage enregistré pour le moment.'], 404);
}

$content = file_get_contents(DATA_FILE);
$voyages = $content !== false ? json_decode($content, true) : null;
if (!is_array($voyages)) {
    fail(['Impossible de lire data/voyages.json.'], 500);
}

$index = null;
foreach ($voyages as $i => $voyage) {
    if (($voyage['id'] ?? null) === $id) {
        $index = $i;
        break;
    }
}

if ($index === null) {
    fail(["Aucun voyage avec l'id \"{$id}\" n'a été trouvé."], 404);
}

$removed = $voyages[$index];

// Supprime ses photos (telles que listées dans voyages.json, pas en
// devinant un nom de fichier) avant de réécrire le JSON.
foreach ((array) ($removed['photos'] ?? []) as $relativePath) {
    $photoPath = ROOT_DIR . '/' . ltrim((string) $relativePath, '/');
    if (is_file($photoPath)) {
        @unlink($photoPath);
    }
}

$voyages = array_values(array_filter(
    $voyages,
    fn ($voyage) => ($voyage['id'] ?? null) !== $id
));

$json = json_encode($voyages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents(DATA_FILE, $json) === false) {
    fail(["Impossible d'écrire data/voyages.json."], 500);
}

echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    fail(["Erreur serveur : {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})"], 500);
}
