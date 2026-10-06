# Header (barre de navigation)

> À mettre à jour à chaque modification de cette section.

## Fichiers concernés

- `index.html` — balisage de `<header class="site-header">`
- `style.css` — styles (`.site-header`, `.site-header-logo-img`, `.site-header-nav`)
- `script.js` — génération des liens de nav (`buildNav`, dans `initFromVoyagesData`)

## Comment ça marche

Le header est fixe en haut de l'écran (`position: fixed`), avec un fond translucide flouté (`backdrop-filter: blur`) pour rester lisible aussi bien sur le hero sombre que sur les sections blanches en dessous.

Il contient :

- Le **logo** (`assets/logo.png`), à l'origine un lien texte, remplacé par une image.
- La **navigation** (`<nav class="site-header-nav">`) : vide dans `index.html`, remplie par `script.js` au chargement — un lien par destination, généré depuis `data/voyages.json` et trié dans le même ordre que les sections (chronologique par date de départ). Voir `docs/destinations.md` pour le détail du tri.

## Historique / ce qu'on a fait

- Les 3 liens de nav (Caraïbes / Indonésie / Sri Lanka) étaient codés en dur à l'origine.
- **30 septembre** : remplacés par une génération dynamique (`buildNav`) lors du passage au site généré depuis `data/voyages.json` — ajouter un voyage via l'admin met automatiquement à jour la nav, sans toucher à `index.html`.
- Le logo est passé d'un lien texte à une image (`assets/logo.png`), changement fait directement dans l'éditeur.

## Points d'attention / pièges rencontrés

- Si un nouveau voyage n'apparaît pas dans la nav après ajout via l'admin : vérifier que `data/voyages.json` a bien été réécrit (voir `docs/admin.md`), et que `buildNav` est bien appelée après le `fetch` du JSON (ordre d'exécution dans `script.js`).
- La nav dépend entièrement du JS : si `script.js` échoue à charger, ou que `fetch('data/voyages.json')` échoue, le header reste avec une nav vide. Pas de repli HTML statique actuellement.
