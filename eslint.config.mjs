import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginCypress from "eslint-plugin-cypress";

export default defineConfig([
  // `coverage/` et `results/` sont GÉNÉRÉS. Ils sont apparus dans le champ
  // d'eslint en semaine 8, quand la couverture est devenue mesurable : trois
  // avertissements sur des fichiers que personne n'écrit. Un outil de qualité
  // qui juge ses propres artefacts produit du bruit, et le bruit finit par
  // masquer un vrai avertissement.
  globalIgnores(["build/", "coverage/", "results/"]),
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      pluginCypress.configs.recommended,
    ],
    rules: {
      // TODO: review violations of disabled rules
      "no-empty": "off",
      "no-prototype-builtins": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
    languageOptions: {
      globals: globals.node,
    },
  },
  // Le code de test est du code de production (P5). Les règles ci-dessus sont
  // désactivées pour l'application héritée de l'amont ; elles sont réactivées
  // ici pour le code que ce projet écrit. Sans ce bloc,
  // .claude/rules/typescript.md (« aucun any, aucun @ts-ignore ») ne tient que
  // par le grep du hook check-spec.sh, qui ne voit que les fichiers modifiés
  // pendant une session — donc pas ceux d'une contribution extérieure.
  {
    files: ["cypress/**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Incompatible avec l'API fluide de chai : `expect(x).to.be.true` EST
      // une expression sans effet du point de vue de la règle. La désactiver
      // ici est une contrainte de l'outil d'assertion, pas un relâchement.
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  // Outillage L5 : JavaScript simple, on veut au moins les variables mortes.
  {
    files: ["scripts/burn.js", "scripts/run-random-order.js"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
