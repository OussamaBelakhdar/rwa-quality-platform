#!/usr/bin/env node
/**
 * Vérifie que la règle « pas de `any` » de `.claude/hooks/check-spec.sh`
 * distingue le CODE de la PROSE.
 *
 * Pourquoi un script : la règle grepait le fichier entier et bloquait donc sa
 * propre documentation — un commentaire de `typage.contract.ts` qui cite la
 * signature `task(event: string, arg?: any)` la déclenchait. Corrigé en
 * semaine 5, et vérifié à la main sur huit cas. Une vérification faite une
 * fois n'est pas une garantie : un garde-fou dont personne ne teste le
 * comportement finit par mentir, comme il l'a déjà fait ici.
 *
 * Le hook lui-même n'a pas d'autre couverture ; ce fichier est son seul test.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HOOK = path.join(__dirname, "..", ".claude", "hooks", "check-spec.sh");

/** [description, contenu, doit être bloqué] */
const CAS = [
  ["code : annotation `: any`", "const x: any = 1;", true],
  ["code : assertion `as any`", "const x = y as any;", true],
  ["code : générique `<any>`", "type T = Chainable<any>;", true],
  ["code suivi d'un commentaire", "const x: any = 1; // note", true],
  ["commentaire `//` citant `: any`", "// task(event: string, arg?: any)", false],
  ["JSDoc `*` citant `: any`", " * task(event: string, arg?: any)", false],
  ["bloc `/*` citant `: any`", "/* arg?: any */", false],
  ["code sans `any`", "const x: unknown = 1;", false],
];

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "check-hook-"));
const fichier = path.join(dossier, "cas.cy.ts");
let echecs = 0;

for (const [description, contenu, doitBloquer] of CAS) {
  fs.writeFileSync(fichier, `${contenu}\n`);
  let bloque = false;
  try {
    execFileSync("bash", [HOOK], {
      input: JSON.stringify({ tool_input: { file_path: fichier } }),
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (erreur) {
    bloque = erreur.status === 2;
  }
  if (bloque !== doitBloquer) {
    console.error(
      `hook: « ${description} » — attendu ${doitBloquer ? "BLOQUÉ" : "accepté"}, obtenu ${bloque ? "BLOQUÉ" : "accepté"}`
    );
    echecs += 1;
  }
}

fs.rmSync(dossier, { recursive: true, force: true });

if (echecs) process.exit(1);
console.log(`hook: la règle « pas de any » distingue le code de la prose sur ${CAS.length} cas.`);
