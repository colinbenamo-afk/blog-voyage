/* =========================================================
   ADMIN — modifier un voyage existant (ce qui s'affiche sur la page d'accueil)

   S'ouvre avec le bouton « Modifier le voyage » de la liste « Voyages
   existants » (voir admin.js). Le formulaire est rempli avec les valeurs
   actuelles ; on change ce qu'on veut et on enregistre. Les photos ne sont
   renvoyées que si on en a choisi une nouvelle. L'id du voyage ne change
   jamais (il sert au lien vers l'article).

   Envoie tout à update-voyage.php, qui fait la vraie validation.
   ========================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const panel = $('voyage-edit-panel');
  if (!panel) return;

  const champs = {
    key: $('ve-key'), pays: $('ve-pays'), annee: $('ve-annee'), duree: $('ve-duree'),
    transport: $('ve-transport'), lat: $('ve-lat'), lon: $('ve-lon'), intro: $('ve-intro'),
    m1titre: $('ve-m1-titre'), m1texte: $('ve-m1-texte'),
    m2titre: $('ve-m2-titre'), m2texte: $('ve-m2-texte'),
  };
  const headingEl = $('voyage-edit-heading');
  const idEl = $('ve-id');
  const errorListEl = $('ve-error-list');
  const statusEl = $('ve-status-line');
  const saveBtn = $('ve-save');
  const closeBtn = $('ve-close');
  const NOMS_PHOTOS = ['cover_photo', 'moment1_photo', 'moment2_photo'];

  let voyage = null;   // le voyage en cours de modification
  let photos = [];     // 3 emplacements : { keep: chemin } ou { file, previewUrl }

  function setStatus(html, type) {
    statusEl.innerHTML = html;
    statusEl.className = `status-line ${type ? `is-${type}` : ''}`.trim();
    statusEl.classList.toggle('hidden', !html);
  }

  function showErrors(erreurs) {
    errorListEl.innerHTML = '';
    erreurs.forEach((msg) => {
      const li = document.createElement('li');
      li.textContent = msg;
      errorListEl.appendChild(li);
    });
    errorListEl.classList.toggle('hidden', erreurs.length === 0);
  }

  /* --- Photos : miniature actuelle + choix d'une nouvelle ---------------- */
  function dessinerPhoto(i) {
    const hote = $(`ve-photo-${i}`);
    hote.innerHTML = '';
    const slot = photos[i];

    const wrap = document.createElement('div');
    wrap.className = 'slot';

    const thumb = document.createElement('div');
    thumb.className = 'slot-thumb';
    const url = slot.file ? slot.previewUrl : (slot.keep ? `../${slot.keep}` : '');
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '?';
    }

    const info = document.createElement('div');
    info.className = 'slot-info';
    const etat = document.createElement('span');
    etat.className = 'slot-label';
    etat.textContent = slot.file ? `Nouvelle photo : ${slot.file.name}` : 'Photo actuelle (choisis un fichier pour la remplacer)';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      if (!input.files[0]) return;
      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      slot.file = input.files[0];
      slot.previewUrl = URL.createObjectURL(slot.file);
      dessinerPhoto(i);
    });
    info.append(etat, input);

    wrap.append(thumb, info);
    hote.appendChild(wrap);
  }

  /* --- Ouverture / fermeture --------------------------------------------- */
  function ouvrir(v) {
    voyage = v;
    showErrors([]);
    setStatus('', null);

    headingEl.textContent = `Modifier le voyage : ${v.pays || v.id}`;
    idEl.textContent = v.id;
    champs.pays.value = v.pays || '';
    champs.annee.value = v.annee || '';
    champs.duree.value = v.duree || '';
    champs.lat.value = v.coordonnees ? v.coordonnees.lat : '';
    champs.lon.value = v.coordonnees ? v.coordonnees.lon : '';

    // Mode de transport : si la valeur actuelle n'est pas dans la liste
    // (ex : « À COMPLÉTER »), on l'ajoute pour ne pas la perdre en silence.
    [...champs.transport.querySelectorAll('option[data-temporaire]')].forEach((o) => o.remove());
    const connus = [...champs.transport.options].map((o) => o.value);
    if (v.transport && !connus.includes(v.transport)) {
      const o = document.createElement('option');
      o.value = v.transport;
      o.textContent = v.transport;
      o.dataset.temporaire = '1';
      champs.transport.appendChild(o);
    }
    champs.transport.value = v.transport || '';

    const s = v.sections || [];
    champs.intro.value = (s[0] && s[0].texte) || '';
    champs.m1titre.value = (s[1] && s[1].titre) || '';
    champs.m1texte.value = (s[1] && s[1].texte) || '';
    champs.m2titre.value = (s[2] && s[2].titre) || '';
    champs.m2texte.value = (s[2] && s[2].texte) || '';

    photos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    photos = [0, 1, 2].map((i) => ({ keep: (v.photos || [])[i] || '' }));
    photos.forEach((_, i) => dessinerPhoto(i));

    // Réutilise la clé déjà saisie ailleurs dans la page
    if (!champs.key.value) {
      const autre = $('delete-access-key') || $('access-key');
      if (autre && autre.value) champs.key.value = autre.value;
    }

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fermer() {
    photos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    photos = [];
    voyage = null;
    panel.classList.add('hidden');
    showErrors([]);
    setStatus('', null);
  }

  /* --- Validation côté navigateur (la vraie est refaite côté PHP) -------- */
  function valider() {
    const e = [];
    if (!champs.key.value) e.push("La clé d'accès est obligatoire.");
    if (!champs.pays.value.trim()) e.push('Le pays est obligatoire.');
    const annee = Number(champs.annee.value);
    if (!Number.isInteger(annee) || annee < 1900 || annee > 2100) e.push("L'année doit être une année valide (ex : 2026).");
    if (!champs.duree.value.trim()) e.push('La durée est obligatoire.');
    if (!champs.transport.value) e.push('Le mode de transport est obligatoire.');
    const lat = Number(champs.lat.value);
    const lon = Number(champs.lon.value);
    if (champs.lat.value === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) e.push('La latitude doit être comprise entre -90 et 90.');
    if (champs.lon.value === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) e.push('La longitude doit être comprise entre -180 et 180.');
    if (!champs.m1titre.value.trim()) e.push('Le titre du moment fort n°1 est obligatoire.');
    if (!champs.m1texte.value.trim()) e.push('Le texte du moment fort n°1 est obligatoire.');
    if (!champs.m2titre.value.trim()) e.push('Le titre du moment fort n°2 est obligatoire.');
    if (!champs.m2texte.value.trim()) e.push('Le texte du moment fort n°2 est obligatoire.');
    return e;
  }

  /* --- Enregistrement ---------------------------------------------------- */
  async function enregistrer() {
    showErrors([]);
    setStatus('', null);
    const erreurs = valider();
    if (erreurs.length) { showErrors(erreurs); return; }

    saveBtn.disabled = true;
    setStatus('Envoi au serveur…', null);
    try {
      const body = new FormData();
      body.append('access_key', champs.key.value);
      body.append('id', voyage.id);
      body.append('pays', champs.pays.value);
      body.append('annee', champs.annee.value);
      body.append('duree', champs.duree.value);
      body.append('transport', champs.transport.value);
      body.append('lat', champs.lat.value);
      body.append('lon', champs.lon.value);
      body.append('intro_texte', champs.intro.value);
      body.append('moment1_titre', champs.m1titre.value);
      body.append('moment1_texte', champs.m1texte.value);
      body.append('moment2_titre', champs.m2titre.value);
      body.append('moment2_texte', champs.m2texte.value);

      // Seules les photos changées sont envoyées (réduites avant l'envoi
      // grâce à la fonction de admin-article.js, pour ne pas dépasser la
      // limite d'envoi du serveur).
      for (let i = 0; i < photos.length; i++) {
        if (!photos[i].file) continue;
        const reduire = window.reduirePhotoAdmin;
        const { blob, name } = reduire ? await reduire(photos[i].file) : { blob: photos[i].file, name: photos[i].file.name };
        body.append(NOMS_PHOTOS[i], blob, name);
      }

      const res = await fetch('update-voyage.php', { method: 'POST', body });
      let reponse;
      try {
        reponse = await res.json();
      } catch (err) {
        showErrors([`Réponse inattendue du serveur (code ${res.status}). Les photos sont peut-être trop lourdes : réessaie avec une photo à la fois.`]);
        setStatus('', null);
        return;
      }
      if (!res.ok || !reponse.success) {
        showErrors(reponse.errors || ["Erreur inconnue lors de l'enregistrement."]);
        setStatus('', null);
        return;
      }

      // Succès : on rouvre le voyage avec les nouvelles valeurs (les photos
      // choisies deviennent les « photos actuelles ») et on rafraîchit la liste.
      ouvrir({ ...voyage, ...reponse.voyage });
      setStatus('Voyage enregistré ! <a href="../index.html" target="_blank" rel="noopener">Voir la page d\'accueil</a>.', 'success');
      if (typeof loadVoyageList === 'function') await loadVoyageList();
    } catch (err) {
      showErrors([`Impossible de contacter le serveur : ${err.message}`]);
      setStatus('', null);
    } finally {
      saveBtn.disabled = false;
    }
  }

  saveBtn.addEventListener('click', enregistrer);
  closeBtn.addEventListener('click', fermer);

  // admin.js appelle cette fonction depuis la liste des voyages
  window.openVoyageEditor = ouvrir;
})();
