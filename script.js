// ============================================================
// Dancin Tarn — Agenda SBKR
// Lit les événements depuis le Google Sheet publié en CSV,
// les regroupe jour par jour, avec navigation par mois et
// filtres par type.
// ============================================================

// 👉 URL du Google Sheet publié en CSV
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?output=csv";

// ---------- Constantes d'affichage ----------
const TYPES = ["Soirée", "Stage", "Bal", "Gala", "Festival", "Anniversaire", "Événement"];
const CATVAR = {
  "Soirée": "--cat-soiree", "Stage": "--cat-stage", "Bal": "--cat-bal", "Gala": "--cat-gala",
  "Festival": "--cat-festival", "Anniversaire": "--cat-anniv", "Événement": "--cat-event"
};
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_ABBR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DOW = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

let EVENTS = [];
let curMonth = null;                 // "année-mois" ex. "2026-9"
const active = new Set(TYPES);       // types affichés

// ---------- Outils ----------
function cleanString(s) { return typeof s === "string" ? s.trim() : ""; }

function parseFrenchDate(s) {
  const m = (s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0"] = m;
  const date = new Date(+y, +mo - 1, +d, +h, +mi);
  return isNaN(date) ? null : date;
}

function typeOf(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("anniversaire")) return "Anniversaire";
  if (t.includes("stage") || t.includes("atelier")) return "Stage";
  if (t.includes("gala")) return "Gala";
  if (t.includes("festival")) return "Festival";
  if (t.includes("bal")) return "Bal";
  if (t.includes("soirée") || t.includes("soiree")) return "Soirée";
  return "Événement";
}

function monthIndex(key) { const [y, m] = key.split("-").map(Number); return y * 12 + m; }

function timeLabel(e) {
  const multiDay = e.fin && e.fin.toDateString() !== e.debut.toDateString();
  const h = e.debut.getHours(), mi = e.debut.getMinutes();
  const hasTime = !(h === 0 && mi === 0);
  if (multiDay) return "jusqu'au " + e.fin.getDate() + " " + MONTHS_ABBR[e.fin.getMonth()];
  if (!hasTime) return "Journée";
  return mi === 0 ? h + "h" : h + "h" + String(mi).padStart(2, "0");
}

function mapsLink(e) {
  const q = encodeURIComponent((e.lieu || e.ville || "").replace(/\n/g, " "));
  return "https://www.google.com/maps/search/?api=1&query=" + q;
}

