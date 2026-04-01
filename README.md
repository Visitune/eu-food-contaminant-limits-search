# 🔍 EU Food Contaminant Limits Search

<div align="center">

![Status](https://img.shields.io/badge/status-actif-success)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Règlement](https://img.shields.io/badge/R%C3%A8glement-UE%202023%2F915-orange)

</div>

## 📝 Description

Application de recherche des limites maximales de contaminants dans les denrées alimentaires selon le **Règlement (UE) 2023/915** de la Commission européenne.

Cette application permet de :
- 🔍 Rechercher des limites maximales par contaminant, produit ou catégorie
- 📊 Visualiser les informations complètes (limites, notes, dates d'application)
- 📥 Exporter les résultats en CSV ou Excel
- 🔄 Se tenir à jour automatiquement grâce à la surveillance automatique des amendements

## 🏛️ Réglementation

Le Règlement (UE) 2023/915 concerne les teneurs maximales pour les contaminants suivants :

| Catégorie | Exemples de contaminants |
|-----------|--------------------------|
| **Mycotoxines** | Aflatoxines, Ochratoxine A, Patuline, Déoxynivalénol, Zéaralénone, Fumonisines |
| **Toxines végétales** | Acide érucique, Alcaloïdes tropaniques, Acide cyanhydrique, Alcaloïdes pyrrolizidiniques |
| **Métaux lourds** | Plomb, Cadmium, Mercure, Arsenic, Étain |
| **Polluants organiques** | Dioxines, PCB, Substances perfluoroalkylées (PFAS) |
| **Contaminants process** | HAP (Hydrocarbures aromatiques polycycliques), 3-MCPD, Glycidol |
| **Autres** | Nitrates, Mélamine, Perchlorate |

## 🚀 Fonctionnalités

### Recherche intelligente
- Recherche par nom de contaminant
- Recherche par nom de produit
- Recherche par code réglementaire
- Filtrage par catégorie

### Export de données
- Export au format **CSV**
- Export au format **Excel** (XLSX)

### Mise à jour automatique
- Surveillance automatique via GitHub Actions (chaque lundi)
- Alerte par Issue GitHub en cas de nouvel amendement
- Mise à jour des données depuis EUR-Lex

## 📦 Installation

```bash
# Cloner le dépôt
git clone https://github.com/Visitune/eu-food-contaminant-limits-search.git
cd eu-food-contaminant-limits-search

# Installer les dépendances
npm install

# Lancer l'application en mode développement
npm run dev
```

L'application sera accessible à l'adresse : `http://localhost:3000`

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Optionnel : Clé API pour Gemini (si utilisé)
GEMINI_API_KEY=votre_cle_api
```

### Build de production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`

## 📁 Structure du projet

```
eu-food-contaminant-limits-search/
├── .github/
│   └── workflows/
│       └── check-regulation-updates.yml  # Workflow de surveillance
├── src/
│   ├── services/
│   │   ├── contaminantService.ts         # Service de données
│   │   └── eurlexService.ts               # Service EUR-Lex
│   ├── App.tsx                            # Application principale
│   ├── main.tsx                           # Point d'entrée
│   └── index.css                          # Styles
├── scripts/
│   └── check-regulation-update.js         # Script de vérification
├── reglement_2023_915_data.json            # Données réglementaires
├── regulation-state.json                  # État des amendements
└── README.md                               # Ce fichier
```

## 🤖 Automatisation GitHub Actions

### Workflow de surveillance

Le workflow `.github/workflows/check-regulation-updates.yml` vérifie automatiquement les mises à jour du règlement.

**Déclencheurs :**
- ⏰ **Automatique** : Chaque lundi à 8h00 UTC
- 🔄 **Sur push** : À chaque commit sur la branche main
- 👆 **Manuel** : Via le bouton "Run workflow" dans l'onglet Actions

**Actions effectuées :**
1. Interrogation de l'API EUR-Lex (SPARQL)
2. Comparaison avec les amendements connus
3. Création d'une Issue si nouvel amendement détecté
4. Mise à jour automatique de `regulation-state.json`

### États des amendements

Le fichier `regulation-state.json` contient la liste des amendements connus :

```json
{
  "lastChecked": "2026-04-01",
  "baseRegulation": {
    "celex": "32023R0915",
    "date": "2023-04-25"
  },
  "knownAmendments": [
    {"celex": "32024R1003", "date": "2024-04-04", "subject": "..."},
    ...
  ],
  "latestConsolidationDate": "2025-10-08"
}
```

## 📊 Sources officielles

- [EUR-Lex - Règlement (UE) 2023/915](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0915)
- [Journal Officiel L 119](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0915)

## 👥 Contribution

1. Forker le projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commiter vos changements (`git commit -m 'Ajout de...'`)
4. Pusher la branche (`git push origin main`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**Développé avec ❤️ pour la sécurité alimentaire européenne**

</div>
