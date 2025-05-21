let wordsToRemove = ["theme", "invite", "dimanches", "2/3 arret diff", "lundi", "mardi", "mercredi",
    "jeudi", "vendredi", "l'actualité sportive", "lu 2/3 arret diff", "ma 2/3 arret diff",
    "me 2/3 arret diff", "je 2/3 arret diff", "ve 2/3 arret diff", "part 0 av-match crosse check"];
let xmlDoc = null;
let originalFileName = "XML_Nettoye.xml"; // Nom par défaut

document.getElementById("xmlFileInput").addEventListener("change", function(event) {
    let file = event.target.files[0];
    let reader = new FileReader();

    // Stocker le nom du fichier d'origine et lui ajouter "_cleaned"
    originalFileName = file.name.replace(".xml", "_cleaned.xml");

    reader.onload = function() {
        let raw = reader.result;
        let cleanedRaw = extractPureXml(raw); // 💥 nettoyage ici
    
        let parser = new DOMParser();
        xmlDoc = parser.parseFromString(cleanedRaw, "text/xml");
    
        document.getElementById("xmlContent").value = cleanedRaw;
    };

    reader.readAsText(file);
});

function toggleWordList() {
    const wordListContainer = document.getElementById("wordListContainer");
    wordListContainer.classList.toggle("show");
}

function displayWords() {
    const wordListTable = document.getElementById("wordList");
    wordListTable.innerHTML = "";
    wordsToRemove.forEach((word, index) => {
        let row = document.createElement("tr");

        let wordCell = document.createElement("td");
        wordCell.textContent = word;
        row.appendChild(wordCell);

        let actionCell = document.createElement("td");
        let removeBtn = document.createElement("button");
        removeBtn.classList.add("btn-delete");
        removeBtn.textContent = "❌";
        removeBtn.onclick = () => removeWord(index);
        actionCell.appendChild(removeBtn);
        row.appendChild(actionCell);

        wordListTable.appendChild(row);
    });
}

displayWords();

function addWord() {
    let newWord = document.getElementById("newWord").value.trim();
    if (newWord && !wordsToRemove.includes(newWord)) {
        wordsToRemove.push(newWord);
        displayWords();
    }
    document.getElementById("newWord").value = "";
}

function removeWord(index) {
    wordsToRemove.splice(index, 1);
    displayWords();
}

//Fonction de nettoyage du XML
function cleanXML() {
    if (!xmlDoc) {
        alert("Veuillez charger un fichier XML");
        return;
    }

    cleanIDWebFields();            // 🧼 Supprimer ou corriger les ID-WEB
    mergeSuccessiveSameTitles();   // 🔁 Fusion des blocs avec le même titre

    let thematiques = xmlDoc.getElementsByTagName("Thematique");
    let cleanedElements = [];

    for (let thematique of thematiques) {
        let originalText = thematique.textContent;
        let cleanedText = originalText;

        wordsToRemove.forEach(word => {
            cleanedText = cleanedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), "").trim();
        });

        if (originalText !== cleanedText) {
            thematique.textContent = ""; // Vide propre
            let parentDay = thematique.closest("Day") || thematique.closest("day");

            if (!parentDay) {
                console.warn("Aucune balise <Day> trouvée pour:", thematique);
                continue;
            }

            let titreEmission = parentDay.querySelector("Titre-Emission")?.textContent || "Non défini";
            let date = parentDay.querySelector("Date")?.textContent || "Non défini";
            let heureIn = parentDay.querySelector("Heure-IN")?.textContent || "Non défini";
            let heureOut = parentDay.querySelector("Heure-OUT")?.textContent || "Non défini";
            let duree = parentDay.querySelector("Duree")?.textContent || "Non défini";
            let typeDiffusion = parentDay.querySelector("Type-de-Diffusion")?.textContent || "Non défini";

            cleanedElements.push(`
                <tr>
                    <td>${date}</td>
                    <td>${heureIn}</td>
                    <td>${heureOut}</td>
                    <td>${duree}</td>
                    <td>${titreEmission}</td>
                    <td>${typeDiffusion}</td>
                </tr>`);
        }
    }

    // 🧾 Affichage tableau des éléments modifiés
    if (cleanedElements.length === 0) {
        document.getElementById("cleanedResults").innerHTML = "<p class='text-center text-muted'>Aucun élément nettoyé.</p>";
    } else {
        document.getElementById("cleanedResults").innerHTML = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Heure IN</th>
                        <th>Heure OUT</th>
                        <th>Durée</th>
                        <th>Titre Emission</th>
                        <th>Type de Diffusion</th>
                    </tr>
                </thead>
                <tbody>
                    ${cleanedElements.join("")}
                </tbody>
            </table>`;
    }

// 🛠️ Export XML avec formatage propre ligne par ligne
const allDays = window.mergedDays || Array.from(xmlDoc.getElementsByTagName("Day"));

const innerXml = allDays.map(day => {
    const get = tag => day.querySelector(tag)?.textContent.trim() || "";

    return `  <Day day="${get("Date")}">
    <Date>${get("Date")}</Date>
    <Heure-IN>${get("Heure-IN")}</Heure-IN>
    <Heure-OUT>${get("Heure-OUT")}</Heure-OUT>
    <Duree>${get("Duree")}</Duree>
    <ID><![CDATA[${get("ID")}]]></ID>
    <Titre-Emission><![CDATA[${get("Titre-Emission")}]]></Titre-Emission>
    <Thematique><![CDATA[${get("Thematique")}]]></Thematique>
    <Description><![CDATA[${get("Description")}]]></Description>
    <Type-de-Diffusion>${get("Type-de-Diffusion")}</Type-de-Diffusion>
    <ID-WEB>${get("ID-WEB")}</ID-WEB>
  </Day>`;
}).join("\n");

const completeXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Grille-des-programmes>\n${innerXml}\n</Grille-des-programmes>`;
const formattedXml = completeXml;

previewXml(formattedXml);
}

