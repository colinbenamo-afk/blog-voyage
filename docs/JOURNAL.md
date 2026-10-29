# Journal du projet — Blog Voyage

Historique de ce qu'on a fait sur le projet, jour par jour. Les dates
d'avant le premier commit git sont reconstituées à partir des
horodatages de la session de travail — approximatives pour les tout
premiers jours, mais l'ordre des étapes est fiable. Pour le détail
technique de chaque partie, voir `docs/hero.md`, `docs/header.md`,
`docs/destinations.md`, `docs/admin.md` et `docs/securite.md`.

## 16 septembre 2026

- **Effet de défilement des photos** : les photos précédente/suivante de chaque destination restent visibles en fond (plus petites, floutées, estompées) pendant le scroll, au lieu de disparaître d'un coup. (`style.css` : `.photo.is-prev` / `.photo.is-next` ; `script.js` : calcul de la différence d'étape dans Scrollama.)
- Suppression puis réintroduction manuelle des steps 2 et 3 de chaque destination (tâtonnement sur le contenu).
- Suppression des étiquettes placeholder "Photo X — Destination" sur les photos.
- Couleur des titres de section (`h2`) harmonisée sur `var(--accent)`.
- Suppression de l'indicateur "Défiler ↓" du hero.

## 22 septembre 2026

- Refus d'exécuter une commande `npx` fournie avec une clé d'API exposée en clair (risque de compromission de la chaîne d'approvisionnement) — risque expliqué plutôt qu'exécuté.
- **Vertical Parallax** : composant React fourni par l'utilisateur, porté en JS/CSS "vanilla" (le site n'a pas de framework) ; testé comme galerie plein écran par destination, puis **entièrement annulé** sur demande.
- **Coordonnées GPS** ajoutées sous le titre de chaque destination (police Space Mono), avec un correctif pour empêcher le retour à la ligne.
- **Carte topographique animée** (`p5.js`, marching squares) construite en remplacement d'un script cassé fourni par l'utilisateur, intégrée en haut de `<main>` — puis **entièrement annulée** sur demande.

## 23 septembre 2026

- Explication des leviers pour ajuster la sensibilité du scroll (`min-height` des `.step`, offset Scrollama) — pas de changement appliqué, à la demande de l'utilisateur.

## 30 septembre 2026

- **Correctif de polices** : import Fontshare (Expose + Bespoke Sans) + nettoyage des références à l'ancienne variable `--font-family` supprimée.
- **Migration vers un site généré depuis les données** (étapes 1 à 3) :
  1. Création de `data/voyages.json`, reprenant le contenu alors codé en dur dans `index.html`.
  2. Réécriture de `script.js` pour générer la nav, les sections destinations et les marqueurs de la carte du hero depuis ce JSON, trié chronologiquement.
  3. Création de la page `admin.html` (+ `admin.js`, `save-voyage.php`) pour ajouter des voyages sans éditeur de code.
- Correctif : le CSS des photos ne reconnaissait que les 3 destinations d'origine (`caraibes`/`indonesie`/`sri-lanka`) — généralisé pour accepter n'importe quelle destination ajoutée via l'admin.
- Validation des coordonnées GPS avant de les utiliser sur la carte du hero (une valeur aberrante faisait planter le cadrage de la carte pour tout le monde).
- **Nettoyage complet du site** : CSS mort supprimé (`.hero-kicker`, `.step-index`), bug d'échappement Unicode corrigé dans `admin.js`, fichiers inutilisés supprimés (`Colin_Benamo-map.geojson`, images de fond non utilisées), `.gitignore` ajouté.
- Titre du pays (premier step de chaque destination) stylé à part : très grand, minuscules, couleur crème.

## 6 octobre 2026

