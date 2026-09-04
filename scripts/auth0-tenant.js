#!/usr/bin/env node
/**
 * Exécute le flux Auth0 contre un VRAI tenant, en une commande.
 *
 * Tout est déjà en place pour le fournisseur OIDC local (ADR-010) ; ce script
 * ne fait que pointer la même chaîne ailleurs. Il ne change aucun code : la
 * commande, la spec et le backend sont identiques — c'est ce qui rend la cible
 * interchangeable plutôt que parallèle.
 *
 * Il enchaîne ce que la clôture de semaine demande :
 *   1. contrôle des variables, en NOMMANT celles qui manquent ;
 *   2. démarrage de l'application en mode Auth0, avec attente réelle ;
 *   3. la spec, avec `AUTH0_REQUIRED` — donc un échec si rien ne s'exécute ;
 *   4. `cy:burn` pour mesurer le taux de flake (seuil §6 : 2 %) ;
 *   5. la vidéo, copiée dans `artefacts/` — `cypress/videos` est VIDÉ par
 *      Cypress avant chaque run, une vidéo qui y reste disparaît.
 *
 * Aucune valeur de secret n'est affichée, ni journalisée.
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");
const REQUIS = [
  "VITE_AUTH0_DOMAIN",
  "VITE_AUTH0_CLIENTID",
  "VITE_AUTH0_AUDIENCE",
  "AUTH0_USERNAME",
  "AUTH0_PASSWORD",
];

require("dotenv").config({ path: path.join(RACINE, ".env.local") });
require("dotenv").config({ path: path.join(RACINE, ".env") });

const manquantes = REQUIS.filter((v) => !process.env[v]);
if (manquantes.length) {
  console.error(`\n${manquantes.length} variable(s) absente(s) de .env.local :`);
  manquantes.forEach((v) => console.error(`  ✖ ${v}`));
  console.error(
    `\nVoir docs/adr/009-login-auth0-programmatique-vs-cy-origin.md, section\n` +
      `« prérequis du tenant » : trois créations et deux réglages, rien de plus.\n`
  );
  process.exit(1);
}

if (/localhost/.test(process.env.VITE_AUTH0_DOMAIN)) {
  console.error(
    `\nVITE_AUTH0_DOMAIN pointe sur localhost : c'est le fournisseur LOCAL.\n` +
      `Ce script vise un tenant réel — utiliser \`yarn dev:auth0:local\` pour l'autre cible.\n`
  );
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_AUTH0: "true",
  VITE_AUTH_TOKEN_NAME: process.env.VITE_AUTH_TOKEN_NAME || "authAccessToken",
  AUTH0_REQUIRED: "true",
  NODE_ENV: "development",
};

const sonde = (url) =>
  new Promise((resolve) => {
    const client = url.startsWith("https") ? require("https") : require("http");
    const requete = client.get(url, (r) => {
      r.resume();
      resolve(r.statusCode);
    });
    requete.on("error", () => resolve(0));
    requete.setTimeout(2000, () => {
      requete.destroy();
      resolve(0);
    });
  });

const attendre = async () => {
  for (let i = 0; i < 120; i += 1) {
    const front = await sonde("http://localhost:3000");
    const api = await sonde("http://localhost:3001/testData/seed/scenarios");
    if (front && api) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

const etape = (titre) => console.log(`\n── ${titre} ──`);

(async () => {
  etape("Démarrage de l'application en mode Auth0");
  const app = spawn("yarn", ["dev:auth0"], { cwd: RACINE, env, stdio: "ignore", detached: true });

  const arreter = () => {
    if (app.pid) {
      try {
        process.kill(-app.pid, "SIGTERM");
      } catch {
        app.kill();
      }
    }
  };
  process.on("exit", arreter);
  process.on("SIGINT", () => {
    arreter();
    process.exit(130);
  });

  if (!(await attendre())) {
    console.error("l'application n'a pas démarré — arrêt.");
    arreter();
    process.exit(1);
  }
  console.log("application prête sur http://localhost:3000");

  const lancer = (args, titre) => {
    etape(titre);
    const r = spawnSync("yarn", args, { cwd: RACINE, env, stdio: "inherit" });
    return r.status === 0;
  };

  const SPEC = "cypress/e2e/auth/auth0.cy.ts";
  let ok = lancer(
    ["cy:run", "--spec", SPEC, "--config", "video=true"],
    "La spec, contre le tenant"
  );

  if (ok) {
    const source = path.join(RACINE, "cypress", "videos", "auth0.cy.ts.mp4");
    const cible = path.join(RACINE, "artefacts", "semaine-9-tenant-auth0.mp4");
    if (fs.existsSync(source)) {
      fs.mkdirSync(path.dirname(cible), { recursive: true });
      fs.copyFileSync(source, cible);
      console.log(
        `\nvidéo : ${path.relative(RACINE, cible)} (${Math.round(fs.statSync(cible).size / 1024)} Ko)`
      );
    }
    ok = lancer(["cy:burn", "--spec", SPEC], "Burn — taux de flake, seuil §6 à 2 %");
  }

  arreter();
  console.log(
    ok
      ? "\nFlux Auth0 vérifié contre un tenant réel. Le dernier critère de la semaine 9 est tenu."
      : "\nÉchec — le message ci-dessus nomme la cause. Voir ADR-009 pour les prérequis du tenant."
  );
  process.exit(ok ? 0 : 1);
})();
