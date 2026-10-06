<?php
/* =========================================================
   ADMIN — backend d'écriture pour admin.php
   Reçoit le formulaire (FormData, avec les 3 photos), valide,
   convertit les photos en WebP, et ajoute le voyage à
   data/voyages.json (sans jamais toucher aux voyages existants).

   Fonctionne sur n'importe quel hébergement PHP classique (contrairement
   à l'ancienne version en JS pur, qui ne marchait qu'en local dans
   Chrome via l'API File System Access).
   ========================================================= */

declare(strict_types=1);

require __DIR__ . '/auth.php';
requireAdminAuth(true);

header('Content-Type: application/json; charset=utf-8');

// Filet de sécurité : si une erreur PHP fatale et imprévue survient plus
// bas (hébergement différent de celui testé en dév, extension manquante,
// etc.), on répond quand même en JSON au lieu de laisser une page vide —
// c'est ce qui causait "Unexpected end of JSON input" côté navigateur.
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

// Garde-fou simple pour un outil interne : évite qu'un inconnu qui
// tomberait sur l'URL de ce script puisse écrire dans le site.
// Valeur chargée depuis config.php (voir auth.php, requis juste au-dessus) :
// ce n'est pas une vraie sécurité (la clé circule en clair), juste un frein
// en plus de la session déjà vérifiée par requireAdminAuth().
define('ACCESS_KEY', $adminConfig['access_key']);

// save-voyage.php vit maintenant dans admin/ : la racine du projet
// (contenant data/ et assets/) est le dossier parent.
// `const` n'accepte pas d'appel de fonction (dirname()) : on utilise
// define(), qui s'exécute normalement au moment de l'appel.
define('ROOT_DIR', dirname(__DIR__));
define('DATA_DIR', ROOT_DIR . '/data');
define('DATA_FILE', DATA_DIR . '/voyages.json');
define('IMAGES_DIR', ROOT_DIR . '/assets/images');