- **"Le hero ne fonctionne plus"** : diagnostiqué — des coordonnées GPS invalides saisies via l'admin (voyage "Italie") faisaient zoomer la carte Leaflet à l'extrême. Corrigé (filtre de validation + vraies coordonnées renseignées).
- **Sécurisation de la page admin** (détail complet dans `docs/securite.md`) :
  - Clé d'accès dans le formulaire (insuffisante seule).
  - Tentative de protection Apache (`.htaccess`) → échec (erreur 500, hébergement scolaire restreignant `AllowOverride`).
  - Authentification HTTP Basic en PHP → fonctionnelle mais confuse (popup navigateur demandant un nom d'utilisateur).
  - **Page de connexion par session** (`admin/login.php`) → solution retenue.
  - Bug "Unexpected end of JSON input" → cause trouvée (erreur de syntaxe PHP, `const` avec un appel de fonction) grâce à un vrai interpréteur PHP local (MAMP) utilisé pour la première fois dans le projet.
  - Secrets (mot de passe, hash) sortis du code vers `admin/config.php`, exclu de git, avant de publier le dépôt.
- **Premier commit git** du projet, puis **connexion à GitHub** (`github.com/colinbenamo-afk/blog-voyage`, dépôt public).
- Création de la documentation (`docs/`, ce fichier), puis réorganisation : `CHANGELOG.md` → `docs/JOURNAL.md`, `admin/SECURITE.md` → `docs/securite.md`.
- **Site synchronisé avec GitHub et poussé (`git push`)** — fin de session.

## 9 octobre 2026

- Essai d'une autre source de tuiles pour la carte du hero (Esri "Dark Gray Canvas", pour teinter la terre indépendamment de l'eau via `sepia`/`hue-rotate`) — **annulé** sur demande, retour à OpenStreetMap + filtre `invert`/`hue-rotate` d'origine.
- **Nav du header transformée en liste déroulante** ("Les voyages ▾") au lieu des liens côte à côte, via `<details>`/`<summary>` natif (`index.html`, `style.css`, `buildNav` dans `script.js`). Détail dans `docs/header.md`.
- Titre des pays (premier step) : `text-transform: lowercase` → `capitalize` (majuscule au lieu de tout en minuscule).

## 29 octobre 2026

- **Corrections responsive mobile** (`index.html` ouvert à vide, aucun commit poussé entre le 9 et le 29) :
  - Titre du hero coupé au milieu d'un mot sur mobile : `clamp()` avait min/max inversés — corrigé. Détail `docs/hero.md`.
  - Grandes bandes grises en haut/bas de la carte du hero sur écran portrait : zoom `fitBounds` limité par la largeur — corrigé (zoom additionnel après l'événement `moveend`). Détail `docs/hero.md`.
  - Débordement horizontal de toute la page sur mobile (colonnes des sections destinations ~510-540px sur un écran de 390px) : grille CSS qui ne rétrécissait pas sous la taille du texte non cassable des coordonnées GPS — corrigé (`min-width: 0` + coordonnées qui repassent à la ligne sur petit écran). Détail `docs/destinations.md`.
- **Texte au-dessus de la photo sur mobile**, puis **écran scindé collé** : premier essai avec `order: -1` (texte simplement remonté au-dessus, mais toujours empilé — la photo n'apparaissait qu'après tout le texte). Remplacé sur demande par un vrai écran scindé : texte collé en haut, photo collée en bas, tous deux visibles **en même temps** pendant le scroll. A nécessité de dupliquer le texte en JS (un déclencheur invisible pour Scrollama + une copie affichée et collée, sur le modèle des photos). Détail `docs/destinations.md`.
- **Transition entre destinations nettoyée** : juste après l'écran scindé ci-dessus, la fin d'une destination et le début de la suivante se chevauchaient (texte de la nouvelle destination affiché par-dessus sa propre photo, déjà collée en avance). Corrigé avec un espace tampon entre destinations et un `margin-top` qui resynchronise le moment où le texte et la photo se collent chacun à l'écran. Détail `docs/destinations.md`.
- **Menu déroulant mobile agrandi** : sur mobile, la liste déroulante du header passe d'une petite boîte arrondie (comme sur desktop) à un grand panneau à coins carrés et texte plus gros, sur le modèle d'une référence fournie par l'utilisateur. Détail `docs/header.md`.
- **Défilement horizontal continu de la carte du hero sur mobile** : le zoom plus élevé nécessaire sur mobile (bandes grises, voir plus haut) empêche de voir le monde entier d'un coup. La carte défile maintenant doucement et en continu de droite à gauche au lieu de rester figée, pour montrer progressivement le reste du monde. Bug rencontré en cours de route : `map.panBy()` arrondit son décalage au pixel entier, donc un décalage sous 0.5px ne bougeait jamais la carte — corrigé en accumulant les fractions de pixel en JS. Détail `docs/hero.md`.
- **Marqueurs qui disparaissaient après un tour complet de la carte** : rapporté par l'utilisateur après la mise en place du défilement continu ci-dessus. Cause : les tuiles de la carte se répètent à l'infini, mais pas les marqueurs — après une largeur du monde parcourue, ils restaient décalés hors champ pour de bon. Corrigé en revenant silencieusement en arrière d'une largeur du monde à chaque tour complet (invisible à l'écran, le monde se répétant à l'identique). Détail `docs/hero.md`.
