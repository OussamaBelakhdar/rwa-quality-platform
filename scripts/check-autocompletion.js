#!/usr/bin/env node
/**
 * Vérifie que l'autocomplétion propose bien les clés `data-test` typées.
 *
 * Le plan de la semaine 3 demandait « autocomplétion IDE vérifiée (capture
 * d'écran) ». Une capture prouve qu'un écran affichait quelque chose un jour
 * donné ; elle ne détecte aucune régression et personne ne la relit.
 *
 * Ce script interroge le SERVICE DE LANGAGE TypeScript — le même que l'IDE
 * utilise pour peupler sa liste — et vérifie que `cy.getBySel("` propose les
 * clés de l'union. Si quelqu'un élargit `DataTestKey` à `string`, la liste
 * s'effondre et ce script échoue.
 */
const ts = require("typescript");
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
const TSCONFIG = path.join(RACINE, "cypress", "tsconfig.json");
const VIRTUEL = path.join(RACINE, "cypress", "support", "__autocompletion__.ts");

const brut = ts.readConfigFile(TSCONFIG, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(brut.config, ts.sys, path.dirname(TSCONFIG));

// Fichier de sondage : le curseur est placé juste après le guillemet ouvrant.
const SONDE = 'export function sonde(): void {\n  cy.getBySel("");\n}\n';
const position = SONDE.indexOf('getBySel("') + 'getBySel("'.length;

const fichiers = [...parsed.fileNames, VIRTUEL];
const versions = new Map(fichiers.map((f) => [f, "1"]));

const host = {
  getScriptFileNames: () => fichiers,
  getScriptVersion: (f) => versions.get(f) ?? "1",
  getScriptSnapshot: (f) =>
    f === VIRTUEL
      ? ts.ScriptSnapshot.fromString(SONDE)
      : fs.existsSync(f)
        ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, "utf8"))
        : undefined,
  getCurrentDirectory: () => RACINE,
  getCompilationSettings: () => parsed.options,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: (f) => f === VIRTUEL || ts.sys.fileExists(f),
  readFile: (f) => (f === VIRTUEL ? SONDE : ts.sys.readFile(f)),
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());
const completions = service.getCompletionsAtPosition(VIRTUEL, position, {});
const proposees = (completions?.entries ?? []).map((e) => e.name.replace(/^"|"$/g, ""));

const union = fs.readFileSync(
  path.join(RACINE, "cypress", "support", "selectors", "data-test.ts"),
  "utf8"
);
const attendues = [...union.matchAll(/^\s+"([^"]+)",$/gm)].map((m) => m[1]);

const manquantes = attendues.filter((k) => !proposees.includes(k));

if (proposees.length === 0) {
  console.error("Aucune complétion proposée — le service de langage n'a rien rendu.");
  process.exit(1);
}
if (manquantes.length) {
  console.error(`\n${manquantes.length} clé(s) attendues mais non proposées :`);
  manquantes.slice(0, 10).forEach((k) => console.error(`  - ${k}`));
  console.error("\nLe typage de cy.getBySel s'est relâché (DataTestKey élargi ?).");
  process.exit(1);
}

console.log(
  `autocomplétion: cy.getBySel("…") propose ${proposees.length} entrées, dont les ${attendues.length} clés de l'union.`
);
console.log(`  exemples : ${attendues.slice(0, 4).join(", ")}…`);
process.exit(0);
