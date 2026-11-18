<?php
/* =========================================================
   ADMIN — enregistre (crée ou remplace) l'article d'un pays.

   Reçoit un formulaire multipart :
   - access_key : la clé d'accès admin ;
   - payload    : le texte de l'article en JSON
       { id, titre, intro, hero, galerie: [...], blocs: [{texte, photo}] }
     où chaque photo (hero, éléments de galerie, photo d'un bloc) est :
       { "file": "<clé>" }  → nouvelle photo, envoyée dans le champ "photo_<clé>"
       { "keep": "<chemin>" } → photo déjà enregistrée, qu'on garde telle quelle ;
   - photo_<clé> : les nouvelles photos.

   Résultat :
   - data/articles/<id>.json  (le contenu de l'article)
   - assets/articles/<id>/*.webp  (ses photos, converties en WebP)
   - "article": true ajouté à l'entrée du pays dans data/voyages.json
     (c'est ce qui fait apparaître le lien « Lire l'article » sur l'accueil).
   ========================================================= */

require __DIR__ . '/common.php';

// Enregistre une photo (nouvelle ou conservée) et retourne son chemin
// relatif à la racine du site, ou ajoute une erreur à $errors.
// $kind : "hero", "galerie" ou "bloc" (sert à nommer le fichier).
function resolveSlot($slot, string $kind, string $label, string $id, array &$errors, array &$newPaths, array &$referenced): ?string
{
    if (!is_array($slot)) {
        $errors[] = "{$label} : photo manquante.";
        return null;
    }

    // --- Photo déjà enregistrée : on vérifie que le chemin est bien à nous
    if (isset($slot['keep'])) {
        $path = (string) $slot['keep'];
        // Le chemin doit être EXACTEMENT de la forme assets/articles/<id>/<nom>.webp :
        // impossible de viser un autre dossier ou de remonter avec « ../ ».
        $pattern = '#^assets/articles/' . preg_quote($id, '#') . '/[a-z0-9-]+\.webp$#';
        if (preg_match($pattern, $path) !== 1 || !is_file(ROOT_DIR . '/' . $path)) {
            $errors[] = "{$label} : la photo existante est introuvable (ré-envoie-la).";
            return null;
        }
        $referenced[$path] = true;
        return $path;
    }

    // --- Nouvelle photo : cherchée dans $_FILES
    $key = (string) ($slot['file'] ?? '');
    if (preg_match('/^[a-z0-9_]+$/', $key) !== 1) {
        $errors[] = "{$label} : photo manquante.";
        return null;
    }
    $file = $_FILES['photo_' . $key] ?? null;
    if ($file === null || !is_array($file) || !isset($file['error'])) {
        $errors[] = "{$label} : photo manquante.";
        return null;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = "{$label} : " . uploadErrorMessage((int) $file['error']) . '.';
        return null;
    }

    $name = $kind . '-' . bin2hex(random_bytes(4)) . '.webp';
    $dest = articleImageDir($id) . '/' . $name;
    $error = saveAsWebp($file, $dest);
    if ($error !== null) {
        $errors[] = "{$label} : {$error}";
        return null;
    }
    $newPaths[] = $dest;
    $relative = "assets/articles/{$id}/{$name}";
    $referenced[$relative] = true;
    return $relative;
}

$newPaths = [];   // fichiers créés pendant CET enregistrement (à supprimer si ça échoue)

