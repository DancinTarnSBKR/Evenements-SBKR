// URLs des feuilles
const mainSheetUrl = 
  "https://api.allorigins.win/raw?url=" +
  encodeURIComponent(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?gid=0&output=csv"
  );

const emailsSheetUrl =
  "https://api.allorigins.win/raw?url=" +
  encodeURIComponent(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?gid=1&output=csv"
  );

// Fonctions utilitaires
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
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time || "00:00:00"}`);
  }
  return null;
}

function normalizeDate(date) {
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
}

function formatDate(date) {
  if (!date) return "Non spécifié";
  return date.toLocaleDateString("fr-FR", {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase());
}

function formatDateTime(date) {
  if (!date) return "Non spécifié";
  return date.toLocaleDateString("fr-FR", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/^\w/, c => c.toUpperCase());
}

// Chargement des emails avec correspondance A=Emails, C=Désignation
async function loadEmailMappings() {
  try {
    const response = await fetch(emailsSheetUrl);
    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
    
    const csvData = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const emailMap = {};
          results.data.forEach(row => {
            const email = row['Emails'];
            const displayName = row['Désignation'];
            if (email && displayName) {
              emailMap[email.trim().toLowerCase()] = displayName;
            }
          });
          resolve(emailMap);
        },
        error: () => resolve({})
      });
    });
  } catch (error) {
    console.error("Erreur chargement emails:", error);
    return {};
  }
}

// Fonction principale
async function loadEvents() {
  try {
    const [emailMappings, response] = await Promise.all([
      loadEmailMappings(),
      fetch(mainSheetUrl)
    ]);

    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

    const csvData = await response.text();
    const eventsContainer = document.getElementById("events");
    if (!eventsContainer) return;

    Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        eventsContainer.innerHTML = "";

        // Grouper par date
        const groupedEvents = results.data.reduce((acc, event) => {
          const date = formatDate(normalizeDate(parseFrenchDate(event.Début)));
          if (!acc[date]) acc[date] = [];
          acc[date].push(event);
          return acc;
        }, {});

        // Afficher les événements
        Object.entries(groupedEvents).forEach(([date, events]) => {
          const dateDiv = document.createElement("div");
          dateDiv.className = "date-group";
          dateDiv.innerHTML = `<h2>${date}</h2>`;
          
          events.sort((a, b) => {
            const dateA = parseFrenchDate(a["Date de création"])?.getTime() || 0;
            const dateB = parseFrenchDate(b["Date de création"])?.getTime() || 0;
            return dateA - dateB;
          }).forEach(event => {
            const creatorEmail = cleanString(event["Créateur"]);
            const creatorName = creatorEmail 
              ? (emailMappings[creatorEmail.toLowerCase()] || creatorEmail)
              : "Non spécifié";

            const eventDiv = document.createElement("div");
            eventDiv.className = "event";
            eventDiv.innerHTML = `
              <h3 class="${event.Titre?.includes("Anniversaire") ? "red" : ""}">
                ${event.Titre || "Événement sans titre"}
              </h3>
              <p>🗓️ Début: ${formatDateTime(parseFrenchDate(event.Début))}</p>
              <p>🏁 Fin: ${formatDateTime(parseFrenchDate(event.Fin))}</p>
              <p>📍 Lieu: ${event.Lieu || "Non spécifié"}</p>
              <p>${event.Description || "Pas de description"}</p>
              <p class="creation-date">
                <i>Créé le: ${formatDateTime(parseFrenchDate(event["Date de création"]))} par ${creatorName}</i>
              </p>
            `;
            dateDiv.appendChild(eventDiv);
          });

          eventsContainer.appendChild(dateDiv);
        });
      },
      error: (error) => {
        throw new Error(`Erreur d'analyse CSV: ${error.message}`);
      }
    });
  } catch (error) {
    console.error("Erreur:", error);
    const container = document.getElementById("events");
    if (container) {
      container.innerHTML = `
        <div class="error">
          ❌ Erreur de chargement: ${error.message}
          <small>Vérifiez la connexion internet</small>
        </div>
      `;
    }
  }
}

// Démarrer au chargement
document.addEventListener('DOMContentLoaded', loadEvents);
