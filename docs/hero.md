# Hero (section d'introduction)

> À mettre à jour à chaque modification de cette section.

## Fichiers concernés

- `index.html` — balisage de `<section class="hero">`
- `style.css` — styles (`.hero`, `.hero-map`, `.hero-overlay`, `.hero-content`, `.hero-title`, `.hero-letter`, `.hero-subtitle`)
- `script.js` — animation du titre (`revealHeroTitle`) + carte interactive (`initHeroMap`, dans `initFromVoyagesData`)

## Comment ça marche

Le hero occupe tout l'écran (`height: 100vh`) et empile trois couches :

1. **`.hero-map`** — une carte Leaflet en fond (tuiles OpenStreetMap, assombries par un filtre CSS), avec un marqueur orange par destination (généré depuis `data/voyages.json`, voir `docs/destinations.md`). Les marqueurs sont cliquables et scrollent vers la section correspondante. Toutes les interactions de la carte (zoom, déplacement) sont désactivées : elle sert de décor.
2. **`.hero-overlay`** — un dégradé sombre par-dessus la carte, pour que le titre reste lisible.
3. **`.hero-content`** — le titre `<h1>` et le sous-titre, centrés.

Le titre est découpé lettre par lettre en JS (`revealHeroTitle`, section 0 de `script.js`) pour l'animation d'apparition progressive ; le texte original reste accessible aux lecteurs d'écran via `aria-label`.

Le bas du hero s'estompe en transparence (`mask-image`) pour une transition douce vers la section suivante.

## Historique / ce qu'on a fait

- Indicateur "Défiler ↓" en bas du hero : ajouté à l'origine, **supprimé** (16 septembre) à la demande de l'utilisateur, avec son CSS associé (`.hero-scroll-hint`, `.hero-scroll-arrow`, `@keyframes bounce-arrow`).
- Carte topographique animée (p5.js) : testée comme fond alternatif juste après le hero (pas dans le hero lui-même), **annulée** entièrement (22 septembre).
- Migration des marqueurs de la carte : à l'origine lus depuis `Colin_Benamo-map.geojson` (fichier séparé), **remplacés** par une génération depuis `data/voyages.json` lors du passage au site généré depuis les données (30 septembre) — le fichier `.geojson` n'est plus utilisé et a été supprimé du projet.
- Bug du hero cassé (6 octobre) : des coordonnées GPS invalides sur un voyage (lat `442134`) faisaient que Leaflet zoomait la carte à l'extrême pour essayer de les inclure, réduisant le hero à un minuscule bandeau de tuiles. Voir "Points d'attention" ci-dessous.
- Essai d'une autre source de tuiles (Esri "Dark Gray Canvas") pour teinter la terre indépendamment de l'eau (9 octobre) — **annulé**, retour aux tuiles OpenStreetMap + filtre `invert`/`hue-rotate` d'origine.
- **Deux bugs mobile corrigés (29 octobre)** :
  1. Le titre se coupait au milieu d'un mot ("voyag" / "es") : `font-size: clamp(2.6rem, 8vw, 2rem)` avait min et max inversés (2.6rem > 2rem), donc le navigateur appliquait toujours le minimum, trop grand pour un petit écran. Corrigé en `clamp(2rem, 8vw, 2.6rem)`.
  2. Sur un écran très haut et étroit (portrait), de grandes bandes grises apparaissaient en haut/bas de la carte : `fitBounds()` choisit un zoom limité par la largeur disponible, laissant un vide en hauteur. `initHeroMap()` zoome maintenant un peu plus après coup (`map.once('moveend', ...)`, `+2` niveaux) quand le conteneur est nettement plus haut que large.

## Points d'attention / pièges rencontrés

- **Une seule destination avec des coordonnées GPS hors de la plage valide (latitude hors -90/90, longitude hors -180/180) casse l'affichage de toute la carte**, pas seulement son propre marqueur — `fitBounds()` de Leaflet essaie d'inclure tous les points, même aberrants, et zoome en conséquence. `initHeroMap()` filtre maintenant les coordonnées invalides avant de calculer le cadrage (avec un `console.warn` si une destination est ignorée). Si le hero semble à nouveau cassé (carte minuscule, grise), vérifier en premier les coordonnées dans `data/voyages.json`.
- Le filtre CSS qui assombrit les tuiles de la carte (`.hero-map .leaflet-tile-pane`) dépend de la structure DOM générée par Leaflet : si une future version de la librairie change cette structure, revérifier que le filtre s'applique toujours.
- **Un `clamp(min, préféré, max)` avec `min > max` ne fait pas d'erreur visible** : le navigateur l'accepte silencieusement et applique toujours `min`, ignorant tout rétrécissement sur petit écran. Si un texte semble "bloqué" à une taille trop grande sur mobile, vérifier l'ordre des valeurs dans le `clamp()` en premier.
- **`map.setZoom()` juste après `map.fitBounds()` peut se faire écraser** : `fitBounds` applique sa propre vue de façon un peu différée en interne, donc un ajustement de zoom immédiatement après peut être ignoré. Il faut attendre l'événement `moveend` (`map.once('moveend', () => map.setZoom(...))`) pour que l'ajustement s'applique réellement.
