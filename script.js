// script.js - Correction de l'affichage des liens Google Drive
function cleanString(str) {
    return str ? str.trim() : "";
}

function parseFrenchDate(dateString) {
    if (!dateString || typeof dateString !== "string") return null;
    const cleanDate = cleanString(dateString);
    const isFrenchFormat = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanDate);

    if (isFrenchFormat) {
        const [day, month, yearAndTime] = cleanDate.split("/");
        const [year, time] = yearAndTime.split(" ");
        return new Date(
            `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time || "00:00:00"}`
        );
    }
    return null;
}

function normalizeDate(date) {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date) {
    if (!date) return "Non spécifié";
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    return date.toLocaleDateString("fr-FR", options).replace(/^\w/, c => c.toUpperCase());
}

function formatDateTime(date) {
    if (!date) return "Non spécifié";
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
    return date.toLocaleDateString("fr-FR", options).replace(/^\w/, c => c.toUpperCase());
}

function generateGoogleMapsLink(address) {
    if (!address) return "";
    const encodedAddress = encodeURIComponent(address.trim());
    return `<a href="https://www.google.com/maps/search/?api=1&query=${encodedAddress}" target="_blank" class="maps-link">📍 Voir sur Google Maps</a>`;
}

// Nouvelle fonction : Extraction des liens Google Drive
function extractDriveLinks(text) {
    if (!text) return [];
    const driveRegex = /<a href="https:\/\/drive\.google\.com\/[^\s]+|https:\/\/docs\.google\.com\/[^\s]+[^\s]+<\/a>/g;
    return [...new Set(text.match(driveRegex) || [])]; // Élimine les doublons
}

function formatDriveLink(linkHTML) {
    // Utiliser un élément temporaire pour parser le HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = linkHTML;

    // Extraire le lien et le texte du lien
    const linkElement = tempDiv.querySelector('a');

    if (!linkElement) return ''; // Retourner vide si pas de lien

    const link = linkElement.href; // URL du lien
    const text = linkElement.textContent || link; // Texte du lien (ou URL si vide)

    const icon = link.includes('/document/') ? '📄' :
        link.includes('/spreadsheets/') ? '📊' :
            link.includes('/presentation/') ? '🖥️' : '📁';

    return `<div class="drive-link"><a href="${link}" target="_blank">${icon} ${text}</a></div>`;
}

// Définir sheetUrl en dehors de loadEvents
const sheetUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?output=csv"
);

async function loadEvents() {
    try {
        const response = await fetch(sheetUrl);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

        const csvData = await response.text();

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const eventsContainer = document.getElementById("events");
                eventsContainer.innerHTML = "";

                // Groupement par date
                const groupedEvents = results.data.reduce((acc, event) => {
                    const dateKey = formatDateOnly(normalizeDate(parseFrenchDate(event.Début)));
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(event);
                    return acc;
                }, {});

                // Affichage
                Object.entries(groupedEvents).forEach(([date, events]) => {
                    const dateDiv = document.createElement("div");
                    dateDiv.className = "date-group";
                    dateDiv.innerHTML = `<h2>${date}</h2>`;

                    events.sort((a, b) => {
                        const dateA = parseFrenchDate(a["Date de création"])?.getTime() || 0;
                        const dateB = parseFrenchDate(b["Date de création"])?.getTime() || 0;
                        return dateA - dateB;
                    });

                    events.forEach((event) => {
                        // Extraction des liens et suppression de la description
                        let description = event.Description || "";
                        const driveLinks = extractDriveLinks(description);
                        driveLinks.forEach(link => {
                             description = description.replace(link + "<br><br>", "");
                        });
                       description = description.replace(/<a[^>]*>|<\/a>|Affiche/g, "");
                         description = description.replace(/(\r\n|\n|\r)/gm, "");
                        const driveLinksHTML = driveLinks.map(formatDriveLink).join('');

                        const eventDiv = document.createElement("div");
                        eventDiv.className = "event";
                        eventDiv.innerHTML = `
                            <h3 class="${event.Titre?.includes("Anniversaire") ? "red" : ""}">
                                ${event.Titre || "Événement sans titre"}
                            </h3>
                            <p>🗓️ Début : ${formatDateTime(parseFrenchDate(event.Début))}</p>
                            ${event.Fin ? `<p>🏁 Fin : ${formatDateTime(parseFrenchDate(event.Fin))}</p>` : ''}
                            <p>📍 ${event.VILLE || ''} ${event.Lieu ? `(${event.Lieu})` : ''} ${generateGoogleMapsLink(event.Lieu || event.VILLE)}</p>
                            <div class="description">${description || "Pas de description"}</div>
                            ${driveLinksHTML ? `<div class="drive-links">${driveLinksHTML}</div>` : ''}
                            <p class="meta">
                                <i>Créé le ${formatDateTime(parseFrenchDate(event["Date de création"]))} 
                                par ${event["Désignation"] || "anonyme"}</i>
                            </p>
                        `;
                        dateDiv.appendChild(eventDiv);
                    });

                    eventsContainer.appendChild(dateDiv);
                });
            },
            error: (error) => {
                throw new Error(`Erreur CSV : ${error.message}`);
            }
        });
    } catch (error) {
        console.error("Erreur :", error);
        document.getElementById("events").innerHTML = `
            <div class="error">
                ❌ Erreur : ${error.message}<br>
                <button onclick="loadEvents()">Réessayer</button>
            </div>
        `;
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', loadEvents);
