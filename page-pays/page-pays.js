/* =========================================================
   PAGE PAYS — comportements
   Un seul comportement : les blocs apparaissent en douceur
   quand on arrive dessus en faisant défiler la page.
   (Plus de carrousel : toutes les photos sont fixes.)
   ========================================================= */
(function apparitionAuScroll() {
  const blocs = document.querySelectorAll(".reveal");

  // Sans IntersectionObserver, on affiche tout directement
  if (!("IntersectionObserver" in window)) {
    blocs.forEach((b) => b.classList.add("est-visible"));
    return;
  }

  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add("est-visible");
        observateur.unobserve(entree.target); // une seule fois
      }
    });
  }, { threshold: 0.15 });

  blocs.forEach((b) => observateur.observe(b));
})();
