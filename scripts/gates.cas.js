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
];
