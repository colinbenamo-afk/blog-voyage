<?php
/* =========================================================
   ADMIN — authentification par session, en PHP pur.

   Remplace la popup "Basic Auth" du navigateur (confuse : elle
   demandait un nom d'utilisateur en plus du mot de passe, et
   ressemblait à un login de compte, pas à un mot de passe de site)
   par une vraie page de connexion (login.php) avec juste un champ
   mot de passe. Une fois connecté, la session PHP retient l'accès
   pour la durée de la visite du navigateur.

   Inclus tout en haut de admin.php ET de save-voyage.php : les deux
   appellent requireAdminAuth() juste après, impossible de contourner
   la page en appelant save-voyage.php directement.
   ========================================================= */

session_start();

// Secrets chargés depuis config.php, volontairement hors de git (voir
// .gitignore et config.example.php) pour pouvoir publier ce dépôt sur
// un repo GitHub public sans exposer le mot de passe / son hash.
$adminConfigPath = __DIR__ . '/config.php';
if (!is_file($adminConfigPath)) {
    http_response_code(500);
    exit('Configuration manquante : copie admin/config.example.php vers admin/config.php et remplis tes identifiants.');
}
$adminConfig = require $adminConfigPath;

// Hash bcrypt du mot de passe (jamais le mot de passe en clair),
// vérifiable avec password_verify() en PHP.
define('ADMIN_PASS_HASH', $adminConfig['admin_pass_hash']);

function isAdminAuthenticated(): bool
{
    return $_SESSION['admin_authenticated'] ?? false;
}

// $asJson : true pour save-voyage.php (appelé en fetch/AJAX, doit
// répondre en JSON) ; false pour admin.php (page normale, on
// redirige vers le formulaire de connexion).
function requireAdminAuth(bool $asJson = false): void
{
    if (isAdminAuthenticated()) {
        return;
    }

    if ($asJson) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['Session expirée : reconnecte-toi sur la page admin.']]);
        exit;
    }

    header('Location: login.php');
    exit;
}
