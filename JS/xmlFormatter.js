function formatXML(xmlString) {
    // Nettoyage HTML parasite (balises HTML, P, etc.)
    xmlString = xmlString
      .replace(/<\/*(html|head|body|p)[^>]*>/gi, "")
      .replace(/^\s*[\r\n]/gm, ""); // supprime les lignes vides
  
    // Corrige faux CDATA encodé
    xmlString = xmlString.replace(/&lt;!\[CDATA\[(.*?)\]\]&gt;/g, "<![CDATA[$1]]>");
  
    // Parse XML proprement
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  
    // Fonction récursive de beautification
    const beautifyNode = (node, indent = 0) => {
      const pad = "  ".repeat(indent);
      let output = "";
  
      if (node.nodeType === 1) { // ELEMENT_NODE
        output += `${pad}<${node.nodeName}`;
  
        // Attributs
        for (let attr of node.attributes) {
          output += ` ${attr.name}="${attr.value}"`;
        }
  
        output += ">";
  
        const children = Array.from(node.childNodes);
        const hasChildren = children.length > 0;
  
        if (hasChildren) {
          output += "\n";
          children.forEach(child => {
            output += beautifyNode(child, indent + 1);
          });
          output += `${pad}</${node.nodeName}>\n`;
        } else {
          output = output.trimEnd() + `</${node.nodeName}>\n`;
        }
      }
      else if (node.nodeType === 3) { // TEXT_NODE
        const text = node.nodeValue.trim();
        if (text) output += `${pad}${text}\n`;
      }
      else if (node.nodeType === 4) { // CDATA_SECTION_NODE
        output += `${pad}<![CDATA[${node.nodeValue}]]>\n`;
      }
  
      return output;
    };
  
    // Root node
    const root = xmlDoc.documentElement;
    let formatted = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  
    // Si la racine n’est pas <Grille-des-programmes>, on l'ajoute
    if (root.nodeName !== "Grille-des-programmes") {
      formatted += `<Grille-des-programmes>\n`;
      formatted += beautifyNode(root, 1);
      formatted += `</Grille-des-programmes>\n`;
    } else {
      formatted += beautifyNode(root, 0);
    }
  
    return formatted.trim();
  }
  
  window.formatXML = formatXML;