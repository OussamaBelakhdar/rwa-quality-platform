#!/usr/bin/env node
/**
 * Lance la suite E2E dans un ordre aléatoire — preuve d'isolation (P1).
 *
 * PORTÉE : ce script mélange l'ordre des FICHIERS de spec, jamais celui des
 * `it` à l'intérieur d'un fichier. P1 parle de « chaque test » ; voici
 * pourquoi la preuve s'arrête là, avec les deux mesures qui l'ont décidé.
 *
 * 1. Réordonner `suite.tests` depuis un `before()` racine. Mesuré sur une
 *    spec de 4 tests : 3 exécutés, 1 en « Skipped ». Mocha tient un pointeur
 *    sur le tableau qu'il parcourt ; le muter fait sauter un test. Un mélange
 *    qui perd des tests est pire que pas de mélange — abandonné.
 * 2. Isoler chaque `it` par `--env grep=<titre>`. Mesuré : le filtrage par
 *    titre ne filtre pas — un motif inexistant laisse passer les 4 tests.
 *    `grepTags` filtre bien, mais au niveau des FICHIERS.
 *
 * CE QUI TIENT À LA PLACE, par construction et non par échantillonnage :
 * `testIsolation` (défaut Cypress) réinitialise l'état navigateur entre deux
 * `it`, et `check-spec.sh` exige un `cy.seed()` DANS le `beforeEach` de chaque
 * spec, ce qui réinitialise la base avant chaque test. Le couplage
 * intra-fichier est donc empêché, pas seulement échantillonné.
 *
 * Un test qui passe seul mais échoue en suite dépend d'un état laissé par un
 * autre. Fixer l'ordre masque le problème ; le randomiser le fait remonter.
 *
 * Cypress honore l'ordre passé à `--spec` : vérifié en semaine 4 en lançant
 * deux specs dans un sens puis dans l'autre, et en comparant les lignes
 * « Running: » de sa sortie. L'ordre imprimé ci-dessous est donc bien celui
 * qui s'exécute.
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

// Doit suivre le `specPattern` de cypress.config.ts. En semaine 3 le pattern
// est passé à `cypress/{e2e,api}/**` sans que ce script suive : cy:random
// exécutait 30 tests quand cy:run en exécutait 34, et l'affirmait vert. Une
// preuve d'isolation qui couvre moins que la suite est une preuve fausse.
// La garde en bas du fichier empêche que ça se reproduise silencieusement.
const RACINE_CYPRESS = path.join(__dirname, "..", "cypress");
const DOSSIERS_SPECS = ["e2e", "api"].map((d) => path.join(RACINE_CYPRESS, d));

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

const specs = DOSSIERS_SPECS.flatMap(collectSpecs);
if (specs.length === 0) {
  console.error(`Aucune spec trouvée sous ${DOSSIERS_SPECS.join(", ")}`);
  process.exit(1);
}

// Garde : toute spec de `cypress/` hors des dossiers balayés et hors
// `cypress/manual/` (démonstrations, hors specPattern par conception) est
// signalée. Sans elle, ajouter un domaine ferait silencieusement rétrécir la
// preuve d'isolation.
// Exclusion ANCRÉE sur le dossier `cypress/manual` et non sur la sous-chaîne
// « manual » : sans l'ancrage, `cypress/e2e/transactions/manual/x.cy.ts` serait
// silencieusement retiré de la preuve d'isolation — exactement la dérive que
// cette garde existe pour empêcher.
const DOSSIER_MANUEL = path.join(RACINE_CYPRESS, "manual") + path.sep;
const oubliees = collectSpecs(RACINE_CYPRESS).filter(
  (f) => !specs.includes(f) && !f.startsWith(DOSSIER_MANUEL)
);
if (oubliees.length) {
  console.error("\nSpecs non couvertes par l'ordre aléatoire :");
  oubliees.forEach((f) => console.error(`  ${path.relative(process.cwd(), f)}`));
  console.error("\nAjouter leur dossier à DOSSIERS_SPECS, ou les exclure explicitement.\n");
  process.exit(1);
}

// Graine validée : `CY_RANDOM_SEED=abc` donnait NaN, et `NaN >>> 0 === 0`
// rejouait silencieusement la graine 0 en affichant « graine NaN ». La
// reproductibilité est la raison d'être de ce script ; elle ne doit pas casser
// en silence.
let seed;
if (process.env.CY_RANDOM_SEED !== undefined) {
  seed = Number(process.env.CY_RANDOM_SEED);
  if (!Number.isInteger(seed) || seed < 0) {
    console.error(
      `CY_RANDOM_SEED doit être un entier positif, reçu : ${process.env.CY_RANDOM_SEED}`
    );
    process.exit(1);
  }
} else {
  seed = Math.floor(Math.random() * 2 ** 31);
}
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
  [
    "cypress",
    "run",
    "--e2e",
    // Retries forcés à zéro : avec retries.runMode=2, un test qui dépend de
    // l'état laissé par un autre échouerait puis passerait au retry, et la
    // preuve d'isolation (P1) serait verte alors que la dépendance existe.
    "--config",
    "retries=0",
    "--spec",
    relative.join(","),
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, CY_SHUFFLE_TESTS: "true", CY_RANDOM_SEED: String(seed) },
  }
);
if (result.status !== 0) {
  console.error(
    `\nÉchec en ordre aléatoire. Rejouer exactement : CY_RANDOM_SEED=${seed} yarn cy:random\n`
  );
}
process.exit(result.status ?? 1);
