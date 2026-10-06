<?php
require __DIR__ . '/auth.php';
requireAdminAuth();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin — Ajouter un voyage</title>

  <!-- Mêmes polices que le site public -->
  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://api.fontshare.com/v2/css?f[]=expose@400,500,700&f[]=bespoke-sans@400,500,700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">


  <!-- style.css fournit les variables de couleurs/police du site ; admin.css
       ne contient que la mise en page propre au formulaire (non lié au reste). -->
  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">

  <a class="admin-back" href="../index.html">← Retour au site</a>

  <h1 class="admin-title">Ajouter un voyage</h1>
  <p class="admin-intro">
    Outil interne pour ajouter un voyage à <code>data/voyages.json</code> et ses
    photos dans <code>assets/images/</code>, sans éditeur de code. L'enregistrement
    passe par <code>save-voyage.php</code> côté serveur (fonctionne sur n'importe
    quel hébergement PHP). Cette page n'est pas liée depuis le site public.
  </p>

  <!-- ============================================ -->
  <!-- FORMULAIRE DU VOYAGE                          -->
  <!-- ============================================ -->
  <form id="voyage-form" class="admin-panel" novalidate>
    <h2>Accès</h2>
    <div class="field">
      <label for="access-key">Clé d'accès admin</label>
      <input type="password" id="access-key" name="access-key" autocomplete="off" required>
    </div>

    <h2>Informations du voyage</h2>

    <div class="field">
      <label for="pays">Pays / destination</label>
      <input type="text" id="pays" name="pays" required>
      <span class="id-preview">id : <strong id="id-preview">—</strong></span>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="date">Date de départ</label>
        <input type="date" id="date" name="date" required>
      </div>
      <div class="field">
        <label for="duree">Durée</label>
        <input type="text" id="duree" name="duree" placeholder="ex : 6 semaines" required>
      </div>
    </div>

    <div class="field">
      <label for="transport">Mode de transport</label>
      <select id="transport" name="transport" required>
        <option value="" disabled selected>Choisir…</option>
        <option value="sac à dos">Sac à dos</option>
        <option value="vélo">Vélo</option>
        <option value="voilier">Voilier</option>
        <option value="van">Van</option>
        <option value="autre">Autre</option>
      </select>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="lat">Latitude</label>
        <input type="number" id="lat" name="lat" step="any" required>
      </div>
      <div class="field">
        <label for="lon">Longitude</label>
        <input type="number" id="lon" name="lon" step="any" required>
      </div>
    </div>

    <div class="field">
      <label for="cover-photo">Photo de couverture (fiche pratique)</label>
      <input type="file" id="cover-photo" name="cover-photo" accept="image/*" required>
    </div>

    <h2 class="admin-subheading">Moment fort n°1</h2>
    <div class="field">
      <label for="moment1-titre">Titre</label>
      <input type="text" id="moment1-titre" name="moment1-titre" required>
    </div>
    <div class="field">
      <label for="moment1-texte">Texte</label>
      <textarea id="moment1-texte" name="moment1-texte" required></textarea>
    </div>
    <div class="field">
      <label for="moment1-photo">Photo</label>
      <input type="file" id="moment1-photo" name="moment1-photo" accept="image/*" required>
    </div>

    <h2 class="admin-subheading">Moment fort n°2</h2>
    <div class="field">
      <label for="moment2-titre">Titre</label>
      <input type="text" id="moment2-titre" name="moment2-titre" required>
    </div>
    <div class="field">
      <label for="moment2-texte">Texte</label>
      <textarea id="moment2-texte" name="moment2-texte" required></textarea>
    </div>
    <div class="field">
      <label for="moment2-photo">Photo</label>
      <input type="file" id="moment2-photo" name="moment2-photo" accept="image/*" required>
    </div>

    <ul id="error-list" class="error-list hidden"></ul>
    <p id="status-line" class="status-line hidden"></p>

    <button type="submit" id="submit-btn">Enregistrer</button>
  </form>

  <script src="admin.js"></script>
</body>
</html>
