#!/usr/bin/env node
/**
 * Vérifie les amendements au Règlement (UE) 2023/915 via l'API CELLAR (EUR-Lex).
 * Si de nouveaux amendements sont détectés, écrit un fichier update-found.json
 * que le workflow GitHub Actions utilisera pour créer une Issue.
 *
 * Usage : node scripts/check-regulation-update.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STATE_FILE = join(ROOT, 'regulation-state.json');
const OUTPUT_FILE = join(ROOT, 'update-found.json');

// ── API EUR-Lex CELLAR (SPARQL) ─────────────────────────────────────────────
const SPARQL_ENDPOINT = 'https://publications.europa.eu/webapi/rdf/sparql';

// Requête : trouve tous les actes qui modifient 32023R0915 avec leur date et CELEX
const SPARQL_QUERY = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?date WHERE {
  ?base cdm:resource_legal_id_celex "32023R0915" ;
        cdm:act_amended_by ?amending .
  ?amending cdm:resource_legal_id_celex ?celex ;
            cdm:work_date_document ?date .
}
ORDER BY DESC(?date)
`;

// ── Fallback : vérification via la page EUR-Lex (date de consolidation) ─────
const EURLEX_CONSOLIDATION_URL =
  'https://eur-lex.europa.eu/api/search?' +
  new URLSearchParams({
    type: 'CONSLEG',
    FM_CODED: '32023R0915',
    lang: 'fr',
    orderBy: 'date_document:desc',
    pageSize: '5',
  }).toString();

// ────────────────────────────────────────────────────────────────────────────

async function querySparql() {
  const body = new URLSearchParams({ query: SPARQL_QUERY, format: 'application/sparql-results+json' });
  const res = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
  const json = await res.json();
  return (json.results?.bindings ?? []).map((b) => ({
    celex: b.celex?.value ?? '',
    date: b.date?.value?.split('T')[0] ?? '',
  }));
}

async function queryEurlexFallback() {
  const res = await fetch(EURLEX_CONSOLIDATION_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`EUR-Lex HTTP ${res.status}`);
  const json = await res.json();
  // Retourne la date du document le plus récent trouvé
  const results = json.results?.result ?? [];
  return results
    .map((r) => ({
      celex: r.reference?.CELEX ?? '',
      date: r.content?.WORK_DATE_DOCUMENT ?? '',
    }))
    .filter((r) => r.celex && r.date);
}

function loadState() {
  if (!existsSync(STATE_FILE)) {
    console.error(`❌ Fichier d'état introuvable : ${STATE_FILE}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

function buildIssueBody(newAmendments, state) {
  const rows = newAmendments
    .map(
      (a) =>
        `| \`${a.celex}\` | ${a.date} | [Voir sur EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:${a.celex}) |`
    )
    .join('\n');

  return `## Nouveaux amendements détectés au Règlement (UE) 2023/915

${newAmendments.length} nouvel(s) amendement(s) publié(s) depuis la dernière vérification (**${state.lastChecked}**).

| CELEX | Date | Lien |
|-------|------|------|
${rows}

## Actions requises pour l'administrateur

1. **Consulter** chaque amendement sur EUR-Lex (liens ci-dessus)
2. **Identifier** les changements : nouveaux contaminants, nouvelles limites, modifications de valeurs
3. **Mettre à jour** \`reglement_2023_915_data.json\` avec les nouvelles données
4. **Mettre à jour** \`regulation-state.json\` : ajouter les nouveaux CELEX dans \`knownAmendments\` et mettre à jour \`latestConsolidationDate\`
5. **Commiter et pousser** sur GitHub — l'application reflètera automatiquement les nouvelles données

> 📋 Version consolidée actuelle : [\`${state.latestConsolidationCelex}\`](https://eur-lex.europa.eu/eli/reg/2023/915/${state.latestConsolidationDate}/eng)
> 🔗 Texte consolidé complet : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:${state.latestConsolidationCelex?.replace(/-/g, '')}

---
*Vérification automatique via GitHub Actions — [workflow](.github/workflows/check-regulation-updates.yml)*`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Vérification des amendements au Règlement (UE) 2023/915...');

  const state = loadState();
  const knownCelexSet = new Set(state.knownAmendments.map((a) => a.celex));

  let remoteAmendments = [];

  // 1. Essai via SPARQL CELLAR
  try {
    remoteAmendments = await querySparql();
    console.log(`✅ SPARQL CELLAR : ${remoteAmendments.length} amendement(s) trouvé(s)`);
  } catch (err) {
    console.warn(`⚠️  SPARQL échoué (${err.message}), tentative fallback EUR-Lex...`);
    try {
      remoteAmendments = await queryEurlexFallback();
      console.log(`✅ EUR-Lex fallback : ${remoteAmendments.length} entrée(s) trouvée(s)`);
    } catch (err2) {
      console.error(`❌ Les deux APIs ont échoué : ${err2.message}`);
      console.log('ℹ️  Pas de mise à jour de l\'état — réessai à la prochaine exécution.');
      process.exit(0);
    }
  }

  // 2. Filtrer les nouveaux (absents de knownAmendments)
  const newAmendments = remoteAmendments.filter(
    (a) => a.celex && !knownCelexSet.has(a.celex)
  );

  // 3. Mettre à jour la date de dernière vérification
  state.lastChecked = new Date().toISOString().split('T')[0];

  if (newAmendments.length === 0) {
    console.log('✅ Aucun nouvel amendement — données à jour.');
    saveState(state);
    // Supprimer l'éventuel fichier résidu d'une ancienne exécution
    if (existsSync(OUTPUT_FILE)) {
      writeFileSync(OUTPUT_FILE, '', 'utf-8');
    }
    process.exit(0);
  }

  // 4. Nouveaux amendements détectés
  console.log(`🚨 ${newAmendments.length} nouvel(s) amendement(s) :`);
  newAmendments.forEach((a) => console.log(`   - ${a.celex} (${a.date})`));

  // 5. Écrire le fichier de sortie pour le workflow
  const issueTitle = `🚨 Mise à jour réglementaire — ${newAmendments.length} nouvel(s) amendement(s) au Règlement (UE) 2023/915`;
  const issueBody = buildIssueBody(newAmendments, state);

  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ title: issueTitle, body: issueBody, count: newAmendments.length }, null, 2),
    'utf-8'
  );

  // 6. Sauvegarder l'état mis à jour (avec les nouveaux amendements)
  for (const a of newAmendments) {
    state.knownAmendments.push({ celex: a.celex, date: a.date, subject: 'À documenter', applicableFrom: '' });
  }
  saveState(state);

  console.log(`📝 update-found.json écrit — le workflow va créer une Issue GitHub.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
