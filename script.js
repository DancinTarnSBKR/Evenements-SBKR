// ============================
// OUTILS
// ============================

function cleanString(str) {
    return typeof str === "string" ? str.trim() : "";
}

function parseFrenchDate(dateString) {
    if (!dateString || typeof dateString !== "string") return null;

    const cleanDate = cleanString(dateString);
    const match = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?/);

    if (!match) return null;

    const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;

    const date = new Date(year, month - 1, day, hour, minute, second);

    return isNaN(date.getTime()) ? null : date;
}

function normalizeDate(date) {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date) {
    if (!date) return "Non spécifié";

    const formatted = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDateTime(date) {
    if (!date) return "Non spécifié";

    const formatted = date.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function generateGoogleMapsLink(address) {
    const cleanAddress = cleanString(address);
    if (!cleanAddress) return "";

    const encoded = encodeURIComponent(cleanAddress);
    return `<a href="https://www.google.com/maps/search/?api=1&query=${encoded}" 
            target="_blank" 
            class="maps-link">📍 Voir sur Google Maps</a>`;
}

// ============================
// CONFIG
// ============================

// ⚠️ Utilise DIRECTEMENT l’URL CSV publiée
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?output=csv";

// ============================
// CHARGEMENT
// ============================

async function loadEvents() {
    const container = document.getElementById("events");
    container.innerHTML = "Chargement en cours...";

    try {
        const response = await fetch(sheetUrl, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const csvData = await response.text();

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {

                container.innerHTML = "";

                if (!results.data || results.data.length === 0) {
                    container.innerHTML = "Aucun événement trouvé.";
                    return;
                }

                const groupedEvents = {};

                results.data.forEach(event => {

                    const startDate = parseFrenchDate(event.Début);
                    const normalized = normalizeDate(startDate);

                    const groupKey = normalized
                        ? normalized.getTime()
                        : "no-date";

                    if (!groupedEvents[groupKey]) {
                        groupedEvents[groupKey] = {
                            date: normalized,
                            events: []
                        };
                    }

                    groupedEvents[groupKey].events.push(event);
                });

                // Trier les groupes par date
                const sortedGroups = Object.values(groupedEvents)
                    .sort((a, b) => {
                        if (!a.date) return 1;
                        if (!b.date) return -1;
                        return a.date - b.date;
                    });

                sortedGroups.forEach(group => {

                    const dateDiv = document.createElement("div");
                    dateDiv.classList.add("date-group");

                    const title = group.date
                        ? formatDateOnly(group.date)
                        : "Date non spécifiée";

                    dateDiv.innerHTML = `<h2>${title}</h2>`;
                    container.appendChild(dateDiv);

                    // Trier par date de création
                    group.events.sort((a, b) => {
                        const da = parseFrenchDate(a["Date de création"]);
                        const db = parseFrenchDate(b["Date de création"]);

                        return (da?.getTime() || 0) - (db?.getTime() || 0);
                    });

                    group.events.forEach(event => {

                        const title = cleanString(event.Titre) || "Événement sans titre";
                        const isBirthday = title.includes("Anniversaire");

                        const eventDiv = document.createElement("div");
                        eventDiv.classList.add("event");

                        eventDiv.innerHTML = `
                            <h3 class="${isBirthday ? "red" : ""}">${title}</h3>
                            <p>🗓️ Début : ${formatDateTime(parseFrenchDate(event.Début))}</p>
                            <p>🏁 Fin : ${formatDateTime(parseFrenchDate(event.Fin))}</p>
                            <p>📍 Ville : ${cleanString(event.VILLE) || "Non spécifié"}</p>
                            <p>${cleanString(event.Lieu) || ""}</p>
                            ${generateGoogleMapsLink(event.Lieu || event.VILLE)}
                            <p>${cleanString(event.Description) || "Pas de description disponible."}</p>
                            <p class="creation-date">
                                <i>Créé le : ${formatDateTime(parseFrenchDate(event["Date de création"]))}
                                par ${cleanString(event["Désignation"]) || "Non spécifié"}</i>
                            </p>
                        `;

                        dateDiv.appendChild(eventDiv);
                    });
                });
            },
            error: function (error) {
                throw new Error("Erreur d'analyse CSV : " + error.message);
            }
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="error">
                ❌ Erreur de chargement<br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", loadEvents);
