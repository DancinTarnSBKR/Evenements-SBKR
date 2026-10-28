// ============================
// COMPTEUR DE VISITES (Abacus)
// ============================
// API publique, gratuite, sans clé ni inscription : https://jasoncameron.dev/abacus/
//   - /hit/<namespace>/<key> -> incrémente le compteur (et le crée s'il n'existe pas)
//   - /get/<namespace>/<key> -> lit la valeur sans l'incrémenter
// Réponse JSON : { "value": <nombre> }
//
// NB : on utilisait CounterAPI v1 avant, mais ce service a été fermé (erreur 410).
// Sa v2 exige un token Bearer, impossible à cacher dans un JS public servi par
// GitHub Pages — d'où le passage à Abacus, qui reste sans clé.

(function () {
    const NAMESPACE = "dancintarn-sbkr";
    const KEY = "visites-site";
    const BASE = "https://abacus.jasoncameron.dev";

    const alreadyCounted = sessionStorage.getItem("sbkr_visit_counted") === "1";
    const url = alreadyCounted
        ? `${BASE}/get/${NAMESPACE}/${KEY}`
        : `${BASE}/hit/${NAMESPACE}/${KEY}`;

    fetch(url, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
            if (typeof data.value !== "number") return;
            if (!alreadyCounted) sessionStorage.setItem("sbkr_visit_counted", "1");
            const valueEl = document.getElementById("visit-count");
            const wrapEl = document.getElementById("visit-counter");
            if (valueEl && wrapEl) {
                valueEl.textContent = data.value.toLocaleString("fr-FR");
                wrapEl.hidden = false;
            }
        })
        .catch(err => console.warn("Compteur de visites indisponible :", err));
})();
