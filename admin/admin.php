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
  <title>Admin — Gérer les voyages et les articles</title>

  <!-- Mêmes polices que le site public -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/fonts/fonts.css">


  <!-- style.css fournit les variables de couleurs/police du site ; admin.css
       ne contient que la mise en page propre au formulaire (non lié au reste). -->
  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">

  <a class="admin-back" href="../index.html">← Retour au site</a>

  <h1 class="admin-title">Gérer les voyages</h1>
  <p class="admin-intro">
    Outil interne pour ajouter ou supprimer un voyage dans <code>data/voyages.json</code>
    et ses photos dans <code>assets/images/</code>, et pour écrire l'article de chaque pays
    (<code>data/articles/</code>), sans éditeur de code. Passe par
    <code>save-voyage.php</code>, <code>delete-voyage.php</code>, <code>save-article.php</code> et
    <code>delete-article.php</code> côté serveur (fonctionne sur n'importe quel hébergement PHP).
    Cette page n'est pas liée depuis le site public.
  </p>

  <!-- ============================================ -->
  <!-- VOYAGES EXISTANTS (liste + suppression)       -->
  <!-- ============================================ -->
  <section class="admin-panel">
    <h2>Voyages existants</h2>
    <p class="admin-intro" style="margin-bottom: 1rem;">
      « Créer l'article » / « Modifier l'article » ouvre l'éditeur de l'article du pays.
      Supprimer un voyage retire son entrée de <code>data/voyages.json</code>,
      ses photos dans <code>assets/images/</code> et son article. Irréversible.
    </p>
    <div class="field">
      <label for="delete-access-key">Clé d'accès admin</label>
      <input type="password" id="delete-access-key" name="delete-access-key" autocomplete="off">
    </div>
    <ul id="voyage-list" class="voyage-list"></ul>
    <p id="delete-status-line" class="status-line hidden"></p>
  </section>

  <!-- ============================================ -->
  <!-- ÉDITEUR D'ARTICLE (caché tant qu'on n'a pas    -->
  <!-- cliqué sur « Créer/Modifier l'article »)       -->
  <!-- Tout le contenu dynamique est généré par       -->
  <!-- admin-article.js                               -->
  <!-- ============================================ -->
  <section id="article-panel" class="admin-panel hidden">
    <h2 id="article-heading">Article</h2>
    <p class="admin-intro" style="margin-bottom: 1rem;">
      L'article s'affiche sur <code>pays.html</code>. Les photos sont réduites puis converties en WebP
      automatiquement. Dans les textes, une ligne vide crée un nouveau paragraphe.
    </p>

    <div class="field">
      <label for="article-access-key">Clé d'accès admin</label>
      <input type="password" id="article-access-key" autocomplete="off">
    </div>

    <div class="field">
      <label for="article-titre">Titre de l'article (affiché en grand en haut de la page)</label>
      <input type="text" id="article-titre" maxlength="120">
    </div>

    <div class="field">
      <label for="article-intro">Texte d'introduction (au-dessus de la rangée de photos)</label>
      <textarea id="article-intro"></textarea>
    </div>

    <h3 class="article-subheading">Photo du haut de page</h3>
    <div id="article-hero"></div>

    <h3 class="article-subheading">Galerie (3 à 7 photos, la photo du milieu est mise en avant)</h3>
    <div id="article-galerie"></div>
    <button type="button" id="article-galerie-add" class="btn-secondary">+ Ajouter une photo</button>

    <h3 class="article-subheading">Blocs texte + photo (le côté de la photo alterne tout seul)</h3>
    <div id="article-blocs"></div>
    <button type="button" id="article-bloc-add" class="btn-secondary">+ Ajouter un bloc</button>

    <p id="article-photo-count" class="photo-count"></p>

    <ul id="article-error-list" class="error-list hidden"></ul>
    <p id="article-status-line" class="status-line hidden"></p>

    <div class="article-actions">
      <button type="button" id="article-save">Enregistrer l'article</button>
      <button type="button" id="article-close" class="btn-secondary">Fermer</button>
      <button type="button" id="article-delete" class="voyage-delete-btn hidden">Supprimer l'article</button>
    </div>
  </section>

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
        <label for="annee">Année du voyage</label>
        <input type="number" id="annee" name="annee" min="1900" max="2100" step="1" placeholder="ex : 2026" required>
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
  <script src="admin-article.js"></script>
</body>
</html>