try {

checkRequestBasics();

/* --- Lecture du payload ------------------------------------------------ */

$payload = json_decode((string) ($_POST['payload'] ?? ''), true);
if (!is_array($payload)) {
    fail(["Les données de l'article sont illisibles."]);
}

$id = (string) ($payload['id'] ?? '');
if (!isValidId($id)) {
    fail(["Identifiant du pays invalide."]);
}

$voyages = readJsonFile(VOYAGES_FILE);
if ($voyages === null) {
    fail(['Impossible de lire data/voyages.json.'], 500);
}
$voyageIndex = null;
foreach ($voyages as $i => $voyage) {
    if (($voyage['id'] ?? null) === $id) {
        $voyageIndex = $i;
        break;
    }
}
if ($voyageIndex === null) {
    fail(["Aucun voyage avec l'id \"{$id}\" : crée d'abord le voyage, puis son article."], 404);
}

/* --- Validation des textes -------------------------------------------- */

$errors = [];

$titre = trim((string) ($payload['titre'] ?? ''));
$intro = trim((string) ($payload['intro'] ?? ''));
if ($titre === '') {
    $errors[] = "Le titre de l'article est obligatoire.";
} elseif (mb_strlen($titre) > 120) {
    $errors[] = 'Le titre est trop long (120 caractères maximum).';
}
if ($intro === '') {
    $errors[] = "Le texte d'introduction est obligatoire.";
} elseif (mb_strlen($intro) > 3000) {
    $errors[] = "Le texte d'introduction est trop long (3000 caractères maximum).";
}

$galerie = $payload['galerie'] ?? null;
if (!is_array($galerie) || count($galerie) < GALERIE_MIN || count($galerie) > GALERIE_MAX) {
    $errors[] = 'La galerie doit contenir entre ' . GALERIE_MIN . ' et ' . GALERIE_MAX . ' photos.';
    $galerie = [];
}

$blocs = $payload['blocs'] ?? [];
if (!is_array($blocs) || count($blocs) > BLOCS_MAX) {
    $errors[] = 'Un article peut contenir ' . BLOCS_MAX . ' blocs texte + photo au maximum.';
    $blocs = [];
}
foreach ($blocs as $i => $bloc) {
    $n = $i + 1;
    $texte = is_array($bloc) ? trim((string) ($bloc['texte'] ?? '')) : '';
    if ($texte === '') {
        $errors[] = "Bloc n°{$n} : le texte est obligatoire.";
    } elseif (mb_strlen($texte) > 5000) {
        $errors[] = "Bloc n°{$n} : texte trop long (5000 caractères maximum).";
    }
}

// Erreurs de texte : on s'arrête là, avant de toucher au moindre fichier.
if ($errors) {
    fail($errors);
}

/* --- Photos : nouvelles (converties en WebP) ou conservées -------------- */

$imgDir = articleImageDir($id);
if (!is_dir($imgDir) && !mkdir($imgDir, 0775, true) && !is_dir($imgDir)) {
    fail(["Impossible de créer le dossier des photos de l'article."], 500);
}

$referenced = [];   // chemins des photos que l'article utilisera (pour nettoyer le reste)

$heroPath = resolveSlot($payload['hero'] ?? null, 'hero', 'Photo du haut de page', $id, $errors, $newPaths, $referenced);

$galeriePaths = [];
foreach ($galerie as $i => $slot) {
    $p = resolveSlot($slot, 'galerie', 'Galerie, photo n°' . ($i + 1), $id, $errors, $newPaths, $referenced);
    if ($p !== null) {
        $galeriePaths[] = $p;
    }
}

$blocsOut = [];
foreach ($blocs as $i => $bloc) {
    $n = $i + 1;
    $p = resolveSlot(is_array($bloc) ? ($bloc['photo'] ?? null) : null, 'bloc', "Bloc n°{$n}", $id, $errors, $newPaths, $referenced);
    $blocsOut[] = ['texte' => trim((string) ($bloc['texte'] ?? '')), 'photo' => $p];
}

if ($errors) {
    foreach ($newPaths as $path) {
        @unlink($path);
    }
    @rmdir($imgDir);   // retire le dossier s'il vient d'être créé et reste vide (sans effet sinon)
    fail($errors);
}

/* --- Écriture de l'article, puis du drapeau dans voyages.json ----------- */

$article = [
    'id' => $id,
    'titre' => $titre,
    'intro' => $intro,
    'hero' => $heroPath,
    'galerie' => $galeriePaths,
    'blocs' => $blocsOut,
];

if (!writeJsonFile(ARTICLES_DIR . "/{$id}.json", $article)) {
    foreach ($newPaths as $path) {
        @unlink($path);
    }
    fail(["Impossible d'écrire data/articles/{$id}.json."], 500);
}

if (empty($voyages[$voyageIndex]['article'])) {
    $voyages[$voyageIndex]['article'] = true;
    if (!writeJsonFile(VOYAGES_FILE, $voyages)) {
        fail(["L'article est enregistré mais data/voyages.json n'a pas pu être mis à jour (le lien n'apparaîtra pas sur l'accueil)."], 500);
    }
}

// Ménage : supprime les anciennes photos que l'article n'utilise plus
// (photo remplacée, photo retirée de la galerie, bloc supprimé…).
foreach (scandir($imgDir) ?: [] as $entry) {
    if ($entry === '.' || $entry === '..') {
        continue;
    }
    if (!isset($referenced["assets/articles/{$id}/{$entry}"])) {
        @unlink($imgDir . '/' . $entry);
    }
}

echo json_encode(['success' => true, 'article' => $article], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    foreach ($newPaths as $path) {
        @unlink($path);
    }
    fail(["Erreur serveur : {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})"], 500);
}
