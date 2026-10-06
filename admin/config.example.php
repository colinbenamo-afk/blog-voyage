<?php
/* =========================================================
   Gabarit de admin/config.php — ce fichier-ci EST commité dans
   git, mais ne contient aucun vrai secret.

   Pour déployer : copier ce fichier en "config.php" (à côté), et
   remplir les vraies valeurs. config.php est ignoré par git
   (.gitignore), donc les secrets ne sont jamais poussés sur GitHub.

   Pour générer admin_pass_hash à partir d'un mot de passe :
   php -r "echo password_hash('TON_MOT_DE_PASSE', PASSWORD_BCRYPT), PHP_EOL;"
   ========================================================= */

return [
    'access_key' => 'change-moi',
    'admin_pass_hash' => '$2y$...',
];