function extractPureXml(xmlString) {
    // Supprimer tout avant la première vraie balise XML (ex: <Root>, <Programme>, <Day>...)
    const xmlStart = xmlString.match(/<(\w+)[^>]*>/);
    if (!xmlStart) return xmlString;
  
    const index = xmlString.indexOf(xmlStart[0]);
    return xmlString.slice(index).trim();
  }

//Fonction qui fuisionne les blocs ayant le même titre
function mergeSuccessiveSameTitles() {
    if (!xmlDoc) return;

    const allDays = window.mergedDays || Array.from(xmlDoc.getElementsByTagName("Day"));
    window.mergedDays = [];
    const mergedLog = [];

    const parseTime = (timeStr) => timeStr.split(":").map(Number).reduce((acc, val, i) => acc + val * [3600, 60, 1][i], 0);

    const formatTime = (seconds) => new Date(seconds * 1000).toISOString().substr(11, 8);

    const formatDuration = (seconds) => formatTime(seconds);

    allDays.sort((a, b) => {
        const dateA = a.querySelector("Date").textContent;
        const dateB = b.querySelector("Date").textContent;
        const timeA = parseTime(a.querySelector("Heure-IN").textContent);
        const timeB = parseTime(b.querySelector("Heure-IN").textContent);
        return dateA.localeCompare(dateB) || timeA - timeB;
    });

    let currentMergedBlock = null;

    for (let i = 0; i < allDays.length; i++) {
        const current = allDays[i];
        const currentTitle = current.querySelector("Titre-Emission")?.textContent.trim();

        if (!currentMergedBlock) {
            currentMergedBlock = current.cloneNode(true);
            continue;
        }

        const mergedTitle = currentMergedBlock.querySelector("Titre-Emission")?.textContent.trim();

        if (currentTitle === mergedTitle) {
            const currentIn = parseTime(current.querySelector("Heure-IN").textContent);
            const currentOut = parseTime(current.querySelector("Heure-OUT").textContent);
            const mergedIn = parseTime(currentMergedBlock.querySelector("Heure-IN").textContent);
            const mergedOut = parseTime(currentMergedBlock.querySelector("Heure-OUT").textContent);

            const newIn = Math.min(currentIn, mergedIn);
            let newOut = Math.max(currentOut, mergedOut);
            if (newOut < newIn) newOut += 86400;

            currentMergedBlock.querySelector("Heure-IN").textContent = formatTime(newIn);
            currentMergedBlock.querySelector("Heure-OUT").textContent = formatTime(newOut);
            currentMergedBlock.querySelector("Duree").textContent = formatDuration(newOut - newIn);

            const currentDesc = current.querySelector("Description")?.textContent || "";
            const mergedDesc = currentMergedBlock.querySelector("Description")?.textContent || "";

            const currentType = current.querySelector("Type-de-Diffusion")?.textContent || "";
            const mergedType = currentMergedBlock.querySelector("Type-de-Diffusion")?.textContent || "";
            if (currentType === "PREMIERE DIFFUSION" || mergedType !== "PREMIERE DIFFUSION") {
                currentMergedBlock.querySelector("Type-de-Diffusion").textContent = currentType;
            }

            mergedLog.push(`Fusion : "${currentTitle}" prolongé de ${formatTime(mergedOut)} → ${formatTime(newOut)}`);
        } else {
            mergedDays.push(currentMergedBlock);
            currentMergedBlock = current.cloneNode(true);
        }
    }

    if (currentMergedBlock) {
        mergedDays.push(currentMergedBlock);
    }

        injectMergedDays();
    }

