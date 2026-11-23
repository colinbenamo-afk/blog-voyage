/* =========================================================
   PAGE ARTICLE D'UN PAYS — pays.html?id=indonesie

   Tout le contenu vient de fichiers JSON (aucun texte en dur ici) :
   - data/articles/<id>.json : l'article (titre, intro, photos, blocs),
     créé depuis la page admin ;
   - data/voyages.json : le nom du pays, ses coordonnées et la liste
     des voyages pour le menu du header.
   Les textes sont insérés avec textContent (jamais innerHTML) : même
   si un texte contient du HTML, il s'affiche tel quel, sans s'exécuter.
   ========================================================= */
(function () {
  'use strict';

  const contenu = document.getElementById('pays-contenu');
  const heroEl = document.getElementById('pays-hero');
  const titreEl = document.getElementById('pays-titre');
  const coordsEl = document.getElementById('pays-coords');
  const retourEl = document.getElementById('pays-retour');

  /* --- Outils ----------------------------------------------------------- */

  // N'accepte que des chemins de la forme assets/articles/<id>/<nom>.webp
  // (ceux que l'admin crée) : protège contre un JSON modifié à la main.
  function cheminPhotoValide(chemin) {
    return typeof chemin === 'string' && /^assets\/articles\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(chemin);
  }

  // Même formatage des coordonnées que sur l'accueil (script.js)
  function formatCoord(value, positiveLabel, negativeLabel) {
    const label = value < 0 ? negativeLabel : positiveLabel;
    return `${Math.abs(value).toFixed(4)}° ${label}`;
  }

  // Texte -> paragraphes. Une ligne vide dans l'admin = un nouveau paragraphe.
  function ajouterParagraphes(conteneur, texte) {
    String(texte)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => {
        const el = document.createElement('p');
        el.textContent = p;
        conteneur.appendChild(el);
      });
  }

  function creerImage(chemin, alt, lazy) {
    const img = document.createElement('img');
    img.src = chemin;
    img.alt = alt;
    img.width = 450;
    img.height = 600;
    if (lazy) img.loading = 'lazy';
    return img;
  }

  async function chargerJson(url) {
    // no-cache : le navigateur vérifie auprès du serveur, donc un article
    // modifié dans l'admin apparaît tout de suite.
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} : ${res.status}`);
    return res.json();
  }

  function afficherMessage(titre, message) {
    titreEl.textContent = titre;
    contenu.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'pays-message';
    p.textContent = message;
    contenu.appendChild(p);
    document.title = `${titre} – Mon Blog de Voyage`;
  }

  /* --- Menu du header (même liste que l'accueil) ------------------------ */
  function construireNav(voyages) {
    const details = document.querySelector('.site-header-nav');
    const liste = document.querySelector('.site-header-nav-list');
    if (!liste) return;
    liste.innerHTML = '';
    voyages.forEach((voyage) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `index.html#${voyage.id}`;
      a.textContent = voyage.pays;
      li.appendChild(a);
      liste.appendChild(li);
    });
    // Un clic en dehors referme le menu (sinon il reste ouvert sur la page)
    document.addEventListener('click', (e) => {
      if (details && !details.contains(e.target)) details.removeAttribute('open');
    });
  }

  /* --- Construction de la page ------------------------------------------ */
  function construireIntro(article, paysNom) {
    const section = document.createElement('section');
    section.className = 'bloc-intro reveal';

    const texte = document.createElement('div');
    texte.className = 'bloc-intro-texte';
    ajouterParagraphes(texte, article.intro);
    section.appendChild(texte);

    const photos = (article.galerie || []).filter(cheminPhotoValide);
    if (photos.length) section.appendChild(construireCarrousel(photos, paysNom));
    return section;
  }

  /* --- Carrousel de la galerie ------------------------------------------
     Les photos tournent en boucle autour de celle du milieu (la plus
     grande). On le fait tourner avec les flèches, en glissant le doigt ou
     la souris, avec les touches ← → du clavier, ou en cliquant une photo
     sur le côté. Chaque photo reçoit sa position par rapport au centre
     (--pos : 0 au centre, -1 à gauche, +1 à droite…) et le CSS fait le
     reste (déplacement, taille, luminosité, animation). */
  function construireCarrousel(photos, paysNom) {
    const n = photos.length;
    let actif = Math.floor(n / 2);

    const bande = document.createElement('div');
    bande.className = 'carrousel';
    bande.setAttribute('role', 'region');
    bande.setAttribute('aria-roledescription', 'carrousel');
    bande.setAttribute('aria-label', `Galerie de photos : ${paysNom}`);

    const piste = document.createElement('ul');
    piste.className = 'bande-piste';
    piste.tabIndex = 0;

    const items = photos.map((chemin, i) => {
      const li = document.createElement('li');
      li.className = 'bande-photo';
      li.appendChild(creerImage(chemin, `${paysNom} : photo ${i + 1} sur ${n}`, true));
      li.addEventListener('click', () => {
        if (glisse) return;           // un glisser n'est pas un clic
        if (i !== actif) allerA(i);
      });
      piste.appendChild(li);
      return li;
    });

    const nav = document.createElement('div');
    nav.className = 'carrousel-nav';
    const prec = document.createElement('button');
    prec.type = 'button';
    prec.className = 'carrousel-fleche';
    prec.setAttribute('aria-label', 'Photo précédente');
    prec.textContent = '←';
    const compteur = document.createElement('span');
    compteur.className = 'carrousel-compteur';
    compteur.setAttribute('aria-live', 'polite');
    const suiv = document.createElement('button');
    suiv.type = 'button';
    suiv.className = 'carrousel-fleche';
    suiv.setAttribute('aria-label', 'Photo suivante');
    suiv.textContent = '→';
    nav.append(prec, compteur, suiv);

    // Position d'une photo par rapport à la photo active, en boucle :
    // avec 5 photos, la dernière est juste à gauche de la première.
    function position(i) {
      let d = i - actif;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    }

    function afficher() {
      items.forEach((li, i) => {
        const pos = position(i);
        li.style.setProperty('--pos', String(pos));
        li.dataset.d = String(Math.min(3, Math.abs(pos)));
        li.classList.toggle('est-active', pos === 0);
        li.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      });
      compteur.textContent = `${actif + 1} / ${n}`;
    }

    function allerA(i) {
      actif = ((i % n) + n) % n;
      afficher();
    }

    prec.addEventListener('click', () => allerA(actif - 1));
    suiv.addEventListener('click', () => allerA(actif + 1));
    piste.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); allerA(actif - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); allerA(actif + 1); }
    });

    // Glisser (doigt ou souris) : au-delà de 40px, on passe à la photo
    // suivante / précédente. touch-action: pan-y (CSS) laisse le scroll
    // vertical de la page fonctionner normalement.
    let departX = null;
    let glisse = false;
    piste.addEventListener('pointerdown', (e) => {
      departX = e.clientX;
      glisse = false;
    });
    piste.addEventListener('pointermove', (e) => {
      if (departX !== null && Math.abs(e.clientX - departX) > 10) glisse = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (departX === null) return;
      const dx = e.clientX - departX;
      departX = null;
      if (Math.abs(dx) > 40) allerA(actif + (dx < 0 ? 1 : -1));
      // le "click" qui suit le pointerup doit encore voir glisse = true
      setTimeout(() => { glisse = false; }, 0);
    });
    piste.addEventListener('dragstart', (e) => e.preventDefault()); // pas de glisser natif des images

    if (n < 2) nav.hidden = true;
    afficher();
    bande.append(piste, nav);
    return bande;
  }

  function construireBloc(bloc, index, paysNom) {
    const section = document.createElement('section');
    section.className = 'bloc-texte-photo reveal';
    // Un bloc sur deux a la photo à gauche (alternance automatique)
    if (index % 2 === 1) section.classList.add('bloc-texte-photo--inverse');

    const texte = document.createElement('div');
    texte.className = 'bloc-texte';
    ajouterParagraphes(texte, bloc.texte);
    section.appendChild(texte);

    if (cheminPhotoValide(bloc.photo)) {
      const figure = document.createElement('figure');
      figure.className = 'photo-unique';
      figure.appendChild(creerImage(bloc.photo, `${paysNom} : photo ${index + 1}`, true));
      section.appendChild(figure);
    }
    return section;
  }

  // Apparition en fondu quand un bloc entre dans l'écran
  function activerApparition() {
    const blocs = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      blocs.forEach((b) => b.classList.add('est-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('est-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    blocs.forEach((b) => observer.observe(b));
  }

  /* --- Démarrage -------------------------------------------------------- */
  async function init() {
    const id = new URLSearchParams(window.location.search).get('id') || '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      afficherMessage('Article introuvable', "Aucun pays n'est indiqué dans l'adresse de cette page.");
      return;
    }

    // Les voyages servent au menu et au nom du pays ; si le fichier ne se
    // charge pas, l'article s'affiche quand même.
    let voyages = [];
    try {
      const data = await chargerJson('data/voyages.json');
      if (Array.isArray(data)) voyages = data;
    } catch (err) {
      console.warn(err);
    }
    construireNav(voyages);
    const voyage = voyages.find((v) => v.id === id) || null;
    const paysNom = voyage ? voyage.pays : id;

    let article;
    try {
      article = await chargerJson(`data/articles/${id}.json`);
    } catch (err) {
      afficherMessage('Article introuvable', `Il n'y a pas encore d'article pour « ${paysNom} ».`);
      return;
    }

    // En-tête : titre, coordonnées, photo de fond
    titreEl.textContent = article.titre || paysNom;
    document.title = `${article.titre || paysNom} – Mon Blog de Voyage`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', `${article.titre || paysNom} : mes photos et mes souvenirs de voyage.`);

    if (voyage && voyage.coordonnees) {
      const lat = formatCoord(voyage.coordonnees.lat, 'N', 'S');
      const lon = formatCoord(voyage.coordonnees.lon, 'E', 'O');
      coordsEl.textContent = `${lat}, ${lon}`;
      coordsEl.hidden = false;
      retourEl.href = `index.html#${id}`;
      retourEl.textContent = '← Retour au voyage';
    }
    if (cheminPhotoValide(article.hero)) {
      heroEl.style.setProperty('--hero-photo', `url("${article.hero}")`);
    }

    // Contenu : intro + galerie, puis les blocs texte/photo
    contenu.innerHTML = '';
    contenu.appendChild(construireIntro(article, paysNom));
    (article.blocs || []).forEach((bloc, i) => contenu.appendChild(construireBloc(bloc, i, paysNom)));

    activerApparition();
  }

  init();
})();
