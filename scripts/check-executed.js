#!/usr/bin/env node
/**
 * Vérifie qu'un run a RÉELLEMENT exécuté ce qu'il a enregistré.
 *
 * Pourquoi ce contrôle existe : un test mis en attente ne fait pas échouer
 * Cypress. Un job dont l'unique raison d'être est d'exercer un flux peut donc
 * afficher « All specs passed » sans avoir rien exécuté — il suffit d'une
 * variable d'environnement mal orthographiée dans le workflow. C'est la même
 * famille que le hook `check-spec.sh` qui sortait 0 quand `jq` manquait
 * (semaine 6) : un garde-fou doit échouer FERMÉ.
 *
 * `AUTH0_REQUIRED` traite déjà ce cas pour Auth0, et il le traite MIEUX : il
 * nomme la variable absente. Ce script-ci est le filet générique — il ne dit
 * pas POURQUOI, il dit QUE. Il couvre les drapeaux `okta_configured`,
 * `cognito_configured` et `google_configured`, encore sans spec aujourd'hui,
 * et tout `this.skip()` qu'on ajouterait demain.
 *
 * Les trois signatures, mesurées sur Cypress 15 plutôt que supposées — la
 * sémantique `pending`/`skipped` a changé entre versions :
 *
 *   tout s'exécute      pending 0, skipped 0
 *   `this.skip()`       pending N, skipped 0
 *   `beforeEach` échoue pending 0, skipped N   (les suivants ne tournent pas)
 *
 * Le second cas est celui qui passe inaperçu : Cypress sort 0.
 *
 * Usage : node scripts/check-executed.js [dossier-de-rapports]
 * En CI le conteneur est neuf, donc le dossier ne contient que le run courant.
 */
const fs = require("fs");
const path = require("path");

const DOSSIER = path.resolve(process.argv[2] || "results/mochawesome");

if (!fs.existsSync(DOSSIER)) {
  console.error(
    `exécution: ${path.relative(process.cwd(), DOSSIER)} introuvable — aucun rapport à vérifier.`
  );
  process.exit(1);
}

const rapports = fs.readdirSync(DOSSIER).filter((f) => f.endsWith(".json"));
if (rapports.length === 0) {
  console.error(
    `exécution: aucun rapport dans ${path.relative(process.cwd(), DOSSIER)} — le run n'a rien produit.`
  );
  process.exit(1);
}

/** Parcourt les suites imbriquées pour retrouver le TITRE des tests non joués. */
const titresNonJoues = (noeud, acc = []) => {
  for (const t of noeud.tests || []) {
    if (t.pending) acc.push({ etat: "en attente", titre: t.fullTitle || t.title });
    else if (t.skipped) acc.push({ etat: "ignoré", titre: t.fullTitle || t.title });
  }
  for (const s of noeud.suites || []) titresNonJoues(s, acc);
  return acc;
};

let attente = 0;
let ignores = 0;
let joues = 0;
const details = [];

for (const f of rapports) {
  const rapport = JSON.parse(fs.readFileSync(path.join(DOSSIER, f), "utf8"));
  const s = rapport.stats || {};
  attente += s.pending || 0;
  ignores += s.skipped || 0;
  joues += (s.passes || 0) + (s.failures || 0);
  if ((s.pending || 0) + (s.skipped || 0) > 0) {
    for (const r of rapport.results || []) {
      for (const d of titresNonJoues(r)) details.push({ fichier: r.file || f, ...d });
    }
  }
}

if (attente + ignores === 0) {
  console.log(
    `exécution: ${joues} test(s) joué(s) dans ${rapports.length} rapport(s), aucun en attente ni ignoré.`
  );
  process.exit(0);
}

console.error(
  `\n${attente} test(s) en attente et ${ignores} ignoré(s) — ce run n'a pas exercé ce qu'il déclare :`
);
for (const d of details.slice(0, 20)) console.error(`  ✖ [${d.etat}] ${d.fichier} — ${d.titre}`);
if (details.length > 20) console.error(`  … et ${details.length - 20} autre(s)`);
console.error(
  `\nUn job dédié qui saute ses tests passe au vert sans rien prouver.\n` +
    `Si l'attente est LÉGITIME ici, ne pas lancer ce contrôle sur ce job ; sinon,\n` +
    `chercher la condition qui met la spec en attente (variables d'environnement).\n`
);
process.exit(1);
