// tv-programme.js
console.log("📌 Vérification immédiate des boutons :", document.querySelectorAll(".day-filter button"));
// Insertion de l'année actuelle dans le footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Variables globales pour stocker les programmes et filtres
let allPrograms = [];
let currentDayFilter = "all";
let currentTimeFilter = "all";

// 🔄 Fonction pour récupérer la liste des fichiers XML disponibles sur le serveur
function getXmlFileList() {
    return fetch('http://192.168.3.253:85/xml/manifest.json')
    .then(response => {
        if (!response.ok) throw new Error(`Erreur réseau : ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (!Array.isArray(data.files)) {
            console.warn("❌ Format JSON incorrect.");
            return [];
        }

        console.log("📂 Fichiers JSON reçus :", data.files);

        // Vérifier que les fichiers existent vraiment sur le serveur avant de les retourner
        return Promise.all(data.files.map(file =>
            fetch(`http://192.168.3.253:85/xml/${file}`, { method: "HEAD" })
                .then(response => response.ok ? file : null)
                .catch(() => null)
        ));
    })
    .then(validFiles => {
        let existingFiles = validFiles.filter(file => file !== null);
        console.log("✅ Fichiers XML réellement disponibles :", existingFiles);
        return existingFiles;
    })
    .catch(error => {
        console.error("🚨 Erreur lors de la récupération des fichiers XML :", error);
        return [];
    });
}

// Fonction pour normaliser le titre pour le nom de fichier (supprime les accents, remplace les espaces par des tirets)
function sanitizeFilename(str) {
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // supprime les accents
            .replace(/\s+/g, '-')            // remplace les espaces par des tirets
            .replace(/[^a-zA-Z0-9\-]/g, '');  // supprime les caractères non alphanumériques
}

// Fonction pour formater une date au format "Lundi 17 février 2025"
function formatDate(dateStr) {
  const days = [
    "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
  ];
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];

  // Convertir la date en objet Date
  const dateObj = new Date(dateStr);

  // Extraire les parties de la date
  const dayName = days[dateObj.getDay()]; // Jour de la semaine
  const day = dateObj.getDate(); // Jour du mois
  const month = months[dateObj.getMonth()]; // Mois
  const year = dateObj.getFullYear(); // Année

  return `${dayName} ${day} ${month} ${year}`;
}

// ** Ajout d'un écouteur dynamique sur le champ de recherche **
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("strictSearch").addEventListener("change", applyFilters);

document.querySelector(".search-icon").addEventListener("click", function() {
  document.getElementById("searchInput").focus(); // Mettre le focus sur le champ
});

// Parcours le fichier XML pour récupérer les données
function parseXML(xmlDoc, fileName = "") {
    let programs = [];
    const dayElements = xmlDoc.getElementsByTagName("Day");

    Array.from(dayElements).forEach(dayEl => {
        let thematiqueText = dayEl.getElementsByTagName("Thematique")[0]?.textContent?.trim() || "";

        let rawDate = dayEl.getElementsByTagName("Date")[0]?.textContent || "";
        let parsedDate = rawDate ? new Date(rawDate) : null;

        // 💡 Conversion automatique en nom de jour (ex: "mardi")
        let jourTexte = parsedDate ? parsedDate.toLocaleDateString("fr-FR", { weekday: "long" }) : "inconnu";
        jourTexte = jourTexte.toLowerCase().trim();

        console.log(`📆 Jour extrait automatiquement : ${jourTexte}`);

        if (!fileName) {
            console.warn("⚠ Programme sans fichier associé !");
            return;
        }

        programs.push({
            jour: jourTexte,
            date: rawDate,
            heureIn: dayEl.getElementsByTagName("Heure-IN")[0]?.textContent || "",
            heureOut: dayEl.getElementsByTagName("Heure-OUT")[0]?.textContent || "",
            titre: dayEl.getElementsByTagName("Titre-Emission")[0]?.textContent || "",
            thematique: thematiqueText,
            description: dayEl.getElementsByTagName("Description")[0]?.textContent || "",
            idWeb: dayEl.getElementsByTagName("ID-WEB")[0]?.textContent || "",
            fileName: fileName
        });
    });

    console.log("✅ Programmes chargés :", programs);
    return programs;
}

