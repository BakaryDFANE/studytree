// ============================================================
// static/script.js
// ============================================================

let arbre = null;

let brancheSelectionnee = null;


// ------------------------------------------------------------
// CHARGER L'ARBRE
// ------------------------------------------------------------

async function chargerArbre() {

    const reponse = await fetch("/api/arbre");

    arbre = await reponse.json();

    afficherArbre();
}


// ------------------------------------------------------------
// AFFICHER L'ARBRE
// ------------------------------------------------------------

function afficherArbre() {

    const container = document.getElementById("tree");

    container.innerHTML = "";

    const arbreHTML = creerNoeud(arbre);

    container.appendChild(arbreHTML);
}


// ------------------------------------------------------------
// CRÉER UN NŒUD
// ------------------------------------------------------------

function creerNoeud(branche, profondeur = 0) {

    const wrapper = document.createElement("div");

    wrapper.className = "tree";


    const node = document.createElement("div");

    node.className = "tree-node";


    const card = document.createElement("div");

    card.className = "node-card";

    const sizeRatio = Math.max(0.35, 1 / Math.pow(2, profondeur));
    card.style.transform = `scale(${sizeRatio})`;
    card.style.transformOrigin = "center bottom";
    card.style.minWidth = `${Math.max(90, 180 / Math.pow(2, profondeur))}px`;
    card.style.padding = `${Math.max(10, 18 / Math.pow(2, profondeur))}px 12px`;


    const icon = document.createElement("div");

    icon.className = "node-icon";

    icon.textContent =
        branche.type === "racine"
            ? "📚"
            : "📁";


    const name = document.createElement("div");

    name.className = "node-name";

    name.textContent = branche.nom;

    if (profondeur > 0) {
        name.style.fontSize = `${Math.max(9, 15 / Math.pow(2, profondeur - 1))}px`;
    }


    card.appendChild(icon);

    card.appendChild(name);


    card.addEventListener("click", function(event) {

        event.stopPropagation();

        ouvrirBranche(branche);

    });


    node.appendChild(card);


    // --------------------------------------------------------
    // ENFANTS
    // --------------------------------------------------------

    if (branche.enfants.length > 0) {

        const children = document.createElement("div");

        children.className = "tree-children";


        branche.enfants.forEach(function(enfant) {

            const enfantNode = creerNoeud(enfant, profondeur + 1);

            children.appendChild(enfantNode);

        });


        node.appendChild(children);
    }


    wrapper.appendChild(node);

    return wrapper;
}


// ------------------------------------------------------------
// OUVRIR UNE BRANCHE
// ------------------------------------------------------------

function ouvrirBranche(branche) {

    brancheSelectionnee = branche;


    const panel = document.getElementById("side-panel");

    const title = document.getElementById("panel-title");

    const content = document.getElementById("panel-content");


    title.textContent = branche.nom;


    content.innerHTML = "";


    // --------------------------------------------------------
    // INFORMATIONS
    // --------------------------------------------------------

    const description = document.createElement("p");

    description.textContent =
        "Branche : " + branche.nom;

    content.appendChild(description);


    // --------------------------------------------------------
    // DOCUMENTS
    // --------------------------------------------------------

    const documentsTitle = document.createElement("h3");

    documentsTitle.textContent = "Documents";

    documentsTitle.style.marginTop = "25px";

    content.appendChild(documentsTitle);


    if (branche.documents.length === 0) {

        const aucun = document.createElement("p");

        aucun.textContent = "Aucun document.";

        aucun.style.marginTop = "10px";

        content.appendChild(aucun);

    } else {

        branche.documents.forEach(function(document) {

            const element = document.createElement("div");

            element.className = "document";


            const info = document.createElement("div");
            info.style.display = "flex";
            info.style.flexDirection = "column";
            info.style.gap = "4px";


            const lien = document.createElement("a");

            lien.href = document.emplacement;

            lien.target = "_blank";

            lien.textContent = document.nom;


            const source = document.createElement("small");

            source.textContent = document.source;

            info.appendChild(lien);
            info.appendChild(source);

            const supprimerDocumentBtn = document.createElement("button");
            supprimerDocumentBtn.textContent = "🗑️";
            supprimerDocumentBtn.title = "Supprimer le document";
            supprimerDocumentBtn.onclick = async function() {
                await supprimerDocument(document.id);
            };

            element.appendChild(info);
            element.appendChild(supprimerDocumentBtn);

            content.appendChild(element);

        });
    }


    // --------------------------------------------------------
    // BOUTONS
    // --------------------------------------------------------

    const actions = document.createElement("div");

    actions.className = "actions";


    const ajouter = document.createElement("button");

    ajouter.textContent = "+ Ajouter une branche";

    ajouter.onclick = function() {

        ouvrirModalPourBranche(branche);

    };


    const renommer = document.createElement("button");

    renommer.textContent = "✏️ Renommer";

    renommer.onclick = function() {

        renommerBranche(branche);

    };


    const documentButton = document.createElement("button");

    documentButton.textContent = "📎 Ajouter un document";

    documentButton.onclick = function() {

        ajouterDocument(branche);

    };


    const supprimer = document.createElement("button");

    supprimer.textContent = "🗑️ Supprimer";

    supprimer.onclick = function() {

        supprimerBranche(branche);

    };


    actions.appendChild(ajouter);

    actions.appendChild(renommer);

    actions.appendChild(documentButton);


    if (branche.id !== "root") {

        actions.appendChild(supprimer);

    }


    content.appendChild(actions);


    panel.classList.add("active");
}


