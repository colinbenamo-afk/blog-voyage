<?php
/* =========================================================
   ADMIN — modifier un voyage EXISTANT (page d'accueil).

   Reçoit le formulaire « Modifier le voyage » (FormData) : tous les textes,
   plus, seulement si on les a changées, les 3 photos du voyage. Met à jour
   l'entrée du voyage dans data/voyages.json.

   - L'id du voyage ne change jamais (il sert de lien vers l'article et de
     nom de dossier) : on peut renommer le pays sans rien casser.
   - Une photo remplacée reçoit un NOUVEAU nom de fichier : sinon le
     navigateur garderait l'ancienne photo en cache. L'ancien fichier est
     supprimé s'il n'est plus utilisé.
   - Les champs qu'on ne gère pas ici (ex : "article": true) sont conservés.

   Les fonctions communes (session, JSON, WebP…) viennent de common.php,
   comme pour save-article.php.
   ========================================================= */

declare(strict_types=1);

require __DIR__ . '/common.php';

define('IMAGES_DIR', ROOT_DIR . '/assets/images');

// Texte de la fiche pratique quand on n'en écrit pas un soi-même,
// ex : "En 2026, 3 jours en van." (même formule que save-voyage.php)
function buildIntroText(int $annee, string $duree, string $transport): string
{
    return "En {$annee}, {$duree} en {$transport}.";
}

