<?php
/* =========================================================
   ADMIN — supprime l'article d'un pays (mais PAS le voyage).

   Retire data/articles/<id>.json, le dossier assets/articles/<id>/
   et le drapeau "article" de l'entrée du pays dans voyages.json
   (le lien « Lire l'article » disparaît alors de l'accueil).
   ========================================================= */

require __DIR__ . '/common.php';

try {

checkRequestBasics();

$id = trim((string) ($_POST['id'] ?? ''));
if (!isValidId($id)) {
    fail(['Identifiant du pays invalide.']);
}

$voyages = readJsonFile(VOYAGES_FILE);
if ($voyages === null) {
    fail(['Impossible de lire data/voyages.json.'], 500);
}

$found = false;
foreach ($voyages as $i => $voyage) {
    if (($voyage['id'] ?? null) === $id) {
        unset($voyages[$i]['article']);
        $found = true;
        break;
    }
}
if (!$found) {
    fail(["Aucun voyage avec l'id \"{$id}\" n'a été trouvé."], 404);
}

// D'abord le drapeau (pour que le lien disparaisse même si un fichier résiste),
// puis le JSON de l'article et ses photos.
if (!writeJsonFile(VOYAGES_FILE, $voyages)) {
    fail(["Impossible d'écrire data/voyages.json."], 500);
}
@unlink(ARTICLES_DIR . "/{$id}.json");
deleteDirectory(articleImageDir($id));

echo json_encode(['success' => true, 'id' => $id], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    fail(["Erreur serveur : {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})"], 500);
}