function fail(array $errors, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

// "Costa Rica" -> "costa-rica" (enlève les accents et tout ce qui
// n'est pas alphanumérique).
function slugify(string $text): string
{
    $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    if ($translit === false) {
        $translit = $text;
    }
    $slug = strtolower($translit);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

function buildIntroText(string $date, string $duree, string $transport): string
{
    $timestamp = strtotime($date);
    $dateLabel = $date;
    if ($timestamp !== false) {
        $mois = [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
        ];
        $dateLabel = (int) date('j', $timestamp) . ' ' . $mois[(int) date('n', $timestamp) - 1] . ' ' . date('Y', $timestamp);
    }
    return "Départ le {$dateLabel}, {$duree}, en {$transport}.";
}

// Enregistre un fichier uploadé en WebP à l'emplacement donné.
// Retourne un message d'erreur (string) en cas d'échec, ou null si ok.
function saveAsWebp(array $file, string $destPath): ?string
{
    $tmpPath = $file['tmp_name'];
    $info = @getimagesize($tmpPath);
    if ($info === false) {
        return "Le fichier \"{$file['name']}\" n'est pas une image valide.";
    }

    // Hébergement sans support WebP dans GD : on copie le fichier tel
    // quel plutôt que d'échouer (mieux qu'une photo manquante).
    if (!function_exists('imagewebp')) {
        return copy($tmpPath, $destPath) ? null : "Impossible d'enregistrer \"{$file['name']}\".";
    }

    $type = $info[2];
    switch ($type) {
        case IMAGETYPE_JPEG:
            $image = @imagecreatefromjpeg($tmpPath);
            break;
        case IMAGETYPE_PNG:
            $image = @imagecreatefrompng($tmpPath);
            break;
        case IMAGETYPE_WEBP:
            $image = @imagecreatefromwebp($tmpPath);
            break;
        case IMAGETYPE_GIF:
            $image = @imagecreatefromgif($tmpPath);
            break;
        default:
            $image = null;
    }

    if ($image === null || $image === false) {
        return copy($tmpPath, $destPath) ? null : "Impossible d'enregistrer \"{$file['name']}\".";
    }

    // Préserve la transparence (PNG/GIF) lors de la conversion.
    imagepalettetotruecolor($image);
    imagealphablending($image, true);
    imagesavealpha($image, true);

    $ok = imagewebp($image, $destPath, 85);
    imagedestroy($image);

    return $ok ? null : "Échec de la conversion WebP pour \"{$file['name']}\".";
}

try {

/* --- Vérifications de base ------------------------------------------- */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(['Méthode non autorisée.'], 405);
}

if (($_POST['access_key'] ?? '') !== ACCESS_KEY) {
    fail(["Clé d'accès invalide."], 403);
}

/* --- Validation des champs -------------------------------------------- */

$requiredText = [
    'pays' => 'Le pays',
    'date' => 'La date de départ',
    'duree' => 'La durée',
    'transport' => 'Le mode de transport',
    'moment1_titre' => 'Le titre du moment fort n°1',
    'moment1_texte' => 'Le texte du moment fort n°1',
    'moment2_titre' => 'Le titre du moment fort n°2',
    'moment2_texte' => 'Le texte du moment fort n°2',
];

$errors = [];
foreach ($requiredText as $field => $label) {
    if (trim((string) ($_POST[$field] ?? '')) === '') {
        $errors[] = "{$label} est obligatoire.";
    }
}

$lat = filter_var($_POST['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$lon = filter_var($_POST['lon'] ?? null, FILTER_VALIDATE_FLOAT);

if ($lat === false || $lat === null) {
    $errors[] = 'La latitude doit être un nombre.';
} elseif ($lat < -90 || $lat > 90) {
    $errors[] = 'La latitude doit être comprise entre -90 et 90.';
}

if ($lon === false || $lon === null) {
    $errors[] = 'La longitude doit être un nombre.';
} elseif ($lon < -180 || $lon > 180) {
    $errors[] = 'La longitude doit être comprise entre -180 et 180.';
}

foreach (['cover_photo' => 'de couverture', 'moment1_photo' => 'du moment fort n°1', 'moment2_photo' => 'du moment fort n°2'] as $fileField => $label) {
    if (!isset($_FILES[$fileField]) || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        $errors[] = "La photo {$label} est obligatoire.";
    }
}

if ($errors) {
    fail($errors);
}

$pays = trim((string) $_POST['pays']);
$id = slugify($pays);
if ($id === '') {
    fail(['Impossible de générer un id à partir du pays saisi.']);
}

/* --- Charge le fichier existant et vérifie les doublons ---------------- */

$voyages = [];
if (is_file(DATA_FILE)) {
    $content = file_get_contents(DATA_FILE);
    $decoded = $content !== false ? json_decode($content, true) : null;
    if (is_array($decoded)) {
        $voyages = $decoded;
    }
}

foreach ($voyages as $voyage) {
    if (($voyage['id'] ?? null) === $id) {
        fail(["Un voyage avec l'id \"{$id}\" existe déjà dans voyages.json."], 409);
    }
}

/* --- Écrit les 3 photos (converties en WebP) ---------------------------- */

if (!is_dir(IMAGES_DIR) && !mkdir(IMAGES_DIR, 0775, true) && !is_dir(IMAGES_DIR)) {
    fail(["Impossible de créer le dossier assets/images/."], 500);
}

$photoFiles = [
    "{$id}-1" => $_FILES['cover_photo'],
    "{$id}-2" => $_FILES['moment1_photo'],
    "{$id}-3" => $_FILES['moment2_photo'],
];

$writtenPaths = [];
foreach ($photoFiles as $baseName => $file) {
    $destPath = IMAGES_DIR . "/{$baseName}.webp";
    $error = saveAsWebp($file, $destPath);
    if ($error !== null) {
        // Nettoie les photos déjà écrites pour cette tentative avant d'abandonner.
        foreach ($writtenPaths as $path) {
            @unlink($path);
        }
        fail([$error], 500);
    }
    $writtenPaths[] = $destPath;
}

/* --- Construit le voyage et réécrit voyages.json ------------------------ */

$duree = trim((string) $_POST['duree']);
$transport = trim((string) $_POST['transport']);

$newVoyage = [
    'id' => $id,
    'pays' => $pays,
    'ordre_depart' => (string) $_POST['date'],
    'duree' => $duree,
    'transport' => $transport,
    'coordonnees' => ['lat' => $lat, 'lon' => $lon],
    'photos' => [
        "assets/images/{$id}-1.webp",
        "assets/images/{$id}-2.webp",
        "assets/images/{$id}-3.webp",
    ],
    'sections' => [
        ['titre' => $pays, 'texte' => buildIntroText((string) $_POST['date'], $duree, $transport)],
        ['titre' => trim((string) $_POST['moment1_titre']), 'texte' => trim((string) $_POST['moment1_texte'])],
        ['titre' => trim((string) $_POST['moment2_titre']), 'texte' => trim((string) $_POST['moment2_texte'])],
    ],
];

// On ajoute le nouveau voyage sans jamais toucher aux voyages existants.
$voyages[] = $newVoyage;

if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0775, true) && !is_dir(DATA_DIR)) {
    foreach ($writtenPaths as $path) {
        @unlink($path);
    }
    fail(['Impossible de créer le dossier data/.'], 500);
}

$json = json_encode($voyages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents(DATA_FILE, $json) === false) {
    foreach ($writtenPaths as $path) {
        @unlink($path);
    }
    fail(["Impossible d'écrire data/voyages.json."], 500);
}

echo json_encode(['success' => true, 'voyage' => $newVoyage], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    fail(["Erreur serveur : {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})"], 500);
}
