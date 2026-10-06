# data/voyages.json

Première étape de la migration vers un contenu basé sur des données : ce fichier
reprend le contenu déjà écrit dans `index.html` (rien n'a été inventé), pour
préparer un futur rendu dynamique. `index.html`, `style.css` et `script.js` ne
sont pas encore branchés dessus — c'est un simple export du contenu actuel.

## Structure

Un tableau, un objet par destination, dans l'ordre où elles apparaissent sur le
site (Caraïbes, Indonésie, Sri Lanka) :

- `id` — slug utilisé comme ancre (`#caraibes`) et comme `data-destination`.
- `pays` — nom affiché (`<h2>` de la première section).
- `ordre_depart` — date de départ réelle (`AAAA-MM-JJ`), ou `"À COMPLÉTER"` si
  elle n'est écrite nulle part dans le site actuel.
- `duree` — texte libre repris du site (ex : `"3 moins et demie"` pour les
  Caraïbes, tel quel — la coquille n'a pas été corrigée pour rester fidèle au
  contenu existant). `"À COMPLÉTER"` quand aucune durée n'est mentionnée.
- `transport` — mode de transport principal. Déduit du texte quand c'est
  raisonnablement certain (ex : `"voilier"` pour les Caraïbes, à cause du nom
  de bateau "Gypsy Soul"), sinon `"À COMPLÉTER"`.
- `coordonnees` — `{ lat, lon }` en degrés décimaux, repris des
  `<p class="coords">` du site (Sud et Ouest convertis en valeurs négatives).
- `photos` — chemins des 3 photos de la destination, dans l'ordre des
  `--photo-src` du HTML.
- `sections` — les 3 blocs `.step` de la destination, dans l'ordre : la
  première sert de fiche pratique (titre = nom du pays), les deux suivantes
  sont les moments forts.

## Valeurs "À COMPLÉTER"

Chaque fois qu'une information n'était pas écrite noir sur blanc dans
`index.html` (date de départ précise, durée, transport), le champ a été laissé
à `"À COMPLÉTER"` plutôt que deviné. À remplir à la main avant de brancher ce
fichier sur le site.

## Prochaines étapes (pas encore faites)

Ce fichier n'est pour l'instant lu par rien : `index.html` garde son contenu en
dur, `style.css` et `script.js` n'ont pas changé. Une étape suivante pourrait
consister à générer les sections du site à partir de `voyages.json` (en JS, au
chargement de la page).
