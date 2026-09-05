#!/usr/bin/env node
/**
 * Mesure les specs générées par IA contre les gates du projet (ADR-011, semaine 10).
 *
 * POURQUOI UN SCRIPT ET PAS UNE OPINION. « L'IA écrit des tests fragiles » est
 * une affirmation ; ce dépôt en exige des mesures. L'arbitre est donc
 * `.claude/hooks/check-spec.sh` — le même hook qui bloque mes propres specs
 * depuis la semaine 1. Il ne sait pas qui a écrit le code qu'il lit, et c'est
 * exactement ce qui rend son verdict utilisable.
 *
 * Les fichiers bruts vivent en `.cy.ts.txt` : hors eslint, hors prettier, hors
 * tsc, hors specPattern — aucune exclusion à maintenir, la sortie de l'IA est
 * conservée telle quelle sans polluer la toolchain.
 *
 * Ils sont recopiés sous un chemin `<tmp>/cypress/e2e/` : le hook applique ses
 * règles de SUITE (tags, seed dans beforeEach) sur ce motif de chemin. Rien
 * n'est écrit dans le dépôt.
 *
 *     yarn ia:mesure
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const BRUT = path.join(RACINE, "docs", "ia", "brut");
const HOOK = path.join(RACINE, ".claude", "hooks", "check-spec.sh");

const bac = fs.mkdtempSync(path.join(os.tmpdir(), "ia-mesure-"));
const dossier = path.join(bac, "cypress", "e2e");
fs.mkdirSync(dossier, { recursive: true });

/** Fait juger un fichier par le hook. Rend la liste de ses reproches. */
const juger = (chemin) => {
  try {
    execFileSync("bash", [HOOK], {
      input: JSON.stringify({ tool_input: { file_path: chemin } }),
      stdio: ["pipe", "pipe", "pipe"],
    });
    return [];
  } catch (erreur) {
    return String(erreur.stderr || "")
      .split("\n")
      .filter((l) => l.trim() && !/^\s*\d+[:-]/.test(l))
      .map((l) => l.trim());
  }
};

const resultats = fs
  .readdirSync(BRUT)
  .filter((f) => f.endsWith(".cy.ts.txt"))
  .sort()
  .map((f) => {
    const cible = path.join(dossier, f.replace(/\.txt$/, ""));
    fs.copyFileSync(path.join(BRUT, f), cible);
    return { fichier: f.replace(/\.cy\.ts\.txt$/, ""), reproches: juger(cible) };
  });

fs.rmSync(bac, { recursive: true, force: true });

const total = resultats.reduce((n, r) => n + r.reproches.length, 0);
const bloquees = resultats.filter((r) => r.reproches.length > 0).length;

console.log(`\nSpecs générées par un LLM externe, jugées par check-spec.sh\n`);
for (const { fichier, reproches } of resultats) {
  console.log(`  ${reproches.length ? "✖" : "✔"} ${fichier} — ${reproches.length} violation(s)`);
  reproches.forEach((r) => console.log(`      · ${r.split(" —")[0].split(" :")[0]}`));
}
console.log(
  `\n  ${bloquees}/${resultats.length} specs bloquées, ${total} violations automatiquement détectées.`
);
console.log(
  `  Ce chiffre est un PLANCHER : il ne compte que ce qu'une règle sait nommer.\n` +
    `  Les assertions creuses et les faux parcours ne sont pas dedans — voir docs/ia-revue.md.\n`
);

// Sortie 0 : ce script MESURE, il ne garde pas la porte. La gate qui garde la
// porte est `check-ai-review.js`.
