/* =========================================================
   0. RÉVÉLATION LETTRE PAR LETTRE DU TITRE DU HERO
   Découpe le texte en une span par lettre, chacune animée avec
   un délai croissant (--i) pour un effet d'apparition gauche → droite.
   Le texte original reste accessible via une version lecteur d'écran.
   ========================================================= */
(function revealHeroTitle() {
  const titleEl = document.querySelector('.hero-title');
  if (!titleEl) return;

  const text = titleEl.textContent.trim();
  titleEl.textContent = '';
  titleEl.setAttribute('aria-label', text);

  const visual = document.createElement('span');
  visual.className = 'hero-title-visual';
  visual.setAttribute('aria-hidden', 'true');

  let letterIndex = 0;
  text.split('').forEach((char) => {
    if (char === ' ') {
      visual.appendChild(document.createTextNode(' '));
      return;
    }
    const letter = document.createElement('span');
    letter.className = 'hero-letter';
    letter.style.setProperty('--i', letterIndex);
    letter.textContent = char;
    visual.appendChild(letter);
    letterIndex += 1;
  });

  titleEl.appendChild(visual);
})();

/* =========================================================
   1. SITE GÉNÉRÉ DEPUIS data/voyages.json
   Le contenu (nav, sections destinations, marqueurs de la carte du
   hero) n'est plus écrit en dur dans index.html : il est généré ici
   à partir du JSON, trié chronologiquement par date de départ. Le
   rendu final (classes CSS, data-attributes) reproduit exactement
   ce qui était auparavant codé en dur, pour que style.css n'ait
   rien à changer.
   ========================================================= */
