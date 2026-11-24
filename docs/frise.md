# Frise chronologique (barre des dates sur le côté)

> À mettre à jour à chaque modification de la frise. Le reste de la page d'accueil (sections pays, scrollytelling) est décrit dans `docs/destinations.md`.

## À quoi ça sert

Sur la page d'accueil, une petite roue de dates orange est collée au bord gauche de l'écran. Elle montre l'année du pays qu'on est en train de lire, avec les années des autres voyages au-dessus et en dessous. Quand on scrolle d'un pays au suivant, la roue tourne pour amener la nouvelle année devant. Un clic sur une année emmène directement au pays correspondant.

Elle sert aussi à **classer les voyages par ordre chronologique automatiquement** : il suffit de saisir l'année dans la page admin lors de la création d'un voyage.

## Fichiers concernés

- `script.js` : `getAnnee()`, `sortByYear()` (tri des voyages) et `buildTimeline()` (construction et rotation de la roue)
- `style.css` : bloc « FRISE CHRONOLOGIQUE » (`.frise`, `.frise-roue`, `.frise-tick`, `.frise-graduation`…) et ses réglages mobile dans `@media (max-width: 820px)`
- `data/voyages.json` : champ `annee` de chaque voyage
- `admin/admin.php`, `admin/admin.js`, `admin/save-voyage.php` : champ « Année du voyage » (voir `docs/admin.md`)

## Comment ça marche

### 1. L'année et le tri

Chaque voyage a un champ `annee` (ex. `2025`) dans `data/voyages.json`. Au chargement, `sortByYear()` trie les voyages du plus récent au plus ancien (depuis le 24 novembre ; champ `mois` facultatif pour départager une même année). Tout le reste (sections, menu, globe, frise) utilise cette liste triée.

- `getAnnee()` lit `annee`. Si le champ manque (ancien fichier encore en ligne), elle reprend l'année de l'ancien champ `ordre_depart` (`"2026-..."`).
- Un voyage sans année est placé à la fin et affiche « — » dans la frise.

### 2. La roue (vue de face)

`buildTimeline()` crée :

- un `<nav class="frise">` fixé au bord gauche, au milieu de la hauteur de l'écran ;
- dedans, une `div.frise-roue` ;
- pour chaque voyage, un lien `a.frise-tick` (vers `#id-du-pays`) qui contient un trait (`span.frise-trait`) et l'année (`span.frise-annee`) ;
- entre deux années, 3 petits traits de graduation (`span.frise-graduation`), plus quelques-uns avant la première et après la dernière année pour que la roue paraisse continue.

Tous ces éléments sont posés **sur un cylindre en CSS 3D**. Chacun reçoit une variable `--pos` : sa position par rapport au pays en cours (0 = devant, -1 = l'année juste au-dessus, +1 = juste en dessous, 0.25 = une graduation…). Le CSS en déduit la position sur la roue :

```css
transform: translateZ(calc(var(--rayon) * -1))
           rotateX(calc(var(--pos) * var(--angle) * -1))
           translateZ(var(--rayon));
```

Autrement dit : on recule jusqu'au centre de la roue, on tourne de `pos × 18°`, puis on revient sur le bord. La `perspective` sur `.frise-roue` donne l'effet de profondeur. Ce qui est devant apparaît grand et net, ce qui part vers le haut ou le bas s'écrase et s'éloigne.

Réglages actuels :

| | Ordinateur | Mobile (≤ 820px) |
|---|---|---|
| Rayon (`--rayon`) | 186px | 138px |
| Angle entre deux années (`--angle`) | 18° | 18° |
| Graduations entre deux années | 3 | 3 |

### 3. Le fondu

L'opacité de chaque élément (`--opacite`) est calculée en JS par `visibilite(pos)` à partir du cosinus de son angle sur la roue : 1 devant, puis de plus en plus pâle, et 0 quand il passe sur le côté de la roue. Les graduations sont deux fois plus pâles que les années. Une année presque invisible reçoit la classe `.is-cache` pour qu'on ne puisse pas cliquer dessus par erreur.

### 4. La rotation au scroll

À chaque scroll (limité à une fois par image avec `requestAnimationFrame`), `update()` :

1. regarde quelle section pays se trouve au milieu de l'écran ;
2. si c'est un nouveau pays, recalcule `--pos` et `--opacite` de tous les éléments, et met `.is-active` sur l'année du pays en cours (trait plus long, année plus grande et en gras) ;
3. affiche la frise seulement quand on est dans les sections pays (`.is-visible`), pas sur le hero.

Comme seule `--pos` change, la `transition` CSS sur `transform` (0,7 s) anime le passage : la roue tourne en douceur au lieu de sauter.

### 5. Mobile

La roue est plus petite (rayon 138px), les traits et les années aussi. L'ensemble tient dans la marge de gauche (environ 40px), sans toucher le texte.

## Historique / ce qu'on a fait

Tout le 13 et le 23 novembre 2026, à la demande de l'utilisateur :

1. **13 novembre : première version.** Règle de 40 petits traits sur le bord gauche, avec l'année de chaque voyage à la hauteur de sa section. En même temps, l'admin passe de « date de départ » à « année du voyage » et les voyages sont triés par année.
2. **13 novembre : version inspirée de destination2075.com.** Un trait par voyage, celui en cours allongé, et une seule année affichée dont les chiffres défilent comme un compteur.
3. **23 novembre : frise allongée.** Traits plus espacés (18px → 48px). Résultat jugé trop espacé.
4. **23 novembre : passage en roue.** Demande : « comme une roue qu'on voit de face », avec des dates qui apparaissent en douceur comme le carrousel des articles. Le compteur à chiffres est remplacé par la roue 3D décrite plus haut.
5. **23 novembre : roue ×3 + graduations.** Diamètre multiplié par 3, angle entre deux années réduit de 28° à 18° pour garder un espacement raisonnable, et ajout des petits traits entre les années.

Chaque étape a été vérifiée avec Playwright : bonne année au centre pour chaque pays, rotation capturée en cours de mouvement, clic sur une année, captures ordinateur et mobile, aucune erreur console.

## Points d'attention / pièges rencontrés

- **`--angle` (CSS) et `ANGLE` (script.js) doivent rester égaux.** Le CSS s'en sert pour placer les éléments, le JS pour calculer le fondu. Si on n'en change qu'un, le fondu ne correspond plus à la position.
- **Ajouter un voyage ne demande rien de plus** : la roue se construit depuis `voyages.json`. Il faut juste que le voyage ait une année, sinon il est placé à la fin avec « — ».
- **Sur mobile, la marge est étroite.** Si on agrandit la taille des années, vérifier qu'elles ne chevauchent pas le texte (la marge à gauche du texte fait environ 40px).
- **Sur un écran entre 821 et 1440px de large**, les sections pays ont un `padding-left` supplémentaire (5,5rem) pour laisser la place à la frise.
- La frise est cachée sur le hero et réapparaît dès qu'on arrive dans les sections pays.
