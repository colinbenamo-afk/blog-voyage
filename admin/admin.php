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
    Ici, tu ajoutes un voyage, tu écris l'article d'un pays ou tu supprimes un voyage,
    sans toucher au code. Les changements s'appliquent directement au site.
    Cette page n'est pas liée depuis le site public.
  </p>

  <!-- ============================================ -->
  <!-- VOYAGES EXISTANTS (liste + suppression)       -->
  <!-- ============================================ -->
  <section class="admin-panel">
    <h2>Voyages existants</h2>
    <p class="admin-intro">
      « Créer l'article » ou « Modifier l'article » ouvre l'éditeur de l'article du pays.
      Attention : supprimer un voyage supprime aussi ses photos et son article, et c'est irréversible.
    </p>
    <div class="field">
      <label for="delete-access-key">Clé d'accès admin</label>
      <input type="password" id="delete-access-key" name="delete-access-key" autocomplete="off">
    </div>
    <ul id="voyage-list" class="voyage-list"></ul>
    <p id="delete-status-line" class="status-line hidden"></p>
  </section>

  <!-- ============================================ -->
  <!-- MODIFIER UN VOYAGE (caché tant qu'on n'a pas   -->
  <!-- cliqué sur « Modifier le voyage »)             -->
  <!-- Rempli et géré par admin-voyage.js             -->
  <!-- ============================================ -->
  <section id="voyage-edit-panel" class="admin-panel hidden">
    <h2 id="voyage-edit-heading">Modifier le voyage</h2>
    <p class="admin-intro">
      Change ce que tu veux : ce que tu ne touches pas reste comme avant.
      L'article du pays se modifie avec « Modifier l'article ».
    </p>

    <div class="field">
      <label for="ve-key">Clé d'accès admin</label>
      <input type="password" id="ve-key" autocomplete="off">
    </div>

    <h3 class="admin-subheading">Informations du voyage</h3>
    <div class="field">
      <label for="ve-pays">Pays / destination</label>
      <input type="text" id="ve-pays">
      <span class="id-preview">id (ne change jamais, même si tu renommes le pays) : <strong id="ve-id">—</strong></span>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ve-annee">Année du voyage</label>
        <input type="number" id="ve-annee" min="1900" max="2100" step="1">
      </div>
      <div class="field">
        <label for="ve-duree">Durée</label>
        <input type="text" id="ve-duree" placeholder="ex : 6 semaines">
      </div>
    </div>
    <div class="field">
      <label for="ve-transport">Mode de transport</label>
      <select id="ve-transport">
        <option value="" disabled>Choisir…</option>
        <option value="sac à dos">Sac à dos</option>
        <option value="vélo">Vélo</option>
        <option value="voilier">Voilier</option>
        <option value="van">Van</option>
        <option value="autre">Autre</option>
      </select>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="ve-lat">Latitude</label>
        <input type="number" id="ve-lat" step="any">
      </div>
      <div class="field">
        <label for="ve-lon">Longitude</label>
        <input type="number" id="ve-lon" step="any">
      </div>
    </div>

    <h3 class="admin-subheading">Texte et photo du pays (premier écran)</h3>
    <div class="field">
      <label for="ve-intro">Texte affiché sous le nom du pays (vide = « En 2026, 6 semaines en van. »)</label>
      <textarea id="ve-intro"></textarea>
    </div>
    <div id="ve-photo-0"></div>

    <h3 class="admin-subheading">Moment fort n°1</h3>
    <div class="field">
      <label for="ve-m1-titre">Titre</label>
      <input type="text" id="ve-m1-titre">
    </div>
    <div class="field">
      <label for="ve-m1-texte">Texte</label>
      <textarea id="ve-m1-texte"></textarea>
    </div>
    <div id="ve-photo-1"></div>

    <h3 class="admin-subheading">Moment fort n°2</h3>
    <div class="field">
      <label for="ve-m2-titre">Titre</label>
      <input type="text" id="ve-m2-titre">
    </div>
    <div class="field">
      <label for="ve-m2-texte">Texte</label>
      <textarea id="ve-m2-texte"></textarea>
    </div>
    <div id="ve-photo-2"></div>

    <ul id="ve-error-list" class="error-list hidden"></ul>
    <p id="ve-status-line" class="status-line hidden"></p>

    <div class="article-actions">
      <button type="button" id="ve-save">Enregistrer les modifications</button>
      <button type="button" id="ve-close" class="btn-secondary">Fermer</button>
    </div>
  </section>

  <!-- ============================================ -->
  <!-- ÉDITEUR D'ARTICLE (caché tant qu'on n'a pas    -->
  <!-- cliqué sur « Créer/Modifier l'article »)       -->
  <!-- Tout le contenu dynamique est généré par       -->
  <!-- admin-article.js                               -->
  <!-- ============================================ -->
  <section id="article-panel" class="admin-panel hidden">
    <h2 id="article-heading">Article</h2>
    <p class="admin-intro">
      Les photos sont réduites et converties automatiquement. Dans les textes,
      une ligne vide crée un nouveau paragraphe.
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

    <h3 class="article-subheading">Galerie (3 photos minimum, autant que tu veux ; le carrousel s'ouvre sur la photo du milieu)</h3>
    <!-- Zone de dépôt : on peut y glisser plusieurs photos ou un dossier entier -->
    <div id="article-galerie-drop" class="dropzone" tabindex="0" role="button">
      Glisse ici tes photos ou un dossier entier<br>
      <span class="dropzone-hint">ou clique pour choisir plusieurs photos</span>
      <input type="file" id="article-galerie-files" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
    </div>
    <p id="article-galerie-msg" class="status-line hidden"></p>
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
    <h2>Ajouter un voyage</h2>
    <div class="field">
      <label for="access-key">Clé d'accès admin</label>
      <input type="password" id="access-key" name="access-key" autocomplete="off" required>
    </div>

    <h3 class="admin-subheading">Informations du voyage</h3>

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

    <h3 class="admin-subheading">Moment fort n°1</h3>
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

    <h3 class="admin-subheading">Moment fort n°2</h3>
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
  <script src="admin-voyage.js"></script>
</body>
</html>