// ------------------------------------------------------------
// MODAL
// ------------------------------------------------------------

function ouvrirModalPourBranche(parent) {

    brancheSelectionnee = parent;

    document.getElementById("modal-title").textContent =
        "Ajouter une branche";

    document.getElementById("branch-name").value = "";

    document.getElementById("modal").classList.remove("hidden");

    document.getElementById("branch-name").focus();
}


// ------------------------------------------------------------
// AJOUTER UNE BRANCHE
// ------------------------------------------------------------

async function ajouterBranche() {

    const input = document.getElementById("branch-name");

    const nom = input.value.trim();


    if (!nom) {

        alert("Entre un nom.");

        return;
    }


    await fetch("/api/branche", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            parent_id: brancheSelectionnee.id,

            nom: nom

        })

    });


    fermerModal();

    await chargerArbre();


    const nouvelleBranche =
        trouverBrancheParNom(arbre, nom);

    if (nouvelleBranche) {

        ouvrirBranche(nouvelleBranche);

    }
}


// ------------------------------------------------------------
// RENOMMER
// ------------------------------------------------------------

async function renommerBranche(branche) {

    const nouveauNom = prompt(
        "Nouveau nom :",
        branche.nom
    );


    if (!nouveauNom) {
        return;
    }


    await fetch(
        `/api/branche/${branche.id}`,
        {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nom: nouveauNom
            })
        }
    );


    await chargerArbre();
}


// ------------------------------------------------------------
// SUPPRIMER
// ------------------------------------------------------------

async function supprimerBranche(branche) {

    const confirmation = confirm(
        `Supprimer "${branche.nom}" et tout son contenu ?`
    );


    if (!confirmation) {
        return;
    }


    await fetch(
        `/api/branche/${branche.id}`,
        {
            method: "DELETE"
        }
    );


    document
        .getElementById("side-panel")
        .classList.remove("active");


    await chargerArbre();
}


// ------------------------------------------------------------
// AJOUTER DOCUMENT
// ------------------------------------------------------------

function ouvrirModalDocument(branche) {
    brancheSelectionnee = branche;

    const documentModal = document.getElementById("document-modal");
    const documentName = document.getElementById("document-name");
    const documentSource = document.getElementById("document-source");
    const documentUrl = document.getElementById("document-url");
    const documentFile = document.getElementById("document-file");

    documentName.value = "";
    documentUrl.value = "";
    documentFile.value = "";
    documentSource.value = "local";
    documentUrl.style.display = "none";
    documentFile.style.display = "block";

    documentSource.onchange = function() {
        if (documentSource.value === "local") {
            documentUrl.style.display = "none";
            documentFile.style.display = "block";
        } else {
            documentUrl.style.display = "block";
            documentFile.style.display = "none";
        }
    };

    documentModal.classList.remove("hidden");
    documentName.focus();
}

async function ajouterDocument(branche) {
    ouvrirModalDocument(branche);
}

