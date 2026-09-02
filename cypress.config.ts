import path from "path";
import _ from "lodash";
import axios from "axios";
import dotenv from "dotenv";
import Promise from "bluebird";
import codeCoverageTask from "@cypress/code-coverage/task";
import { defineConfig } from "cypress";
import viteConfig from "./vite.cypress.config.ts";
import { plugin as registerGrepPlugin } from "@cypress/grep/plugin";
import cypressSplit from "cypress-split";
import { enregistrerTachesDb, validerEnvironnement } from "./cypress/plugins";

dotenv.config({ path: ".env.local" });
dotenv.config();

let awsConfig = {
  default: undefined,
};

try {
  awsConfig = require(path.join(__dirname, "./aws-exports-es5.js"));
} catch (e) {}

/**
 * Dérivé de `.env`, jamais écrit en dur.
 *
 * Depuis la semaine 5, TOUS les matchers d'intercept sont ancrés sur cette
 * valeur (`cypress/support/intercepts/factories.ts`). Un `VITE_BACKEND_PORT`
 * modifié sans mise à jour d'`apiUrl` ferait donc rater chaque intercept — en
 * silence pour un espion sans `cy.wait`. `getBackendPort` (`src/utils/portUtils.ts`)
 * demandait déjà de tenir les deux à jour à la main : une consigne à deux
 * endroits est une consigne qu'on oublie.
 */
const apiUrl = `http://localhost:${process.env.VITE_BACKEND_PORT}`;

