/**
 * Catalogue des preuves par mutation des gates — lu par `check-gates.js`.
 *
 * Une entrée = « voici un arbre de fichiers qui VIOLE cette règle ; la gate
 * doit le rejeter ». Les contrôles négatifs (`attendu: "acceptation"`) sont
 * aussi importants : une gate qui rejette tout est aussi inutile qu'une gate
 * qui n'accepte rien, et c'est par un faux positif qu'un garde-fou apprend à
 * être contourné.
 *
 * Chaque `regle` doit correspondre à un marqueur `// RÈGLE: <id>` dans la
 * source de la gate. `check-gates.js` refuse une règle sans cas ET un cas sans
 * règle : le catalogue ne peut donc ni prendre du retard, ni décrire une règle
 * qui n'existe plus.
 */

/** Union et préfixes minimaux, partagés par les cas de `check-selectors`. */
const unionVide = `export const DATA_TEST_KEYS = [\n] as const;\nexport type DataTestKey = (typeof DATA_TEST_KEYS)[number];\n`;
const unionAvecCle = `export const DATA_TEST_KEYS = [\n  "ma-cle",\n] as const;\nexport type DataTestKey = (typeof DATA_TEST_KEYS)[number];\n`;
// `never` et non une chaîne : un préfixe déclaré ici serait lui-même orphelin,
// et le contrôle négatif échouerait pour une raison qui n'a rien à voir avec ce
// qu'il teste. Un cas de test mal construit accuse la gate à tort.
const typesVides = `export type DataTestPrefix = never;\n`;

/**
 * Seed VALIDE de référence, réduit au minimum : une ligne par collection, toutes
 * conformes au contrat. Chaque cas de `check-seed-contract` en part et casse UN
 * champ.
 *
 * Pourquoi un seed complet plutôt qu'un objet à un champ : la gate signale
 * « collection absente ou vide » pour chaque collection manquante. Un fixture
 * partiel déclencherait donc sept ruptures en plus de celle qu'on veut isoler —
 * et le cas passerait pour la mauvaise raison. C'est l'erreur qu'un premier
 * fixture faisait, et elle rendait la mutation de `motif-uuid` indétectable.
 */
const seedValide = () => {
  const dates = { createdAt: "2026-01-01T00:00:00.000Z", modifiedAt: "2026-01-01T00:00:00.000Z" };
  const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const base = { ...dates, uuid };
  return {
    users: [
      {
        ...base,
        email: "a@b.co",
        phoneNumber: "123-456-7890",
        avatar: "https://exemple.test/a.png",
        firstName: "A",
        lastName: "B",
        username: "ab",
        balance: 100,
      },
    ],
    contacts: [{ ...base }],
    bankaccounts: [
      { ...base, accountNumber: "0123456789", routingNumber: "012345678", bankName: "Banque" },
    ],
    transactions: [{ ...base, description: "d", amount: 10, balanceAtCompletion: 20 }],
    likes: [{ ...base }],
    comments: [{ ...base, content: "c" }],
    notifications: [{ ...base }],
    banktransfers: [{ ...base, amount: 5 }],
  };
};

/** Un seed valide dont un seul champ est cassé, sérialisé pour l'arbre de test. */
const seedCasse = (mutation) => {
  const s = seedValide();
  mutation(s);
  return JSON.stringify(s);
};

/** Cas de `check-seed-contract` : une règle, un champ cassé, rien d'autre. */
const casSeed = (regle, intitule, mutation) => ({
  gate: "check-seed-contract",
  regle,
  intitule,
  arbre: { "data/database-seed.json": seedCasse(mutation) },
  attendu: "rejet",
});

