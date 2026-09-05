#!/usr/bin/env node
/**
 * Gate 11 — LES GATES SONT PROUVÉES. Une règle sans preuve fait échouer le lint.
 *
 * ── Le défaut de classe que cette gate ferme ──
 * Ce dépôt a corrigé six garde-fous qui ne gardaient rien : `jq` absent
 * (semaine 6), le serveur OIDC fantôme (semaine 9), puis quatre en semaine 10 —
 * deux règles du hook mortes sous `set -u`, `check-hook.js` qui ne les testait
 * pas, `check-selectors` aveugle à une écriture JSX, `auth0_configured` qui
 * répondait à une autre question que celle posée.
 *
 * Chacun a été corrigé PUIS prouvé par mutation, à la main, dans un terminal.
 * Et c'est là le vrai défaut : **il ne restait rien de ces preuves.** Elles ne
 * tournaient plus jamais. Une gate écrite hier n'a aucune raison de fonctionner
 * demain — le hook l'a démontré en cessant de bloquer sans que rien ne change
 * dans son propre fichier.
 *
 * ── Ce que la gate vérifie, parce que c'est décidable ──
 *   1. toute gate de `scripts/check-*.js` est SOUS CONTRAT ou explicitement
 *      exemptée — on ne peut pas ajouter une gate en douce ;
 *   2. toute règle marquée `// RÈGLE: <id>` dans une gate sous contrat possède
 *      au moins un cas de REJET. C'est ce point-ci qui manquait : `check-hook.js`
 *      couvrait quatre règles sur douze, et personne ne pouvait le voir ;
 *   3. tout cas du catalogue vise une règle qui existe encore — un catalogue
 *      qui décrit des règles disparues donne une fausse assurance ;
 *   4. chaque cas est EXÉCUTÉ : la gate tourne contre un arbre de test
 *      (`GATE_ROOT`) et doit rejeter ce qui doit l'être, accepter le reste.
 *
 * ── Ce qu'elle ne vérifie pas, parce que c'est indécidable ──
 * Que la règle soit la bonne, ou que le cas soit représentatif. Elle garantit
 * qu'une règle peut encore échouer — pas qu'elle a raison d'exister.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const CAS = require("./gates.cas.js");

/**
 * Gates sous contrat : chacune doit voir toutes ses règles prouvées ici.
 *
 * La liste est explicite, et c'est volontaire : une gate qui apparaît dans
 * `scripts/` sans être ici fait échouer le contrôle. Le retard éventuel est
 * ainsi VISIBLE au lieu d'être tacite.
 */
const SOUS_CONTRAT = [
  "check-cloud",
  "check-ai-review",
  "check-selectors",
  "check-references",
  "check-quarantine",
  "check-levels",
  "check-seed-contract",
  "check-autocompletion",
];

/**
 * Exemptions, chacune avec sa raison. Une exemption sans raison est une
 * dette masquée ; ici elle est écrite et relisible.
 */
const EXEMPTEES = {
  "check-hook":
    "prouvée par son propre banc, qui vérifie LUI-MÊME sa couverture : il découvre les " +
    "règles dans la source du hook (`# RÈGLE:`) et échoue si l'une n'a aucun cas. " +
    "L'exemption disait d'abord « prouvée par son propre banc — 28 cas » : un compteur, " +
    "pas une couverture. Le banc en couvrait alors 6 sur 14.",
  "check-gates": "c'est cette gate ; elle se prouve par les cas qu'elle exécute.",
  "check-test-surface":
    "STRUCTURELLE, et non une dette. Elle ne lit aucun fichier : elle construit " +
    "l'application, la sert et interroge les ports — c'est un contrôle de " +
    "COMPORTEMENT à l'exécution, qu'un arbre de fichiers ne représente pas. " +
    "Elle portait « semaine 11 » jusqu'à ce que la tentative de la mettre sous " +
    "contrat démente ce report.",
  "check-executed": "lit des rapports mochawesome produits par un run CI, pas l'arbre.",
  "check-secrets": "interroge l'historique git ; un arbre de test n'a pas d'historique.",
};

const erreurs = [];

// ── 1. Aucune gate hors contrat ni exemption ────────────────────────────────
const gates = fs
  .readdirSync(path.join(RACINE, "scripts"))
  .filter((f) => /^check-.*\.js$/.test(f))
  .map((f) => f.replace(/\.js$/, ""));

for (const gate of gates) {
  if (!SOUS_CONTRAT.includes(gate) && !(gate in EXEMPTEES)) {
    erreurs.push(
      `${gate} — gate ni sous contrat ni exemptée.\n` +
        `    L'ajouter à SOUS_CONTRAT avec ses cas, ou à EXEMPTEES AVEC SA RAISON.`
    );
  }
}