(function initFromVoyagesData() {
  const DATA_URL = 'data/voyages.json';

  /* --- Tri chronologique -------------------------------------------- */
  // Les voyages sans date connue ("À COMPLÉTER") sont envoyés à la fin,
  // dans leur ordre d'origine (tri stable), pour ne rien changer tant
  // que les dates de départ n'ont pas été renseignées.
  function parseSortableDate(value) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? Infinity : timestamp;
  }

  function sortByDeparture(voyages) {
    return [...voyages].sort(
      (a, b) => parseSortableDate(a.ordre_depart) - parseSortableDate(b.ordre_depart)
    );
  }

  /* --- Formatage des coordonnées, identique à l'ancien texte en dur -- */
  function formatCoord(value, positiveLabel, negativeLabel) {
    const label = value < 0 ? negativeLabel : positiveLabel;
    return `${Math.abs(value).toFixed(4)}° ${label}`;
  }

  /* --- Génération de la nav du header --------------------------------- */
  function buildNav(voyages) {
    const nav = document.querySelector('.site-header-nav');
    if (!nav) return;

    nav.innerHTML = '';
    voyages.forEach((voyage) => {
      const link = document.createElement('a');
      link.href = `#${voyage.id}`;
      link.textContent = voyage.pays;
      nav.appendChild(link);
    });
  }

  /* --- Génération d'une section .destination -------------------------- */
  function buildPhotoFrame(voyage) {
    const frame = document.createElement('div');
    frame.className = 'photo-frame';

    voyage.photos.forEach((src, index) => {
      const photo = document.createElement('div');
      photo.className = 'photo';
      if (index === 0) photo.classList.add('is-active');
      if (index === 1) photo.classList.add('is-next');
      photo.dataset.step = String(index);
      photo.style.setProperty('--photo-src', `url('${src}')`);
      frame.appendChild(photo);
    });

    return frame;
  }

  function buildStepsCol(voyage) {
    const stepsCol = document.createElement('div');
    stepsCol.className = 'steps-col';

    const spacerTop = document.createElement('div');
    spacerTop.className = 'step-spacer';
    stepsCol.appendChild(spacerTop);

    voyage.sections.forEach((sectionData, index) => {
      const step = document.createElement('div');
      step.className = 'step';
      step.dataset.step = String(index);

      const h2 = document.createElement('h2');
      h2.textContent = sectionData.titre;
      step.appendChild(h2);

      // La ligne de coordonnées n'apparaît que sur le premier step
      // (fiche pratique de la destination), comme dans la version en dur.
      if (index === 0) {
        const coords = document.createElement('p');
        coords.className = 'coords';
        const lat = formatCoord(voyage.coordonnees.lat, 'N', 'S');
        const lon = formatCoord(voyage.coordonnees.lon, 'E', 'O');
        coords.innerHTML = `<strong>Latitude</strong> : ${lat} | <strong>Longitude</strong> : ${lon}`;
        step.appendChild(coords);
      }

      const text = document.createElement('p');
      text.textContent = sectionData.texte;
      step.appendChild(text);

      stepsCol.appendChild(step);
    });

    const spacerBottom = document.createElement('div');
    spacerBottom.className = 'step-spacer';
    stepsCol.appendChild(spacerBottom);

    return stepsCol;
  }

  function buildDestinationSection(voyage) {
    const section = document.createElement('section');
    section.className = 'destination';
    section.id = voyage.id;
    section.dataset.destination = voyage.id;

    const stickyCol = document.createElement('div');
    stickyCol.className = 'sticky-col';
    stickyCol.appendChild(buildPhotoFrame(voyage));

    section.appendChild(stickyCol);
    section.appendChild(buildStepsCol(voyage));

    return section;
  }

  function buildDestinations(voyages) {
    const main = document.querySelector('main');
    if (!main) return;

    main.innerHTML = '';
    voyages.forEach((voyage) => {
      main.appendChild(buildDestinationSection(voyage));
    });
  }

  /* --- Carte interactive (hero) : un marqueur par voyage --------------
     Leaflet + fond de carte sombre (OpenStreetMap), un marqueur cliquable
     par voyage aux coordonnées du JSON, qui scrolle vers sa section.
     La carte sert de fond visuel : interactions désactivées pour qu'elle
     reste un décor et ne vole pas le scroll de la page. */
  function initHeroMap(voyages) {
    const mapEl = document.getElementById('hero-map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map(mapEl, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: true,
    }).setView([10, 40], 2);

    // Tuiles OpenStreetMap standard (gratuites, sans clé API) ; l'apparence
    // sombre vient d'un filtre CSS appliqué au calque de tuiles (voir style.css)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Une seule destination avec des coordonnées aberrantes (ex: lat hors
    // -90/90) fausse tout le calcul de fitBounds et fait zoomer la carte à
    // l'extrême pour l'inclure : on l'ignore plutôt que de casser le hero
    // pour toutes les autres destinations.
    function hasValidCoordinates(voyage) {
      const { lat, lon } = voyage.coordonnees || {};
      const valid = Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      if (!valid) {
        console.warn(`Coordonnées invalides pour "${voyage.pays}" (lat=${lat}, lon=${lon}) : marqueur ignoré sur la carte du hero.`);
      }
      return valid;
    }

    const markers = voyages
      .filter(hasValidCoordinates)
      .map((voyage) => {
        const marker = L.marker([voyage.coordonnees.lat, voyage.coordonnees.lon], {
          // Icône orange/accent identique à l'ancien marqueur (voir .map-marker en CSS)
          icon: L.divIcon({ className: 'map-marker-icon', html: '<span class="map-marker"></span>', iconSize: [14, 14] }),
        }).bindTooltip(voyage.pays, { direction: 'top', offset: [0, -6] });

        marker.on('click', () => {
          document.getElementById(voyage.id)?.scrollIntoView({ behavior: 'smooth' });
        });

        marker.addTo(map);
        return marker;
      });

    if (markers.length) {
      const bounds = L.featureGroup(markers).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 4 });
      }
    }
  }

  /* --- Scrollytelling (Scrollama), initialisé APRÈS le rendu du DOM ----
     Pour chaque section destination :
     - la photo active correspond au data-step de l'étape en cours
     - le texte de l'étape en cours "s'illumine" (classe is-active) */
  function initScrollama() {
    const scroller = scrollama();

    function handleStepEnter({ element }) {
      const stepIndex = Number(element.dataset.step);
      const section = element.closest('.destination');
      if (!section) return;

      // Illumination du texte : une seule étape active à la fois par section
      section.querySelectorAll('.step').forEach((step) => {
        step.classList.toggle('is-active', step === element);
      });

      // Glissement enchaîné entre les photos de la même section, façon carousel
      // vertical : la photo active passe au premier plan, tandis que la photo
      // juste avant ("is-prev") et celle juste après ("is-next") restent
      // visibles en fond, plus petites et estompées, pour montrer ce qui vient
      // de défiler et ce qui arrive.
      section.querySelectorAll('.photo').forEach((photo) => {
        const diff = Number(photo.dataset.step) - stepIndex;
        photo.classList.toggle('is-active', diff === 0);
        photo.classList.toggle('is-prev', diff === -1);
        photo.classList.toggle('is-next', diff === 1);
      });
    }

    scroller
      .setup({
        step: '.step',
        offset: 0.75, // déclenche le changement quand l'étape passe le milieu de l'écran
        debug: false,
      })
      .onStepEnter(handleStepEnter);

    window.addEventListener('resize', scroller.resize);

    return scroller;
  }

  /* --- Précharge les photos (background-image) puis recalcule Scrollama
     Les .photo utilisent --photo-src en background-image (pas de <img>),
     donc on précharge chaque URL manuellement pour savoir quand toutes
     les images sont arrivées et que les hauteurs sont stabilisées. */
  function preloadPhotos(voyages) {
    const urls = voyages.flatMap((voyage) => voyage.photos);
    return Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = url;
          })
      )
    );
  }

  fetch(DATA_URL)
    .then((res) => res.json())
    .then((voyages) => {
      const sorted = sortByDeparture(voyages);

      buildNav(sorted);
      buildDestinations(sorted);
      initHeroMap(sorted);

      // Scrollama a besoin que les .step existent déjà dans le DOM :
      // on l'initialise seulement une fois le contenu généré et inséré.
      const scroller = initScrollama();

      // Les photos (background-image) peuvent arriver après coup et décaler
      // les hauteurs des sections : on recalcule Scrollama une fois chargées.
      preloadPhotos(sorted).then(() => scroller.resize());
    })
    .catch((err) => console.error('Impossible de charger data/voyages.json :', err));
})();
