<?php
/* =========================================================
   ADMIN — code commun aux endpoints des ARTICLES
   (save-article.php, delete-article.php).

   Même principe que save-voyage.php / delete-voyage.php : session
   obligatoire, réponses toujours en JSON, filet de sécurité contre les
   erreurs PHP fatales. On met tout ça ici pour ne pas le copier-coller
   dans chaque endpoint.

   (save-voyage.php et delete-voyage.php gardent leur propre copie : on
   ne les a volontairement pas modifiés pour ne pas risquer de casser
   la partie « voyages » qui fonctionne déjà.)
   ========================================================= */

declare(strict_types=1);

require __DIR__ . '/auth.php';
requireAdminAuth(true);

header('Content-Type: application/json; charset=utf-8');

// Filet de sécurité : voir save-voyage.php (répond en JSON même en cas
// d'erreur PHP fatale, pour éviter « Unexpected end of JSON input »).
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
define('VOYAGES_FILE', DATA_DIR . '/voyages.json');
define('ARTICLES_DIR', DATA_DIR . '/articles');
define('ARTICLE_IMG_DIR', ROOT_DIR . '/assets/articles');

// Limites de l'article (à modifier ici si le cahier des charges change)
const GALERIE_MIN = 3;   // pas de maximum : la galerie peut contenir autant de photos qu'on veut
const BLOCS_MAX = 20;

function fail(array $errors, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

// Un id valide ressemble à "costa-rica" : minuscules, chiffres, tirets.
// C'est aussi ce qui empêche toute astuce de type "../" dans un chemin.
function isValidId(string $id): bool
{
    return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $id) === 1;
}

/* --- Vérifications communes à tous les endpoints d'article ------------- */
function checkRequestBasics(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail(['Méthode non autorisée.'], 405);
    }

    // Si le corps de la requête dépasse post_max_size, PHP vide $_POST ET
    // $_FILES sans prévenir : on le détecte pour donner un vrai message.
    if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        $limite = ini_get('post_max_size');
        fail(["Les photos sont trop lourdes pour le serveur (limite d'envoi : {$limite}). Réduis leur taille ou enregistre l'article en plusieurs fois."], 413);
    }

    if (!hash_equals(ACCESS_KEY, (string) ($_POST['access_key'] ?? ''))) {
        fail(["Clé d'accès invalide."], 403);
    }
}

/* --- Lecture / écriture JSON ------------------------------------------ */
function readJsonFile(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $content = file_get_contents($path);
    $decoded = $content !== false ? json_decode($content, true) : null;
    return is_array($decoded) ? $decoded : null;
}

// Écriture « atomique » : on écrit dans un fichier temporaire puis on le
// renomme. Si le serveur plante pendant l'écriture, l'ancien fichier reste
// intact au lieu de se retrouver à moitié écrit.
function writeJsonFile(string $path, array $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $json) === false) {
        @unlink($tmp);
        return false;
    }
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/* --- Dossier d'images d'un article ------------------------------------- */
function articleImageDir(string $id): string
{
    return ARTICLE_IMG_DIR . '/' . $id;
}

// Supprime un dossier et son contenu (une seule profondeur suffit ici :
// le dossier d'un article ne contient que des fichiers .webp).
function deleteDirectory(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        $path = $dir . '/' . $entry;
        if (is_dir($path)) {
            deleteDirectory($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}

// Enregistre un fichier uploadé en WebP (1200 px de large maximum),
// exactement comme save-voyage.php. Retourne un message d'erreur ou null.
function saveAsWebp(array $file, string $destPath): ?string
{
    $tmpPath = $file['tmp_name'];
    $info = @getimagesize($tmpPath);
    if ($info === false) {
        return "Le fichier \"{$file['name']}\" n'est pas une image valide.";
    }

    // Hébergement sans WebP dans GD : on copie le fichier tel quel.
    if (!function_exists('imagewebp')) {
        return copy($tmpPath, $destPath) ? null : "Impossible d'enregistrer \"{$file['name']}\".";
    }

    switch ($info[2]) {
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

    $maxWidth = 1200;
    if (imagesx($image) > $maxWidth) {
        $scaled = imagescale($image, $maxWidth);
        if ($scaled !== false) {
            imagedestroy($image);
            $image = $scaled;
        }
    }

    imagepalettetotruecolor($image);
    imagealphablending($image, true);
    imagesavealpha($image, true);

    $ok = imagewebp($image, $destPath, 85);
    imagedestroy($image);

    return $ok ? null : "Échec de la conversion WebP pour \"{$file['name']}\".";
}

// Message lisible pour un code d'erreur d'upload PHP.
function uploadErrorMessage(int $code): string
{
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'photo trop lourde pour le serveur (limite : ' . ini_get('upload_max_filesize') . ')';
        case UPLOAD_ERR_PARTIAL:
            return 'envoi interrompu';
        case UPLOAD_ERR_NO_FILE:
            return 'aucun fichier reçu';
        default:
            return "erreur d'envoi (code {$code})";
    }
}
