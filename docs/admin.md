# Page admin (ajout de voyages)

> À mettre à jour à chaque modification de cette section. Pour tout ce qui concerne la **sécurité** de cette page (mots de passe, connexion), voir `admin/SECURITE.md` en détail — ce fichier-ci reste focalisé sur le fonctionnement de l'outil.

## Fichiers concernés

- `admin/admin.php` — le formulaire (anciennement `admin.html`)
- `admin/admin.js` — logique du formulaire côté navigateur
- `admin/admin.css` — mise en page du formulaire
- `admin/save-voyage.php` — écrit le nouveau voyage côté serveur
- `admin/login.php`, `admin/auth.php`, `admin/config.php` *(non versionné)* — connexion et secrets (détails dans `admin/SECURITE.md`)

## Comment ça marche

1. **Connexion** : `admin/login.php` demande un mot de passe, ouvre une session PHP si correct, redirige vers `admin.php`. Toute tentative d'accès à `admin.php` ou `save-voyage.php` sans session valide est bloquée (`requireAdminAuth()` dans `auth.php`).
2. **Formulaire** (`admin.php`) : pays, date de départ, durée, transport, coordonnées GPS, photo de couverture + 2 "moments forts" (titre, texte, photo chacun). L'id de la destination (`slug`, ex : `"Costa Rica"` → `"costa-rica"`) est calculé en direct à l'écriture du nom du pays, avec un avertissement si l'id existe déjà dans `data/voyages.json`.
3. **Validation** : côté navigateur (`admin.js`, retour immédiat) *et* côté serveur (`save-voyage.php`, la seule qui compte vraiment — ne jamais faire confiance au navigateur).
4. **Enregistrement** (`save-voyage.php`) : vérifie le mot de passe + la session, valide tous les champs, convertit les 3 photos en WebP (via GD ; copie le fichier tel quel si l'hébergement ne supporte pas la conversion), écrit les photos dans `assets/images/`, puis **ajoute** (sans jamais supprimer) le nouveau voyage à `data/voyages.json`.

## Historique / ce qu'on a fait

- **30 septembre** : première version, utilisant l'API File System Access du navigateur (Chrome uniquement, écriture directe sur le disque local) — fonctionnait seulement en local, jamais une fois le site hébergé.
- **30 septembre** : remplacée par un vrai backend PHP (`save-voyage.php`), qui fonctionne sur n'importe quel hébergement PHP classique, dans n'importe quel navigateur.
- **6 octobre** : la page est devenue accessible publiquement (lien dans le footer du site) → tout un travail de sécurisation, détaillé dans `admin/SECURITE.md` (clé d'accès → tentative Apache échouée → Basic Auth PHP → page de connexion par session, solution actuelle).
- **6 octobre** : bug "Unexpected end of JSON input" lors de l'enregistrement — causé par une erreur de syntaxe PHP (`const` avec un appel de fonction), introduite pendant la sécurisation. Trouvée grâce à un test avec un vrai interpréteur PHP local (MAMP) plutôt qu'en devinant. Détail complet dans `admin/SECURITE.md`.

## Points d'attention / pièges rencontrés

- **`admin/config.php` n'est jamais commité** (`.gitignore`) — après un nouveau `git clone` (nouvelle machine, nouvel hébergement), il faut copier `admin/config.example.php` vers `admin/config.php` et y remettre les vrais identifiants, sinon la page affiche une erreur claire au lieu de planter.
- **Toujours valider côté serveur**, jamais seulement côté navigateur — `admin.js` ne sert qu'au confort (retour immédiat), `save-voyage.php` revalide tout.
- Les coordonnées GPS saisies ne sont validées côté serveur que pour leur format (nombre, plage -90/90 et -180/180) — une valeur dans la plage mais géographiquement fausse (ex : mauvais pays) ne sera pas détectée automatiquement. Voir `docs/hero.md` pour l'impact d'une coordonnée invalide sur la carte du hero.
- Pas de linter/interpréteur PHP disponible par défaut dans cet environnement de développement — **MAMP** (déjà installé sur la machine) fournit plusieurs versions de PHP utilisables en ligne de commande (`/Applications/MAMP/bin/php/php8.3.30/bin/php`) pour tester (`-l` pour la syntaxe, `-S` pour un serveur local complet). À utiliser systématiquement avant de renvoyer du PHP sur l'hébergement, pour éviter de redécouvrir des bugs après coup.
