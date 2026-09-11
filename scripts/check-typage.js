#!/usr/bin/env node
/**
 * Gate 13 — aucun fichier TypeScript hors de portée de `yarn types`.
 *
 * ── Le défaut que cette gate ferme ──
 * `cypress.config.ts` n'était inclus dans AUCUN des deux `tsconfig` : ni dans
 * celui de la racine, ni dans celui de `cypress/`. Il tombait exactement entre
 * les deux, et `yarn types` passait au vert sur 364 lignes qu'il ne lisait pas.
 * Huit `any` implicites y dormaient — visibles dans l'IDE, invisibles en CI.
 *
 * En cherchant s'il était seul, la mesure a donné bien pire : **89 fichiers sur
 * 198**, dont TOUTE l'application et les 27 tests de composant. Ces derniers
 * étaient censés être couverts par `src/**\/*.cy.{js,ts,jsx,tsx}` — un motif à
 * ACCOLADES, que `include` de TypeScript ne développe pas. Il ne matchait rien,
 * et rien ne le disait.
 *
 * Les inclure a révélé 13 erreurs réelles dans l'application, toutes corrigées.
 *
 * ── Ce que la gate vérifie, parce que c'est décidable ──
 * Chaque `.ts` / `.tsx` du dépôt appartient au programme d'au moins un
 * `tsconfig`, ou figure dans `HORS_PORTEE` **avec sa raison écrite**.
 *
 * ── Ce qu'elle ne vérifie pas ──
 * Que le typage soit bon. Elle garantit qu'un fichier est LU, pas qu'il est
 * juste — c'est déjà ce qui manquait.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const RACINE = process.env.GATE_ROOT
  ? path.resolve(process.env.GATE_ROOT)
  : path.join(__dirname, "..");

/** Les `tsconfig` qui composent `yarn types`. */
const CONFIGS = ["tsconfig.json", path.join("cypress", "tsconfig.json")];

/**
 * Hors portée, chacun avec sa raison. Une exclusion sans raison est une dette
 * masquée ; ici elle est écrite et relisible.
 */
const HORS_PORTEE = {
  "amplify/": "types générés par AWS Amplify — code amont, jamais édité ici.",
  "playwright/":
    "module séparé (ADR-005, borne 1) : son propre tsconfig, vérifié par `cd playwright && tsc`.",
};

const erreurs = [];
const couverts = new Set();

for (const config of CONFIGS) {
  const complet = path.join(RACINE, config);
  if (!fs.existsSync(complet)) {
    erreurs.push(`${config} — absent. \`yarn types\` ne peut pas couvrir ce qu'il ne lit pas.`);
    continue;
  }
  const brut = ts.readConfigFile(complet, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(brut.config, ts.sys, path.dirname(complet));
  parsed.fileNames.forEach((f) => couverts.add(path.relative(RACINE, f)));
}

const tous = [];
const parcourir = (repertoire) => {
  for (const e of fs.readdirSync(repertoire, { withFileTypes: true })) {
    if (/^(node_modules|\.git|dist|artefacts|coverage|test-results)$/.test(e.name)) continue;
    const complet = path.join(repertoire, e.name);
    if (e.isDirectory()) parcourir(complet);
    else if (/\.tsx?$/.test(complet)) tous.push(path.relative(RACINE, complet));
  }
};
parcourir(RACINE);

const excusé = (f) => Object.keys(HORS_PORTEE).some((prefixe) => f.startsWith(prefixe));

for (const fichier of tous.sort()) {
  if (couverts.has(fichier) || excusé(fichier)) continue;
  // RÈGLE: fichier-hors-tsconfig
  erreurs.push(
    `${fichier} — n'appartient au programme d'aucun tsconfig.\n` +
      `    \`yarn types\` ne le lit pas : il peut contenir n'importe quoi.\n` +
      `    L'ajouter à un \`include\`, ou à HORS_PORTEE AVEC SA RAISON.`
  );
}

if (erreurs.length) {
  console.error(`\n✖ check-typage : ${erreurs.length} fichier(s) hors de portée de yarn types\n`);
  erreurs.forEach((e) => console.error(`  ${e}\n`));
  process.exit(1);
}
console.log(
  `typage: ${tous.filter((f) => !excusé(f)).length} fichiers TS, tous lus par yarn types ` +
    `(${Object.keys(HORS_PORTEE).length} arborescences hors portée, raison écrite).`
);