module.exports = [
  // ── check-cloud ───────────────────────────────────────────────────────────
  {
    gate: "check-cloud",
    regle: "enregistrement-ci",
    intitule: "un run enregistré vers Cypress Cloud dans un workflow",
    arbre: {
      ".github/workflows/e2e.yml": "jobs:\n  x:\n    steps:\n      - run: cypress run --record\n",
      "cypress.config.ts": "export default {};\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-cloud",
    regle: "enregistrement-ci",
    intitule: "la clé d'enregistrement passée par un secret",
    arbre: {
      ".github/workflows/e2e.yml":
        "jobs:\n  x:\n    env:\n      CYPRESS_RECORD_KEY: ${{ secrets.K }}\n",
      "cypress.config.ts": "export default {};\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-cloud",
    regle: "project-id",
    intitule: "un projectId réintroduit dans la configuration",
    arbre: { "cypress.config.ts": 'export default { projectId: "abc123" };\n' },
    attendu: "rejet",
  },
  {
    gate: "check-cloud",
    regle: "cy-prompt-dans-la-suite",
    intitule: "cy.prompt appelé depuis une spec de la suite",
    arbre: {
      "cypress.config.ts": "export default {};\n",
      "cypress/e2e/x/y.cy.ts": 'it("x", () => {\n  cy.prompt(["connecte-toi"]);\n});\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-cloud",
    regle: "spec-pattern-trop-large",
    intitule: "un specPattern qui engloberait cypress/manual/",
    arbre: { "cypress.config.ts": 'export default { specPattern: "cypress/**/*.cy.ts" };\n' },
    attendu: "rejet",
  },
  {
    gate: "check-cloud",
    intitule: "un COMMENTAIRE qui nomme l'interdit reste toléré",
    arbre: {
      ".github/workflows/e2e.yml":
        "# jamais de CYPRESS_RECORD_KEY ni de record: true ici (ADR-003)\n",
      "cypress.config.ts": "// pas de projectId : ADR-001 §C\nexport default {};\n",
    },
    attendu: "acceptation",
  },

  // ── check-ai-review ───────────────────────────────────────────────────────
  {
    gate: "check-ai-review",
    regle: "revue-absente",
    intitule: "docs/ia-revue.md supprimé",
    arbre: { "cypress/e2e/x/y.cy.ts": "// vide\n" },
    attendu: "rejet",
  },
  {
    gate: "check-ai-review",
    regle: "tag-sans-revue",
    intitule: "une spec taguée @ai-generated absente de la revue",
    arbre: {
      "docs/ia-revue.md": "# Revue\n\nAucun fichier listé.\n",
      "cypress/e2e/x/y.cy.ts": 'describe("x", { tags: ["@ai-generated"] }, () => {});\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-ai-review",
    intitule: "le tag cité dans un commentaire ne déclenche pas",
    arbre: {
      "docs/ia-revue.md": "# Revue\n",
      "cypress/e2e/x/y.cy.ts":
        '// exemple : tags: ["@ai-generated"] serait à déclarer\ndescribe("x", () => {});\n',
    },
    attendu: "acceptation",
  },

  // ── check-selectors ───────────────────────────────────────────────────────
  {
    gate: "check-selectors",
    regle: "cle-manquante-dans-union",
    intitule: "une clé posée en JSX ordinaire, absente de l'union",
    arbre: {
      "src/A.tsx": 'export const A = () => <div data-test="ma-cle" />;\n',
      "cypress/support/selectors/data-test.ts": unionVide,
      "cypress/support/types.ts": typesVides,
    },
    attendu: "rejet",
  },
  {
    gate: "check-selectors",
    regle: "cle-manquante-dans-union",
    intitule: "une clé posée via inputProps MUI, absente de l'union",
    arbre: {
      "src/A.tsx": 'export const A = () => <input inputProps={{ "data-test": "ma-cle" }} />;\n',
      "cypress/support/selectors/data-test.ts": unionVide,
      "cypress/support/types.ts": typesVides,
    },
    attendu: "rejet",
  },
  {
    gate: "check-selectors",
    regle: "cle-manquante-dans-union",
    // Cette écriture-ci est la QUATRIÈME garde de ce projet à avoir échoué
    // ouvert : le motif exigeait un guillemet juste après le `=`, et cinq clés
    // de `BankAccountForm.tsx` vivaient hors de l'union sans que rien ne le
    // dise. Le cas existe pour que ça ne se reproduise pas en silence.
    intitule: 'une clé posée en JSX accoladé `data-test={"cle"}`, absente de l\'union',
    arbre: {
      "src/A.tsx": 'export const A = () => <div data-test={"ma-cle"} />;\n',
      "cypress/support/selectors/data-test.ts": unionVide,
      "cypress/support/types.ts": typesVides,
    },
    attendu: "rejet",
  },
  {
    gate: "check-selectors",
    regle: "cle-fantome-dans-union",
    intitule: "une clé de l'union disparue de src/",
    arbre: {
      "src/A.tsx": "export const A = () => <div />;\n",
      "cypress/support/selectors/data-test.ts": unionAvecCle,
      "cypress/support/types.ts": typesVides,
    },
    attendu: "rejet",
  },
  {
    gate: "check-selectors",
    regle: "prefixe-orphelin",
    intitule: "un préfixe dynamique déclaré mais absent de src/",
    arbre: {
      "src/A.tsx": "export const A = () => <div />;\n",
      "cypress/support/selectors/data-test.ts": unionVide,
      "cypress/support/types.ts": 'export type DataTestPrefix = "prefixe-jamais-pose";\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-selectors",
    intitule: "src/ et l'union concordent",
    arbre: {
      "src/A.tsx": 'export const A = () => <div data-test="ma-cle" />;\n',
      "cypress/support/selectors/data-test.ts": unionAvecCle,
      "cypress/support/types.ts": typesVides,
    },
    attendu: "acceptation",
  },

  // ── check-references ──────────────────────────────────────────────────────
  {
    gate: "check-references",
    regle: "fichier-introuvable",
    intitule: "une doc cite un fichier qui n'existe pas",
    arbre: { "docs/x.md": "Voir `cypress/support/disparu.ts:12`.\n" },
    attendu: "rejet",
  },
  {
    gate: "check-references",
    regle: "ligne-hors-fichier",
    intitule: "une doc cite une ligne au-dela de la fin du fichier",
    arbre: {
      "docs/x.md": "Voir `cypress/support/a.ts:99`.\n",
      "cypress/support/a.ts": "const a = 1;\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-references",
    regle: "ligne-vide",
    intitule: "une doc cite une ligne blanche",
    arbre: {
      "docs/x.md": "Voir `cypress/support/a.ts:2`.\n",
      "cypress/support/a.ts": "const a = 1;\n\nconst b = 2;\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-references",
    intitule: "une citation exacte, et une citation sans numero de ligne",
    arbre: {
      "docs/x.md": "Voir `cypress/support/a.ts:1` et `cypress/support/a.ts`.\n",
      "cypress/support/a.ts": "const a = 1;\n",
    },
    attendu: "acceptation",
  },

  // ── check-quarantine ──────────────────────────────────────────────────────
  {
    gate: "check-quarantine",
    regle: "ticket-absent",
    intitule: "@quarantine sans ticket ni date",
    arbre: { "cypress/e2e/x/y.cy.ts": 'describe("x", { tags: ["@quarantine"] }, () => {});\n' },
    attendu: "rejet",
  },
  {
    gate: "check-quarantine",
    regle: "date-illisible",
    intitule: "un ticket dont la date n'est pas une date",
    arbre: {
      "cypress/e2e/x/y.cy.ts":
        '// QUARANTINE: #12 pas-une-date\ndescribe("x", { tags: ["@quarantine"] }, () => {});\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-quarantine",
    regle: "quarantaine-perimee",
    intitule: "une quarantaine plus vieille que le delai maximum",
    arbre: {
      "cypress/e2e/x/y.cy.ts":
        '// QUARANTINE: #12 2020-01-01\ndescribe("x", { tags: ["@quarantine"] }, () => {});\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-quarantine",
    intitule: "une quarantaine recente et correctement ticketee",
    arbre: {
      "cypress/e2e/x/y.cy.ts":
        "// QUARANTINE: #12 " +
        new Date().toISOString().slice(0, 10) +
        '\ndescribe("x", { tags: ["@quarantine"] }, () => {});\n',
    },
    attendu: "acceptation",
  },

  // ── check-levels ──────────────────────────────────────────────────────────
  {
    gate: "check-levels",
    regle: "niveau-non-declare",
    intitule: "une spec sans ligne « // Niveau … »",
    arbre: { "cypress/e2e/x/y.cy.ts": 'describe("x", () => {});\n' },
    attendu: "rejet",
  },
  {
    gate: "check-levels",
    regle: "niveau-incoherent",
    intitule: "une spec sous cypress/e2e/ qui se declare COMPOSANT",
    arbre: {
      "cypress/e2e/x/y.cy.ts":
        '// Niveau COMPOSANT : au mauvais endroit\ndescribe("x", () => {});\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-levels",
    regle: "spec-sso-orpheline",
    intitule: "une spec @sso exclue des shards et nommee par aucun job",
    arbre: {
      "cypress/e2e/x/y.cy.ts":
        '// Niveau E2E : justification\ndescribe("x", { tags: ["@sso"] }, () => {});\n',
      ".github/workflows/e2e.yml": "jobs:\n  e2e:\n    steps: []\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-levels",
    intitule: "une spec E2E bien placee et bien declaree",
    arbre: { "cypress/e2e/x/y.cy.ts": '// Niveau E2E : justification\ndescribe("x", () => {});\n' },
    attendu: "acceptation",
  },

  // ── check-seed-contract ───────────────────────────────────────────────────
  {
    gate: "check-seed-contract",
    regle: "seed-introuvable",
    intitule: "le fichier de seed a disparu",
    arbre: { "README.md": "arbre sans data/database-seed.json\n" },
    attendu: "rejet",
  },
  casSeed("collection-absente", "une collection du contrat est vide", (s) => {
    s.likes = [];
  }),
  casSeed("champ-non-entier", "un montant en centimes fractionnaires", (s) => {
    s.transactions[0].amount = 10.5;
  }),
  casSeed("motif-uuid", "un uuid qui n'en est pas un", (s) => {
    s.users[0].uuid = "pas-un-uuid";
  }),
  casSeed("motif-telephone", "un téléphone hors format", (s) => {
    s.users[0].phoneNumber = "0612345678";
  }),
  casSeed("motif-chiffres10", "un numéro de compte qui n'a pas 10 chiffres", (s) => {
    s.bankaccounts[0].accountNumber = "123";
  }),
  casSeed("motif-chiffres9", "un numéro de routage qui n'a pas 9 chiffres", (s) => {
    s.bankaccounts[0].routingNumber = "12345678901";
  }),
  casSeed("motif-email", "une adresse sans arobase", (s) => {
    s.users[0].email = "pas-un-email";
  }),
  casSeed("motif-httpsUrl", "un avatar servi en clair", (s) => {
    s.users[0].avatar = "http://exemple.test/a.png";
  }),
  casSeed("motif-dateISO", "une date qui n'est pas ISO", (s) => {
    s.comments[0].createdAt = "01/01/2026";
  }),
  casSeed("motif-nonVide", "un champ obligatoire vide", (s) => {
    s.users[0].firstName = "   ";
  }),
  {
    gate: "check-seed-contract",
    intitule: "un seed conforme au contrat",
    arbre: { "data/database-seed.json": JSON.stringify(seedValide()) },
    attendu: "acceptation",
  },
  {
    gate: "check-quarantine",
    regle: "plafond-depasse",
    intitule: "plus de blocs en quarantaine que le plafond §6",
    // Construit en JS plutôt qu'écrit à la main : le plafond est une constante
    // de la gate, et un cas qui le recopierait en dur mentirait le jour où il
    // change. Six blocs pour un plafond de cinq.
    arbre: {
      "cypress/e2e/x/y.cy.ts": Array.from(
        { length: 6 },
        (_, i) =>
          `// QUARANTINE: #${i} ${new Date().toISOString().slice(0, 10)}\ndescribe("d${i}", { tags: ["@quarantine"] }, () => {});`
      ).join("\n"),
    },
    attendu: "rejet",
  },

  // ── check-autocompletion ──────────────────────────────────────────────────
  // Arbre auto-suffisant : un tsconfig minimal, sans `extends` ni `types`, pour
  // que le service de langage n'ait besoin ni de node_modules ni du tsconfig
  // racine. C'est ce qui rend cette gate testable — la plus difficile des sept,
  // parce qu'elle n'inspecte pas des fichiers mais interroge le compilateur.
  {
    gate: "check-autocompletion",
    regle: "cle-non-proposee",
    intitule: "le typage de getBySel s'est relâché — une clé de l'union n'est plus proposée",
    arbre: {
      "cypress/tsconfig.json":
        '{ "compilerOptions": { "strict": true, "types": [], "lib": ["es2022"], "noEmit": true }, "include": ["./**/*.ts"] }',
      "cypress/support/selectors/data-test.ts":
        'export const DATA_TEST_KEYS = [\n  "ma-cle",\n  "autre-cle",\n] as const;\nexport type DataTestKey = (typeof DATA_TEST_KEYS)[number];\n',
      "cypress/support/decl.d.ts":
        'import type { DataTestKey } from "./selectors/data-test";\ndeclare global {\n  const cy: { getBySel(key: Extract<DataTestKey, "ma-cle">): void };\n}\nexport {};\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-autocompletion",
    regle: "aucune-completion",
    intitule: "getBySel accepte n'importe quelle chaîne — plus aucune complétion",
    arbre: {
      "cypress/tsconfig.json":
        '{ "compilerOptions": { "strict": true, "types": [], "lib": ["es2022"], "noEmit": true }, "include": ["./**/*.ts"] }',
      "cypress/support/selectors/data-test.ts":
        'export const DATA_TEST_KEYS = [\n  "ma-cle",\n] as const;\nexport type DataTestKey = (typeof DATA_TEST_KEYS)[number];\n',
      "cypress/support/decl.d.ts":
        "declare global {\n  const cy: { getBySel(key: string): void };\n}\nexport {};\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-autocompletion",
    intitule: "le typage est intact : chaque clé de l'union est proposée",
    arbre: {
      "cypress/tsconfig.json":
        '{ "compilerOptions": { "strict": true, "types": [], "lib": ["es2022"], "noEmit": true }, "include": ["./**/*.ts"] }',
      "cypress/support/selectors/data-test.ts":
        'export const DATA_TEST_KEYS = [\n  "ma-cle",\n  "autre-cle",\n] as const;\nexport type DataTestKey = (typeof DATA_TEST_KEYS)[number];\n',
      "cypress/support/decl.d.ts":
        'import type { DataTestKey } from "./selectors/data-test";\ndeclare global {\n  const cy: { getBySel(key: DataTestKey): void };\n}\nexport {};\n',
    },
    attendu: "acceptation",
  },

  // ── check-playwright ──────────────────────────────────────────────────────
  // Chaque cas porte un en-tête VALIDE sauf celui qui teste l'en-tête : sans
  // ça, tous déclencheraient `justification-webkit` en plus de leur propre
  // règle, et passeraient pour la mauvaise raison. Même leçon que les fixtures
  // de seed.
  {
    gate: "check-playwright",
    regle: "justification-webkit",
    intitule: "une spec sans justification WebKit dans son en-tête",
    arbre: { "playwright/tests/x.spec.ts": 'test("x", async () => {});\n' },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    regle: "mot-de-passe-en-dur",
    intitule: "un mot de passe en dur dans une spec Playwright",
    arbre: {
      "playwright/tests/x.spec.ts":
        '// WebKit change le résultat : justifié.\nconst p = "s3cret";\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    regle: "attente-fixe",
    intitule: "waitForTimeout, l'équivalent de cy.wait(<nombre>)",
    arbre: {
      "playwright/tests/x.spec.ts":
        "// WebKit change le résultat : justifié.\nawait page.waitForTimeout(500);\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    regle: "selecteur-fragile",
    intitule: "un sélecteur #id dans une spec Playwright",
    arbre: {
      "playwright/tests/x.spec.ts":
        '// WebKit change le résultat : justifié.\nawait page.locator("#username").click();\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    regle: "import-depuis-cypress",
    intitule: "le module Playwright importe du code de cypress/",
    arbre: {
      "playwright/tests/x.spec.ts":
        '// WebKit change le résultat : justifié.\nimport { u } from "../../cypress/fixtures/builders/user.builder";\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    regle: "navigateur-hors-webkit",
    intitule: "un projet Chromium, qui dupliquerait la couverture Cypress",
    arbre: {
      "playwright/playwright.config.ts": 'export default { projects: [{ name: "chromium" }] };\n',
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    intitule: "une spec conforme à la frontière, et un commentaire citant les interdits",
    arbre: {
      "playwright/tests/x.spec.ts":
        "// WebKit change le résultat : justifié.\n" +
        '// Ne jamais écrire page.waitForTimeout(500) ni page.locator("#id").\n' +
        'await page.getByTestId("sidenav-username").click();\n',
      "playwright/playwright.config.ts": 'export default { projects: [{ name: "webkit" }] };\n',
    },
    attendu: "acceptation",
  },
  {
    gate: "check-playwright",
    regle: "quarantaine-sans-ticket",
    intitule: "un test mis de côté sans ticket ni date",
    arbre: {
      "playwright/tests/x.spec.ts":
        "// WebKit change le résultat : justifié.\ntest.fixme();\ntest('x', async () => {});\n",
    },
    attendu: "rejet",
  },
  {
    gate: "check-playwright",
    intitule: "un test mis de côté AVEC son ticket et sa date",
    arbre: {
      "playwright/tests/x.spec.ts":
        "// WebKit change le résultat : justifié.\n// QUARANTINE: #123 2026-09-05\ntest.fixme();\ntest('x', async () => {});\n",
      "playwright/playwright.config.ts": 'export default { projects: [{ name: "webkit" }] };\n',
    },
    attendu: "acceptation",
  },
];
