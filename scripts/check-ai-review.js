#!/usr/bin/env node
/**
 * Gate 10 — toute spec taguée `@ai-generated` est relue par écrit.
 *
 * `docs/ARCHITECTURE.md` §10 annonçait ce gate depuis la semaine 3 : « Ajout de
 * l'IA (cy.prompt, LLM) → nouveau gate : revue humaine obligatoire des specs
 * générées, tag @ai-generated ». Il n'existait pas. Ce dépôt a déjà constaté
 * trois fois ce que devient un garde-fou seulement écrit : rien.
 *
 * Ce que la gate vérifie, parce que c'est décidable : le chemin de chaque spec
 * taguée figure dans `docs/ia-revue.md`.
 *
 * Ce qu'elle ne vérifie pas, parce que c'est indécidable : que la revue soit
 * bonne. Aucune machine ne juge si « le test ne teste pas son titre » a été vu.
 * La gate exige que quelqu'un ait signé, pas qu'il ait eu raison — c'est déjà
 * la différence entre un tag décoratif et un engagement.
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const REVUE = path.join(RACINE, "docs", "ia-revue.md");

if (!fs.existsSync(REVUE)) {
  console.error("\n✖ check-ai-review : docs/ia-revue.md est absent.\n");
  process.exit(1);
}
const revue = fs.readFileSync(REVUE, "utf8");

const specs = [];
const parcourir = (repertoire) => {
  if (!fs.existsSync(repertoire)) return;
  for (const entree of fs.readdirSync(repertoire, { withFileTypes: true })) {
    if (/^(node_modules|\.git|artefacts|coverage|dist)$/.test(entree.name)) continue;
    const complet = path.join(repertoire, entree.name);
    if (entree.isDirectory()) parcourir(complet);
    else if (/\.cy\.tsx?$/.test(complet)) specs.push(complet);
  }
};
["cypress", "src"].forEach((d) => parcourir(path.join(RACINE, d)));

const erreurs = [];
for (const fichier of specs) {
  // Vue code seul : un tag cité dans un commentaire — comme ce fichier le fait
  // lui-même — ne doit pas déclencher la règle. Même défaut de classe que le
  // hook `check-spec.sh` a payé deux fois.
  const code = fs
    .readFileSync(fichier, "utf8")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  if (!code.includes("@ai-generated")) continue;

  const relatif = path.relative(RACINE, fichier);
  if (!revue.includes(relatif)) {
    erreurs.push(
      `${relatif} — taguée @ai-generated, absente de docs/ia-revue.md.\n` +
        `    Une spec générée non relue par écrit est une spec dont personne ne répond.`
    );
  }
}

if (erreurs.length) {
  console.error(`\n✖ check-ai-review : ${erreurs.length} spec(s) générée(s) sans revue\n`);
  erreurs.forEach((e) => console.error(`  ${e}\n`));
  process.exit(1);
}
const nb = specs.filter((f) => fs.readFileSync(f, "utf8").includes("@ai-generated")).length;
console.log(
  `✔ check-ai-review : ${nb} spec(s) @ai-generated, toutes couvertes par docs/ia-revue.md`
);