async function confirmerDocument() {
    const branche = brancheSelectionnee;
    const nom = document.getElementById("document-name").value.trim();
    const type = document.getElementById("document-source").value;
    const url = document.getElementById("document-url").value.trim();
    const fichier = document.getElementById("document-file").files[0];

    if (!nom) {
        alert("Entre un nom pour le document.");
        return;
    }

    if (type === "local") {
        if (!fichier) {
            alert("Choisis un fichier local.");
            return;
        }

        const formData = new FormData();
        formData.append("branche_id", branche.id);
        formData.append("nom", nom);
        formData.append("file", fichier);

        const reponse = await fetch("/api/document", {
            method: "POST",
            body: formData
        });

        if (!reponse.ok) {
            const err = await reponse.json();
            alert(err.erreur || "Erreur lors de l’ajout du fichier.");
            return;
        }
    } else {
        const emplacement = type === "drive"
            ? (url || "https://drive.google.com")
            : url;

        if (!emplacement) {
            alert("Entre le lien du document.");
            return;
        }

        const reponse = await fetch("/api/document", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                branche_id: branche.id,
                nom: nom,
                source: type === "drive" ? "Google Drive" : "Lien",
                emplacement: emplacement
            })
        });

        if (!reponse.ok) {
            const err = await reponse.json();
            alert(err.erreur || "Erreur lors de l’ajout du lien.");
            return;
        }
    }

    fermerModalDocument();
    await chargerArbre();

    const brancheActualisee = trouverBranche(arbre, branche.id);
    if (brancheActualisee) {
        ouvrirBranche(brancheActualisee);
    }
}

async function supprimerDocument(documentId) {
    const confirmation = confirm("Supprimer ce document ?");
    if (!confirmation) {
        return;
    }

    const reponse = await fetch(`/api/document/${documentId}`, {
        method: "DELETE"
    });

    if (!reponse.ok) {
        const err = await reponse.json();
        alert(err.erreur || "Erreur lors de la suppression.");
        return;
    }

    await chargerArbre();

    if (brancheSelectionnee) {
        const brancheActualisee = trouverBranche(arbre, brancheSelectionnee.id);
        if (brancheActualisee) {
            ouvrirBranche(brancheActualisee);
        }
    }
}


// ------------------------------------------------------------
// RECHERCHER UNE BRANCHE
// ------------------------------------------------------------

function trouverBranche(branche, id) {

    if (branche.id === id) {
        return branche;
    }


    for (const enfant of branche.enfants) {

        const resultat =
            trouverBranche(enfant, id);


        if (resultat) {
            return resultat;
        }

    }


    return null;
}


// ------------------------------------------------------------
// RECHERCHER PAR NOM
// ------------------------------------------------------------

function trouverBrancheParNom(branche, nom) {

    if (branche.nom === nom) {
        return branche;
    }


    for (const enfant of branche.enfants) {

        const resultat =
            trouverBrancheParNom(enfant, nom);


        if (resultat) {
            return resultat;
        }

    }


    return null;
}


// ------------------------------------------------------------
// FERMER MODAL
// ------------------------------------------------------------

function fermerModal() {

    document
        .getElementById("modal")
        .classList.add("hidden");
}

function fermerModalDocument() {
    document
        .getElementById("document-modal")
        .classList.add("hidden");
}


// ------------------------------------------------------------
// ÉVÉNEMENTS
// ------------------------------------------------------------

document
    .getElementById("confirm-branch")
    .addEventListener(
        "click",
        ajouterBranche
    );


document
    .getElementById("close-modal")
    .addEventListener(
        "click",
        fermerModal
    );


document
    .getElementById("close-document-modal")
    .addEventListener(
        "click",
        fermerModalDocument
    );


document
    .getElementById("confirm-document")
    .addEventListener(
        "click",
        confirmerDocument
    );


document
    .getElementById("close-panel")
    .addEventListener(
        "click",
        function() {

            document
                .getElementById("side-panel")
                .classList.remove("active");

        }
    );


document
    .getElementById("add-root-button")
    .addEventListener(
        "click",
        function() {

            ouvrirModalPourBranche(arbre);

        }
    );


// ------------------------------------------------------------
// DÉMARRAGE
// ------------------------------------------------------------

chargerArbre();