# Page des destinations (sections "pays")

> À mettre à jour à chaque modification de cette section.

## Fichiers concernés

- `data/voyages.json` — le contenu (une entrée par destination), voir `data/README.md` pour le détail du schéma
- `script.js` — génération du HTML (`buildDestinations`, `buildPhotoFrame`, `buildStepsCol`...) + scrollytelling (`initScrollama`)
- `style.css` — tous les styles `.destination`, `.sticky-col`, `.photo*`, `.steps-col`, `.step*`

## Comment ça marche

Chaque destination est une section `.destination` à deux colonnes :

- **`.sticky-col`** (gauche) : reste fixe à l'écran pendant que le texte défile. Contient 3 `.photo` empilées (une par étape), gérées par Scrollama : la photo active est au premier plan, celle juste avant/après reste visible en fond (plus petite, floutée, estompée — classes `.is-prev`/`.is-next`), pour montrer ce qui vient de défiler et ce qui arrive.
- **`.steps-col`** (droite) : un `.step` par étape (titre + texte). Le premier step de chaque destination sert de "fiche pratique" : son titre (le nom du pays) est affiché en très grand et en minuscules (règle `.step[data-step="0"] h2`), avec les coordonnées GPS juste en dessous (police Space Mono).

Tout ce contenu est **généré en JavaScript** (`initFromVoyagesData` dans `script.js`) à partir de `data/voyages.json`, trié chronologiquement par `ordre_depart` (les voyages sans date connue restent à la fin, dans leur ordre d'origine). Scrollama est initialisé **après** cette génération, sinon il ne trouverait aucun `.step` à observer.

## Historique / ce qu'on a fait

- **16 septembre** : effet de "peek" ajouté — les photos précédente/suivante restent visibles en fond pendant le scroll (`.is-prev`/`.is-next`), calculé en JS par différence d'étape (`diff = photoStep - currentStep`) plutôt que par l'état précédent du DOM, pour fonctionner dans les deux sens de scroll.
- **22 septembre** : coordonnées GPS ajoutées sous le titre de chaque destination (bug de retour à la ligne corrigé avec `white-space: nowrap`).
- **22 septembre** : deux expérimentations testées *ailleurs* dans la page (pas dans les sections destinations elles-mêmes) puis annulées : une galerie "Vertical Parallax" et une carte topographique animée en fond.
- **30 septembre** : contenu entièrement codé en dur dans `index.html` → **migré vers `data/voyages.json`**, généré dynamiquement par `script.js`. Permet d'ajouter des destinations sans toucher au HTML (voir `docs/admin.md`).
- **30 septembre** : le CSS du fond des photos (`background-image`) ne reconnaissait que les 3 destinations d'origine via des sélecteurs `[data-destination="..."]` codés en dur — généralisé en une seule règle `.photo` valable pour n'importe quelle destination.
- **30 septembre** : titre du pays (premier step) mis en évidence avec un style à part (très grand, minuscules).

## Points d'attention / pièges rencontrés

- **Scrollama doit être initialisé après la génération du DOM**, pas avant — sinon aucun `.step` n'est observé et le scrollytelling ne se déclenche jamais.
- Les photos sont en `background-image` (pas des `<img>`), donc pas d'événement `load` natif : `script.js` précharge chaque URL manuellement (`preloadPhotos`) et relance `scroller.resize()` une fois toutes chargées, pour que les hauteurs de section soient correctes même si les photos arrivent après coup.
- Ajouter une nouvelle destination ne demande aucune modification de `style.css` ou `index.html` — tout passe par `data/voyages.json` (via l'admin, voir `docs/admin.md`). Si un ajout casse l'affichage, le problème est presque toujours dans les données (coordonnées invalides, champ manquant), pas dans le CSS/JS.