// Fonction pour générer une liste des fichiers XML basés sur les semaines (sans PHP)
function generateXmlFileList() {
  let files = [];
  for (let i = 1; i <= 52; i++) {
      let weekNum = i.toString().padStart(2, '0'); // Format XX pour les semaines
      files.push(`Programme_Sem_${weekNum}.xml`);
  }
  return files;
}

// Charger le programme de la semaine en cours et afficher toutes les semaines valides
function loadAvailableWeeks() {
    let weekSelector = document.getElementById("weekSelector");
    let currentWeek = getWeekNumber(new Date()); // Semaine actuelle
    allPrograms = []; // ✅ Réinitialiser les programmes avant de charger de nouveaux fichiers

    getXmlFileList().then(files => {
        console.log("🎯 Fichiers après vérification :", files); // ✅ Vérifier les fichiers réellement passés
    
        if (!files.length) {
            console.warn("Aucun fichier XML trouvé.");
            weekSelector.innerHTML = "<option disabled>Aucune semaine disponible</option>";
            return;
        }
    
        let weekData = {}; // Associer numéro de semaine -> fichier XML
        let filePromises = files
            .filter(file => file) // 🔥 Assurer qu'on ne charge que les fichiers valides
            .map(file => loadXML(file)
            .then(xmlDoc => {
                let firstDateElement = xmlDoc.querySelector("Day Date");
                console.log("📅 Premier élément Date trouvé :", firstDateElement ? firstDateElement.textContent : "❌ Aucun élément trouvé !");
                if (firstDateElement && firstDateElement.textContent) {
                    let firstDate = firstDateElement.textContent.trim();
                    let weekNumber = getWeekNumber(new Date(firstDate));
    
                    if (!weekData[weekNumber]) {
                        weekData[weekNumber] = file; // Associer fichier à sa semaine
                    }
                } else {
                    console.warn(`⚠️ Fichier ${file} : Aucune date valide trouvée.`);
                }
    
                let parsedPrograms = parseXML(xmlDoc, file);
                allPrograms = allPrograms.concat(parsedPrograms);
            })
            .catch(err => console.error(`❌ Erreur lors du chargement du fichier XML ${file}:`, err)))

        Promise.allSettled(filePromises).then(() => {
            weekSelector.innerHTML = ""; // Nettoyer la liste pour éviter les doublons

            let uniqueWeeks = Object.keys(weekData).sort((a, b) => a - b);
            if (!uniqueWeeks.length) {
                weekSelector.innerHTML = "<option disabled>Aucune semaine disponible</option>";
                return;
            }

            // ✅ Ajouter toutes les semaines disponibles au sélecteur
            uniqueWeeks.forEach(week => {
                let option = document.createElement("option");
                option.value = weekData[week];
                option.textContent = `Semaine ${week}`;
                weekSelector.appendChild(option);
            });

            // ✅ Sélectionner la semaine actuelle si disponible, sinon la plus récente
            let defaultWeek = weekData[currentWeek] || weekData[uniqueWeeks[uniqueWeeks.length - 1]];
            if (defaultWeek) {
                weekSelector.value = defaultWeek;
                loadSelectedWeek(defaultWeek);
            } else {
                console.warn("Aucune semaine disponible pour affichage.");
            }

            // ✅ Mettre à jour l'affichage après le chargement des fichiers
            console.log("📅 Toutes les semaines disponibles ont été chargées.");
            applyFilters();
        });
    }).catch(error => {
        console.error("Erreur lors de la récupération des fichiers XML :", error);
        weekSelector.innerHTML = "<option disabled>Erreur chargement semaines</option>";
    });
}

