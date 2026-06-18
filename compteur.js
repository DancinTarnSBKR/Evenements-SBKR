// ============================
// COMPTEUR DE VISITES (CounterAPI v1)
// ============================
// API publique, gratuite, sans clé : https://docs.counterapi.dev/api/endpoints/v1/
//   - <BASE>/up  -> incrémente le compteur (et le crée s'il n'existe pas)
//   - <BASE>/    -> lit la valeur sans l'incrémenter
// La v2 a été écartée volontairement : elle exige un Bearer token, qu'on ne peut
// pas cacher dans un JS public servi par GitHub Pages.

(function () {
    const NAMESPACE = "dancintarn-sbkr";
    const KEY = "visites-site";
    const BASE = `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}`;

    // On ne compte qu'une visite par session : un simple rechargement de page
    // (F5) relit la valeur sans la gonfler artificiellement.
    const alreadyCounted = sessionStorage.getItem("sbkr_visit_counted") === "1";
    const url = alreadyCounted ? `${BASE}/` : `${BASE}/up`;

    fetch(url, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
            // En cas d'erreur API, la réponse n'a pas de champ "count" numérique.
            if (typeof data.count !== "number") return;

            if (!alreadyCounted) {
                sessionStorage.setItem("sbkr_visit_counted", "1");
            }

            const valueEl = document.getElementById("visit-count");
            const wrapEl = document.getElementById("visit-counter");
            if (valueEl && wrapEl) {
                valueEl.textContent = data.count.toLocaleString("fr-FR");
                wrapEl.hidden = false; // on n'affiche le compteur qu'une fois la valeur connue
            }
        })
        .catch(err => {
            // Réseau coupé / API indisponible : on reste silencieux côté visiteur.
            console.warn("Compteur de visites indisponible :", err);
        });
})();
