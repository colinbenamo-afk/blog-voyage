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
- `ordre_depart` : date de départ (`AAAA-MM-JJ`), sert au tri chronologique. Une
  valeur non datée (`"À COMPLÉTER"`) place le voyage à la fin.
- `duree`, `transport` : texte libre.
- `coordonnees` : `{ lat, lon }` en degrés décimaux (Sud et Ouest négatifs).
- `photos` : 3 chemins d'images, un par étape. Un même chemin peut apparaître
  deux fois.
- `sections` : 3 blocs `{ titre, texte }`. Le premier est la fiche du pays, les
  deux suivants les moments forts.

## countries.geojson

Contours des pays du monde (Natural Earth 110m, domaine public), utilisés pour
dessiner les frontières sur le globe du hero. Voir `docs/hero.md` pour la façon
de le régénérer.
