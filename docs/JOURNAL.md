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
