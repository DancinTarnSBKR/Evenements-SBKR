// ============================
// CONFIGURATION
// ============================

// 👉 Mets ici TON URL Google Sheets publié en CSV
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?output=csv";

let allEvents = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ============================
// OUTILS
// ============================

function cleanString(str) {
    return typeof str === "string" ? str.trim() : "";
}

function parseFrenchDate(dateString) {
    if (!dateString) return null;

    const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s(\d{2}):(\d{2}))?/);
    if (!match) return null;

    const [, day, month, year, hour = "00", minute = "00"] = match;

    const date = new Date(year, month - 1, day, hour, minute);
    return isNaN(date) ? null : date;
}

function formatDateTime(date) {
    if (!date) return "Non spécifié";

    return date.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function generateGoogleMapsLink(address) {
    const clean = cleanString(address);
    if (!clean) return "";

    const encoded = encodeURIComponent(clean);
    return `<a href="https://www.google.com/maps/search/?api=1&query=${encoded}" 
            target="_blank" 
            class="maps-link">📍 Voir sur Google Maps</a>`;
}

// ============================
// AFFICHAGE DU MOIS
// ============================

function renderMonth(month, year) {

    const container = document.getElementById("events");
    container.innerHTML = "";

    const monthLabel = new Date(year, month).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric"
    });

    document.getElementById("currentMonthLabel").textContent =
        monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const filtered = allEvents.filter(event =>
        event.parsedDate &&
        event.parsedDate.getMonth() === month &&
        event.parsedDate.getFullYear() === year
    );

    if (filtered.length === 0) {
        container.innerHTML = "<p>Aucun événement ce mois-ci.</p>";
        return;
    }

    filtered
        .sort((a, b) => a.parsedDate - b.parsedDate)
        .forEach(event => {

            const div = document.createElement("div");
            div.classList.add("event");

            const title = cleanString(event.Titre) || "Événement sans titre";
            const isBirthday = title.includes("Anniversaire");

            div.innerHTML = `
                <h3 class="${isBirthday ? "red" : ""}">${title}</h3>
                <p>🗓️ ${formatDateTime(event.parsedDate)}</p>
                <p>🏁 Fin : ${formatDateTime(parseFrenchDate(event.Fin))}</p>
                <p>📍 Ville : ${cleanString(event.VILLE) || "Non spécifié"}</p>
                <p>${cleanString(event.Lieu)}</p>
                ${generateGoogleMapsLink(event.Lieu || event.VILLE)}
                <p>${cleanString(event.Description) || ""}</p>
                <p><i>Créé le : ${formatDateTime(parseFrenchDate(event["Date de création"]))}
                par ${cleanString(event["Désignation"]) || "Non spécifié"}</i></p>
            `;

            container.appendChild(div);
        });
}

// ============================
// CHARGEMENT DES DONNÉES
// ============================

async function loadEvents() {

    try {
        const response = await fetch(sheetUrl, { cache: "no-store" });
        const csv = await response.text();

        Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {

                allEvents = results.data.map(event => ({
                    ...event,
                    parsedDate: parseFrenchDate(event.Début)
                }));

                renderMonth(currentMonth, currentYear);
            }
        });

    } catch (error) {
        document.getElementById("events").innerHTML =
            "❌ Erreur de chargement des données.";
        console.error(error);
    }
}

// ============================
// NAVIGATION
// ============================

document.addEventListener("DOMContentLoaded", () => {

    loadEvents();

    document.getElementById("prevMonth").addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderMonth(currentMonth, currentYear);
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderMonth(currentMonth, currentYear);
    });

});
