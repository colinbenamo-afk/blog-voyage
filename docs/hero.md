# Hero (section d'introduction)

> À mettre à jour à chaque modification de cette section.

## Fichiers concernés

- `index.html` — balisage de `<section class="hero">`, chargement du script `globe.gl` via CDN
- `style.css` — styles (`.hero`, `.hero-map`, `.hero-overlay`, `.hero-content`, `.hero-title`, `.hero-letter`, `.hero-subtitle`)
- `script.js` — animation du titre (`revealHeroTitle`) + globe 3D interactif (`initHeroMap`, `startGlobeRotation`, dans `initFromVoyagesData`)
- `data/countries.geojson` — contours des 177 pays du monde (Natural Earth, basse résolution 110m, domaine public), utilisés pour dessiner les frontières sur le globe

## Comment ça marche

Le hero occupe tout l'écran (`height: 100vh`) et empile trois couches :

1. **`.hero-map`** — un globe 3D interactif en fond (librairie **globe.gl**, qui encapsule Three.js/WebGL). Plutôt qu'un point par destination, c'est le **pays entier qui s'allume en orange** (généré depuis `data/voyages.json`, voir `docs/destinations.md`). Les pays orange sont cliquables et scrollent vers la section correspondante, sans légende ni nom de pays affiché.
2. **`.hero-overlay`** — un dégradé sombre par-dessus le globe, pour que le titre reste lisible.
3. **`.hero-content`** — le titre `<h1>` et le sous-titre, centrés.

Le titre est découpé lettre par lettre en JS (`revealHeroTitle`, section 0 de `script.js`) pour l'animation d'apparition progressive ; le texte original reste accessible aux lecteurs d'écran via `aria-label`.

Le bas du hero s'estompe en transparence (`mask-image`) pour une transition douce vers la section suivante.

### Le globe (`initHeroMap`)

