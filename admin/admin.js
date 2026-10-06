/* =========================================================
   ADMIN — ajout d'un voyage via le backend PHP (save-voyage.php)

   Le navigateur ne fait qu'envoyer un formulaire (FormData, avec les
   3 photos) au script PHP ; toute la logique (slug, doublons,
   conversion WebP, écriture des fichiers) est faite côté serveur.
   Ça marche sur n'importe quel hébergement PHP classique, dans
   n'importe quel navigateur — contrairement à une ancienne version
   qui utilisait l'API File System Access du navigateur (Chrome
   uniquement, et seulement en local).
   ========================================================= */

// "Costa Rica" -> "costa-rica" — utilisé seulement pour l'aperçu de
// l'id en direct ; le slug définitif est recalculé côté serveur.
function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const form = document.getElementById('voyage-form');
const accessKeyInput = document.getElementById('access-key');
const paysInput = document.getElementById('pays');
const idPreviewEl = document.getElementById('id-preview');
const dateInput = document.getElementById('date');
const dureeInput = document.getElementById('duree');
const transportSelect = document.getElementById('transport');
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const coverPhotoInput = document.getElementById('cover-photo');
const moment1TitreInput = document.getElementById('moment1-titre');
const moment1TexteInput = document.getElementById('moment1-texte');
const moment1PhotoInput = document.getElementById('moment1-photo');
const moment2TitreInput = document.getElementById('moment2-titre');
const moment2TexteInput = document.getElementById('moment2-texte');
const moment2PhotoInput = document.getElementById('moment2-photo');

const errorListEl = document.getElementById('error-list');
const statusLineEl = document.getElementById('status-line');
const submitBtn = document.getElementById('submit-btn');

/* --- Aperçu de l'id en direct + avertissement si déjà pris ----------- */
async function getExistingIds() {
  try {
    const res = await fetch('../data/voyages.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const voyages = await res.json();
    return Array.isArray(voyages) ? voyages.map((v) => v.id) : [];
  } catch (err) {
    return [];
  }
}

paysInput.addEventListener('input', async () => {
  const id = slugify(paysInput.value);
  idPreviewEl.textContent = id || '—';

  if (!id) {
    idPreviewEl.style.color = '';
    idPreviewEl.title = '';
    return;
  }

  const existingIds = await getExistingIds();
  const isDuplicate = existingIds.includes(id);
  idPreviewEl.style.color = isDuplicate ? '#e0664a' : '';
  idPreviewEl.title = isDuplicate ? 'Cet id existe déjà dans voyages.json' : '';
});

/* --- Validation côté client (juste pour un retour immédiat : la      --
   --- validation qui compte vraiment est refaite côté PHP)             */
function collectFormValues() {
  return {
    accessKey: accessKeyInput.value,
    pays: paysInput.value.trim(),
    date: dateInput.value,
    duree: dureeInput.value.trim(),
    transport: transportSelect.value,
    lat: parseFloat(latInput.value),
    lon: parseFloat(lonInput.value),
    coverPhoto: coverPhotoInput.files[0] || null,
    moment1Titre: moment1TitreInput.value.trim(),
    moment1Texte: moment1TexteInput.value.trim(),
    moment1Photo: moment1PhotoInput.files[0] || null,
    moment2Titre: moment2TitreInput.value.trim(),
    moment2Texte: moment2TexteInput.value.trim(),
    moment2Photo: moment2PhotoInput.files[0] || null,
  };
}

function validate(values) {
  const errors = [];
  if (!values.accessKey) errors.push("La clé d'accès est obligatoire.");
  if (!values.pays) errors.push('Le pays est obligatoire.');
  if (!values.date) errors.push('La date de départ est obligatoire.');
  if (!values.duree) errors.push('La durée est obligatoire.');
  if (!values.transport) errors.push('Le mode de transport est obligatoire.');
  if (Number.isNaN(values.lat)) errors.push('La latitude doit être un nombre.');
  else if (values.lat < -90 || values.lat > 90) errors.push('La latitude doit être comprise entre -90 et 90.');
  if (Number.isNaN(values.lon)) errors.push('La longitude doit être un nombre.');
  else if (values.lon < -180 || values.lon > 180) errors.push('La longitude doit être comprise entre -180 et 180.');
  if (!values.coverPhoto) errors.push('La photo de couverture est obligatoire.');
  if (!values.moment1Titre) errors.push('Le titre du moment fort n°1 est obligatoire.');
  if (!values.moment1Texte) errors.push('Le texte du moment fort n°1 est obligatoire.');
  if (!values.moment1Photo) errors.push('La photo du moment fort n°1 est obligatoire.');
  if (!values.moment2Titre) errors.push('Le titre du moment fort n°2 est obligatoire.');
  if (!values.moment2Texte) errors.push('Le texte du moment fort n°2 est obligatoire.');
  if (!values.moment2Photo) errors.push('La photo du moment fort n°2 est obligatoire.');
  return errors;
}

function showErrors(errors) {
  errorListEl.innerHTML = '';
  errors.forEach((msg) => {
    const li = document.createElement('li');
    li.textContent = msg;
    errorListEl.appendChild(li);
  });
  errorListEl.classList.toggle('hidden', errors.length === 0);
}

function setStatus(html, type) {
  statusLineEl.innerHTML = html;
  statusLineEl.className = `status-line ${type ? `is-${type}` : ''}`.trim();
  statusLineEl.classList.toggle('hidden', !html);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showErrors([]);
  setStatus('', null);

  const values = collectFormValues();
  const formErrors = validate(values);
  if (formErrors.length) {
    showErrors(formErrors);
    return;
  }

  const body = new FormData();
  body.append('access_key', values.accessKey);
  body.append('pays', values.pays);
  body.append('date', values.date);
  body.append('duree', values.duree);
  body.append('transport', values.transport);
  body.append('lat', String(values.lat));
  body.append('lon', String(values.lon));
  body.append('cover_photo', values.coverPhoto);
  body.append('moment1_titre', values.moment1Titre);
  body.append('moment1_texte', values.moment1Texte);
  body.append('moment1_photo', values.moment1Photo);
  body.append('moment2_titre', values.moment2Titre);
  body.append('moment2_texte', values.moment2Texte);
  body.append('moment2_photo', values.moment2Photo);

  submitBtn.disabled = true;
  setStatus('Envoi au serveur…', null);

  try {
    const res = await fetch('save-voyage.php', { method: 'POST', body });
    const payload = await res.json();

    if (!res.ok || !payload.success) {
      showErrors(payload.errors || ["Erreur inconnue lors de l'enregistrement."]);
      setStatus('', null);
      return;
    }

    setStatus(
      `Voyage "${payload.voyage.pays}" enregistré ! <a href="../index.html">Vérifier sur le site</a>.`,
      'success'
    );
    form.reset();
    idPreviewEl.textContent = '—';
  } catch (err) {
    showErrors([`Impossible de contacter le serveur : ${err.message}`]);
    setStatus('', null);
  } finally {
    submitBtn.disabled = false;
  }
});
