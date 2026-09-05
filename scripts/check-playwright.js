#!/usr/bin/env node
/**
 * Gate 12 — la frontière d'ADR-005 est tenue par du code, pas par une intention.
 *
 * ── Pourquoi cette gate existe ──
 * ADR-005 fait entrer un module Playwright dans un dépôt dont les 11 gates ne
 * regardent que Cypress. Une spec Playwright pouvait donc violer, sans que rien
 * ne bronche, les règles que `check-spec.sh` fait respecter à trois mètres de
 * là — attente fixe, sélecteur fragile, mot de passe en dur.
 *
 * Le défaut a été relevé par `adr-challenger` : livrer une surface de test que
 * personne ne contrôle, le lendemain d'ADR-012 qui établit qu'une règle non
 * prouvée n'existe pas, aurait été une contradiction datée du même jour.
 *
 * ── Ce qu'elle vérifie, parce que c'est décidable ──
 * La borne 5 d'ADR-005 : chaque spec dit pourquoi WebKit change son résultat.
 * Sans cette ligne, la spec appartient à Cypress — et la coexistence glisse vers
 * l'option D que l'ADR écarte, celle qui n'a pas de raison de s'arrêter.
 */
const fs = require("fs");
const path = require("path");

// Racine surchargeable — `check-gates.js` fait tourner cette gate contre un
// arbre de test pour prouver que ses règles rejettent encore (ADR-012).
const RACINE = process.env.GATE_ROOT
  ? path.resolve(process.env.GATE_ROOT)
  : path.join(__dirname, "..");
const MODULE = path.join(RACINE, "playwright");
const erreurs = [];

if (!fs.existsSync(MODULE)) {
  console.log("playwright: module absent, rien à vérifier.");
  process.exit(0);
}

const specs = [];
const parcourir = (repertoire) => {
  if (!fs.existsSync(repertoire)) return;
  for (const e of fs.readdirSync(repertoire, { withFileTypes: true })) {
    if (/^(node_modules|test-results|playwright-report|\.auth)$/.test(e.name)) continue;
    const complet = path.join(repertoire, e.name);
    if (e.isDirectory()) parcourir(complet);
    else if (/\.spec\.ts$/.test(complet)) specs.push(complet);
  }
};
parcourir(MODULE);

for (const fichier of specs) {
  const relatif = path.relative(RACINE, fichier);
  const brut = fs.readFileSync(fichier, "utf8");
  // Vue CODE SEUL : les commentaires sont blanchis, pas supprimés, pour que les
  // numéros de ligne restent justes. Même leçon que `check-spec.sh`, qui a
  // bloqué deux fois sa propre documentation avant de l'apprendre.
  const code = brut
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
    .join("\n");

  // La justification, elle, se cherche dans les COMMENTAIRES — c'est leur objet.
  const enTete = brut.split("\n").slice(0, 12).join("\n");
  if (!/WebKit change le résultat/.test(enTete)) {
    // RÈGLE: justification-webkit
    erreurs.push(
      `${relatif} — aucune ligne « WebKit change le résultat : … » dans l'en-tête.\n` +
        `    ADR-005 borne 5 : sans cette justification, la spec appartient à Cypress.\n` +
        `    C'est la seule chose qui empêche la coexistence de glisser vers l'option D.`
    );
  }

  if (/["'`]s3cret["'`]/.test(code)) {
    // RÈGLE: mot-de-passe-en-dur
    erreurs.push(
      `${relatif} — mot de passe en dur. Utiliser MOT_DE_PASSE de support/socle.ts.\n` +
        `    Même règle que côté Cypress (.claude/rules/testing.md #3).`
    );
  }

  if (/waitForTimeout\(\s*\d/.test(code)) {
    // RÈGLE: attente-fixe
    erreurs.push(
      `${relatif} — \`waitForTimeout(ms)\`. Attendre un ÉVÉNEMENT, pas une durée.\n` +
        `    Équivalent Playwright de l'interdiction de \`cy.wait(<nombre>)\`.`
    );
  }

  if (/page\.locator\(\s*["'`][#.]/.test(code)) {
    // RÈGLE: selecteur-fragile
    erreurs.push(
      `${relatif} — sélecteur \`#id\` ou \`.class\`. Utiliser getByTestId ou getByRole.`
    );
  }

  // Même exigence que `check-quarantine.js` côté Cypress : un test mis de côté
  // sans ticket ni date est un test oublié. `fixme` et `skip` sont les deux
  // formes que Playwright offre ; les deux doivent se justifier.
  if (
    /test\.(fixme|skip)\(\s*\)/.test(code) &&
    !/QUARANTINE:\s*#\S+\s+\d{4}-\d{2}-\d{2}/.test(brut)
  ) {
    // RÈGLE: quarantaine-sans-ticket
    erreurs.push(
      `${relatif} — \`test.fixme()\` ou \`test.skip()\` sans « // QUARANTINE: #<issue> <AAAA-MM-JJ> ».\n` +
        `    Un test mis de côté sans ticket ni date est un test oublié.`
    );
  }

  if (/from\s+["'][^"']*\.\.\/\.\.\/cypress/.test(code)) {
    // RÈGLE: import-depuis-cypress
    erreurs.push(
      `${relatif} — importe depuis cypress/. ADR-005 borne 1 : les deux modules\n` +
        `    ne partagent aucun CODE, seulement le contrat HTTP /testData.`
    );
  }
}

// Borne 4 : WebKit et rien d'autre. Un projet Chromium dupliquerait la
// couverture Cypress sans rien prouver, et la coexistence perdrait sa raison.
const CONFIG = path.join(MODULE, "playwright.config.ts");
if (fs.existsSync(CONFIG)) {
  const conf = fs
    .readFileSync(CONFIG, "utf8")
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
    .join("\n");
  if (/name:\s*["'](chromium|firefox|chrome|edge)["']/.test(conf)) {
    // RÈGLE: navigateur-hors-webkit
    erreurs.push(
      `playwright.config.ts — un projet autre que WebKit.\n` +
        `    ADR-005 borne 4 : ce module n'existe que pour le moteur que Cypress ne\n` +
        `    couvre pas. Ailleurs, il duplique la suite Cypress à ses frais.`
    );
  }
}

if (erreurs.length) {
  console.error(`\n✖ check-playwright : ${erreurs.length} violation(s) d'ADR-005\n`);
  erreurs.forEach((e) => console.error(`  ${e}\n`));
  process.exit(1);
}
console.log(`playwright: ${specs.length} specs, frontière ADR-005 tenue (WebKit seul, justifiée).`);
