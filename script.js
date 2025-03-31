const sheetUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vRQfL6xOYvzpcDkFOcEwg_qE1mkP_4H6uq7tPSNAHg0XQIhT720m-lY6bFl7SQ2TUwYT2sxaiMkOOum/pub?output=csv');

// Fonction pour nettoyer une chaîne de texte
function cleanString(str) {
    return str ? str.trim() : ''; // Supprimer les espaces avant/après et gérer les valeurs nulles/undefined
}

// Fonction pour convertir une date au format français DD/MM/YYYY HH:mm:ss
function parseFrenchDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    const cleanDate = cleanString(dateString);

    // Vérifier si le format est français (DD/MM/YYYY HH:mm:ss)
    const isFrenchFormat = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanDate);
    if (isFrenchFormat) {
        const [day, month, yearAndTime] = cleanDate.split('/');
        const [year, time] = yearAndTime.split(' ');
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time || '00:00:00'}`);
    }

    // Retourner null si le format est inconnu
    return null;
}

// Fonction pour normaliser une date (ignorer l'heure)
function normalizeDate(date) {
    if (!date) return null;
    // Normalisation : conserver uniquement AAAA-MM-JJ
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Fonction pour formater une date en français (uniquement la date)
function formatDateOnly(date) {
    if (!date) return 'Non spécifié';

    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    const formattedDate = date.toLocaleDateString('fr-FR', options);
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1); // Capitaliser la première lettre
}

// Fonction pour formater une date complète (date et heure)
function formatDateTime(date) {
    if (!date) return 'Non spécifié';

    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    const formattedDate = date.toLocaleDateString('fr-FR', options);
    return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1); // Capitaliser la première lettre
}

// Fonction principale de chargement des événements
async function loadEvents() {
    try {
        const response = await fetch(sheetUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
        }

        const csvData = await response.text();

        // Utiliser Papa.parse pour analyser le CSV
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete(results) {
                const eventsContainer = document.getElementById('events');
                eventsContainer.innerHTML = ''; // Vider le contenu initial

                // Regrouper les événements par date de début
                const groupedEvents = {};
                results.data.forEach(event => {
                    const debutDate = parseFrenchDate(event.Début);
                    const normalizedDate = normalizeDate(debutDate); // Normaliser la date
                    const formattedDate = formatDateOnly(normalizedDate); // Formater la date normalisée

                    console.log(`Début brut : "${event.Début}", Début nettoyé : "${cleanString(event.Début)}", Début parsé : ${debutDate}, Date normalisée : ${normalizedDate}, Date formatée : ${formattedDate}`);

                    if (!groupedEvents[formattedDate]) {
                        groupedEvents[formattedDate] = [];
                    }
                    groupedEvents[formattedDate].push(event);
                });

                // Afficher les groupes d'événements
                for (const [date, events] of Object.entries(groupedEvents)) {
                    const dateDiv = document.createElement('div');
                    dateDiv.classList.add('date-group');
                    dateDiv.innerHTML = `<h2>${date}</h2>`;
                    eventsContainer.appendChild(dateDiv);

                    // Trier les événements par heure de début
                    events.sort((a, b) => parseFrenchDate(a.Début).getTime() - parseFrenchDate(b.Début).getTime());

                    events.forEach(event => {
                        // Formater la "date de création" (colonne F)
                        const creationDateFormatted = event['Date de création']
                            ? formatDateTime(parseFrenchDate(event['Date de création']))
                            : 'Non spécifié';

                        // Récupérer le créateur (colonne G)
                        const creatorName = event['Créateur'] || 'Non spécifié';

                        const eventDiv = document.createElement('div');
                        eventDiv.classList.add('event');

                        eventDiv.innerHTML = `
                            <h3 class="${event.Titre.includes('Anniversaire') ? 'red' : ''}">
                                ${event.Titre || 'Événement sans titre'}
                            </h3>
                            <p>${event.Description || 'Pas de description disponible.'}</p>
                            <p>🏁 Fin : ${formatDateTime(parseFrenchDate(event.Fin))}</p>
                            <p>📍 Lieu : ${event.Lieu || 'Non spécifié'}</p>
                            <p class="creation-date"><i>Créé le : ${creationDateFormatted} par ${creatorName}</i></p>
                        `;
                        dateDiv.appendChild(eventDiv);
                    });
                }
            },
            error(error) {
                throw new Error(`Erreur d'analyse : ${error.message}`);
            }
        });

    } catch (error) {
        console.error('Erreur :', error);
        document.getElementById('events').innerHTML = `
            <div class="error">
                ❌ Erreur de chargement : ${error.message}<br>
                <small>Vérifiez la connexion internet ou contactez l'administrateur</small>
            </div>
        `;
    }
}

// Lancer le chargement au démarrage
loadEvents();
