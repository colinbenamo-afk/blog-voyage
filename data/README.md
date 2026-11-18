# Dossier data/

Les données lues par le site au chargement. Rien ici n'est écrit à la main en
temps normal : `voyages.json` est modifié par la page admin, `countries.geojson`
est un fichier généré.

## voyages.json

Un tableau, un objet par destination. Lu par `script.js` pour générer le menu,
les sections et les points du globe. Écrit par `admin/save-voyage.php` (ajout)
et `admin/delete-voyage.php` (suppression).

- `id` : identifiant sans accent ni espace (`sri-lanka`), sert d'ancre (`#sri-lanka`).
- `pays` : nom affiché.
- `annee` : année du voyage (nombre, ex : `2026`), sert au tri chronologique et à
  la frise de la page d'accueil. `null` si inconnue : le voyage est alors placé
  à la fin et n'apparaît pas dans la frise.
- `duree`, `transport` : texte libre.
- `coordonnees` : `{ lat, lon }` en degrés décimaux (Sud et Ouest négatifs).
- `photos` : 3 chemins d'images, un par étape. Un même chemin peut apparaître
  deux fois.
- `sections` : 3 blocs `{ titre, texte }`. Le premier est la fiche du pays, les
  deux suivants les moments forts.
- `article` *(optionnel)* : `true` si le pays a un article (`data/articles/<id>.json`).
  Ajouté/retiré par `admin/save-article.php` et `admin/delete-article.php` ; fait
  apparaître le lien « Lire l'article » sur l'accueil.

## articles/

Un fichier `<id>.json` par article de pays (titre, intro, photo du haut, galerie,
blocs texte + photo). Écrit par `admin/save-article.php`, lu par `pays.js`. Les
photos associées sont dans `assets/articles/<id>/`. Format détaillé : `docs/pays.md`.

## countries.geojson

Contours des pays du monde (Natural Earth 110m, domaine public), utilisés pour
dessiner les frontières sur le globe du hero. Voir `docs/hero.md` pour la façon
de le régénérer.
