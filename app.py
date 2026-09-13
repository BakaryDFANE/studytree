# ============================================================
# app.py
# ============================================================

from flask import Flask, render_template, request, jsonify, send_from_directory
from pathlib import Path
import json
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent


def dossier_writable(nom):
    value = os.environ.get(f"{nom.upper()}_DIR")
    if value:
        chemin = Path(value)
    else:
        chemin = Path(tempfile.gettempdir()) / "study_tree" / nom

    chemin.mkdir(parents=True, exist_ok=True)
    return chemin


app = Flask(
    __name__,
    template_folder=str(BASE_DIR),
    static_folder=str(BASE_DIR)
)

UPLOAD_FOLDER = dossier_writable("uploads")
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)

DATA_DIR = dossier_writable("data")
DATA_FILE = DATA_DIR / "study_tree.json"


# ------------------------------------------------------------
# DONNÉES
# ------------------------------------------------------------

def charger_arbre():
    if not DATA_FILE.exists():
        arbre = {
            "id": "root",
            "nom": "Mes études",
            "type": "racine",
            "enfants": [],
            "documents": []
        }

        sauvegarder_arbre(arbre)
        return arbre

    with open(DATA_FILE, "r", encoding="utf-8") as fichier:
        return json.load(fichier)


def sauvegarder_arbre(arbre):
    with open(DATA_FILE, "w", encoding="utf-8") as fichier:
        json.dump(arbre, fichier, ensure_ascii=False, indent=4)


# ------------------------------------------------------------
# RECHERCHE D'UNE BRANCHE
# ------------------------------------------------------------

def trouver_branche(branche, branche_id):

    if branche["id"] == branche_id:
        return branche

    for enfant in branche.get("enfants", []):
        resultat = trouver_branche(enfant, branche_id)

        if resultat:
            return resultat

    return None


# ------------------------------------------------------------
# RECHERCHE DU PARENT
# ------------------------------------------------------------

def trouver_parent(branche, branche_id):

    for enfant in branche.get("enfants", []):

        if enfant["id"] == branche_id:
            return branche

        resultat = trouver_parent(enfant, branche_id)

        if resultat:
            return resultat

    return None


# ------------------------------------------------------------
# PAGE PRINCIPALE
# ------------------------------------------------------------

@app.route("/")
def accueil():
    return render_template("index.html")


# ------------------------------------------------------------
# RÉCUPÉRER L'ARBRE
# ------------------------------------------------------------

@app.route("/api/arbre", methods=["GET"])
def obtenir_arbre():

    arbre = charger_arbre()

    return jsonify(arbre)


# ------------------------------------------------------------
# AJOUTER UNE BRANCHE
# ------------------------------------------------------------

@app.route("/api/branche", methods=["POST"])
def ajouter_branche():

    donnees = request.json

    parent_id = donnees.get("parent_id")
    nom = donnees.get("nom")

    if not parent_id or not nom:
        return jsonify({
            "erreur": "Nom ou parent manquant"
        }), 400

    arbre = charger_arbre()

    parent = trouver_branche(arbre, parent_id)

    if not parent:
        return jsonify({
            "erreur": "Parent introuvable"
        }), 404

    nouvelle_branche = {
        "id": str(uuid.uuid4()),
        "nom": nom,
        "type": "branche",
        "enfants": [],
        "documents": []
    }

    parent["enfants"].append(nouvelle_branche)

    sauvegarder_arbre(arbre)

    return jsonify(nouvelle_branche)


# ------------------------------------------------------------
# RENOMMER UNE BRANCHE
# ------------------------------------------------------------

@app.route("/api/branche/<branche_id>", methods=["PUT"])
def renommer_branche(branche_id):

    donnees = request.json

    nouveau_nom = donnees.get("nom")

    if not nouveau_nom:
        return jsonify({
            "erreur": "Nom manquant"
        }), 400

    arbre = charger_arbre()

    branche = trouver_branche(arbre, branche_id)

    if not branche:
        return jsonify({
            "erreur": "Branche introuvable"
        }), 404

    branche["nom"] = nouveau_nom

    sauvegarder_arbre(arbre)

    return jsonify(branche)


