#!/usr/bin/env node
/**
 * Lance la suite E2E dans un ordre de specs aléatoire — preuve d'isolation (P1).
 *
 * Un test qui passe seul mais échoue en suite dépend d'un état laissé par un
 * autre. Fixer l'ordre masque le problème ; le randomiser le fait remonter.
 *
 * La graine est imprimée et réinjectable :
 *     yarn cy:random                  # graine aléatoire, imprimée
 *     CY_RANDOM_SEED=123 yarn cy:random   # rejoue exactement le même ordre
 *
 * Sans cela un échec en ordre aléatoire serait irreproductible, donc
 * indiagnosticable — l'inverse de ce que le script cherche à prouver.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const E2E_DIR = path.join(__dirname, "..", "cypress", "e2e");

/** Générateur déterministe (mulberry32) : même graine, même ordre. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function collectSpecs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectSpecs(full);
    return /\.cy\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const specs = collectSpecs(E2E_DIR);
if (specs.length === 0) {
  console.error(`Aucune spec trouvée sous ${E2E_DIR}`);
  process.exit(1);
}

const seed = process.env.CY_RANDOM_SEED
  ? Number(process.env.CY_RANDOM_SEED)
  : Math.floor(Math.random() * 2 ** 31);
const random = mulberry32(seed);

// Fisher-Yates
for (let i = specs.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [specs[i], specs[j]] = [specs[j], specs[i]];
}

const relative = specs.map((s) => path.relative(process.cwd(), s));
console.log(`\nOrdre aléatoire — graine ${seed} (CY_RANDOM_SEED=${seed} pour rejouer)`);
relative.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${s}`));
console.log("");

const result = spawnSync(
  "npx",
  ["cypress", "run", "--e2e", "--spec", relative.join(","), ...process.argv.slice(2)],
  { stdio: "inherit" }
);
if (result.status !== 0) {
  console.error(
    `\nÉchec en ordre aléatoire. Rejouer exactement : CY_RANDOM_SEED=${seed} yarn cy:random\n`
  );
}
process.exit(result.status ?? 1);
