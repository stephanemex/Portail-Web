# 🎬 Portail Web – Léman Bleu Télévision

**Portail de gestion interne des programmes, publicités et droits d'auteur** développé pour **Léman Bleu Télévision**.

Ce projet a pour objectif de centraliser plusieurs outils internes d'analyse, de génération de rapports et d'exploration de fichiers (XML, Excel, etc.), afin de faciliter la production télévisuelle et les obligations réglementaires.

---

## 🧩 Modules intégrés

### 📺 PrimeTime Xplorer
- **Fonction** : Analyse de programme TV basé sur des fichiers XML préformatés.
- **Usage** : Vue d’ensemble, recherche par plage horaire, analyse visuelle.

### 📄 PrimeTime Reporter
- **Fonction** : Création de rapports de diffusion à destination de la **SSA**.
- **Usage** : Suivi des contenus diffusés, export structuré des données.

### 🎼 PrimeTime Tracks
- **Fonction** : Gestion des droits d'auteur, génération de rapports pour la **SUISA**.
- **Usage** : Analyse des musiques utilisées, regroupement par émission ou date.

### 📢 PrimeTime Ads
- **Fonction** : Création de blocs publicitaires virtuels et rapports d’audience.
- **Usage** : Analyse comparative d’audience, gestion de planning pub, génération de fichiers Excel.

### 🧹 XML Cleaner
- **Fonction** : Nettoyage et préformatage des fichiers XML générés par **WinMedia**.
- **Usage** : Préparation des fichiers pour l’analyse ou l’import dans d’autres modules.

### 🔍 Programme TV
- **Fonction** : Visualisation interne du programme TV (recherche, filtres par jour/plage horaire).
- **Fichier principal** : `tv-programmes.html`

---

## 🛠️ Stack technique

- **Frontend** : HTML5, CSS3, JavaScript (ES6+)
- **Librairies** :
  - [`xlsx`](https://github.com/SheetJS/sheetjs) – lecture/écriture Excel
  - [`D3.js`](https://d3js.org/) – visualisation
  - [`dhtmlx-gantt`](https://dhtmlx.com/docs/products/dhtmlxGantt/) – timelines
- **Aucune dépendance backend actuellement**

---

## 📁 Arborescence simplifiée