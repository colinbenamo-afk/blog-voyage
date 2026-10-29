# Header (barre de navigation)

> À mettre à jour à chaque modification de cette section.

## Fichiers concernés

- `index.html` — balisage de `<header class="site-header">`
- `style.css` — styles (`.site-header`, `.site-header-logo-img`, `.site-header-nav`, `.site-header-nav-list`)
- `script.js` — génération des liens de nav (`buildNav`, dans `initFromVoyagesData`)

## Comment ça marche

Le header est fixe en haut de l'écran (`position: fixed`), avec un fond translucide flouté (`backdrop-filter: blur`) pour rester lisible aussi bien sur le hero sombre que sur les sections blanches en dessous.

Il contient :

- Le **logo** (`assets/logo.png`), à l'origine un lien texte, remplacé par une image.
- La **navigation** : une liste déroulante native (`<details class="site-header-nav"><summary>Les voyages</summary><ul class="site-header-nav-list">...</ul></details>`), sans JS pour l'ouverture/fermeture (comportement natif du navigateur). La `<ul>` est vide dans `index.html`, remplie par `script.js` au chargement — un `<li><a>` par destination, généré depuis `data/voyages.json` et trié dans le même ordre que les sections (chronologique par date de départ). Voir `docs/destinations.md` pour le détail du tri. Cliquer sur un lien referme le menu (petit `removeAttribute('open')` dans `buildNav`).

## Historique / ce qu'on a fait

- Les 3 liens de nav (Caraïbes / Indonésie / Sri Lanka) étaient codés en dur à l'origine.
- **30 septembre** : remplacés par une génération dynamique (`buildNav`) lors du passage au site généré depuis `data/voyages.json` — ajouter un voyage via l'admin met automatiquement à jour la nav, sans toucher à `index.html`.
- Le logo est passé d'un lien texte à une image (`assets/logo.png`), changement fait directement dans l'éditeur.
- **9 octobre** : nav transformée en liste déroulante (`<details>`/`<summary>` "Les voyages") au lieu des liens affichés côte à côte — plus compact, surtout utile si le nombre de destinations grandit.
- **29 octobre** : sur mobile, la liste déroulante (`.site-header-nav-list`) change complètement d'apparence par rapport au desktop — grand panneau à coins carrés (`border-radius: 0`), plus large (`min-width: 65vw`), texte plus gros (`1.3rem` au lieu de `0.8rem`), sur le modèle d'une référence fournie par l'utilisateur, au lieu de la petite boîte arrondie ancrée en haut à droite utilisée sur desktop.

## Points d'attention / pièges rencontrés

- Si un nouveau voyage n'apparaît pas dans la nav après ajout via l'admin : vérifier que `data/voyages.json` a bien été réécrit (voir `docs/admin.md`), et que `buildNav` est bien appelée après le `fetch` du JSON (ordre d'exécution dans `script.js`).
- La nav dépend entièrement du JS : si `script.js` échoue à charger, ou que `fetch('data/voyages.json')` échoue, le header reste avec un menu déroulant vide (le `<summary>` "Les voyages" reste affiché, mais rien dans la liste). Pas de repli HTML statique actuellement.
- Le triangle `▾`/`▴` est dessiné en CSS (`::after` sur `summary`), avec le marqueur natif du navigateur masqué (`::-webkit-details-marker { display: none; }`) — si le triangle natif réapparaît un jour sur un navigateur, c'est que cette règle ne le couvre pas (Firefox utilise `list-style: none` sur le `summary`, déjà en place).