export default defineConfig({
  retries: {
    runMode: 2,
  },
  // allowCypressEnv: false ferme Cypress.env() côté navigateur. Cypress 15.4+
  // le déprécie et signale que, laissé ouvert, n'importe quel code de la page
  // peut lire ces valeurs — donc les secrets. Voir ADR-001.
  allowCypressEnv: false,
  env: {
    defaultPassword: process.env.SEED_DEFAULT_USER_PASSWORD,
  },
  expose: {
    apiUrl,
    mobileViewportWidthBreakpoint: 414,
    coverage: false,
    codeCoverage: {
      url: `${apiUrl}/__coverage__`,
      exclude: "cypress/**/*.*",
    },
    paginationPageSize: process.env.PAGINATION_PAGE_SIZE,

    // Auth0
    auth0_domain: process.env.VITE_AUTH0_DOMAIN,

    // Okta
    okta_domain: process.env.VITE_OKTA_DOMAIN,
    okta_client_id: process.env.VITE_OKTA_CLIENTID,
    okta_programmatic_login: process.env.OKTA_PROGRAMMATIC_LOGIN || false,

    // Amazon Cognito
    cognito_domain: process.env.AWS_COGNITO_DOMAIN,
    cognito_programmatic_login: false,
    awsConfig: awsConfig.default,

    // Google
    googleClientId: process.env.VITE_GOOGLE_CLIENTID,
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig,
    },
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/{e2e,api}/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    viewportHeight: 1000,
    viewportWidth: 1280,
    experimentalRunAllSpecs: true,
    setupNodeEvents(on, config) {
      const testDataApiEndpoint = `${config.expose.apiUrl}/testData`;

      const queryDatabase = ({ entity, query }, callback) => {
        const fetchData = async (attrs) => {
          const { data } = await axios.get(`${testDataApiEndpoint}/${entity}`);
          return callback(data, attrs);
        };

        return Array.isArray(query) ? Promise.map(query, fetchData) : fetchData(query);
      };

      // Tâches L1 du projet : proxy HTTP typé vers /testData
      // (cypress/plugins/). Le backend reste le seul écrivain lowdb.
      //
      // La tâche `db:seed` de l'amont a été retirée : deux contrats de seeding
      // coexistaient (`db:seed` non typée et `db:reset` typée par TaskMap), et
      // le prochain contributeur en aurait choisi un au hasard.
      on("task", enregistrerTachesDb(config.expose.apiUrl));
      on("task", {
        "env:validate": () =>
          validerEnvironnement(config.expose.apiUrl, config.env.defaultPassword),
      });

      on("task", {
        // fetch test data from a database (MySQL, PostgreSQL, etc...)
        "filter:database"(queryPayload) {
          return queryDatabase(queryPayload, (data, attrs) => _.filter(data.results, attrs));
        },
        "find:database"(queryPayload) {
          return queryDatabase(queryPayload, (data, attrs) => _.find(data.results, attrs));
        },
        getAuth0Credentials() {
          const username = process.env.AUTH0_USERNAME;
          const password = process.env.AUTH0_PASSWORD;
          if (!username || !password) {
            throw new Error("AUTH0_USERNAME and AUTH0_PASSWORD must be set");
          }
          return { username, password };
        },
        getOktaCredentials() {
          const username = process.env.OKTA_USERNAME;
          const password = process.env.OKTA_PASSWORD;
          if (!username || !password) {
            throw new Error("OKTA_USERNAME and OKTA_PASSWORD must be set");
          }
          return { username, password };
        },
        getCognitoCredentials() {
          const username = process.env.AWS_COGNITO_USERNAME;
          const password = process.env.AWS_COGNITO_PASSWORD;
          if (!username || !password) {
            throw new Error("AWS_COGNITO_USERNAME and AWS_COGNITO_PASSWORD must be set");
          }
          return { username, password };
        },
        getGoogleCredentials() {
          const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
          const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
          if (!refreshToken || !clientSecret) {
            throw new Error("GOOGLE_REFRESH_TOKEN and VITE_GOOGLE_CLIENT_SECRET must be set");
          }
          return { refreshToken, clientSecret };
        },
      });

      codeCoverageTask(on, config);

      // Pont env → expose pour @cypress/grep 7.
      //
      // La v7 lit TOUTES ses options depuis `config.expose` (côté Node) et
      // `Cypress.expose()` (côté navigateur) — c'est la même migration que
      // celle d'ADR-001. Or `--env grep=…` écrit dans `config.env`. Sans ce
      // pont, le filtrage ne s'applique NI aux specs NI aux tests, et la
      // commande sort en vert en ayant tout exécuté : un filtre qui ne filtre
      // pas est pire qu'un filtre absent, parce qu'on lui fait confiance.
      for (const cle of ["grep", "grepTags", "grepUntagged", "grepBurn", "grepOmitFiltered"]) {
        if (config.env[cle] !== undefined) {
          config.expose[cle] = config.env[cle];
        }
      }
      // Pré-filtrage des specs : évite de charger un fichier dont aucun test
      // ne correspond. Le filtrage fin des `it` reste fait au runtime.
      config.expose.grepFilterSpecs = true;

      registerGrepPlugin(config);

      /**
       * Découpe de la suite entre plusieurs runners — ADR-003.
       *
       * Piloté par `SPLIT` et `SPLIT_INDEX` dans l'environnement, donc INERTE
       * en local : sans ces variables, `cypress-split` ne touche à rien et
       * `yarn cy:run` exécute la suite entière. Aucun compte, aucune clé,
       * aucun service tiers (P6).
       *
       * Enregistré APRÈS `@cypress/grep` : le filtrage par tag réduit d'abord
       * l'ensemble des specs, la découpe répartit ensuite ce qui reste. Dans
       * l'ordre inverse, un shard recevrait des specs que le filtre écarte et
       * finirait vide.
       */
      cypressSplit(on, config);

      // Derive the auth-provider guard flags from the fully-resolved
      // config.env so every credential source is honored (CYPRESS_* vars,
      // --env, cypress.env.json), matching the prior Cypress.env() guards.
      config.expose.auth0_configured = Boolean(config.env.auth0_username);
      config.expose.okta_configured = Boolean(config.env.okta_username);
      config.expose.cognito_configured = Boolean(config.env.cognito_username);
      // Google's gate is its public client id, which already lives in expose.
      config.expose.google_configured = Boolean(config.expose.googleClientId);

      return config;
    },
  },
});
