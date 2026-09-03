#!/usr/bin/env node
/**
 * Vérifie qu'aucun fichier porteur de secrets n'est suivi par git, et que les
 * règles d'ignorance qui le garantissent existent toujours.
 *
 * Pourquoi ce contrôle existe : `docs/PLAN.md` fait du « `.env` non commité »
 * un critère de fin de la semaine 9, et `CLAUDE.md` interdit de committer
 * `.env.local`, `cypress.env.json` et les secrets Auth0. C'était vrai au moment
 * où on l'a écrit — rien ne le maintenait. Une règle sans gate est une
 * intention, et la semaine 9 introduit justement les premiers vrais secrets du
 * projet (identifiants d'un tenant Auth0).
 *
 * Ce que ce script PEUT vérifier : qu'aucun de ces fichiers n'est suivi, ni
 * maintenant, ni dans l'historique. Ce qu'il NE PEUT PAS vérifier : qu'un
 * secret n'a pas été collé dans un fichier ordinaire. C'est le rôle de la
 * revue, et de l'interdiction du mot de passe en dur déjà tenue par
 * `check-spec.sh`.
 *
 * `.env` est délibérément EXCLU de la liste : il est commité et public — ports,
 * tailles de seed, mot de passe de test `s3cret` (CLAUDE.md). L'y ajouter
 * ferait échouer le dépôt sur son propre fonctionnement.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..");

const INTERDITS = [
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
  "cypress.env.json",
];

const git = (cmd) => {
  try {
    return execSync(cmd, { cwd: RACINE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

const problemes = [];

// 1. Aucun de ces fichiers ne doit être suivi MAINTENANT.
const suivis = git("git ls-files").split("\n").filter(Boolean);
for (const f of INTERDITS) {
  if (suivis.includes(f)) problemes.push(`${f} est SUIVI par git — il porte des secrets`);
}

// 2. Ni l'avoir été. Un fichier retiré de l'index reste dans l'historique, et
//    un secret publié une fois est un secret publié.
const historique = git(`git log --all --name-only --pretty=format: -- ${INTERDITS.join(" ")}`)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);
for (const f of [...new Set(historique)]) {
  problemes.push(`${f} apparaît dans l'HISTORIQUE — le retirer de l'index ne suffit pas`);
}

// 3. Les règles d'ignorance doivent exister : c'est ce qui rend le point 1
//    durable plutôt que chanceux.
const gitignore = fs.existsSync(path.join(RACINE, ".gitignore"))
  ? fs.readFileSync(path.join(RACINE, ".gitignore"), "utf8")
  : "";
for (const f of INTERDITS) {
  const couvert =
    gitignore.split("\n").some((l) => l.trim() === f) ||
    git(`git check-ignore -q "${f}" && echo oui`).includes("oui");
  if (!couvert) problemes.push(`${f} n'est couvert par aucune règle de .gitignore`);
}

// 4. `.env` doit rester suivi : c'est le gabarit public, et son absence
//    casserait le démarrage pour tout nouveau clone.
if (!suivis.includes(".env")) {
  problemes.push(".env n'est PAS suivi — c'est le gabarit public, il doit l'être (CLAUDE.md)");
}

if (problemes.length === 0) {
  console.log(
    `secrets: ${INTERDITS.length} fichiers sensibles ni suivis ni dans l'historique, et .env public toujours en place.`
  );
  process.exit(0);
}

console.error(`\n${problemes.length} problème(s) d'hygiène des secrets :`);
problemes.forEach((p) => console.error(`  ✖ ${p}`));
console.error("");
process.exit(1);
