#!/usr/bin/env node
/**
 * Gate 10 — aucune dépendance à Cypress Cloud dans le code ni la CI (P6, ADR-011).
 *
 * POURQUOI CETTE GATE EXISTE. ADR-003 avait écrit cet invariant dans sa
 * section « surveillé via », sous forme d'une commande `grep` que le lecteur
 * était censé lancer. Personne ne l'a jamais lancée : une commande dans un
 * fichier de documentation n'est pas un contrôle, c'est une intention. Trois
 * semaines plus tard, `docs/ARCHITECTURE.md` affirmait encore qu'une
 * démonstration Test Replay avait eu lieu alors que la semaine 7 l'avait
 * annulée — la documentation avait dérivé sans que rien ne l'arrête.
 *
 * ADR-011 rouvre une porte étroite (une démonstration manuelle de `cy.prompt`,
 * hors du specPattern). Une porte étroite non gardée s'élargit. Celle-ci est
 * gardée ici.
 */
const fs = require("fs");
const path = require("path");

// Racine SURCHARGEABLE. `check-gates.js` fait tourner cette gate contre un
// arbre de test pour prouver que chacune de ses règles rejette encore ce
// qu'elle existe pour rejeter. Sans ce point d'entrée, prouver une gate
// obligerait à muter le vrai dépôt — ce que j'ai fait à la main, dans le
// terminal, et dont il ne restait rien le lendemain.
const RACINE = process.env.GATE_ROOT
  ? path.resolve(process.env.GATE_ROOT)
  : path.join(__dirname, "..");
const erreurs = [];

/** Fichiers versionnés d'une arborescence, sans node_modules ni artefacts. */
const fichiers = (repertoire, filtre) => {
  const trouves = [];
  const parcourir = (courant) => {
    if (!fs.existsSync(courant)) return;
    for (const entree of fs.readdirSync(courant, { withFileTypes: true })) {
      if (/^(node_modules|\.git|artefacts|coverage|dist)$/.test(entree.name)) continue;
      const complet = path.join(courant, entree.name);
      if (entree.isDirectory()) parcourir(complet);
      else if (filtre(complet)) trouves.push(complet);
    }
  };
  parcourir(repertoire);
  return trouves;
};

const relatif = (f) => path.relative(RACINE, f);

// ── 1. Pas d'enregistrement Cloud dans la CI ────────────────────────────────
// L'invariant littéral d'ADR-003, enfin exécuté.
for (const f of fichiers(path.join(RACINE, ".github"), (f) => /\.ya?ml$/.test(f))) {
  const lignes = fs.readFileSync(f, "utf8").split("\n");
  lignes.forEach((ligne, i) => {
    if (/^\s*#/.test(ligne)) return; // un commentaire qui NOMME l'interdit est légitime
    if (/record:\s*true|CYPRESS_RECORD_KEY\s*:|--record\b/.test(ligne)) {
      // RÈGLE: enregistrement-ci
      erreurs.push(
        `${relatif(f)}:${i + 1} — enregistrement Cypress Cloud dans la CI.\n` +
          `    P6 exige que la suite tourne sans compte tiers (ADR-003, ADR-011).`
      );
    }
  });
}

// ── 2. Pas de projectId dans la configuration Cypress ───────────────────────
// ADR-001 §C a retiré `projectId: "7s5okt"`. Le réintroduire — même le sien —
// rebranche le dépôt sur un compte.
const config = path.join(RACINE, "cypress.config.ts");
fs.readFileSync(config, "utf8")
  .split("\n")
  .forEach((ligne, i) => {
    if (/^\s*(\/\/|\*)/.test(ligne)) return;
    if (/\bprojectId\s*:/.test(ligne)) {
      // RÈGLE: project-id
      erreurs.push(
        `cypress.config.ts:${i + 1} — \`projectId\` réintroduit.\n` +
          `    ADR-001 §C l'a retiré : il rattache chaque run à un projet Cloud.`
      );
    }
  });

// ── 3. `cy.prompt` reste hors de la suite automatisée ───────────────────────
// La borne 1 d'ADR-011. `cy.prompt` appelle un LLM à travers le Cloud : son
// résultat n'est pas déterministe. Un gate bloquant dont le corps est
// régénéré à chaque run n'est plus un test de non-régression.
const suite = [
  ...fichiers(path.join(RACINE, "cypress", "e2e"), (f) => /\.cy\.tsx?$/.test(f)),
  ...fichiers(path.join(RACINE, "cypress", "api"), (f) => /\.cy\.tsx?$/.test(f)),
  ...fichiers(path.join(RACINE, "src"), (f) => /\.cy\.tsx?$/.test(f)),
];
for (const f of suite) {
  const lignes = fs.readFileSync(f, "utf8").split("\n");
  lignes.forEach((ligne, i) => {
    if (/^\s*(\/\/|\*)/.test(ligne)) return;
    if (/\bcy\.prompt\s*\(/.test(ligne)) {
      // RÈGLE: cy-prompt-dans-la-suite
      erreurs.push(
        `${relatif(f)}:${i + 1} — \`cy.prompt\` dans la suite automatisée.\n` +
          `    ADR-011 borne 1 : la démonstration vit dans cypress/manual/, hors specPattern.\n` +
          `    Elle exige un compte Cloud et son résultat n'est pas déterministe.`
      );
    }
  });
}

// ── 4. La démonstration reste hors du specPattern ───────────────────────────
// Contrôle du contrôle : si `cypress/manual/` entrait dans un specPattern, la
// borne 1 serait annulée sans qu'aucune des règles ci-dessus ne bronche.
const texteConfig = fs.readFileSync(config, "utf8");
for (const [, motif] of texteConfig.matchAll(/specPattern:\s*["'`]([^"'`]+)["'`]/g)) {
  if (motif.includes("manual") || /cypress\/\*\*/.test(motif)) {
    // RÈGLE: spec-pattern-trop-large
    erreurs.push(
      `cypress.config.ts — un specPattern (\`${motif}\`) engloberait cypress/manual/.\n` +
        `    La démonstration Cloud serait alors jouée par \`yarn cy:run\` et en CI.`
    );
  }
}

if (erreurs.length) {
  console.error(`\n✖ check-cloud : ${erreurs.length} violation(s) de P6 / ADR-011\n`);
  erreurs.forEach((e) => console.error(`  ${e}\n`));
  process.exit(1);
}
console.log("✔ check-cloud : aucune dépendance Cypress Cloud dans le code ni la CI");
