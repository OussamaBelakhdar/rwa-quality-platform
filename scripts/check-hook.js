#!/usr/bin/env node
/**
 * Vérifie que `.claude/hooks/check-spec.sh` distingue le CODE de la PROSE, et
 * qu'il ne se laisse pas satisfaire par de la prose là où il exige une présence.
 *
 * Pourquoi ce fichier existe : le hook a bloqué DEUX FOIS sa propre
 * documentation. D'abord la règle « pas de any », sur un commentaire citant la
 * signature de `cy.task`. Puis la règle « pas de cy.wait(ms) », sur un
 * commentaire expliquant précisément pourquoi `cy.wait(5500)` serait la
 * mauvaise réponse. La première fois j'ai corrigé l'instance ; la seconde a
 * montré que le défaut était de CLASSE — je n'avais pas regardé les autres
 * règles. Ce script garde la classe, pas une instance.
 *
 * Le hook n'a aucune autre couverture ; ce fichier est son seul test.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HOOK = path.join(__dirname, "..", ".claude", "hooks", "check-spec.sh");

/**
 * RÈGLES D'INTERDICTION — [description, contenu, doit être bloqué].
 * Elles ne doivent jamais se déclencher sur un commentaire qui cite le motif.
 */
const CAS = [
  ["code : annotation `: any`", "const x: any = 1;", true],
  ["code : assertion `as any`", "const x = y as any;", true],
  ["code : générique `<any>`", "type T = Chainable<any>;", true],
  ["code suivi d'un commentaire", "const x: any = 1; // note", true],
  ["commentaire `//` citant `: any`", "// task(event: string, arg?: any)", false],
  ["JSDoc `*` citant `: any`", " * task(event: string, arg?: any)", false],
  ["bloc `/*` citant `: any`", "/* arg?: any */", false],
  ["code sans `any`", "const x: unknown = 1;", false],
  ["code : cy.wait(500)", "cy.wait(500);", true],
  ["commentaire citant cy.wait(5500)", "// cy.wait(5500) serait la mauvaise réponse", false],
  ["code : it.only", "it.only('x', () => {});", true],
  ["commentaire citant it.only", "// it.only est interdit ici", false],
  ["code : sélecteur de classe", "cy.get('.ma-classe');", true],
  ["commentaire citant un sélecteur de classe", "// ne jamais écrire cy.get('.x')", false],
];

/**
 * RÈGLES DE PRÉSENCE — ici le défaut s'inverse. Un `cy.seed` ou un `tags:`
 * laissé en commentaire les satisferait sans rien faire : faux NÉGATIF, donc la
 * règle laisserait passer ce qu'elle existe pour bloquer.
 *
 * Ces cas exigent un chemin sous `cypress/e2e/`, que le hook reconnaît par
 * motif — le fichier de test reste hors du dépôt.
 */
const CAS_PRESENCE = [
  [
    "spec dont le cy.seed est en commentaire",
    'describe("x", { tags: ["@transactions", "@regression"] }, () => {\n  beforeEach(() => {\n    // cy.seed("default");\n  });\n});',
    true,
  ],
  [
    "spec dont les tags sont en commentaire",
    '// tags: ["@transactions", "@regression"]\ndescribe("x", () => {\n  beforeEach(() => {\n    cy.seed("default");\n  });\n});',
    true,
  ],
  [
    "spec conforme",
    'describe("x", { tags: ["@transactions", "@regression"] }, () => {\n  beforeEach(() => {\n    cy.seed("default");\n  });\n});',
    false,
  ],
];

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "check-hook-"));
const suite = path.join(dossier, "cypress", "e2e");
fs.mkdirSync(suite, { recursive: true });
let echecs = 0;

const estBloque = (fichier) => {
  try {
    execFileSync("bash", [HOOK], {
      input: JSON.stringify({ tool_input: { file_path: fichier } }),
      stdio: ["pipe", "pipe", "pipe"],
    });
    return false;
  } catch (erreur) {
    return erreur.status === 2;
  }
};

const verifier = (description, contenu, doitBloquer, fichier) => {
  fs.writeFileSync(fichier, contenu + "\n");
  const obtenu = estBloque(fichier);
  if (obtenu !== doitBloquer) {
    const attendu = doitBloquer ? "BLOQUÉ" : "accepté";
    console.error(
      `hook: « ${description} » — attendu ${attendu}, obtenu ${obtenu ? "BLOQUÉ" : "accepté"}`
    );
    echecs += 1;
  }
};

for (const [description, contenu, doitBloquer] of CAS) {
  verifier(description, contenu, doitBloquer, path.join(dossier, "cas.cy.ts"));
}
for (const [description, contenu, doitBloquer] of CAS_PRESENCE) {
  verifier(description, contenu, doitBloquer, path.join(suite, "cas.cy.ts"));
}

fs.rmSync(dossier, { recursive: true, force: true });

if (echecs) process.exit(1);
console.log(
  `hook: ${CAS.length} interdictions (code bloqué, prose acceptée) et ${CAS_PRESENCE.length} règles de présence vérifiées.`
);
