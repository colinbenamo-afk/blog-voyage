# Articles des pays (pays.html)

> À mettre à jour à chaque modification de cette section. L'éditeur d'article côté admin est aussi décrit dans `docs/admin.md`.

Chaque pays peut avoir un **article** : une page plus visuelle (beaucoup de photos, peu de texte) accessible depuis l'accueil par le lien « Lire l'article → » sous le texte du pays. Tout est piloté depuis la page admin, sans toucher au code.

## Fichiers concernés

- `pays.html` — la page (une seule pour tous les pays, le pays est choisi par l'adresse : `pays.html?id=indonesie`)
- `pays.css` — mise en page de l'article (reprend les variables, le fond et le header de `style.css`)
- `pays.js` — lit l'article et construit la page
- `data/articles/<id>.json` — le contenu d'un article (créé par l'admin)
- `assets/articles/<id>/*.webp` — les photos d'un article (créées par l'admin, noms avec suffixe aléatoire)
- `script.js` / `style.css` — le lien « Lire l'article → » sur l'accueil (fonction `buildStepBody`)
- `admin/admin-article.js`, `admin/save-article.php`, `admin/delete-article.php`, `admin/common.php` — l'éditeur (voir `docs/admin.md`)

## Structure d'une page article

1. **En-tête** : photo plein cadre en fond (assombrie, qui se fond dans le fond du blog), titre de l'article en grand, coordonnées GPS du pays (lues dans `voyages.json`).
2. **Bloc intro** : texte d'introduction + **galerie** de 3 à 7 photos fixes (pas de carrousel). La photo du milieu est la plus grande, les autres rétrécissent et s'assombrissent en s'éloignant (attribut `data-d` = distance au centre, posé par `pays.js`). La largeur des photos s'adapte au nombre de photos (`--n`).
3. **Blocs texte + photo** (0 à 20) : texte d'un côté, une photo plus grande de l'autre. Le côté alterne automatiquement (le 2e bloc est inversé, etc.).
4. Pied de page : retour au voyage sur l'accueil.

Sur mobile (≤ 720 px) : la galerie passe sur 2 colonnes, chaque bloc devient une seule colonne (photo au-dessus du texte).

## Format de `data/articles/<id>.json`

```json
{
  "id": "indonesie",
  "titre": "L'Indonésie",
  "intro": "Texte d'intro.\n\nUn 2e paragraphe (ligne vide = nouveau paragraphe).",
  "hero": "assets/articles/indonesie/hero-1a2b3c4d.webp",
  "galerie": ["assets/articles/indonesie/galerie-….webp", "…", "…"],
  "blocs": [
    { "texte": "…", "photo": "assets/articles/indonesie/bloc-….webp" }
  ]
}
```

Et dans `data/voyages.json`, l'entrée du pays reçoit `"article": true` (ajouté/retiré automatiquement par l'admin) — c'est ce qui fait apparaître le lien sur l'accueil.

## Points d'attention

- **Les textes sont insérés avec `textContent`**, jamais `innerHTML` : du HTML écrit dans un texte s'affiche tel quel, il ne s'exécute pas.
- **Les chemins de photos sont revérifiés** côté navigateur (`pays.js`, forme `assets/articles/<id>/<nom>.webp`) et côté serveur : un JSON modifié à la main ne peut pas pointer ailleurs.
- **Id invalide ou article inexistant** : la page affiche un message « Article introuvable » (pas de page blanche).
- **Photos 3:4** : la variable `--ratio-photo` (en haut de `pays.css`) règle le ratio de toutes les photos de la page. Les photos sont recadrées (`object-fit: cover`), pas déformées.
- **Cahier des charges** : minimum 8 photos par article (hero + galerie + blocs) — l'admin affiche un compteur, mais n'empêche pas d'enregistrer en dessous.
- **Fond d'écran propre aux pages pays** : volontairement mis de côté pour l'instant (idées de fonds « strates » générées, pas utilisées).
- Le dossier `page-pays/` (prototype indépendant) n'est plus utilisé : tout a été repris dans `pays.html`, `pays.css`, `pays.js`.
