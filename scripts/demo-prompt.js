#!/usr/bin/env node
/**
 * Lance la démonstration `cy.prompt` sans rien écrire dans le dépôt (ADR-011).
 *
 * ── Le fait qui a tout décidé ──
 * `cy.prompt` n'exige pas seulement un COMPTE Cypress Cloud : il exige un
 * PROJET CONNECTÉ, donc un `projectId`. Le message est explicite :
 *
 *     cy.prompt requires a valid projectId.
 *     We were unable to find an existing projectId set in your Cypress config file.
 *
 * La première rédaction d'ADR-011 supposait qu'une simple connexion suffirait.
 * Elle avait tort, et l'assistant Cloud écrit d'ailleurs le `projectId`
 * directement dans `cypress.config.ts` — ce que `check-cloud.js` refuse.
 *
 * ── La sortie, vérifiée et non supposée ──
 * `CYPRESS_PROJECT_ID` est lu depuis l'environnement, et il suffit : mesuré,
 * `Cypress.config("projectId")` rend bien la valeur alors que le fichier de
 * configuration n'en contient AUCUNE.
 *
 * La borne 2 d'ADR-011 tient donc sans amendement — « rien qui rattache le
 * dépôt à un compte n'est commité ». Un identifiant propre à un opérateur
 * appartient à son environnement, pas au dépôt de tout le monde. P6 est intact :
 * un inconnu clone, lance `yarn cy:run`, et ne voit jamais ce projectId.
 *
 *     CYPRESS_PROJECT_ID=<votre id> yarn cy:demo:prompt
 */
const { spawnSync } = require("child_process");
const path = require("path");

const RACINE = path.join(__dirname, "..");

// `.env.local` est LU, comme le fait déjà `scripts/auth0-tenant.js`. Ce fichier
// est ignoré par git et sert précisément aux valeurs propres à un opérateur —
// les identifiants Auth0 y vivent depuis la semaine 9. Y mettre une ligne de
// plus évite d'avoir à se souvenir d'une variable à chaque lancement, ce qui
// est la meilleure façon de faire contourner un garde-fou.
require("dotenv").config({ path: path.join(RACINE, ".env.local") });

const id = process.env.CYPRESS_PROJECT_ID;

if (!id) {
  console.error(
    `\n✖ CYPRESS_PROJECT_ID est absent, et \`cy.prompt\` ne peut pas s'en passer.\n\n` +
      `  La commande exige un PROJET connecté à Cypress Cloud, pas seulement un\n` +
      `  compte. Sans projectId, elle refuse de s'exécuter.\n\n` +
      `  Où trouver l'identifiant : cloud.cypress.io → votre projet → Settings →\n` +
      `  Project ID. Six caractères.\n\n` +
      `  Deux façons, au choix :\n\n` +
      `      echo 'CYPRESS_PROJECT_ID=xxxxxx' >> .env.local   # une fois pour toutes\n` +
      `      CYPRESS_PROJECT_ID=xxxxxx yarn cy:demo:prompt    # ponctuel\n\n` +
      `  \`.env.local\` est ignoré par git et porte déjà vos identifiants Auth0.\n\n` +
      `  NE LE METTEZ PAS dans cypress.config.ts : \`check-cloud.js\` le refuse,\n` +
      `  et c'est voulu — P6 exige que le dépôt tourne sans compte tiers.\n` +
      `  L'environnement est le bon endroit pour un identifiant d'opérateur.\n`
  );
  process.exit(1);
}

console.log(
  `\nDémonstration cy.prompt — projet ${id}, lu depuis l'environnement.\n` +
    `Le dépôt reste vierge de tout identifiant : vérifiez avec \`git status\`.\n`
);

const r = spawnSync(
  "npx",
  [
    "cypress",
    "open",
    "--e2e",
    "--browser",
    "chrome",
    "--config",
    "specPattern=cypress/manual/**/*.cy.ts",
  ],
  { cwd: RACINE, stdio: "inherit", env: process.env }
);
process.exit(r.status ?? 1);