function injectMergedDays() {
    const parent = xmlDoc.documentElement;

    // Nettoyer les champs Thématique AVANT d'injecter
    cleanThematiqueFields();

    const existingDays = Array.from(xmlDoc.getElementsByTagName("Day"));
    existingDays.forEach(day => day.parentNode.removeChild(day));

    mergedDays.forEach(day => parent.appendChild(day));

    const serializer = new XMLSerializer();
    document.getElementById("xmlContent").value = serializer.serializeToString(xmlDoc);

    console.group("📺 Blocs fusionnés :");
    if (mergedDays.length === 0) {
        console.log("Aucune fusion effectuée.");
    } else {
        mergedDays.forEach(day => {
            const titre = day.querySelector("Titre-Emission")?.textContent || "Inconnu";
            const heure = day.querySelector("Heure-IN")?.textContent || "?";
            console.log(`Fusion conservée : "${titre}" à partir de ${heure}`);
        });
    }
    console.groupEnd();
}

function cleanThematiqueFields() {
    mergedDays.forEach(day => {
        const thematique = day.querySelector("Thematique");
        if (thematique) {
            let originalText = thematique.textContent;
            let cleanedText = originalText;

            wordsToRemove.forEach(word => {
                cleanedText = cleanedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), "").trim();
            });

            if (originalText !== cleanedText) {
                thematique.textContent = "";  // Vide propre
            }
        }
    });
}

//Nettoyage du champs ID-WEB
function cleanIDWebFields() {
    const allDays = window.mergedDays || Array.from(xmlDoc.getElementsByTagName("Day"));
    let removedCount = 0;
    let cleanedCount = 0;

    allDays.forEach(day => {
        // Recherche robuste du tag ID-WEB, insensible à la casse
        const idWebElement = Array.from(day.children).find(
            el => el.tagName.toLowerCase() === "id-web"
        );

        if (idWebElement) {
            const content = idWebElement.textContent.trim();
            console.log(`🔍 ID-WEB trouvé : "${content}"`);

            if (/^!?RADIO$/i.test(content)) {
                console.log("🗑️ Suppression bloc complet (ID-WEB == RADIO ou !RADIO)");
                day.parentNode.removeChild(day);
                removedCount++;
            } else if (/!\s*RADIO/i.test(content)) {
                idWebElement.textContent = content.replace(/!\s*RADIO/gi, "").trim();
                console.log("✂️ Nettoyage de '!RADIO' →", idWebElement.textContent);
                cleanedCount++;
            }
        } else {
            console.warn("⚠️ Aucun ID-WEB trouvé dans ce bloc:", day);
        }
    });

    console.log(`✅ ${removedCount} bloc(s) supprimé(s), ${cleanedCount} nettoyé(s).`);
}

let latestFormattedXml = '';

//Fonction pour afficher le Preview XML
function previewXml(xmlString) {
    latestFormattedXml = xmlString;
    document.getElementById('xmlModal').style.display = 'block';
  
    // Par défaut on affiche sans highlight
    document.getElementById('xmlPreviewContent').innerText = xmlString;
  }

function closeXmlModal() {
  document.getElementById('xmlModal').style.display = 'none';
}