// Fonction pour récupérer la liste des fichiers XML disponibles
fetch('http://192.168.3.253:85/xml/manifest.json')
    .then(response => response.json())
    .then(data => {
        if (!Array.isArray(data.files)) {
            console.warn("❌ Format JSON incorrect.");
            return [];
        }

        console.log("📂 Fichiers JSON reçus :", data.files);

        return Promise.all(data.files.map(file =>
            fetch(`http://192.168.3.253:85/xml/${file}`, { method: "HEAD" })
                .then(response => response.ok ? file : null)
                .catch(() => null)
        ));
    })
    .then(validFiles => {
        let existingFiles = validFiles.filter(file => file !== null);
        console.log("✅ Fichiers XML réellement disponibles :", existingFiles);
        if (existingFiles.length === 0) {
            console.warn("⚠ Aucun fichier XML accessible !");
        }
    })
    .catch(error => console.error("🚨 Erreur lors de la récupération des fichiers XML :", error));

// Charger et parser tous les fichiers XML
getXmlFileList()
.then(xmlFiles => {
    if (!xmlFiles.length) {
        console.warn("⚠ Aucun fichier XML trouvé.");
        return;
    }

    return Promise.allSettled(xmlFiles.map(loadXML));
})
.then(results => {
    let xmlDocs = results.filter(result => result.status === "fulfilled").map(result => result.value);
    let programs = [];

    xmlDocs.forEach(doc => {
        programs = programs.concat(parseXML(doc));
    });

    allPrograms = programs;
    console.log("✅ Programmes finaux :", allPrograms);
    applyFilters();
})
.catch(error => console.error("🚨 Erreur lors du chargement des fichiers XML:", error));

// Fonction pour charger la semaine sélectionnée
function loadSelectedWeek(xmlFile) {
    let fullPath = `${xmlFile}`; // ✅ Ajouter l’URL complète
  
    loadXML(fullPath).then(xmlDoc => {
        console.log("📄 Contenu XML chargé :", xmlDoc);
        allPrograms = parseXML(xmlDoc, xmlFile); // ✅ On passe aussi le fileName pour l’affichage
        console.log("✅ Programmes extraits :", allPrograms);
        applyFilters();
    }).catch(error => console.error("Erreur chargement XML :", error));
  }

// Fonction pour obtenir le numéro de semaine d'une date donnée
function getWeekNumber(date) {
  let d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  let dayNum = d.getUTCDay() || 7; // Lundi = 1, Dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Ajuster au jeudi de la semaine courante
  let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Fonction pour charger un fichier XML
function loadXML(file) {
    let fullUrl = `http://192.168.3.253:85/xml/${file}`;
    console.log("📢 Tentative de chargement avec URL :", fullUrl);

    return fetch(fullUrl)  // 👈 Ici on met bien l'URL complète
        .then(response => {
            console.log(`🔄 Réponse serveur pour ${file} :`, response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`❌ Erreur réseau (${response.status}) lors du chargement du fichier ${file}`);
            }
            return response.text();
        })
        .then(str => {
            console.log(`✅ Fichier ${file} récupéré, tentative de parsing...`);
            return new window.DOMParser().parseFromString(str, "application/xml");
        })
        .catch(error => {
            console.error(`❌ Échec du chargement de ${file} :`, error);
            return null;
        });
}

// Écouteur pour changement de semaine (l’utilisateur peut changer de semaine manuellement)
document.getElementById("weekSelector").addEventListener("change", function () {
  loadSelectedWeek(this.value);
});

// Charger uniquement la semaine actuelle au démarrage
loadAvailableWeeks();

// ✅ Ajoute un écouteur pour détecter le changement de semaine et filtrer
document.getElementById("weekSelector").addEventListener("change", applyFilters);