try {

checkRequestBasics();

$id = trim((string) ($_POST['id'] ?? ''));
if (!isValidId($id)) {
    fail(['Identifiant du voyage invalide.']);
}

$voyages = readJsonFile(VOYAGES_FILE);
if ($voyages === null) {
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

/* --- Validation des champs -------------------------------------------- */
$champ = fn (string $nom): string => trim((string) ($_POST[$nom] ?? ''));

$errors = [];
$obligatoires = [
    'pays' => 'Le pays',
    'duree' => 'La durée',
    'transport' => 'Le mode de transport',
    'moment1_titre' => 'Le titre du moment fort n°1',
    'moment1_texte' => 'Le texte du moment fort n°1',
    'moment2_titre' => 'Le titre du moment fort n°2',
    'moment2_texte' => 'Le texte du moment fort n°2',
];
foreach ($obligatoires as $nom => $libelle) {
    if ($champ($nom) === '') {
        $errors[] = "{$libelle} est obligatoire.";
    }
}

$annee = filter_var($_POST['annee'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1900, 'max_range' => 2100]]);
if ($annee === false || $annee === null) {
    $errors[] = "L'année du voyage doit être une année valide (ex : 2026).";
}

$lat = filter_var($_POST['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$lon = filter_var($_POST['lon'] ?? null, FILTER_VALIDATE_FLOAT);
if ($lat === false || $lat === null || $lat < -90 || $lat > 90) {
    $errors[] = 'La latitude doit être un nombre compris entre -90 et 90.';
}
if ($lon === false || $lon === null || $lon < -180 || $lon > 180) {
    $errors[] = 'La longitude doit être un nombre compris entre -180 et 180.';
}

// Photos : facultatives (si on n'en envoie pas, on garde l'actuelle)
$champsPhotos = ['cover_photo' => 0, 'moment1_photo' => 1, 'moment2_photo' => 2];
$libellesPhotos = ['cover_photo' => 'de couverture', 'moment1_photo' => 'du moment fort n°1', 'moment2_photo' => 'du moment fort n°2'];
$aEnregistrer = [];
foreach ($champsPhotos as $nom => $numero) {
    $fichier = $_FILES[$nom] ?? null;
    $code = is_array($fichier) ? (int) ($fichier['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
    if ($code === UPLOAD_ERR_NO_FILE) {
        continue;
    }
    if ($code !== UPLOAD_ERR_OK) {
        $errors[] = "La photo {$libellesPhotos[$nom]} : " . uploadErrorMessage($code) . '.';
        continue;
    }
    $aEnregistrer[$numero] = $fichier;
}

if ($errors) {
    fail($errors);
}

/* --- Écrit les nouvelles photos (nom unique, WebP) ---------------------- */
if (!is_dir(IMAGES_DIR) && !mkdir(IMAGES_DIR, 0775, true) && !is_dir(IMAGES_DIR)) {
    fail(['Impossible de créer le dossier assets/images/.'], 500);
}

$nouveauxChemins = [];   // numéro de photo => chemin relatif
$fichiersEcrits = [];    // chemins complets (pour nettoyer en cas d'échec)
foreach ($aEnregistrer as $numero => $fichier) {
    $nom = $id . '-' . ($numero + 1) . '-' . bin2hex(random_bytes(4)) . '.webp';
    $erreur = saveAsWebp($fichier, IMAGES_DIR . '/' . $nom);
    if ($erreur !== null) {
        foreach ($fichiersEcrits as $chemin) {
            @unlink($chemin);
        }
        fail([$erreur], 500);
    }
    $fichiersEcrits[] = IMAGES_DIR . '/' . $nom;
    $nouveauxChemins[$numero] = 'assets/images/' . $nom;
}

/* --- Met à jour l'entrée du voyage ------------------------------------- */
$v = $voyages[$index];
$ancienPays = (string) ($v['pays'] ?? '');
$pays = $champ('pays');
$duree = $champ('duree');
$transport = $champ('transport');

$v['pays'] = $pays;
$v['annee'] = $annee;
$v['duree'] = $duree;
$v['transport'] = $transport;
$v['coordonnees'] = ['lat' => $lat, 'lon' => $lon];

$photos = array_values((array) ($v['photos'] ?? []));
$anciennesPhotos = [];
foreach ($nouveauxChemins as $numero => $chemin) {
    if (isset($photos[$numero])) {
        $anciennesPhotos[] = (string) $photos[$numero];
    }
    $photos[$numero] = $chemin;
}
ksort($photos);
$v['photos'] = array_values($photos);

$sections = array_values((array) ($v['sections'] ?? []));
while (count($sections) < 3) {
    $sections[] = ['titre' => '', 'texte' => ''];
}
// Le titre du premier bloc suit le pays, sauf s'il avait été personnalisé à la main
$titreFiche = (string) ($sections[0]['titre'] ?? '');
$sections[0]['titre'] = ($titreFiche === '' || $titreFiche === $ancienPays) ? $pays : $titreFiche;
$introTexte = $champ('intro_texte');
$sections[0]['texte'] = $introTexte !== '' ? $introTexte : buildIntroText($annee, $duree, $transport);
$sections[1]['titre'] = $champ('moment1_titre');
$sections[1]['texte'] = $champ('moment1_texte');
$sections[2]['titre'] = $champ('moment2_titre');
$sections[2]['texte'] = $champ('moment2_texte');
$v['sections'] = $sections;

$voyages[$index] = $v;

if (!writeJsonFile(VOYAGES_FILE, $voyages)) {
    foreach ($fichiersEcrits as $chemin) {
        @unlink($chemin);
    }
    fail(["Impossible d'écrire data/voyages.json."], 500);
}

/* --- Supprime les anciennes photos devenues inutiles -------------------- */
// Seulement si plus aucun voyage ne les utilise, et seulement un .webp du
// dossier assets/images/ (jamais un chemin « piégé »).
$utilisees = [];
foreach ($voyages as $x) {
    foreach ((array) ($x['photos'] ?? []) as $p) {
        $utilisees[(string) $p] = true;
    }
}
foreach ($anciennesPhotos as $p) {
    if (isset($utilisees[$p]) || preg_match('#^assets/images/[A-Za-z0-9._-]+\.webp$#', $p) !== 1) {
        continue;
    }
    @unlink(ROOT_DIR . '/' . $p);
}

echo json_encode(['success' => true, 'voyage' => $v], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    fail(["Erreur serveur : {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})"], 500);
}
