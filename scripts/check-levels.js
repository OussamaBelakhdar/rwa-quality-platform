#!/usr/bin/env node
/**
 * Toute spec déclare son NIVEAU en tête, et l'emplacement le confirme — ADR-004.
 *
 * Ce que la gate vérifie, parce que c'est décidable :
 *   1. une ligne `// Niveau <COMPOSANT|API|E2E> : <justification>` dans l'en-tête ;
 *   2. la cohérence entre le niveau déclaré et l'emplacement du fichier —
 *      `src/**` est composant, `cypress/api/**` est API, `cypress/e2e/**` est E2E.
 *
 * Ce qu'elle NE vérifie PAS, parce que c'est indécidable : que le niveau choisi
 * soit le bon. Rien dans un fichier ne dit si un test avait besoin du réseau.
 * La gate exige que le choix soit ÉCRIT, pas qu'il soit juste — et c'est déjà
 * ce qui manquait : `ARCHITECTURE.md` §7 a renvoyé pendant sept semaines à un
 * ADR-004 inexistant, sans que rien ne le signale.
 *
 * Pourquoi une gate plutôt qu'une relecture à la clôture : ce dépôt a
 * documenté trois garde-fous non outillés qui se sont désactivés en silence.
 * Confier celui-ci à la mémoire humaine aurait répété l'erreur.
 *
 * Le ratio est AFFICHÉ, jamais comparé à une cible (ADR-004, option C).
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const NIVEAU = /^\/\/\s*Niveau\s+(COMPOSANT|API|E2E)\b/im;
const EN_TETE = 25;

const ZONES = [
  { racine: "src", attendu: "COMPOSANT" },
  { racine: path.join("cypress", "api"), attendu: "API" },
  { racine: path.join("cypress", "e2e"), attendu: "E2E" },
];

const specs = (dir) => {
  const complet = path.join(RACINE, dir);
  if (!fs.existsSync(complet)) return [];
  const parcourir = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const enfant = path.join(d, e.name);
      if (e.isDirectory()) return e.name === "node_modules" ? [] : parcourir(enfant);
      return /\.cy\.tsx?$/.test(e.name) ? [enfant] : [];
    });
  return parcourir(complet);
};

const problemes = [];
const compte = { COMPOSANT: 0, API: 0, E2E: 0 };

for (const { racine, attendu } of ZONES) {
  for (const fichier of specs(racine)) {
    const relatif = path.relative(RACINE, fichier);
    const enTete = fs.readFileSync(fichier, "utf8").split("\n").slice(0, EN_TETE).join("\n");
    const trouve = NIVEAU.exec(enTete);
    if (!trouve) {
      problemes.push(
        `${relatif} — aucune ligne « // Niveau <COMPOSANT|API|E2E> : … » dans les ${EN_TETE} premières lignes`
      );
      continue;
    }
    const declare = trouve[1].toUpperCase();
    if (declare !== attendu) {
      problemes.push(
        `${relatif} — déclare « ${declare} » mais vit sous ${racine}/, donc ${attendu}`
      );
      continue;
    }
    compte[declare] += 1;
  }
}

if (problemes.length) {
  console.error("\nniveaux — ADR-004 :");
  problemes.forEach((p) => console.error(`  ${p}`));
  console.error("");
  process.exit(1);
}

const total = compte.COMPOSANT + compte.API + compte.E2E;
const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
console.log(
  `niveaux : ${total} specs déclarent le leur — ${compte.COMPOSANT} composant (${pct(compte.COMPOSANT)} %), ` +
    `${compte.API} api (${pct(compte.API)} %), ${compte.E2E} e2e (${pct(compte.E2E)} %). Ratio publié, non ciblé.`
);