# ------------------------------------------------------------
# SUPPRIMER UNE BRANCHE
# ------------------------------------------------------------

@app.route("/api/branche/<branche_id>", methods=["DELETE"])
def supprimer_branche(branche_id):

    if branche_id == "root":
        return jsonify({
            "erreur": "Impossible de supprimer la racine"
        }), 400

    arbre = charger_arbre()

    parent = trouver_parent(arbre, branche_id)

    if not parent:
        return jsonify({
            "erreur": "Branche introuvable"
        }), 404

    parent["enfants"] = [
        enfant
        for enfant in parent["enfants"]
        if enfant["id"] != branche_id
    ]

    sauvegarder_arbre(arbre)

    return jsonify({
        "message": "Branche supprimée"
    })


# ------------------------------------------------------------
# AJOUTER UN DOCUMENT
# ------------------------------------------------------------

@app.route("/uploads/<path:filename>")
def telecharger_upload(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/api/document", methods=["POST"])
def ajouter_document():

    if request.content_type and "multipart/form-data" in request.content_type:
        donnees = request.form
        fichier = request.files.get("file")
        branche_id = donnees.get("branche_id")
        nom = donnees.get("nom")

        if fichier and fichier.filename:
            filename = secure_filename(fichier.filename)
            unique_name = f"{uuid.uuid4().hex}_{filename}"
            fichier.save(Path(app.config["UPLOAD_FOLDER"]) / unique_name)
            source = "Fichier local"
            emplacement = f"/uploads/{unique_name}"
        else:
            source = donnees.get("source") or "Lien"
            emplacement = donnees.get("emplacement")
    else:
        donnees = request.get_json(silent=True) or {}
        branche_id = donnees.get("branche_id")
        nom = donnees.get("nom")
        source = donnees.get("source")
        emplacement = donnees.get("emplacement")

    if not source and emplacement and "drive.google.com" in emplacement:
        source = "Google Drive"
    elif not source and emplacement:
        source = "Lien"

    if not branche_id or not nom or not emplacement:
        return jsonify({
            "erreur": "Informations manquantes"
        }), 400

    if not source:
        source = "Lien"

    arbre = charger_arbre()

    branche = trouver_branche(arbre, branche_id)

    if not branche:
        return jsonify({
            "erreur": "Branche introuvable"
        }), 404

    document = {
        "id": str(uuid.uuid4()),
        "nom": nom,
        "source": source,
        "emplacement": emplacement
    }

    branche["documents"].append(document)

    sauvegarder_arbre(arbre)

    return jsonify(document)


# ------------------------------------------------------------
# SUPPRIMER UN DOCUMENT
# ------------------------------------------------------------

@app.route("/api/document/<document_id>", methods=["DELETE"])
def supprimer_document(document_id):

    arbre = charger_arbre()
    fichier_a_supprimer = None

    def supprimer_dans_branche(branche):
        nonlocal fichier_a_supprimer

        documents_avant = len(branche.get("documents", []))
        nouveaux_documents = []

        for document in branche.get("documents", []):
            if document["id"] == document_id:
                fichier_a_supprimer = document.get("emplacement")
                continue
            nouveaux_documents.append(document)

        branche["documents"] = nouveaux_documents

        if len(branche["documents"]) < documents_avant:
            return True

        for enfant in branche.get("enfants", []):
            if supprimer_dans_branche(enfant):
                return True

        return False

    trouve = supprimer_dans_branche(arbre)

    if not trouve:
        return jsonify({
            "erreur": "Document introuvable"
        }), 404

    if fichier_a_supprimer and fichier_a_supprimer.startswith("/uploads/"):
        nom_fichier = fichier_a_supprimer.split("/uploads/")[-1]
        chemin_fichier = Path(app.config["UPLOAD_FOLDER"]) / nom_fichier
        if chemin_fichier.exists():
            chemin_fichier.unlink()

    sauvegarder_arbre(arbre)

    return jsonify({
        "message": "Document supprimé"
    })


# ------------------------------------------------------------
# LANCEMENT
# ------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)