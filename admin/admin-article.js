/* =========================================================
   ADMIN — éditeur d'ARTICLE d'un pays

   S'ouvre avec le bouton « Créer l'article » / « Modifier l'article » de
   la liste « Voyages existants » (voir loadVoyageList dans admin.js).

   Principe : l'article est gardé dans un objet JavaScript (`state`) et la
   page est redessinée à partir de lui (renderAll). Chaque photo est un
   « emplacement » (slot) qui contient SOIT une photo déjà enregistrée
   ({ keep: "assets/articles/…webp" }), SOIT un nouveau fichier choisi par
   l'utilisateur ({ file, previewUrl }).

   À l'enregistrement, tout part en une seule requête vers save-article.php :
   le texte en JSON + les nouvelles photos (réduites au passage, pour ne
   pas dépasser la limite d'envoi du serveur). Le PHP les convertit en WebP.
   ========================================================= */
(function () {
  'use strict';

  const GALERIE_MIN = 3;
  const NOUVELLES_PHOTOS_MAX = 20; // PHP n'accepte par défaut que 20 fichiers par envoi (max_file_uploads)
  const BLOCS_MAX = 20;
  const PHOTOS_CDC = 8;        // minimum de photos demandé par le cahier des charges
  const ENVOI_MAX_COTE = 1600; // côté max (px) des photos avant envoi

  const $ = (id) => document.getElementById(id);
  const panel = $('article-panel');
  const headingEl = $('article-heading');
  const keyInput = $('article-access-key');
  const titreInput = $('article-titre');
  const introInput = $('article-intro');
  const heroHost = $('article-hero');
  const galerieHost = $('article-galerie');
  const blocsHost = $('article-blocs');
  const galerieAddBtn = $('article-galerie-add');
  const dropZone = $('article-galerie-drop');
  const dropInput = $('article-galerie-files');
  const dropMsg = $('article-galerie-msg');
  const blocAddBtn = $('article-bloc-add');
  const countEl = $('article-photo-count');
  const errorListEl = $('article-error-list');
  const statusEl = $('article-status-line');
  const saveBtn = $('article-save');
  const deleteBtn = $('article-delete');
  const closeBtn = $('article-close');

  if (!panel) return;

  let state = null; // { voyage, existe, titre, intro, hero, galerie[], blocs[] }

  /* --- Petits outils ---------------------------------------------------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function slotVide() { return {}; }
  function slotRempli(slot) { return Boolean(slot && (slot.keep || slot.file)); }
  function slotApercu(slot) {
    if (slot.file) return slot.previewUrl;
    if (slot.keep) return `../${slot.keep}`;
    return '';
  }
  function libererSlot(slot) {
    if (slot && slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
  }
  function choisirFichier(slot, file) {
    libererSlot(slot);
    slot.file = file;
    slot.previewUrl = URL.createObjectURL(file);
    delete slot.keep;
  }

  function showErrors(errors) {
    errorListEl.innerHTML = '';
    errors.forEach((msg) => errorListEl.appendChild(el('li', '', msg)));
    errorListEl.classList.toggle('hidden', errors.length === 0);
  }

  function setStatus(html, type) {
    statusEl.innerHTML = html;
    statusEl.className = `status-line ${type ? `is-${type}` : ''}`.trim();
    statusEl.classList.toggle('hidden', !html);
  }

  /* --- Chargement de l'article existant (ou brouillon vide) -------------- */
  async function chargerEtat(voyage) {
    let article = null;
    if (voyage.article) {
      try {
        const res = await fetch(`../data/articles/${encodeURIComponent(voyage.id)}.json`, { cache: 'no-store' });
        if (res.ok) article = await res.json();
      } catch (err) {
        article = null;
      }
    }

    if (article) {
      state = {
        voyage,
        existe: true,
        titre: article.titre || '',
        intro: article.intro || '',
        hero: { keep: article.hero },
        galerie: (article.galerie || []).map((chemin) => ({ keep: chemin })),
        blocs: (article.blocs || []).map((b) => ({ texte: b.texte || '', photo: { keep: b.photo } })),
      };
    } else {
      state = {
        voyage,
        existe: false,
        titre: voyage.pays || voyage.id,
        intro: '',
        hero: slotVide(),
        galerie: [slotVide(), slotVide(), slotVide()],
        blocs: [{ texte: '', photo: slotVide() }, { texte: '', photo: slotVide() }],
      };
    }
  }

  /* --- Affichage --------------------------------------------------------- */

  // Un emplacement photo : miniature + choix du fichier
  function dessinerSlot(slot) {
    const wrap = el('div', 'slot');

    const thumb = el('div', 'slot-thumb');
    const url = slotApercu(slot);
    if (url) {
      const img = el('img');
      img.src = url;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '?';
    }

    const info = el('div', 'slot-info');
    let etat = 'Aucune photo choisie';
    if (slot.file) etat = `Nouvelle photo : ${slot.file.name}`;
    else if (slot.keep) etat = 'Photo actuelle (choisis un fichier pour la remplacer)';
    info.appendChild(el('span', slotRempli(slot) ? 'slot-label' : 'slot-label is-empty', etat));

    const input = el('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      if (input.files[0]) {
        choisirFichier(slot, input.files[0]);
        renderAll();
      }
    });
    info.appendChild(input);

    wrap.appendChild(thumb);
    wrap.appendChild(info);
    return wrap;
  }

  function bouton(texte, titre, onClick, disabled) {
    const b = el('button', 'icon-btn', texte);
    b.type = 'button';
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.disabled = Boolean(disabled);
    b.addEventListener('click', onClick);
    return b;
  }

  function deplacer(tableau, i, delta) {
    const j = i + delta;
    if (j < 0 || j >= tableau.length) return;
    [tableau[i], tableau[j]] = [tableau[j], tableau[i]];
    renderAll();
  }

  function dessinerControles(tableau, i, retirer) {
    const controles = el('div', 'row-controls');
    controles.appendChild(bouton('↑', 'Monter', () => deplacer(tableau, i, -1), i === 0));
    controles.appendChild(bouton('↓', 'Descendre', () => deplacer(tableau, i, 1), i === tableau.length - 1));
    controles.appendChild(bouton('✕', 'Retirer', retirer));
    return controles;
  }

  function renderGalerie() {
    galerieHost.innerHTML = '';
    state.galerie.forEach((slot, i) => {
      const row = el('div', 'row-item');
      row.appendChild(el('span', 'row-num', String(i + 1)));
      row.appendChild(dessinerSlot(slot));
      row.appendChild(dessinerControles(state.galerie, i, () => {
        libererSlot(slot);
        state.galerie.splice(i, 1);
        renderAll();
      }));
      galerieHost.appendChild(row);
    });
  }

  function renderBlocs() {
    blocsHost.innerHTML = '';
    state.blocs.forEach((bloc, i) => {
      const row = el('div', 'row-item row-item--bloc');
      row.appendChild(el('span', 'row-num', String(i + 1)));

      const corps = el('div', 'bloc-corps');
      const area = el('textarea');
      area.value = bloc.texte;
      area.placeholder = 'Texte du bloc (une ligne vide = nouveau paragraphe)';
      area.addEventListener('input', () => { bloc.texte = area.value; });
      corps.appendChild(area);
      corps.appendChild(dessinerSlot(bloc.photo));
      row.appendChild(corps);

      row.appendChild(dessinerControles(state.blocs, i, () => {
        libererSlot(bloc.photo);
        state.blocs.splice(i, 1);
        renderAll();
      }));
      blocsHost.appendChild(row);
    });
    blocAddBtn.disabled = state.blocs.length >= BLOCS_MAX;
  }

  function renderCompteur() {
    const total = 1 + state.galerie.length + state.blocs.length;
    const ok = total >= PHOTOS_CDC;
    countEl.textContent = `Photos dans cet article : ${total} (cahier des charges : ${PHOTOS_CDC} minimum)${ok ? ' ✓' : ''}`;
    countEl.classList.toggle('is-ok', ok);
  }

  function renderAll() {
    headingEl.textContent = `Article : ${state.voyage.pays || state.voyage.id}`;
    deleteBtn.classList.toggle('hidden', !state.existe);

    heroHost.innerHTML = '';
    heroHost.appendChild(dessinerSlot(state.hero));
    renderGalerie();
    renderBlocs();
    renderCompteur();
  }

  /* --- Ouverture / fermeture -------------------------------------------- */
  async function ouvrir(voyage) {
    showErrors([]);
    setStatus('', null);
    dropMsg.classList.add('hidden');
    await chargerEtat(voyage);

    titreInput.value = state.titre;
    introInput.value = state.intro;
    // Réutilise la clé déjà saisie ailleurs dans la page (un champ de moins à retaper)
    if (!keyInput.value) {
      const autre = $('delete-access-key') || $('access-key');
      if (autre && autre.value) keyInput.value = autre.value;
    }

    renderAll();
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fermer() {
    if (state) {
      libererSlot(state.hero);
      state.galerie.forEach(libererSlot);
      state.blocs.forEach((b) => libererSlot(b.photo));
    }
    state = null;
    panel.classList.add('hidden');
    showErrors([]);
    setStatus('', null);
  }

  /* --- Photos : réduction avant envoi ----------------------------------- */

  // Une photo de téléphone pèse souvent 4 à 10 Mo : 15 photos dépasseraient
  // la limite d'envoi du serveur. On la réduit donc dans le navigateur
  // (1600 px max, WebP). Le serveur la ramène ensuite à 1200 px / WebP.
  // En cas de souci (format que le navigateur ne sait pas lire…), on envoie
  // le fichier d'origine tel quel.
  async function reduirePhoto(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const ratio = Math.min(1, ENVOI_MAX_COTE / Math.max(bitmap.width, bitmap.height));
      if (ratio === 1 && file.size < 600 * 1024) {
        bitmap.close();
        return { blob: file, name: file.name };
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const versBlob = (type, qualite) => new Promise((resolve) => canvas.toBlob(resolve, type, qualite));
      let blob = await versBlob('image/webp', 0.85);
      let ext = 'webp';
      if (!blob || blob.type !== 'image/webp') {   // ex. anciens Safari : pas de WebP
        blob = await versBlob('image/jpeg', 0.88);
        ext = 'jpg';
      }
      if (!blob) return { blob: file, name: file.name };
      return { blob, name: `photo.${ext}` };
    } catch (err) {
      return { blob: file, name: file.name };
    }
  }

  /* --- Validation côté navigateur (la vraie est refaite côté PHP) -------- */
  function valider() {
    const erreurs = [];
    if (!keyInput.value) erreurs.push("La clé d'accès est obligatoire.");
    if (!state.titre.trim()) erreurs.push("Le titre de l'article est obligatoire.");
    if (!state.intro.trim()) erreurs.push("Le texte d'introduction est obligatoire.");
    if (!slotRempli(state.hero)) erreurs.push('La photo du haut de page est obligatoire.');
    if (state.galerie.length < GALERIE_MIN) {
      erreurs.push(`La galerie doit contenir au moins ${GALERIE_MIN} photos.`);
    }
    state.galerie.forEach((slot, i) => {
      if (!slotRempli(slot)) erreurs.push(`Galerie : la photo n°${i + 1} n'est pas choisie.`);
    });
    state.blocs.forEach((bloc, i) => {
      if (!bloc.texte.trim()) erreurs.push(`Bloc n°${i + 1} : le texte est obligatoire.`);
      if (!slotRempli(bloc.photo)) erreurs.push(`Bloc n°${i + 1} : la photo n'est pas choisie.`);
    });
    // Une requête ne peut pas contenir plus de NOUVELLES_PHOTOS_MAX fichiers :
    // au-delà, PHP en ignore sans prévenir. On préfère le dire clairement.
    const nouvelles = [state.hero, ...state.galerie, ...state.blocs.map((b) => b.photo)]
      .filter((slot) => slot && slot.file).length;
    if (nouvelles > NOUVELLES_PHOTOS_MAX) {
      erreurs.push(`${nouvelles} nouvelles photos à envoyer : le serveur en accepte ${NOUVELLES_PHOTOS_MAX} au maximum par enregistrement. Enregistre l'article maintenant, puis rouvre-le avec « Modifier l'article » pour ajouter les autres.`);
    }
    return erreurs;
  }

  /* --- Enregistrement ---------------------------------------------------- */
  async function enregistrer() {
    showErrors([]);
    setStatus('', null);

    const erreurs = valider();
    if (erreurs.length) {
      showErrors(erreurs);
      return;
    }

    saveBtn.disabled = true;
    deleteBtn.disabled = true;
    setStatus('Préparation des photos…', null);

    try {
      const body = new FormData();
      body.append('access_key', keyInput.value);

      let compteur = 0;
      async function slotVersPayload(slot) {
        if (slot.file) {
          const cle = `s${compteur++}`;
          const { blob, name } = await reduirePhoto(slot.file);
          body.append(`photo_${cle}`, blob, name);
          return { file: cle };
        }
        return { keep: slot.keep };
      }

      const payload = {
        id: state.voyage.id,
        titre: state.titre.trim(),
        intro: state.intro.trim(),
        hero: await slotVersPayload(state.hero),
        galerie: [],
        blocs: [],
      };
      for (const slot of state.galerie) payload.galerie.push(await slotVersPayload(slot));
      for (const bloc of state.blocs) {
        payload.blocs.push({ texte: bloc.texte.trim(), photo: await slotVersPayload(bloc.photo) });
      }
      body.append('payload', JSON.stringify(payload));

      setStatus(compteur ? `Envoi de ${compteur} photo${compteur > 1 ? 's' : ''} au serveur…` : 'Envoi au serveur…', null);

      const res = await fetch('save-article.php', { method: 'POST', body });
      let reponse;
      try {
        reponse = await res.json();
      } catch (err) {
        showErrors([`Réponse inattendue du serveur (code ${res.status}). Les photos sont peut-être trop lourdes : enregistre l'article en plusieurs fois.`]);
        setStatus('', null);
        return;
      }

      if (!res.ok || !reponse.success) {
        showErrors(reponse.errors || ["Erreur inconnue lors de l'enregistrement."]);
        setStatus('', null);
        return;
      }

      // Succès : on recharge l'article depuis le serveur (les nouvelles photos
      // deviennent des « photos actuelles ») et on met à jour la liste.
      const voyage = { ...state.voyage, article: true };
      fermerSansEffacerMessage();
      await chargerEtat(voyage);
      titreInput.value = state.titre;
      introInput.value = state.intro;
      renderAll();
      panel.classList.remove('hidden');
      setStatus(
        `Article enregistré ! <a href="../pays.html?id=${encodeURIComponent(voyage.id)}" target="_blank" rel="noopener">Voir l'article</a>.`,
        'success'
      );
      if (typeof loadVoyageList === 'function') await loadVoyageList();
    } catch (err) {
      showErrors([`Impossible de contacter le serveur : ${err.message}`]);
      setStatus('', null);
    } finally {
      saveBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  }

  // Libère les aperçus de l'ancien état sans cacher le panneau
  function fermerSansEffacerMessage() {
    if (!state) return;
    libererSlot(state.hero);
    state.galerie.forEach(libererSlot);
    state.blocs.forEach((b) => libererSlot(b.photo));
  }

  /* --- Suppression de l'article ----------------------------------------- */
  async function supprimer() {
    showErrors([]);
    setStatus('', null);
    if (!keyInput.value) {
      showErrors(["La clé d'accès est obligatoire pour supprimer l'article."]);
      return;
    }
    const ok = window.confirm(
      `Supprimer l'article « ${state.voyage.pays} » ? Ses photos et son texte sont effacés, sans possibilité d'annuler. Le voyage lui-même est conservé.`
    );
    if (!ok) return;

    const body = new FormData();
    body.append('access_key', keyInput.value);
    body.append('id', state.voyage.id);

    saveBtn.disabled = true;
    deleteBtn.disabled = true;
    try {
      const res = await fetch('delete-article.php', { method: 'POST', body });
      const reponse = await res.json();
      if (!res.ok || !reponse.success) {
        showErrors(reponse.errors || ['Erreur inconnue lors de la suppression.']);
        return;
      }
      const nom = state.voyage.pays;
      fermer();
      if (typeof setDeleteStatus === 'function') setDeleteStatus(`Article « ${nom} » supprimé.`, 'success');
      if (typeof loadVoyageList === 'function') await loadVoyageList();
    } catch (err) {
      showErrors([`Impossible de contacter le serveur : ${err.message}`]);
    } finally {
      saveBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  }

  /* --- Galerie : glisser-déposer de plusieurs photos ou d'un dossier ------ */
  const FORMAT_IMAGE = /^image\/(jpeg|png|webp|gif)$/;
  const EXT_IMAGE = /\.(jpe?g|png|webp|gif)$/i;
  function estImage(file) {
    return FORMAT_IMAGE.test(file.type) || EXT_IMAGE.test(file.name);
  }

  // Lit une entrée déposée (fichier ou dossier, sous-dossiers compris) et
  // renvoie la liste des fichiers qu'elle contient. Un dossier se lit par
  // paquets : readEntries() est rappelée jusqu'à ce qu'elle renvoie une liste vide.
  function lireEntree(entree) {
    if (entree.isFile) {
      return new Promise((ok) => entree.file((f) => ok([f]), () => ok([])));
    }
    if (!entree.isDirectory) return Promise.resolve([]);
    const lecteur = entree.createReader();
    const fichiers = [];
    const lireUnPaquet = () => new Promise((ok) => {
      lecteur.readEntries(async (paquet) => {
        if (!paquet.length) return ok(fichiers);
        for (const e of paquet) fichiers.push(...(await lireEntree(e)));
        ok(lireUnPaquet());
      }, () => ok(fichiers));
    });
    return lireUnPaquet();
  }

  function messageDepot(texte, type) {
    dropMsg.textContent = texte;
    dropMsg.className = `status-line ${type ? `is-${type}` : ''}`.trim();
  }

  // Range les photos dans la galerie : d'abord les emplacements vides, puis
  // de nouveaux emplacements (sans limite). Les photos déjà en place ne
  // sont jamais remplacées. L'ordre suit les noms de fichiers (IMG_2 avant IMG_10).
  function ajouterPhotosGalerie(fichiers) {
    if (!state) return;
    const images = fichiers.filter(estImage);
    images.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));

    let ajoutees = 0;
    for (const f of images) {
      let slot = state.galerie.find((s) => !slotRempli(s));
      if (!slot) {
        slot = slotVide();
        state.galerie.push(slot);
      }
      choisirFichier(slot, f);
      ajoutees++;
    }
    renderAll();

    const notes = [];
    if (ajoutees) notes.push(`${ajoutees} photo${ajoutees > 1 ? 's' : ''} ajoutée${ajoutees > 1 ? 's' : ''}.`);
    const pasImages = fichiers.length - images.length;
    if (pasImages) notes.push(`${pasImages} fichier${pasImages > 1 ? 's' : ''} ignoré${pasImages > 1 ? 's' : ''} (seuls JPG, PNG, WebP et GIF sont acceptés).`);
    if (!fichiers.length) notes.push('Aucun fichier reçu.');
    messageDepot(notes.join(' '), ajoutees && !pasImages ? 'success' : 'error');
  }

  /* --- Branchements ------------------------------------------------------ */
  titreInput.addEventListener('input', () => { if (state) state.titre = titreInput.value; });
  introInput.addEventListener('input', () => { if (state) state.intro = introInput.value; });

  galerieAddBtn.addEventListener('click', () => {
    if (state) {
      state.galerie.push(slotVide());
      renderAll();
    }
  });
  // Zone de dépôt : glisser des fichiers / un dossier, ou cliquer pour choisir
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('is-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-over'));
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-over');
    // À lire AVANT tout « await » : après, le navigateur vide les données déposées.
    const entrees = [...e.dataTransfer.items]
      .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
      .filter(Boolean);
    const fichiersDirects = [...e.dataTransfer.files];
    const fichiers = entrees.length
      ? (await Promise.all(entrees.map(lireEntree))).flat()
      : fichiersDirects;
    ajouterPhotosGalerie(fichiers);
  });
  dropZone.addEventListener('click', () => dropInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dropInput.click();
    }
  });
  dropInput.addEventListener('change', () => {
    ajouterPhotosGalerie([...dropInput.files]);
    dropInput.value = ''; // permet de re-choisir les mêmes fichiers ensuite
  });

  blocAddBtn.addEventListener('click', () => {
    if (state && state.blocs.length < BLOCS_MAX) {
      state.blocs.push({ texte: '', photo: slotVide() });
      renderAll();
    }
  });
  saveBtn.addEventListener('click', enregistrer);
  deleteBtn.addEventListener('click', supprimer);
  closeBtn.addEventListener('click', fermer);

  // admin.js appelle cette fonction depuis la liste des voyages
  window.openArticleEditor = ouvrir;
  // admin-voyage.js réutilise la même réduction de photo avant envoi
  window.reduirePhotoAdmin = reduirePhoto;
})();
