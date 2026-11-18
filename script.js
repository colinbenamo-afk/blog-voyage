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
   à partir du JSON, trié chronologiquement par année du voyage. Le
   rendu final (classes CSS, data-attributes) reproduit exactement
   ce qui était auparavant codé en dur, pour que style.css n'ait
   rien à changer.
   ========================================================= */
(function initFromVoyagesData() {
  const DATA_URL = 'data/voyages.json';

  /* --- Tri chronologique par année ---------------------------------- */
  // Seule l'année compte (c'est tout ce que l'admin demande). Les voyages
  // sans année sont envoyés à la fin. Le tri de JS est stable : deux
  // voyages de la même année gardent l'ordre dans lequel ils ont été
  // ajoutés.
  // Repli : un voyages.json plus ancien (ex : celui déjà en ligne) n'a pas
  // de champ "annee" mais une date "ordre_depart" (AAAA-MM-JJ) : on en
  // reprend l'année, pour ne rien casser tant qu'il n'a pas été mis à jour.
  function getAnnee(voyage) {
    const annee = Number(voyage.annee);
    if (Number.isInteger(annee) && annee > 0) return annee;
    const match = /^(\d{4})/.exec(String(voyage.ordre_depart ?? ''));
    return match ? Number(match[1]) : null;
  }

  function sortByYear(voyages) {
    const rank = (voyage) => getAnnee(voyage) ?? Number.MAX_SAFE_INTEGER;
    return [...voyages].sort((a, b) => rank(a) - rank(b));
  }

  /* --- Frise chronologique (bord gauche de la page) --------------------
     Inspirée de destination2075.com : un petit trait par voyage, serrés les
     uns sous les autres. Le trait du voyage en cours s'allonge, et une seule
     année est affichée à côté de lui ; quand on change de voyage, ses
     chiffres défilent comme un compteur. Cliquer un trait mène au pays.
     Cachée sur le hero. */
  function buildTimeline(voyages) {
    const main = document.querySelector('main');
    if (!main || !voyages.length) return () => {};

    const frise = document.createElement('nav');
    frise.className = 'frise';
    frise.setAttribute('aria-label', 'Frise chronologique des voyages');

    const ticksEl = document.createElement('div');
    ticksEl.className = 'frise-ticks';
    const items = voyages.map((voyage) => {
      const annee = getAnnee(voyage);
      const tick = document.createElement('a');
      tick.className = 'frise-tick';
      tick.href = `#${voyage.id}`;
      tick.setAttribute('aria-label', annee ? `${voyage.pays} (${annee})` : voyage.pays);
      ticksEl.appendChild(tick);
      return { tick, annee, section: document.getElementById(voyage.id) };
    });

    // L'année : 4 colonnes contenant chacune les chiffres 0 à 9 empilés.
    // Afficher un chiffre = faire glisser sa colonne verticalement (CSS),
    // d'où l'effet de compteur qui défile.
    const label = document.createElement('span');
    label.className = 'frise-annee';
    label.setAttribute('aria-hidden', 'true');
    const strips = [];
    for (let i = 0; i < 4; i += 1) {
      const col = document.createElement('span');
      col.className = 'frise-chiffre';
      const strip = document.createElement('span');
      strip.className = 'frise-bande';
      for (let d = 0; d <= 9; d += 1) {
        const digit = document.createElement('span');
        digit.textContent = d;
        strip.appendChild(digit);
      }
      col.appendChild(strip);
      label.appendChild(col);
      strips.push(strip);
    }
    ticksEl.appendChild(label);

    frise.appendChild(ticksEl);
    document.body.appendChild(frise);

    let current = null;

    function showYear(annee) {
      label.classList.toggle('is-empty', annee === null);
      if (annee === null) return;
      String(annee).padStart(4, '0').split('').forEach((digit, i) => {
        strips[i].style.transform = `translateY(${-Number(digit)}em)`;
      });
    }

    function update() {
      const reference = window.scrollY + window.innerHeight * 0.5;
      const mainTop = main.offsetTop;
      frise.classList.toggle('is-visible', reference > mainTop && reference < mainTop + main.offsetHeight);

      let active = items[0];
      items.forEach((item) => {
        if (item.section && reference >= item.section.offsetTop) active = item;
      });
      if (active === current) return;
      current?.tick.classList.remove('is-active');
      active.tick.classList.add('is-active');
      label.style.setProperty('--y', `${active.tick.offsetTop + active.tick.offsetHeight / 2}px`);
      showYear(active.annee);
      current = active;
    }

    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        update();
      });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return schedule;
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

    // Bouton « Voir la suite du voyage » sous le DERNIER texte du pays, vers
    // son article. Seulement si un article a été créé dans l'admin (l'admin
    // met "article": true dans voyages.json) : pas de bouton vers une page
    // vide. Dans un <p> pour suivre les mêmes règles d'affichage que le
    // texte (voir style.css).
    if (index === voyage.sections.length - 1 && voyage.article) {
      const suite = document.createElement('p');
      suite.className = 'voyage-suite';
      const a = document.createElement('a');
      a.href = `pays.html?id=${encodeURIComponent(voyage.id)}`;
      a.textContent = 'Voir la suite du voyage';
      const fleche = document.createElement('span');
      fleche.setAttribute('aria-hidden', 'true');
      fleche.textContent = '→';
      a.appendChild(fleche);
      suite.appendChild(a);
      nodes.push(suite);
    }

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

  /* --- Globe 3D interactif (hero) : un point par voyage ------------------
     globe.gl (Three.js), avec un point cliquable par voyage aux coordonnées
     du JSON, qui scrolle vers sa section. Les frontières des pays viennent
     de data/countries.geojson (Natural Earth, basse résolution, domaine
     public). Contrairement à l'ancienne carte Leaflet 2D, le globe est
     volontairement interactif (glisser pour tourner) sur desktop ET
     mobile : c'est tout l'intérêt par rapport à la carte plate.
     Essai avec les pays entiers coloriés en orange (au lieu de points)
     tenté le 4 novembre puis abandonné sur demande : l'utilisateur avait
     du mal à viser/cliquer un pays précis. Retour aux points, agrandis. */
  function initHeroMap(voyages) {
    const mapEl = document.getElementById('hero-map');
    if (!mapEl || typeof Globe === 'undefined') return;

    // Une seule destination avec des coordonnées aberrantes (ex: lat hors
    // -90/90) pourrait fausser l'affichage : on l'ignore plutôt que de
    // casser le hero pour toutes les autres destinations.
    function hasValidCoordinates(voyage) {
      const { lat, lon } = voyage.coordonnees || {};
      const valid = Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      if (!valid) {
        console.warn(`Coordonnées invalides pour "${voyage.pays}" (lat=${lat}, lon=${lon}) : point ignoré sur le globe du hero.`);
      }
      return valid;
    }

    const points = voyages.filter(hasValidCoordinates).map((voyage) => ({
      id: voyage.id,
      pays: voyage.pays,
      lat: voyage.coordonnees.lat,
      lng: voyage.coordonnees.lon,
    }));

    // Marqueurs en vrais éléments HTML (htmlElementsData), pas des points
    // WebGL (pointsData) : plus faciles à viser/toucher, puisque le clic
    // passe par le DOM normal du navigateur au lieu d'un calcul de
    // précision 3D (raycasting) qui, en plus, entre parfois en conflit
    // avec le glisser-tourner (OrbitControls) quand le clic contient le
    // moindre mouvement de souris/doigt. Zone cliquable volontairement
    // plus grande que le point visible (voir .hero-globe-marker en CSS),
    // essayé après que l'utilisateur ait eu du mal à cliquer les points
    // WebGL malgré un `pointRadius` déjà agrandi.
    let myGlobe;
    try {
      myGlobe = Globe()(mapEl)
        .backgroundColor('rgba(0,0,0,0)')
        .htmlElementsData(points)
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0)
        .htmlElement((d) => {
          const el = document.createElement('div');
          el.className = 'hero-globe-marker';
          el.title = d.pays;
          el.addEventListener('click', () => {
            document.getElementById(d.id)?.scrollIntoView({ behavior: 'smooth' });
          });
          return el;
        });
    } catch (err) {
      console.error("Impossible d'initialiser le globe du hero :", err);
      return;
    }

    // Couleur de l'océan : même teinte que l'ancienne carte 2D (tuiles OSM
    // + filtre invert/hue-rotate), pour garder l'identité visuelle du site.
    try {
      const mat = myGlobe.globeMaterial();
      mat.color.set('#12262d');
      mat.emissive.set('#0a1418');
      mat.emissiveIntensity = 0.35;
    } catch (e) {}

    try {
      myGlobe.showAtmosphere(false);
    } catch (e) {}

    // Frontières des pays, chargées à part (fichier de ~165 Ko) plutôt que
    // mises en dur ici. Isolé dans son propre .catch : si le fichier ne
    // charge pas, le globe uni (sans pays) reste quand même utilisable.
    // Remplissage terre quasi identique à l'océan (comme sur la carte 2D
    // d'origine) ; ligne de frontière fine et peu lumineuse (sage à faible
    // opacité), pas une bordure épaisse.
    fetch('data/countries.geojson')
      .then((res) => res.json())
      .then((countries) => {
        myGlobe
          .polygonsData(countries.features)
          .polygonCapColor(() => '#121616')
          .polygonSideColor(() => '#0a0c0c')
          .polygonStrokeColor(() => 'rgba(136, 159, 113, 0.35)')
          .polygonAltitude(0.006);
      })
      .catch((err) => console.warn('Impossible de charger data/countries.geojson :', err));

    function resize() {
      const rect = mapEl.getBoundingClientRect();
      try {
        myGlobe.width(rect.width).height(rect.height);
      } catch (e) {}
    }
    resize();
    window.addEventListener('resize', resize);

    try {
      myGlobe.pointOfView({ lat: 15, lng: 20, altitude: 1.8 }, 0);
    } catch (e) {}

    startGlobeRotation(myGlobe);
  }

  /* Rotation du globe du hero : glisser pour tourner soi-même (contrôles
     natifs de globe.gl/Three.js, OrbitControls), + rotation automatique
     douce tant qu'on n'interagit pas. Coupée dès que le hero sort de
     l'écran, pour ne pas tourner inutilement plus bas sur la page.
     Sur mobile (≤ 820px), le globe ne tourne qu'horizontalement : l'angle
     vertical est verrouillé et le canvas repasse en `touch-action: pan-y`
     (OrbitControls le met à `none`, ce qui bloquait le défilement de la
     page au doigt). Glisser à la verticale = scroller la page. */
  function startGlobeRotation(myGlobe) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let controls;
    try {
      controls = myGlobe.controls();
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = !reducedMotion;
      controls.autoRotateSpeed = 0.4;
      if (window.matchMedia('(max-width: 820px)').matches) {
        const polar = controls.getPolarAngle();
        controls.minPolarAngle = polar;
        controls.maxPolarAngle = polar;
        controls.domElement.style.touchAction = 'pan-y';
      }
    } catch (e) {
      return;
    }

    const heroEl = document.querySelector('.hero');
    if ('IntersectionObserver' in window && heroEl) {
      // Hors écran, on coupe aussi la boucle de rendu 3D elle-même (pas
      // seulement la rotation) : sinon le globe continue d'être redessiné
      // 60 fois par seconde pour rien pendant qu'on lit les destinations.
      const observer = new IntersectionObserver(([entry]) => {
        controls.autoRotate = !reducedMotion && entry.isIntersecting;
        try {
          if (entry.isIntersecting) myGlobe.resumeAnimation();
          else myGlobe.pauseAnimation();
        } catch (e) {}
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

      // Illumination du texte : une seule étape active à la fois, sur toute
      // la page (pas juste "par section" : sinon la dernière étape active
      // d'un pays garde sa classe is-active pour toujours une fois qu'on
      // est passé au pays suivant, puisque handleStepEnter ne retouche
      // ensuite que la nouvelle section).
      document.querySelectorAll('.step').forEach((step) => {
        step.classList.toggle('is-active', step === element);
      });

      // Glissement enchaîné entre les photos de la même section, façon carousel
      // vertical : la photo active passe au premier plan, tandis que la photo
      // juste avant ("is-prev") et celle juste après ("is-next") restent
      // visibles en fond, plus petites et estompées, pour montrer ce qui vient
      // de défiler et ce qui arrive. Les photos des AUTRES sections sont
      // explicitement désactivées (même raison que ci-dessus).
      document.querySelectorAll('.photo').forEach((photo) => {
        if (photo.closest('.destination') !== section) {
          photo.classList.remove('is-active', 'is-prev', 'is-next');
          return;
        }
        const diff = Number(photo.dataset.step) - stepIndex;
        photo.classList.toggle('is-active', diff === 0);
        photo.classList.toggle('is-prev', diff === -1);
        photo.classList.toggle('is-next', diff === 1);
      });

      // Copie du texte affichée sur mobile (voir buildTextFrame) : une
      // seule étape visible à la fois, sans dégradé (le chevauchement de
      // deux paragraphes de texte serait illisible, contrairement aux photos).
      // Même correctif : il ne doit en rester qu'une sur toute la page.
      document.querySelectorAll('.step-display').forEach((display) => {
        const sameSection = display.closest('.destination') === section;
        display.classList.toggle('is-active', sameSection && Number(display.dataset.step) === stepIndex);
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
    const urls = [...new Set(voyages.flatMap((voyage) => voyage.photos))];
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
      const sorted = sortByYear(voyages);

      buildNav(sorted);
      buildDestinations(sorted);
      const refreshTimeline = buildTimeline(sorted);
      initHeroMap(sorted);

      // Scrollama a besoin que les .step existent déjà dans le DOM :
      // on l'initialise seulement une fois le contenu généré et inséré.
      const scroller = initScrollama();

      // Les photos (background-image) peuvent arriver après coup et décaler
      // les hauteurs des sections : on recalcule Scrollama une fois chargées.
      preloadPhotos(sorted).then(() => {
        scroller.resize();
        refreshTimeline();
      });
    })
    .catch((err) => console.error('Impossible de charger data/voyages.json :', err));
})();
