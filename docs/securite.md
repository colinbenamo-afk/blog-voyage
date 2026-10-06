# Sécurisation de la page admin

Ce document retrace, étape par étape, comment la page `admin/` (ajout de
voyages au site) a été protégée depuis qu'un lien public y mène depuis le
footer de `index.html`.

## Pourquoi sécuriser cette page

`admin.php` permet d'écrire dans `data/voyages.json` et d'ajouter des
photos dans `assets/images/`. Sans protection, n'importe qui tombant sur
le lien pourrait ajouter des voyages bidons sur le site.

## Étape 1 — une clé d'accès dans le formulaire

**Fichier : `admin/save-voyage.php`**

Premier réflexe, le plus simple : un champ "Clé d'accès admin" dans le
formulaire, comparé côté serveur à une constante :

```php
const ACCESS_KEY = 'mon-mot-de-passe'; // exemple, pas la vraie valeur
...
if (($_POST['access_key'] ?? '') !== ACCESS_KEY) {
    fail(["Clé d'accès invalide."], 403);
}
```

**Limite** : ça protège l'enregistrement, mais pas la page elle-même —
n'importe qui peut quand même *afficher* `admin.php` et voir tout le
formulaire, voir même les commentaires du code source. On a quand même
gardé cette couche en plus de la suite (défense en profondeur), mais elle
ne suffit pas seule.

## Étape 2 — tentative Apache (`.htaccess`) : a échoué

**Fichiers créés puis supprimés : `admin/.htaccess`, `admin/.htpasswd`**

Idée : utiliser l'authentification native d'Apache pour bloquer l'accès
au dossier `admin/` tout entier, avant même qu'une seule ligne de PHP ne
s'exécute. Étapes suivies :

1. Déplacé `admin.html`, `admin.js`, `admin.css` et `save-voyage.php`
   dans un dossier `admin/` à part (nécessaire : il faut que *tout* ce
   qui touche à l'admin, y compris le script PHP, soit dans le dossier
   protégé — sinon on peut contourner la page en appelant
   `save-voyage.php` directement).
2. Généré un hash bcrypt du mot de passe avec `htpasswd -B`.
3. Écrit un `.htaccess` avec `AuthType Basic` + `Require valid-user`.

**Résultat : Erreur 500 Internal Server Error** dès qu'on visitait
`admin/admin.html` sur l'hébergement (`eleves.mediamatique.ch`).