// Fonction pour afficher les programmes regroupés par date
// Fonction pour afficher les programmes regroupés par date
function displayPrograms(programs) {
  const container = document.getElementById("programContainer");
  container.innerHTML = "";

  // Regrouper les programmes par date
  const grouped = programs.reduce((acc, program) => {
    const key = program.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(program);

    // Limite à 500 programmes max pour éviter une boucle infinie
    if (acc[key].length > 500) {
        console.warn(`⚠ Trop de programmes pour ${key}, arrêt du traitement.`);
        return acc;
    }
    return acc;
}, {});

  Object.keys(grouped).forEach(date => {
      const section = document.createElement("div");
      section.classList.add("day-section");

      // Formater la date au format "Lundi 17 février 2025"
      const formattedDate = formatDate(date);
      const heading = document.createElement("h3");
      heading.textContent = formattedDate;
      section.appendChild(heading);

      // Création du conteneur en grille pour les programmes
      const gridContainer = document.createElement("div");
      gridContainer.classList.add("program-grid");

      // Trier les programmes par heure de début
      grouped[date].sort((a, b) => a.heureIn.localeCompare(b.heureIn));

      grouped[date].forEach(program => {
          console.log(`🧐 Programme : ${program.titre}, Thématique brute : "${program.thematique}"`);

          // Liste des thématiques à exclure
          const excludedThemes = [
              "theme", "invite", "dimanches", "2/3 arret diff", "lundi", "mardi", "mercredi",
              "jeudi", "vendredi", "l'actualité sportive", "lu 2/3 arret diff", "ma 2/3 arret diff",
              "me 2/3 arret diff", "je 2/3 arret diff", "ve 2/3 arret diff", "part 0 av-match crosse check"
          ];

          let shouldDisplayThematique = program.thematique &&
              !excludedThemes.some(excluded => program.thematique.toLowerCase().includes(excluded));

          console.log(`🎭 Affichage thématique : "${program.thematique}" -> ${shouldDisplayThematique ? "✅ OUI" : "❌ NON"}`);

        // Gestion des images (Lazy Loading et préchargement)
        const imgBlur = "img/placeholder-blur.png";      // Image floue de fond
        const imgDefault = "img/default-thumbnail.png";  // Image de secours

        const progDiv = document.createElement("div");
        progDiv.classList.add("program");

        // Création de l'image avec Lazy Loading
        const imgElement = document.createElement("img");
        imgElement.classList.add("program-thumbnail");
        imgElement.src = "img/placeholder-blur.png"; // Image floue initiale
        imgElement.alt = program.titre;
        imgElement.loading = "lazy";

        // Fonction pour tester si une image existe
        async function findAvailableImage(idWeb) {
            const basePath = `img/${idWeb}`;
            const jpg = `${basePath}.jpg`;
            const png = `${basePath}.png`;
            const fallback = "img/default-thumbnail.png";

            try {
                const jpgCheck = await fetch(jpg, { method: "HEAD" });
                if (jpgCheck.ok) return jpg;

                const pngCheck = await fetch(png, { method: "HEAD" });
                if (pngCheck.ok) return png;

                return fallback;
            } catch (err) {
                console.warn("Erreur de fetch image", err);
                return fallback;
            }
        }

        // Lazy loading et gestion d'image
        findAvailableImage(program.idWeb).then(validUrl => {
            imgElement.dataset.src = validUrl;

            const observer = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute("data-src");
                            observer.unobserve(img);
                        }
                    });
                },
                { rootMargin: "100px 0px", threshold: 0.1 }
            );

            observer.observe(imgElement);
        });

          // Création du bloc d'infos
          const infoDiv = document.createElement("div");
          infoDiv.classList.add("program-info");

          // Ajout dynamique de la thématique si elle doit être affichée
          let thematiqueHTML = shouldDisplayThematique
              ? `<div class="thematique">${program.thematique}</div>` 
              : "";

          infoDiv.innerHTML = `
              <div class="time">De ${program.heureIn} à ${program.heureOut}</div>
              <div class="title"><strong>${program.titre}</strong></div>
              ${thematiqueHTML}
              <div class="description">${program.description}</div>
          `;

          // Ajout des éléments
          progDiv.appendChild(imgElement);
          progDiv.appendChild(infoDiv);
          gridContainer.appendChild(progDiv);
      });

      section.appendChild(gridContainer);
      container.appendChild(section);
  });
}
// Fonction d'application des filtres sur allPrograms et affichage
function applyFilters() {
    if (!allPrograms || allPrograms.length === 0) {
        console.warn("⚠ Aucun programme chargé !");
        return;
    }

    let filtered = [...allPrograms];

    // **🔹 Filtre par fichier sélectionné (semaine)**
    const weekSelector = document.getElementById("weekSelector");
    if (weekSelector) {
        const selectedFile = weekSelector.value;
        if (selectedFile !== "all") {
            console.table(filtered.map(p => ({ jour: p.jour, titre: p.titre })));
            filtered = filtered.filter(p => p.fileName === selectedFile);
        }
    }

    console.log("📦 Tous les jours disponibles :", [...new Set(allPrograms.map(p => p.jour))]);
    // **🔹 Filtrer par jour** (seulement si un jour spécifique est sélectionné)
    if (currentDayFilter !== "all") {
        console.log(`📆 Filtrage par jour : ${currentDayFilter}`);
        filtered = filtered.filter(p => {
            const jourProg = (p.jour || "").toLowerCase().trim();
            const jourFiltre = currentDayFilter.toLowerCase().trim();
            const match = jourProg === jourFiltre;
            if (!match && jourProg.includes(jourFiltre)) {
                console.log(`🔍 Jour presque correspondant : ${jourProg} ~ ${jourFiltre}`);
            }
            return match;
        });
    }

    // **🔹 Filtrer par plage horaire** (si une plage est sélectionnée)
    if (currentTimeFilter !== "all") {
        let [start, end] = currentTimeFilter.split('-').map(Number);
        filtered = filtered.filter(p => {
            let hour = p.heureIn ? parseInt(p.heureIn.split(':')[0], 10) : null;
            return hour !== null && hour >= start && hour < end;
        });
    }

    // **🔹 Filtrer par champ de recherche**
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const isStrict = document.getElementById("strictSearch")?.checked || false;
        
        if (searchTerm) {
            filtered = filtered.filter(p => {
                const titre = p.titre?.toLowerCase().trim() || "";
                const description = p.description?.toLowerCase().trim() || "";
                return isStrict ? titre === searchTerm : titre.includes(searchTerm) || description.includes(searchTerm);
            });
        }
    }

    // **🔹 Compter les diffusions par fichier**
    let fileCounts = {};
    filtered.forEach(program => {
        let fileName = program.fileName;
        if (!fileName) return;
        fileCounts[fileName] = (fileCounts[fileName] || 0) + 1;
    });
    window.lastFileCounts = fileCounts; // 🔥 rendre accessible globalement

    console.log("📊 Nombre de diffusions par fichier :", fileCounts);
    displaySearchStats(fileCounts);
    displayPrograms(filtered);
}

