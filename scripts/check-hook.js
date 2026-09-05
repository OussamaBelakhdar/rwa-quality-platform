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
  ["code : annotation `: any`", "const x: any = 1;", true, "type-any"],
  ["code : assertion `as any`", "const x = y as any;", true, "type-any"],
  ["code : générique `<any>`", "type T = Chainable<any>;", true, "type-any"],
  ["code suivi d'un commentaire", "const x: any = 1; // note", true, "type-any"],
  ["commentaire `//` citant `: any`", "// task(event: string, arg?: any)", false],
  ["JSDoc `*` citant `: any`", " * task(event: string, arg?: any)", false],
  ["bloc `/*` citant `: any`", "/* arg?: any */", false],
  ["code sans `any`", "const x: unknown = 1;", false],
  ["code : cy.wait(500)", "cy.wait(500);", true, "attente-fixe"],
  ["commentaire citant cy.wait(5500)", "// cy.wait(5500) serait la mauvaise réponse", false],
  ["code : it.only", "it.only('x', () => {});", true, "skip-ou-only"],
  ["commentaire citant it.only", "// it.only est interdit ici", false],
  ["code : sélecteur de classe", "cy.get('.ma-classe');", true, "selecteur-fragile"],
  ["commentaire citant un sélecteur de classe", "// ne jamais écrire cy.get('.x')", false],

  // ── Ajoutés en semaine 10, après une panne silencieuse ────────────────────
  // Les deux règles les plus dures du projet — pas d'accès lowdb, pas de mot
  // de passe en dur — étaient MORTES. Elles lisaient `$code` avant que la
  // variable ne soit affectée : sous `set -u`, la substitution échouait, le
  // `grep` de la condition rendait faux, et le hook sortait 0 en écrivant
  // deux `unbound variable` que personne ne lisait.
  //
  // Ce fichier ne les couvrait pas. Il a été écrit pour garder « la classe et
  // non l'instance », et il ne gardait en fait que 6 des 14 règles du hook.
  ["code : require lowdb", 'const db = require("lowdb");', true, "acces-lowdb"],
  ["code : import lowdb", 'import low from "lowdb";', true, "acces-lowdb"],
  [
    "code : lecture de data/database.json",
    'cy.readFile("data/database.json");',
    true,
    "acces-lowdb",
  ],
  ["commentaire citant lowdb", "// le serveur tient son instance lowdb en mémoire", false],
  ["code : mot de passe en dur", 'cy.login("u", "s3cret");', true, "mot-de-passe-en-dur"],
  [
    "commentaire citant le mot de passe public",
    '// le mot de passe public "s3cret" vit dans .env',
    false,
  ],
  ["code : @ts-ignore (règle qui lit le fichier entier)", "// @ts-ignore", true, "ts-ignore"],
  ["code : data-test écrit en dur", "cy.get('[data-test=sidenav]');", true, "data-test-en-dur"],
  ["commentaire citant un data-test en dur", "// cy.get('[data-test=x]') est interdit", false],
  // Ajouté après qu'un `data-test` en dur dans un `.find()` soit passé au vert :
  // la règle ne couvrait que `cy.get(`. Un cas par écriture, sinon la couverture
  // ment de nouveau.
  [
    "code : data-test en dur dans un .find()",
    "cy.getBySel('x').find('[data-test=y]');",
    true,
    "data-test-en-dur",
  ],
  [
    "code : data-test en dur dans un .filter()",
    "cy.get('@a').filter('[data-test=y]');",
    true,
    "data-test-en-dur",
  ],
  ["code : cy.task brut", 'cy.task("db:reset", "default");', true, "cy-task-brut"],
  ["commentaire citant cy.task", '// cy.task("db:reset") n\'est pas typé', false],
  ["code : sélecteur #id", "cy.get('#username');", true, "selecteur-fragile"],
  ["code : it.skip", "it.skip('x', () => {});", true, "skip-ou-only"],
  ["code : describe.only", "describe.only('x', () => {});", true, "skip-ou-only"],
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
    "seed-dans-before-each",
  ],
  [
    "spec dont les tags sont en commentaire",
    '// tags: ["@transactions", "@regression"]\ndescribe("x", () => {\n  beforeEach(() => {\n    cy.seed("default");\n  });\n});',
    true,
    "tags-absents",
  ],
  // ── Trois règles restées non couvertes jusqu'ici ──────────────────────────
  // Le contrôle de couverture ajouté plus bas les a NOMMÉES. Sans lui, ce
  // banc affichait « 28 interdictions vérifiées » et personne ne pouvait
  // savoir qu'il en manquait trois — c'est le défaut de semaine 6 rejoué à
  // l'étage du dessus : un compteur qui monte n'est pas une couverture.
  [
    "spec avec un tag de domaine mais aucun tag de NIVEAU",
    'describe("x", { tags: ["@transactions"] }, () => {\n  beforeEach(() => {\n    cy.seed("default");\n  });\n});',
    true,
    "niveau-absent",
  ],
  [
    "spec accédant à window en ligne",
    'describe("x", { tags: ["@transactions", "@regression"] }, () => {\n  beforeEach(() => {\n    cy.seed("default");\n  });\n  it("y", () => {\n    cy.window().its("__services__");\n  });\n});',
    true,
    "window-inline",
  ],
  [
    "spec faisant un login par l'UI hors du domaine auth/",
    'describe("x", { tags: ["@transactions", "@regression"] }, () => {\n  beforeEach(() => {\n    cy.seed("default");\n    cy.visit("/signin");\n  });\n});',
    true,
    "login-ui-hors-auth",
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

// ── COUVERTURE : chaque règle du hook a-t-elle au moins un cas ? ────────────
//
// C'est le contrôle qui manquait, et son absence est la CAUSE des deux règles
// mortes de la semaine 10. Ce banc affichait « 15 interdictions vérifiées » et
// personne ne pouvait savoir qu'il en couvrait 6 sur 14 : un compteur qui
// monte n'est pas une couverture. Les huit règles non testées incluaient les
// deux interdits les plus durs du projet.
//
// La règle est découverte dans la SOURCE du hook (`# RÈGLE: <id>`), jamais
// dans une liste tenue à la main : une liste séparée aurait dérivé exactement
// comme la documentation qu'elle prétendait décrire.
//
// C'est aussi ce qui rend honnête l'exemption de `check-hook` dans
// `check-gates.js`. Sans ce bloc, l'exemption affirmait une adéquation
// fausse — et masquait précisément le défaut que la méta-gate existe pour
// trouver.
const reglesDuHook = new Set(
  [...fs.readFileSync(HOOK, "utf8").matchAll(/#\s*RÈGLE:\s*([a-z0-9-]+)/g)].map((m) => m[1])
);
const reglesCouvertes = new Set(
  [...CAS, ...CAS_PRESENCE].filter(([, , bloque]) => bloque).map(([, , , regle]) => regle)
);

for (const regle of reglesDuHook) {
  if (!reglesCouvertes.has(regle)) {
    console.error(`hook: règle « ${regle} » NON COUVERTE — aucun cas ne la déclenche.`);
    echecs += 1;
  }
}
for (const regle of reglesCouvertes) {
  if (regle && !reglesDuHook.has(regle)) {
    console.error(`hook: cas orphelin « ${regle} » — plus aucun marqueur dans check-spec.sh.`);
    echecs += 1;
  }
}

if (echecs) process.exit(1);
console.log(
  `hook: ${reglesDuHook.size} règles du hook, TOUTES couvertes — ` +
    `${CAS.length} cas d'interdiction et ${CAS_PRESENCE.length} de présence rejoués.`
);
