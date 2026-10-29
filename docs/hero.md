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
- **Défilement horizontal continu de la carte sur mobile (29 octobre)** : ce zoom plus élevé veut dire qu'on ne voit jamais le monde entier d'un coup sur mobile. Plutôt que de revenir aux bandes grises, la carte défile maintenant doucement, toujours dans le même sens — droite à gauche (`startContinuousPan()`, `script.js`), uniquement sur mobile (`matchMedia`) et sauf préférence `prefers-reduced-motion`. Coupé via `IntersectionObserver` quand le hero sort de l'écran, pour ne pas tourner inutilement une fois qu'on a scrollé plus bas. Plusieurs ajustements successifs :
  1. D'abord un défilement continu dans un seul sens sur un tour complet du monde, avec un rebouclage silencieux pour les marqueurs (voir "Points d'attention" ci-dessous). Problème rapporté par l'utilisateur : les destinations sont regroupées dans une petite zone (`fitBounds` centre déjà la vue dessus), donc la quasi-totalité du tour traversait de l'océan vide, et les marqueurs ne redevenaient visibles qu'au moment où la carte repassait pile par son point de départ.
  2. Essai d'un va-et-vient borné (oscillation droite-gauche-droite autour du centre d'origine) — **rejeté par l'utilisateur** : il voulait une vraie rotation continue, pas un mouvement qui "revient en arrière".
  3. Essai de marqueurs dupliqués autour du globe (copies décalées en longitude de chaque marqueur, en plus de l'original) pour qu'un marqueur soit visible plus souvent — **rejeté également** : les copies tombaient sur des zones sans aucun rapport avec les vraies destinations (en plein milieu de l'océan, etc.), ce qui ne voulait rien dire visuellement. Retiré entièrement.
  4. **État actuel : défilement continu dans un seul sens, un seul marqueur réel par destination (4 au total), sans artifice.** Le fait que les marqueurs ne soient pas visibles en permanence est accepté comme comportement normal plutôt que "corrigé" à tout prix — les deux tentatives de correctif (va-et-vient, doublons) avaient chacune un défaut pire que le problème d'origine.

## Points d'attention / pièges rencontrés

- **Une seule destination avec des coordonnées GPS hors de la plage valide (latitude hors -90/90, longitude hors -180/180) casse l'affichage de toute la carte**, pas seulement son propre marqueur — `fitBounds()` de Leaflet essaie d'inclure tous les points, même aberrants, et zoome en conséquence. `initHeroMap()` filtre maintenant les coordonnées invalides avant de calculer le cadrage (avec un `console.warn` si une destination est ignorée). Si le hero semble à nouveau cassé (carte minuscule, grise), vérifier en premier les coordonnées dans `data/voyages.json`.
- Le filtre CSS qui assombrit les tuiles de la carte (`.hero-map .leaflet-tile-pane`) dépend de la structure DOM générée par Leaflet : si une future version de la librairie change cette structure, revérifier que le filtre s'applique toujours.
- **Un `clamp(min, préféré, max)` avec `min > max` ne fait pas d'erreur visible** : le navigateur l'accepte silencieusement et applique toujours `min`, ignorant tout rétrécissement sur petit écran. Si un texte semble "bloqué" à une taille trop grande sur mobile, vérifier l'ordre des valeurs dans le `clamp()` en premier.
- **`map.setZoom()` juste après `map.fitBounds()` peut se faire écraser** : `fitBounds` applique sa propre vue de façon un peu différée en interne, donc un ajustement de zoom immédiatement après peut être ignoré. Il faut attendre l'événement `moveend` (`map.once('moveend', () => map.setZoom(...))`) pour que l'ajustement s'applique réellement.
- **`map.panBy()` arrondit son décalage au pixel entier** : lui passer un décalage inférieur à 0.5px (ex: `[0.4, 0]`) ne produit AUCUN mouvement, puisque chaque appel est indépendant et arrondit à 0 à chaque fois (pas d'accumulation automatique). Pour un défilement lent et fluide, il faut accumuler les fractions de pixel soi-même en JS et n'appeler `panBy` qu'une fois le total passé à 1px ou plus (voir `startContinuousPan()`).
- **Les marqueurs ne "bouclent" pas comme les tuiles** : les tuiles OpenStreetMap se répètent à l'infini est-ouest (comportement standard de Leaflet), donc le fond de carte a toujours l'air normal même après un défilement très long. Les marqueurs, eux, ne bouclent pas — sans précaution, ils finissent décalés hors champ pour de bon après un tour complet (une largeur du monde parcourue), invisibles, alors que la carte en dessous continue d'avoir l'air normale. `startContinuousPan()` compte la distance totale parcourue et revient silencieusement en arrière d'une largeur du monde (`map.panBy([-worldWidth, 0], ...)`) à chaque tour complet — invisible à l'écran puisque le monde se répète à l'identique, mais ça remet les marqueurs dans la zone où Leaflet les positionne correctement.
- **Les destinations sont naturellement regroupées, pas réparties sur tout le globe** : `fitBounds` centre la vue initiale sur elles, donc un simple défilement continu dans un seul sens passe la plupart du temps sur de l'océan vide avant de revenir sur elles. Deux pistes essayées pour que les marqueurs soient visibles plus souvent (oscillation bornée, marqueurs dupliqués) ont chacune été rejetées — voir "Historique" ci-dessus. Les creux sans marqueur pendant le défilement sont acceptés tels quels pour l'instant.
- **Attention à l'effet de bord des tests à largeur de fenêtre réduite** : le seuil mobile est `max-width: 820px` (JS *et* CSS). Une fenêtre de navigateur "desktop" mais non maximisée, ou avec les outils de développement ouverts sur le côté, peut facilement repasser sous cette largeur et déclencher le défilement continu — ce n'est pas un bug du mode desktop, juste la largeur réelle de la fenêtre à ce moment-là.