function cleanDesc(d) { return (d || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim(); }

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- Rendu ----------
function monthKeys() {
  return [...new Set(EVENTS.map(e => e.debut.getFullYear() + "-" + e.debut.getMonth()))]
    .sort((a, b) => monthIndex(a) - monthIndex(b));
}

function renderMonths() {
  const box = document.getElementById("months");
  box.innerHTML = "";
  monthKeys().forEach(k => {
    const [y, m] = k.split("-").map(Number);
    const b = document.createElement("button");
    b.className = "month-btn";
    b.textContent = MONTHS_FR[m].charAt(0).toUpperCase() + MONTHS_FR[m].slice(1) + " " + y;
    b.setAttribute("aria-pressed", k === curMonth);
    b.onclick = () => {
      curMonth = k; render();
      document.querySelector(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    box.appendChild(b);
  });
  // amène le mois actif à l'écran dans la barre horizontale
  const activeBtn = box.querySelector('[aria-pressed="true"]');
  if (activeBtn) activeBtn.scrollIntoView({ inline: "center", block: "nearest" });
}

function renderFilters() {
  const box = document.getElementById("filters");
  box.innerHTML = "";
  TYPES.forEach(t => {
    if (!EVENTS.some(e => e.type === t)) return;
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.type = t;
    b.style.setProperty("--c", "var(" + CATVAR[t] + ")");
    b.setAttribute("aria-pressed", active.has(t));
    b.innerHTML = '<span class="dot"></span>' + t;
    b.onclick = () => {
      active.has(t) ? active.delete(t) : active.add(t);
      if (active.size === 0) TYPES.forEach(x => active.add(x));
      box.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", active.has(c.dataset.type)));
      render();
    };
    box.appendChild(b);
  });
  const sum = document.createElement("span");
  sum.className = "summary"; sum.id = "summary";
  box.appendChild(sum);
}

function card(e) {
  const art = document.createElement("article");
  art.className = "ev";
  art.style.setProperty("--c", "var(" + CATVAR[e.type] + ")");
  const desc = cleanDesc(e.desc);
  const lieu = (e.lieu || "").split("\n")[0];
  art.innerHTML =
    '<div class="ev__top">' +
      '<span class="badge">' + e.type + '</span>' +
      '<span class="ev__time">' + timeLabel(e) + '</span>' +
    '</div>' +
    '<h3>' + esc(e.titre) + '</h3>' +
    '<div class="ev__meta">' +
      '<span>📍 ' + esc(e.ville || "Lieu à venir") + '</span>' +
      (lieu ? '<span>' + esc(lieu) + '</span>' : '') +
    '</div>' +
    (desc ? '<p class="ev__desc clamp">' + esc(desc) + '</p>' : '') +
    '<div class="ev__actions">' +
      (desc && desc.length > 150 ? '<button class="link js-more">Voir plus ▾</button>' : '') +
      ((e.lieu || e.ville) ? '<a class="link" href="' + mapsLink(e) + '" target="_blank" rel="noopener">🧭 Itinéraire</a>' : '') +
    '</div>' +
    (e.par ? '<p class="par">Proposé par ' + esc(e.par) + '</p>' : '');
  const more = art.querySelector(".js-more");
  if (more) {
    const p = art.querySelector(".ev__desc");
    more.onclick = () => {
      const clamped = p.classList.toggle("clamp");
      more.textContent = clamped ? "Voir plus ▾" : "Voir moins ▴";
    };
  }
  return art;
}

function render() {
  renderMonths();
  const [y, m] = curMonth.split("-").map(Number);
  const list = EVENTS.filter(e => e.debut.getFullYear() === y && e.debut.getMonth() === m && active.has(e.type));

  const sumEl = document.getElementById("summary");
  if (sumEl) sumEl.textContent = list.length + (list.length > 1 ? " événements" : " événement");

  const agenda = document.getElementById("agenda");
  agenda.innerHTML = "";
  if (!list.length) {
    agenda.innerHTML = '<p class="empty">Aucun événement pour ce filtre ce mois-ci.</p>';
    return;
  }

  const byDay = {};
  list.forEach(e => { const k = e.debut.toDateString(); (byDay[k] ||= []).push(e); });

  Object.keys(byDay).forEach(dayKey => {
    const d = new Date(dayKey);
    const isToday = d.getTime() === TODAY.getTime();
    const sec = document.createElement("section");
    sec.className = "day";
    sec.innerHTML =
      '<div class="day__date' + (isToday ? ' day__today' : '') + '">' +
        '<span class="day__dow">' + DOW[d.getDay()] + '</span>' +
        '<span class="day__num">' + d.getDate() + '</span>' +
        '<span class="day__mon">' + MONTHS_ABBR[d.getMonth()] + '</span>' +
      '</div>';
    const ul = document.createElement("div");
    ul.className = "day__list";
    byDay[dayKey].forEach(e => ul.appendChild(card(e)));
    sec.appendChild(ul);
    agenda.appendChild(sec);
  });
}

// ---------- Chargement des données ----------
function loadEvents() {
  fetch(SHEET_URL, { cache: "no-store" })
    .then(r => r.text())
    .then(csv => {
      Papa.parse(csv, {
        header: true, skipEmptyLines: true,
        complete: results => {
          EVENTS = results.data.map(r => {
            const debut = parseFrenchDate(r["Début"]);
            if (!debut) return null;
            return {
              titre: cleanString(r["Titre"]) || "Événement sans titre",
              debut,
              fin: parseFrenchDate(r["Fin"]),
              ville: cleanString(r["VILLE"]),
              lieu: cleanString(r["Lieu"]),
              desc: cleanString(r["Description"]),
              par: cleanString(r["Désignation"]) || cleanString(r["Créateur"]),
              type: typeOf(r["Titre"])
            };
          }).filter(Boolean).sort((a, b) => a.debut - b.debut);

          if (!EVENTS.length) {
            document.getElementById("agenda").innerHTML = '<p class="empty">Aucun événement pour le moment.</p>';
            return;
          }
          // mois par défaut : le mois en cours, sinon le prochain mois avec des événements
          const keys = monthKeys();
          const curKey = TODAY.getFullYear() + "-" + TODAY.getMonth();
          curMonth = keys.includes(curKey)
            ? curKey
            : (keys.find(k => monthIndex(k) >= monthIndex(curKey)) || keys[keys.length - 1]);

          renderFilters();
          render();
        }
      });
    })
    .catch(err => {
      document.getElementById("agenda").innerHTML = '<p class="empty">❌ Impossible de charger les événements pour le moment.</p>';
      console.error(err);
    });
}

// ---------- Thème clair / sombre ----------
function initTheme() {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("sbkr_theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  document.getElementById("theme").onclick = () => {
    const cur = root.getAttribute("data-theme");
    const dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("sbkr_theme", next); } catch (e) {}
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadEvents();
});