// Fonction pour afficher les statistiques de recherche
function displaySearchStats(fileCounts) {
    let statsContainer = document.getElementById("searchStats");
    if (!statsContainer) {
        statsContainer = document.createElement("div");
        statsContainer.id = "searchStats";
        statsContainer.classList.add("search-stats");
        document.querySelector(".container_prog").insertBefore(statsContainer, document.getElementById("programContainer"));
    }

    statsContainer.innerHTML = "<h3>📊 Résumé des résultats</h3>";
    if (Object.keys(fileCounts).length === 0) {
        statsContainer.innerHTML += "<p>Aucune diffusion trouvée.</p>";
    } else {
        let list = "<ul>";
        Object.entries(fileCounts).forEach(([file, count]) => {
            list += `<li><strong>${formatFileName(file)}</strong> : ${count} diffusion(s)</li>`;
        });
        list += "</ul>";
        statsContainer.innerHTML += list;
    }
}

document.getElementById('downloadStatsBtn').addEventListener('click', async () => {
    if (!window.lastFileCounts || Object.keys(lastFileCounts).length === 0) {
        alert("Aucune donnée de diffusion à exporter.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Statistiques");

    // En-tête
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = "Nombre de diffusions par fichier";
    worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6c8cb7' }
    };

    // Lignes vides
    worksheet.addRow([]);
    worksheet.addRow(['Nom du fichier', 'Nombre de diffusions']);

    // Style pour l’en-tête des colonnes
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).eachCell(cell => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFd9e3f1' }
        };
    });

    // Remplissage
    Object.entries(lastFileCounts).forEach(([fileName, count]) => {
        worksheet.addRow([fileName, count]);
    });

    // Largeur des colonnes
    worksheet.getColumn(1).width = 40;
    worksheet.getColumn(2).width = 20;

    // Génération et téléchargement
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques_diffusions_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
});

