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

  /* --- Génération de la nav du header (liste déroulante) --------------- */
  function buildNav(voyages) {
    const details = document.querySelector('.site-header-nav');
    const list = document.querySelector('.site-header-nav-list');
    if (!list) return;

    list.innerHTML = '';
    voyages.forEach((voyage) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${voyage.id}`;
      link.textContent = voyage.pays;
      // Referme le menu après avoir choisi une destination.
      link.addEventListener('click', () => {
        if (details) details.removeAttribute('open');
      });
      item.appendChild(link);
      list.appendChild(item);
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

  // Construit le titre + coordonnées (si premier step) + texte d'une étape.
  // Réutilisé à la fois pour le contenu "normal" (.step, desktop + lecteurs
  // d'écran) et pour sa copie affichée sur mobile (.step-display).
  function buildStepBody(voyage, sectionData, index) {
    const h2 = document.createElement('h2');
    h2.textContent = sectionData.titre;

    const nodes = [h2];

    if (index === 0) {
      const coords = document.createElement('p');
      coords.className = 'coords';
      const lat = formatCoord(voyage.coordonnees.lat, 'N', 'S');
      const lon = formatCoord(voyage.coordonnees.lon, 'E', 'O');
      coords.innerHTML = `<strong>Latitude</strong> : ${lat} | <strong>Longitude</strong> : ${lon}`;
      nodes.push(coords);
    }

    const text = document.createElement('p');
    text.textContent = sectionData.texte;
    nodes.push(text);

    return nodes;
  }

  /* Sur mobile, le texte affiché ne peut pas être le même élément que le
     déclencheur de scroll (.step) : un élément "collé" (position: sticky)
     ne peut pas aussi fournir la distance de défilement nécessaire à
     Scrollama pour détecter le changement d'étape. On sépare donc :
     - .step (ci-dessous dans buildStepsCol) : élément invisible sur mobile,
       haut de plusieurs vh, sert uniquement de déclencheur ;
     - .text-frame/.step-display (ici) : copie du texte, empilée comme les
       photos (voir buildPhotoFrame), affichée seule à la fois dans un
       cadre collé en haut de l'écran. Caché entièrement sur grand écran. */
  function buildTextFrame(voyage) {
    const frame = document.createElement('div');
    frame.className = 'text-frame';

    voyage.sections.forEach((sectionData, index) => {
      const display = document.createElement('div');
      display.className = 'step-display';
      if (index === 0) display.classList.add('is-active');
      display.dataset.step = String(index);
      buildStepBody(voyage, sectionData, index).forEach((node) => display.appendChild(node));
      frame.appendChild(display);
    });

    return frame;
  }

  function buildStepsCol(voyage) {
    const stepsCol = document.createElement('div');
    stepsCol.className = 'steps-col';

    // Première dans le flux : sa position de départ (haut de .steps-col)
    // lui donne, une fois collée (mobile), toute la hauteur de la colonne
    // pour rester visible pendant le défilement des .step ci-dessous.
    stepsCol.appendChild(buildTextFrame(voyage));

    const spacerTop = document.createElement('div');
    spacerTop.className = 'step-spacer';
    stepsCol.appendChild(spacerTop);

    voyage.sections.forEach((sectionData, index) => {
      const step = document.createElement('div');
      step.className = 'step';
      step.dataset.step = String(index);
      buildStepBody(voyage, sectionData, index).forEach((node) => step.appendChild(node));
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

        // Sur un écran très haut et étroit (mobile portrait), fitBounds
        // choisit un zoom limité par la largeur disponible, ce qui laisse
        // de grandes bandes grises (tuiles manquantes) en haut et en bas.
        // On zoome un peu plus pour combler le vide vertical, une fois que
        // fitBounds a fini d'appliquer sa propre vue (sinon notre zoom se
        // fait écraser par la fin de son animation interne).
        const size = map.getSize();
        if (size.y > size.x * 1.3) {
          map.once('moveend', () => {
            map.setZoom(map.getZoom() + 2, { animate: false });
          });
        }

        // Sur mobile, ce zoom plus élevé veut dire qu'on ne voit jamais
        // le monde entier d'un coup (impossible de tout afficher sans
        // revenir aux bandes grises ci-dessus). On garde ce zoom mais on
        // fait défiler la carte en continu, de droite à gauche, pour que
        // le reste du monde défile progressivement devant les yeux.
        // Démarré après un court délai, le temps que fitBounds (et le
        // zoom correctif ci-dessus) finissent de régler la vue initiale.
        setTimeout(() => startContinuousPan(map), 600);
      }
    }
  }

  /* Défilement horizontal continu de la carte du hero (mobile uniquement),
     toujours dans le même sens (droite à gauche) — jamais de machine
     arrière. Les marqueurs dupliqués autour du globe (voir initHeroMap)
     font qu'on en croise un souvent, sans avoir besoin d'osciller. Coupé
     dès que le hero sort de l'écran (observer), pour ne pas faire tourner
     la carte inutilement une fois qu'on a scrollé plus bas sur la page. */
  function startContinuousPan(map) {
    const isMobile = window.matchMedia('(max-width: 820px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isMobile || reducedMotion) return;

    const PAN_SPEED = 0.5; // pixels par frame (~30px/s à 60 images/s)
    let running = true;
    // panBy arrondit son décalage au pixel entier : passer une valeur en
    // dessous de 0.5 donnerait donc 0 à chaque appel (aucun mouvement). On
    // accumule les fractions de pixel et on ne déplace la carte que
    // lorsqu'elles atteignent au moins 1px, pour un mouvement net fluide
    // malgré l'arrondi.
    let accumulated = 0;

    // Les tuiles de la carte se répètent à l'infini (comportement standard
    // de Leaflet), mais pas les marqueurs : leur position ne "boucle" pas
    // comme les tuiles, donc après un tour complet (une largeur du monde
    // à ce zoom), ils finiraient décalés hors champ pour de bon — alors
    // que le fond de carte, lui, continue d'avoir l'air parfaitement
    // normal. On compte la distance totale parcourue et, une fois une
    // largeur du monde atteinte, on revient silencieusement en arrière
    // d'autant : visuellement identique (le monde se répète), mais ça
    // remet les marqueurs dans la zone où Leaflet les positionne
    // correctement.
    const worldWidth = 256 * Math.pow(2, map.getZoom());
    let totalPanned = 0;

    function step() {
      if (running) {
        accumulated += PAN_SPEED;
        const whole = Math.trunc(accumulated);
        if (whole !== 0) {
          map.panBy([whole, 0], { animate: false });
          accumulated -= whole;
          totalPanned += whole;

          if (totalPanned >= worldWidth) {
            map.panBy([-worldWidth, 0], { animate: false });
            totalPanned -= worldWidth;
          }
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    const heroEl = document.querySelector('.hero');
    if ('IntersectionObserver' in window && heroEl) {
      const observer = new IntersectionObserver(([entry]) => {
        running = entry.isIntersecting;
      });
      observer.observe(heroEl);
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

      // Copie du texte affichée sur mobile (voir buildTextFrame) : une
      // seule étape visible à la fois, sans dégradé (le chevauchement de
      // deux paragraphes de texte serait illisible, contrairement aux photos).
      section.querySelectorAll('.step-display').forEach((display) => {
        display.classList.toggle('is-active', Number(display.dataset.step) === stepIndex);
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