**Cause** : ce type d'hébergement mutualisé/scolaire restreint souvent
`AllowOverride` (la directive Apache qui autorise ou non les
`.htaccess` à définir des règles d'authentification). Si
`AuthConfig` n'est pas autorisé, Apache plante dès qu'il lit une
directive `AuthType`/`Require` dans un `.htaccess` — erreur 500
immédiate, sans qu'on puisse la corriger depuis le site lui-même (il
faudrait changer la config Apache globale, ce qui n'est pas accessible
sur ce genre d'hébergement).

**Abandonné** : `.htaccess` et `.htpasswd` supprimés.

## Étape 3 — authentification en PHP (Basic Auth) : fonctionnait, mais confuse

**Fichier créé : `admin/auth.php`**

Pour contourner la limite d'Apache, l'authentification a été refaite
entièrement en PHP (`$_SERVER['PHP_AUTH_USER']` / `PHP_AUTH_PW` +
`password_verify()`), ce qui ne dépend d'aucune configuration serveur.

**Résultat** : ça fonctionnait techniquement (popup de connexion du
navigateur), mais l'expérience était mauvaise : la popup demande un nom
d'utilisateur *et* un mot de passe, ressemble à un login de compte, et a
entraîné une confusion (tentative avec les identifiants du compte école
`eleves.mediamatique` au lieu du couple créé pour l'admin).

## Étape 4 — page de connexion avec juste un mot de passe (solution actuelle)

**Fichiers : `admin/auth.php` (réécrit), `admin/login.php` (nouveau)**

Remplacé la popup Basic Auth par une vraie page de connexion du site,
avec un seul champ mot de passe, utilisant les sessions PHP natives :

- `admin/login.php` : formulaire, vérifie le mot de passe avec
  `password_verify()`, pose `$_SESSION['admin_authenticated'] = true`
  si correct, puis redirige vers `admin.php`.
- `admin/auth.php` : fonction `requireAdminAuth()`, appelée en tout
  début de `admin.php` et de `save-voyage.php`. Si la session n'est pas
  authentifiée : redirige vers `login.php` (cas de `admin.php`, une page
  normale) ou renvoie une erreur JSON 401 (cas de `save-voyage.php`,
  appelé en arrière-plan par le formulaire).

**Résultat** : la connexion fonctionne. ✅

## Étape 5 — le bug "Unexpected end of JSON input"

Une fois connecté, l'enregistrement d'un voyage échouait avec :

> Impossible de contacter le serveur : Failed to execute 'json' on
> 'Response': Unexpected end of JSON input

Ce message signifie que le navigateur a reçu une réponse **vide** du
serveur à la place du JSON attendu.

### Premier correctif (insuffisant à lui seul)

**Fichier : `admin/save-voyage.php`**

Ajout d'un `try/catch (\Throwable $e)` autour de toute la logique, plus
un filet de sécurité (`register_shutdown_function`) qui transforme
n'importe quelle erreur PHP fatale en réponse JSON lisible plutôt qu'en
page vide. Utile en général, mais n'a pas réglé le problème : une
**erreur de syntaxe** (erreur de *parsing*) empêche PHP d'exécuter le
fichier avant même d'atteindre ce `try/catch` — il fallait trouver cette
erreur en premier.

### La vraie cause : une erreur de syntaxe PHP

En testant avec un vrai interpréteur PHP local (`php -l`, trouvé via
l'installation MAMP présente sur la machine), l'erreur exacte est
apparue :

```
Fatal error: Constant expression contains invalid operations
in admin/save-voyage.php on line 51
```

La ligne en cause, ajoutée lors du déplacement des fichiers dans
`admin/` (étape 2) :

```php
const ROOT_DIR = dirname(__DIR__);
```

**En PHP, un `const` (hors d'une classe) n'accepte que des valeurs
littérales — pas d'appel de fonction.** `dirname()` est une fonction,
donc cette ligne est une erreur de syntaxe : le fichier entier ne
pouvait pas être interprété, d'où la réponse vide (et ce, avant même que
le `try/catch` de l'étape 5 n'entre en jeu).

### Correctif définitif

Remplacé `const` par `define()` pour ces 4 constantes, qui lui accepte
n'importe quelle expression PHP normale :

```php
define('ROOT_DIR', dirname(__DIR__));
define('DATA_DIR', ROOT_DIR . '/data');
define('DATA_FILE', DATA_DIR . '/voyages.json');
define('IMAGES_DIR', ROOT_DIR . '/assets/images');
```

### Vérification

Testé de bout en bout avec un vrai serveur PHP local (`php -S`) :
connexion avec mauvais mot de passe (refusée), connexion avec le bon mot
de passe (acceptée), remplissage et envoi du formulaire → voyage de test
bien écrit dans `data/voyages.json` avec ses 3 photos converties en
WebP, puis le voyage de test a été retiré pour ne pas polluer les
données réelles.

## Étape 6 — sortir les secrets du code avant de publier sur GitHub

En connectant le projet à un repo **GitHub public**, `admin/auth.php`
(hash bcrypt) et `admin/save-voyage.php` (`ACCESS_KEY` en clair)
auraient été visibles par n'importe qui, et resteraient dans
l'historique git même après suppression ultérieure.

**Fichiers créés : `admin/config.php`, `admin/config.example.php`**

- `admin/config.php` — contient les deux vraies valeurs (`access_key` et
  `admin_pass_hash`), **ajouté à `.gitignore`** : jamais poussé sur
  GitHub.
- `admin/config.example.php` — gabarit *sans* secret, lui commité, pour
  qu'un futur déploiement sache quel fichier créer et comment générer un
  nouveau hash (`password_hash()`).
- `auth.php` et `save-voyage.php` chargent maintenant ces valeurs via
  `require __DIR__ . '/config.php'` au lieu de constantes codées en dur.
  Si `config.php` est absent (ex: juste après un `git clone`), le site
  affiche un message clair plutôt qu'une erreur PHP confuse.

**Vérifié** à nouveau de bout en bout avec `php -S` en local : connexion
+ ajout de voyage fonctionnent toujours avec cette indirection.

## État actuel des couches de protection

1. **Session PHP + page de connexion** (`login.php` / `auth.php`) —
   bloque l'accès à `admin.php` *et* à `save-voyage.php` tant qu'on n'a
   pas entré le bon mot de passe.
2. **Clé d'accès dans le formulaire** (`ACCESS_KEY` dans
   `save-voyage.php`) — couche supplémentaire, redondante avec la
   session mais sans inconvénient à garder.
3. **`<meta name="robots" content="noindex, nofollow">`** — empêche les
   moteurs de recherche d'indexer la page (pas une vraie sécurité, juste
   évite qu'elle apparaisse dans des résultats de recherche).

## Points de vigilance pour la suite

- **Ne jamais committer `admin/config.php`** (déjà dans `.gitignore`,
  mais à surveiller si le fichier est un jour renommé ou déplacé).
- Après un nouveau `git clone` du repo (nouvelle machine, nouvel
  hébergement) : copier `admin/config.example.php` en
  `admin/config.php` et y remettre les vraies valeurs — sinon
  `admin.php` et `save-voyage.php` affichent un message d'erreur clair
  au lieu de planter silencieusement.
- Le PHP local utilisé pour les tests (MAMP, PHP 8.3) a confirmé que GD
  et les sessions fonctionnent ; sur l'hébergement final, vérifier que
  c'est aussi le cas si un nouveau problème apparaît (le `try/catch` de
  l'étape 5 affichera le message d'erreur exact si besoin).