1. **Initialisation** : `Globe()(mapEl)` crée le globe dans `#hero-map`. `onPolygonClick` scrolle vers la section du pays cliqué (`scrollIntoView`), mais seulement s'il correspond à un voyage (`feature.__voyageId`) ; `onPolygonHover` change le curseur en pointeur au survol d'un pays visité.
2. **Couleurs** : `globeMaterial().color`/`.emissive` fixent la couleur de l'océan (même teinte que l'ancienne carte 2D, voir plus bas) ; `showAtmosphere(false)` retire le halo lumineux par défaut de globe.gl (demandé explicitement, jugé trop présent).
3. **Pays visités, trouvés par géométrie plutôt que par nom** : `data/countries.geojson` est chargé à part (`fetch`, isolé dans son propre `.catch` — si le fichier ne charge pas, le globe uni reste quand même utilisable). Pour savoir quel contour de pays correspond à quel voyage, `script.js` fait un test "point dans un polygone" (ray casting, `pointInGeometry`/`pointInRing`) entre les coordonnées GPS de chaque voyage et la géométrie de chaque pays — plutôt que de comparer les noms (qui ne s'écriraient pas forcément pareil des deux côtés). Le pays trouvé est marqué (`feature.__voyageId = voyage.id`) et colorié en orange (`polygonCapColor`) ; les autres gardent un remplissage quasi identique à l'océan (comme sur la carte 2D d'origine), distingués par une fine ligne de frontière sage à faible opacité.
4. **Cercle de secours pour les petites îles absentes du fichier** (`makeFallbackCircle`) : à la résolution utilisée (110m, la plus légère), certaines petites îles n'existent pas comme contour séparé — c'est le cas de la Guadeloupe pour "Caraïbes", qui ne matche donc aucun pays à l'étape précédente. Pour ces voyages-là, un petit cercle orange généré par le code (24 points autour des coordonnées GPS) est ajouté à la liste des polygones affichés, avec le même `__voyageId`.
5. **Taille** : `width()`/`height()` suivent la taille réelle du conteneur (`getBoundingClientRect()`), recalculés au redimensionnement de la fenêtre.
6. **Rotation** (`startGlobeRotation`) : contrairement à l'ancienne carte 2D (dont les interactions étaient toutes désactivées, décor pur), le globe est **volontairement interactif sur desktop ET mobile** — glisser pour tourner soi-même (contrôles natifs de Three.js, `OrbitControls`, activés par défaut), plus une rotation automatique douce (`controls().autoRotate`) tant qu'on n'interagit pas. Coupée dès que le hero sort de l'écran (`IntersectionObserver`), et désactivée si `prefers-reduced-motion`. Le zoom et le déplacement latéral (pan) de la caméra sont désactivés (`enableZoom`/`enablePan`) : seule la rotation reste possible.

## Historique / ce qu'on a fait

**Avant le globe 3D, le hero utilisait une carte Leaflet classique (2D, tuiles OpenStreetMap assombries en CSS)**, du 30 septembre au 4 novembre. Résumé de cette période (détails disponibles dans l'historique git si besoin) :

- Marqueurs d'abord lus depuis un fichier `.geojson` séparé, puis générés depuis `data/voyages.json` (30 septembre).
- Bug du hero cassé par une coordonnée GPS invalide faisant zoomer `fitBounds()` à l'extrême (6 octobre) — a mené à la validation des coordonnées toujours en place aujourd'hui (voir "Points d'attention").
- Essai d'une autre source de tuiles (Esri), annulé (9 octobre).
- Deux bugs mobile corrigés (titre coupé, bandes grises sur la carte) le 29 octobre.
- **Long chantier du défilement continu sur mobile** (29 octobre) : la carte 2D ne pouvait pas montrer le monde entier sur un petit écran, donc un défilement horizontal continu a été ajouté — avec plusieurs allers-retours (rebouclage des marqueurs après un tour, essai d'un va-et-vient rejeté par l'utilisateur, essai de marqueurs dupliqués autour du globe rejeté aussi car ça ne correspondait à rien géographiquement). Finalement accepté tel quel (marqueurs parfois invisibles pendant le défilement) faute de meilleure solution *dans le cadre d'une carte 2D*.
- Nom du pays au survol d'un marqueur retiré (4 novembre).

**Tout ce chantier de défilement 2D est devenu obsolète avec le passage au globe 3D** : un vrai globe qu'on peut faire tourner soi-même règle naturellement le problème qui l'avait motivé (voir ci-dessous).

- **Migration de la carte 2D (Leaflet) vers un globe 3D interactif (globe.gl) — 4 novembre**, sur demande de l'utilisateur après avoir vu un exemple de site avec un globe rotatif (`animatemytravel.com`) :
  1. **Prototypage d'abord dans un artifact séparé**, sans toucher au site, pour valider le rendu avant d'intégrer quoi que ce soit — plusieurs allers-retours sur ce prototype : taille du globe, suppression du halo lumineux orange par défaut, couleurs terre/eau (d'abord un vert sauge trop lumineux pour les frontières, puis alignées sur les couleurs réelles de la carte 2D du site une fois échantillonnées sur une vraie capture d'écran), ajout des frontières de tous les pays (d'abord seulement les continents, puis les 177 pays avec leurs frontières, sur demande).
  2. **Intégration dans le site une fois le rendu validé** : `index.html` (script `leaflet` → script `globe.gl`, suppression du CSS Leaflet), `style.css` (tout le bloc `.hero-map .leaflet-*` remplacé), `script.js` (`initHeroMap` et `startContinuousPan` réécrits entièrement).
  3. **Nouveau fichier `data/countries.geojson`** : contours Natural Earth 110m (177 pays), téléchargés puis allégés (propriétés inutiles retirées, précision des coordonnées réduite à 2 décimales) pour passer de ~490 Ko à ~165 Ko.
  4. **Le globe est interactif partout** (glisser pour tourner, sur desktop comme sur mobile), alors que l'ancienne carte 2D était un pur décor sans aucune interaction possible — changement de philosophie assumé : c'est tout l'intérêt d'un globe par rapport à une carte plate.
  5. **Point d'attention traité avec soin : le scroll tactile sur mobile.** Un globe qui capte le glisser-tourner pourrait, par erreur, empêcher de scroller la page au doigt depuis le hero. Réglé avec `touch-action: pan-y` en CSS sur `.hero-map` (garantie au niveau du navigateur, indépendante de ce que fait la librairie JS) : les gestes tactiles verticaux restent toujours un défilement de page, jamais une rotation. Vérifié avec un vrai geste de scroll tactile simulé (CDP `Input.synthesizeScrollGesture`), pas juste en lisant le code.
  6. Testé avant mise en ligne : rendu desktop et mobile, absence d'erreur console, clic sur un point → scroll vers la bonne section, rotation automatique effective (position de caméra vérifiée avant/après), scroll tactile non bloqué, et balayage complet du reste du site (pas de débordement horizontal, nav toujours fonctionnelle) pour s'assurer qu'aucune régression n'a été introduite ailleurs.
- **Remplacement des points par des pays entiers coloriés en orange — 4 novembre**, sur demande, pour une identification plus visuelle des destinations que de petits points :
  1. **Pays trouvé par géométrie** (test "point dans un polygone", voir "Comment ça marche" ci-dessus) plutôt que par nom, pour ne pas dépendre d'une correspondance exacte entre `data/voyages.json` et les noms du fichier de pays.
  2. **Bug rencontré et corrigé : tout le globe s'est retrouvé orange** au lieu de seulement les 4 pays visités, y compris l'océan. Cause trouvée par élimination (désactiver le cercle de secours des Caraïbes a immédiatement réglé le problème, isolant le coupable) : le petit cercle généré pour les Caraïbes (île absente du fichier de pays, voir ci-dessous) avait ses points dans le mauvais sens de rotation. GeoJSON attend un contour extérieur dans un sens précis (horaire vu depuis l'extérieur du globe) ; dans le sens inverse, le moteur de rendu de globe.gl a interprété le cercle à l'envers — "tout sauf ce petit cercle" — et colorié la quasi-totalité de la sphère en orange. Corrigé en inversant le sens de parcours des points du cercle (un simple signe `-` devant l'angle).
  3. **Cas particulier des petites îles absentes du fichier de pays** (la Guadeloupe, pour "Caraïbes", n'existe pas comme contour séparé à la résolution 110m utilisée — vérifié aussi à la résolution 50m, toujours absente) : plutôt que de laisser ce voyage sans rien d'orange, un petit cercle généré par le code sert de secours (voir "Comment ça marche").

## Points d'attention / pièges rencontrés

- **Une seule destination avec des coordonnées GPS hors de la plage valide (latitude hors -90/90, longitude hors -180/180) peut fausser l'affichage** — `initHeroMap()` filtre les coordonnées invalides avant de les utiliser (avec un `console.warn` si une destination est ignorée). Si le hero semble cassé, vérifier en premier les coordonnées dans `data/voyages.json`.
- **Le sens de parcours des points d'un polygone GeoJSON fait toute la différence, sans erreur visible dans la console** : un contour extérieur dans le mauvais sens n'est pas rejeté, il est juste interprété à l'envers (l'intérieur devient l'extérieur et vice-versa) — ce qui peut faire colorier TOUT le globe au lieu d'une petite zone, comme rencontré avec le cercle de secours des Caraïbes (voir "Historique"). Si un polygone généré à la main se met un jour à couvrir beaucoup plus de surface que prévu, vérifier le sens de rotation de ses points en premier.
- **`touch-action: pan-y` sur `.hero-map` est ce qui empêche le globe de bloquer le scroll tactile sur mobile** — si un jour quelqu'un retire cette règle CSS en pensant qu'elle ne sert à rien, le hero redeviendra probablement inutilisable au doigt (plus moyen de scroller depuis cette zone). À garder précieusement.
- **Un pays orange peut occasionnellement se retrouver caché derrière le titre** (`.hero-content`, centré par-dessus le globe) selon l'angle de rotation du moment — le clic ne fonctionne alors pas à cet instant précis, puisque le titre intercepte le clic avant qu'il n'atteigne le globe en dessous. Comme le globe tourne en continu, ce n'est que temporaire ; pas jugé assez gênant pour justifier un correctif.
- **globe.gl charge Three.js en entier** (plusieurs centaines de Ko, bien plus lourd que Leaflet) : c'est le compromis assumé d'un rendu 3D par rapport à une carte 2D plate. Pas un souci pour ce projet, mais à garder en tête si la performance devient un jour un sujet.
- **`data/countries.geojson` est un fichier de données généré, pas écrit à la main** — si les frontières doivent changer un jour (résolution différente, dataset à jour, îles manquantes supplémentaires à ajouter en secours), il faut retélécharger un GeoJSON de pays (ex: Natural Earth `ne_110m_admin_0_countries`), puis l'alléger (retirer les champs `properties`/`bbox`, arrondir les coordonnées) avant de remplacer le fichier.
- **Un `clamp(min, préféré, max)` avec `min > max` ne fait pas d'erreur visible** : le navigateur l'accepte silencieusement et applique toujours `min`, ignorant tout rétrécissement sur petit écran. Si un texte semble "bloqué" à une taille trop grande sur mobile, vérifier l'ordre des valeurs dans le `clamp()` en premier.