// ── 2 et 3. Règles et cas se correspondent ──────────────────────────────────
const reglesDe = (gate) => {
  const source = fs.readFileSync(path.join(RACINE, "scripts", `${gate}.js`), "utf8");
  return [...source.matchAll(/\/\/\s*RÈGLE:\s*([a-z0-9-]+)/g)].map((m) => m[1]);
};

for (const gate of SOUS_CONTRAT) {
  const regles = new Set(reglesDe(gate));
  const prouvees = new Set(
    CAS.filter((c) => c.gate === gate && c.attendu === "rejet" && c.regle).map((c) => c.regle)
  );

  for (const regle of regles) {
    if (!prouvees.has(regle)) {
      erreurs.push(
        `${gate} / ${regle} — règle NON PROUVÉE : aucun cas de rejet dans gates.cas.js.\n` +
          `    Une règle qu'aucun cas ne déclenche est indistinguable d'une règle morte.`
      );
    }
  }
  for (const regle of prouvees) {
    if (!regles.has(regle)) {
      erreurs.push(
        `${gate} / ${regle} — cas ORPHELIN : plus aucun marqueur \`// RÈGLE: ${regle}\`.\n` +
          `    Le catalogue décrirait une règle disparue, donc une assurance fausse.`
      );
    }
  }
}

// ── 4. Exécution de chaque cas contre un arbre de test ──────────────────────
const ecrire = (racine, chemin, contenu) => {
  const complet = path.join(racine, chemin);
  fs.mkdirSync(path.dirname(complet), { recursive: true });
  fs.writeFileSync(complet, contenu);
};

let joues = 0;
for (const cas of CAS) {
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), "check-gates-"));
  try {
    for (const [chemin, contenu] of Object.entries(cas.arbre)) ecrire(bac, chemin, contenu);

    const r = spawnSync("node", [path.join(RACINE, "scripts", `${cas.gate}.js`)], {
      env: { ...process.env, GATE_ROOT: bac },
      encoding: "utf8",
    });
    joues += 1;

    // UN PLANTAGE N'EST PAS UN REJET, et confondre les deux rouvrirait la porte
    // que cette gate ferme : une gate cassée sort en non-zéro comme une gate qui
    // refuse, donc elle passerait tous ses propres cas de rejet. La trace Node
    // sur stderr est le signal qui les sépare.
    // Les couleurs sont RETIRÉES avant l'examen : Node enrobe chaque ligne de
    // trace dans des codes ANSI, si bien qu'un motif ancré sur `^\s+at ` ne
    // voyait jamais rien. Le contrôle existait et ne contrôlait rien — la
    // septième occurrence de ce défaut dans ce dépôt, dans le code même écrit
    // pour l'empêcher.
    const sortie = `${r.stderr || ""}${r.stdout || ""}`.replace(/\u001b\[[0-9;]*m/g, "");
    if (r.error || /^\s+at .+:\d+:\d+\)?\s*$/m.test(sortie)) {
      erreurs.push(
        `${cas.gate}${cas.regle ? ` / ${cas.regle}` : ""} — « ${cas.intitule} »\n` +
          `    la gate a PLANTÉ au lieu de statuer. Un plantage ressemble à un rejet ` +
          `et ferait passer ce cas à tort.\n` +
          `    ${(r.stderr || String(r.error)).trim().split("\n").slice(0, 2).join("\n    ")}`
      );
      continue;
    }

    const rejete = r.status !== 0;
    const attenduRejet = cas.attendu === "rejet";
    if (rejete !== attenduRejet) {
      erreurs.push(
        `${cas.gate}${cas.regle ? ` / ${cas.regle}` : ""} — « ${cas.intitule} »\n` +
          `    attendu ${attenduRejet ? "REJET" : "ACCEPTATION"}, obtenu ` +
          `${rejete ? "REJET" : "ACCEPTATION"}.\n` +
          `    ${(r.stderr || r.stdout || "").trim().split("\n").slice(0, 3).join("\n    ")}`
      );
    }
  } finally {
    fs.rmSync(bac, { recursive: true, force: true });
  }
}

if (erreurs.length) {
  console.error(`\n✖ check-gates : ${erreurs.length} problème(s)\n`);
  erreurs.forEach((e) => console.error(`  ${e}\n`));
  process.exit(1);
}

const nbRegles = SOUS_CONTRAT.reduce((n, g) => n + new Set(reglesDe(g)).size, 0);
console.log(
  `gates: ${SOUS_CONTRAT.length} sous contrat, ${nbRegles} règles toutes prouvées, ` +
    `${joues} cas rejoués (${Object.keys(EXEMPTEES).length} gates exemptées, raison écrite).`
);
