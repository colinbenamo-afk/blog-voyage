<?php
require __DIR__ . '/auth.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = (string) ($_POST['password'] ?? '');
    if (password_verify($password, ADMIN_PASS_HASH)) {
        $_SESSION['admin_authenticated'] = true;
        header('Location: admin.php');
        exit;
    }
    $error = 'Mot de passe incorrect.';
}

// Déjà connecté : inutile de montrer le formulaire.
if (isAdminAuthenticated()) {
    header('Location: admin.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Connexion admin</title>

  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://api.fontshare.com/v2/css?f[]=expose@400,500,700&f[]=bespoke-sans@400,500,700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">

  <a class="admin-back" href="../index.html">← Retour au site</a>

  <h1 class="admin-title">Connexion admin</h1>
  <p class="admin-intro">Page protégée. Entre le mot de passe pour accéder au formulaire d'ajout de voyage.</p>

  <form method="post" class="admin-panel">
    <div class="field">
      <label for="password">Mot de passe</label>
      <input type="password" id="password" name="password" autocomplete="current-password" autofocus required>
    </div>

    <?php if ($error !== null): ?>
      <p class="status-line is-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>

    <button type="submit">Se connecter</button>
  </form>

</body>
</html>