function formatXmlNicely(xml) {
    const PADDING = '    '; // 4 espaces
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;

    xml = xml.replace(reg, '$1\r\n$2$3');
    xml.split('\r\n').forEach((node) => {
        let indent = 0;

        if (node.match(/.+<\/\w[^>]*>$/)) {
            // balise ouverte et fermée sur la même ligne
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            // balise fermante
            if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
            // balise ouvrante
            indent = 1;
        } else {
            indent = 0;
        }

        const padding = PADDING.repeat(pad);
        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted.trim();
}

function downloadXml() {
  const blob = new Blob([latestFormattedXml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalFileName.replace(/_cleaned\.xml$/i, '_CLEAN.xml');
  a.click();
}

//Fonction de recherche
function highlightXml() {
    const search = document.getElementById('xmlSearch').value.trim();
    const preview = document.getElementById('xmlPreviewContent');
  
    if (!search) {
      // Réinitialise l'affichage brut
      preview.textContent = latestFormattedXml;
      matchElements = [];
      currentMatchIndex = -1;
      return;
    }
  
    // Encode le XML pour l'affichage (évite que < > etc. soient interprétés)
    const escapeHtml = (str) =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");
  
    const escapedXml = escapeHtml(latestFormattedXml);
  
    // Highlight avec mark (version échappée !)
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'gi');
  
    let matchIndex = 0;
    const highlighted = escapedXml.replace(regex, match => {
      matchIndex++;
      return `<mark class="${matchIndex === 1 ? 'active-match' : ''}">${match}</mark>`;
    });
  
    preview.innerHTML = highlighted;
  
    // Garde la liste des occurrences pour naviguer ensuite
    matchElements = [...preview.querySelectorAll("mark")];
    currentMatchIndex = 0;
  
    if (matchElements[0]) {
      matchElements[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

let currentMatchIndex = -1;
let matchElements = [];

function gotoPreviousMatch() {
    console.log("Previous match clicked"); // ← debug log
    if (!matchElements.length) return;
  
    matchElements[currentMatchIndex]?.classList.remove('active-match');
  
    currentMatchIndex = (currentMatchIndex - 1 + matchElements.length) % matchElements.length;
  
    const el = matchElements[currentMatchIndex];
    el.classList.add('active-match');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function gotoNextMatch() {
    console.log("Next match clicked"); // ← debug log
    if (!matchElements.length) return;

    matchElements[currentMatchIndex]?.classList.remove('active-match');

    currentMatchIndex = (currentMatchIndex + 1) % matchElements.length;

    const el = matchElements[currentMatchIndex];
    el.classList.add('active-match');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function replaceAll() {
    const search = document.getElementById('xmlSearch').value.trim();
    const replace = document.getElementById('replaceText').value;

    if (!search) return;

    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    latestFormattedXml = latestFormattedXml.replace(regex, replace);
    document.getElementById('xmlPreviewContent').innerText = latestFormattedXml;
    matchElements = [];
    }

//Fonction Download XML clean
function downloadXML() {
    if (!xmlDoc) { alert("Aucun XML modifié à télécharger"); return; }
    let serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(xmlDoc);

    let blob = new Blob([xmlString], { type: "application/xml" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = originalFileName;
    a.click();
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM entièrement chargé !");
    document.getElementById("cleanXmlBtn").addEventListener("click", cleanXML);
    document.getElementById("downloadXmlBtn").addEventListener("click", downloadXML);
    document.querySelector("#xmlSearch")?.addEventListener("input", highlightXml);
  });

  window.addEventListener("load", () => {
    console.log("✅ Tout est chargé, même les éléments cachés !");
    document.getElementById("cleanXmlBtn").addEventListener("click", cleanXML);
    document.getElementById("downloadXmlBtn").addEventListener("click", downloadXML);
    document.getElementById("gotoPrevMatchBtn").addEventListener("click", gotoPreviousMatch);
    document.getElementById("gotoNextMatchBtn").addEventListener("click", gotoNextMatch);
    document.getElementById("replaceAllBtn").addEventListener("click", replaceAll);
    document.getElementById("xmlSearch").addEventListener("input", highlightXml);
    document.getElementById("closeXmlBtn").addEventListener("click", closeXmlModal);
  });