// Fonction pour formater le nom du fichier en "Semaine X"
function formatFileName(filePath) {
    if (!filePath) return "Inconnu";
    let fileName = filePath.split('/').pop();
    let match = fileName.match(/Programme_Sem_(\d+)\.xml/);
    return match ? `Semaine ${parseInt(match[1], 10)}` : "Inconnu";
}

// ✅ Fonction pour déplacer le fond mobile sous le bouton actif
function moveBackground(target, bg) {
    if (!bg) return; // Vérifie si l'élément bg existe avant de l'utiliser

    let btnRect = target.getBoundingClientRect();
    let parentRect = target.parentElement.getBoundingClientRect();
    let offsetX = btnRect.left - parentRect.left; // Position du bouton actif par rapport au parent

    // Ajuste la largeur et la position du fond mobile
    bg.style.width = `${btnRect.width}px`;
    bg.style.left = `${offsetX}px`; // Positionne précisément sans -50%
}

// ✅ Gestion des événements après le chargement du DOM
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM chargé, ajout des événements");

    const buttons = document.querySelectorAll(".day-filter button");
    const bg = document.querySelector(".day-filter-bg"); // Récupère l'élément du fond mobile

    console.log("🎯 Boutons détectés après chargement du DOM :", buttons);

    if (buttons.length > 0) {
        buttons.forEach(button => {
            console.log(`🔗 Ajout d'un événement sur : ${button.textContent}`);
            
            button.addEventListener("click", function () {
                console.log(`🖱 Click détecté sur : ${this.textContent}`);
            
                // Déplace le fond mobile sous le bouton sélectionné
                moveBackground(this, bg);
            
                // Supprime les classes actives des autres boutons
                buttons.forEach(btn => btn.classList.remove("active"));
                this.classList.add("active");
            
                // Mettre à jour le filtre actif
                currentDayFilter = this.getAttribute("data-day");
                console.log(`📆 Nouveau filtre sélectionné : ${currentDayFilter}`);
                applyFilters();
            });
        });

        // 🔹 Déplace immédiatement le fond mobile sous le bouton actif au chargement
        const activeButton = document.querySelector(".day-filter button.active");
        if (activeButton) {
            moveBackground(activeButton, bg);
        }
    } else {
        console.warn("⚠ Aucun bouton de filtre par jour trouvé après chargement du DOM !");
    }

    // 🔹 Gestion du filtre par plage horaire
    const timeRangeSelect = document.getElementById("timeRange");
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener("change", function () {
            console.log(`⏰ Filtre par heure : ${this.value}`);
            currentTimeFilter = this.value;
            applyFilters();
        });
    } else {
        console.warn("⚠ Aucun élément #timeRange trouvé !");
    }

    // 🔹 Gestion de la recherche par texte
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            console.log("🔍 Recherche appliquée :", searchInput.value);
            applyFilters();
        });
    } else {
        console.warn("⚠ Aucun champ de recherche #searchInput trouvé !");
    }

    console.log("🎯 Tous les événements sont bien ajoutés !");
});

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM chargé, configuration de la recherche stricte");

    const strictCheckbox = document.getElementById("strictSearch");
    
    if (strictCheckbox) {
        strictCheckbox.checked = false; // Force la case à être cochée
        console.log("✔ Recherche stricte activée par défaut");
    } else {
        console.warn("⚠ Case à cocher #strictSearch non trouvée !");
    }
});