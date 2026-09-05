import path from "path";
import axios from "axios";
import dotenv from "dotenv";
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

/**
 * Variables exigées par le chemin Auth0, et celles qui manquent.
 *
 * SOURCE UNIQUE. La liste était écrite deux fois — dans la tâche
 * `getAuth0Credentials` et dans le drapeau `auth0_configured` — et c'est
 * précisément le défaut que ce lot prétendait corriger : deux expressions pour
 * une même règle finissent par diverger. Elles divergeaient déjà une fois
 * (`CYPRESS_auth0_username` accepté par l'un, ignoré par l'autre).
 *
 * `config.env` d'abord : il porte `CYPRESS_*`, `--env` et `cypress.env.json`.
 * `process.env` ensuite : c'est ce que `.env`/`.env.local` renseignent.
 */
const variablesAuth0 = (env: Record<string, unknown>) => {
  const requis: Record<string, unknown> = {
    // `VITE_AUTH0` EST UNE VARIABLE REQUISE, ET C'EST UNE CORRECTION.
    //
    // La semaine 9 dérivait `auth0_configured` des seuls identifiants. Le
    // drapeau répondait donc à « ai-je de quoi me connecter ? » alors que la
    // spec pose une autre question : « l'application tourne-t-elle en mode
    // Auth0 ? ». Les deux coïncidaient en CI et divergeaient en local : dès
    // qu'un `.env.local` était rempli, `yarn cy:run` lançait la spec contre une
    // application démarrée par `yarn dev:test`, qui ne redirige pas vers le
    // tenant. `cy.origin` échouait alors sur « expected to run against origin
    // … but the application is at origin http://localhost:3000 ».
    //
    // Trouvé par `yarn cy:random` en semaine 10, pas par la CI — laquelle ne
    // pouvait pas le voir, puisqu'elle fixe `VITE_AUTH0=true` au niveau du job.
    // C'est le symétrique des gardes qui échouent ouvert : celle-ci échouait
    // FERMÉ, en exécutant un test qu'elle aurait dû ignorer.
    //
    // `VITE_AUTH0` est le bon signal : c'est la même variable qui fait charger
    // `src/index.auth0.tsx`. La question posée et la condition vérifiée sont
    // enfin la même.
    VITE_AUTH0: process.env.VITE_AUTH0,
    AUTH0_USERNAME: env.auth0_username || process.env.AUTH0_USERNAME,
    AUTH0_PASSWORD: env.auth0_password || process.env.AUTH0_PASSWORD,
    VITE_AUTH0_DOMAIN: process.env.VITE_AUTH0_DOMAIN,
    VITE_AUTH0_CLIENTID: process.env.VITE_AUTH0_CLIENTID,
    VITE_AUTH0_AUDIENCE: process.env.VITE_AUTH0_AUDIENCE,
  };
  return {
    requis,
    manquantes: Object.entries(requis)
      .filter(([, v]) => !v)
      .map(([k]) => k),
  };
};

export default defineConfig({
  /**
   * Retries — `runMode: 2`, `openMode: 0`. Les deux sont écrits, y compris
   * celui qui vaut déjà zéro par défaut : une valeur implicite n'est pas une
   * décision, et le lecteur ne doit pas avoir à consulter la doc de Cypress
   * pour savoir ce que fait le dépôt.
   *
   * POURQUOI EN CI : une suite E2E partage sa machine avec quatre autres
   * shards, un serveur applicatif et un backend. Mesuré en semaine 5 : sous
   * charge concurrente, la même graine d'ordre aléatoire est passée de 33 s à
   * 37 minutes, et deux tests ont cédé sur un budget de 4 s. Sans retry, ce
   * bruit d'infrastructure deviendrait un rouge que personne ne saurait
   * distinguer d'une régression.
   *
   * POURQUOI PAS EN LOCAL : `openMode: 0`. Un test qu'on est en train
   * d'écrire doit échouer tout de suite et une seule fois. Un retry pendant le
   * développement transforme un bug déterministe en énigme intermittente.
   *
   * CE QUE ÇA NE FAIT PAS : un retry n'est pas un correctif. La règle #10 de
   * `.claude/rules/testing.md` traite tout test ayant nécessité un retry en CI
   * comme flaky, et le renvoie au skill `flake-diagnosis`. `yarn cy:burn`
   * mesure le taux réel en FORÇANT les retries à zéro : il mesure le test, pas
   * le filet. Passer à `runMode: 5` masquerait précisément ce qu'on mesure.
   */
  retries: {
    runMode: 2,
    openMode: 0,
  },
  /**
   * Trois reporters : `spec` reste la sortie lisible par un humain,
   * `mocha-junit-reporter` produit le XML que les outils de CI lisent, et
   * `mochawesome` le JSON dont est tiré le rapport HTML publié sur Pages.
   * Sans le premier, un run local ne dirait plus rien ; sans les autres,
   * quatre shards n'auraient aucun résultat commun.
   *
   * Allure était le choix du plan. Il est ÉCARTÉ, et la raison mérite d'être
   * lue : `allure-cypress` stocke son état de run dans `Cypress.env("allure")`,
   * en lecture ET en écriture. Or ADR-001 a fermé `Cypress.env` côté navigateur
   * (`allowCypressEnv: false`) parce que n'importe quel code de la page peut y
   * lire les secrets — dont `defaultPassword`. Rouvrir une frontière de
   * sécurité pour obtenir un rapport est un mauvais échange. Le plan est donc
   * tenu sur le fond — un rapport publié — pas sur l'outil.
   *
   * `[hash]` dans le nom de fichier : chaque spec écrit le sien, sinon le
   * dernier écrase les précédents — et avec des shards parallèles le hasard
   * déciderait de ce qui reste.
   */
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    configFile: "reporter-config.json",
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
    /**
     * Piloté par la MÊME variable que l'instrumentation Vite
     * (`vite-plugin-istanbul`, option `requireEnv`). Deux interrupteurs pour
     * une seule intention, c'est un interrupteur qu'on oubliera : sans
     * instrumentation, la collecte ne trouve rien ; sans collecte,
     * l'instrumentation ralentit pour rien.
     *
     * `yarn dev:coverage:test` + `CYPRESS_COVERAGE=true yarn cy:run`.
     */
    coverage: process.env.CYPRESS_COVERAGE === "true",
    codeCoverage: {
      url: `${apiUrl}/__coverage__`,
      exclude: "cypress/**/*.*",
    },
    paginationPageSize: process.env.PAGINATION_PAGE_SIZE,

    // Auth0 — configuration PUBLIQUE (ADR-001). Le client secret n'est PAS ici :
    // les valeurs d'`expose` sont lisibles par le code de la page sous test.
    auth0_domain: process.env.VITE_AUTH0_DOMAIN,
    // Origine complète, schéma compris. Même règle que `getDomain` du SDK et
    // que `baseAuth0` du backend : un domaine déjà préfixé est pris tel quel.
    // Calculée ICI et pas dans la commande, pour que les trois consommateurs
    // lisent une seule valeur au lieu de réimplémenter la règle chacun (ADR-010).
    auth0_origin: /^https?:\/\//.test(process.env.VITE_AUTH0_DOMAIN || "")
      ? process.env.VITE_AUTH0_DOMAIN
      : `https://${process.env.VITE_AUTH0_DOMAIN}`,
    auth0_client_id: process.env.VITE_AUTH0_CLIENTID,
    auth0_audience: process.env.VITE_AUTH0_AUDIENCE,
    auth0_scope: process.env.VITE_AUTH0_SCOPE,
    // Le grant `password-realm` prend le realm en PARAMÈTRE, ce qui évite
    // d'exiger un « Default Directory » au niveau du tenant — un réglage global
    // qui affecte aussi l'Universal Login (ADR-009).
    auth0_realm: process.env.AUTH0_REALM || "Username-Password-Authentication",

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

      // Tâches L1 du projet : proxy HTTP typé vers /testData
      // (cypress/plugins/). Le backend reste le seul écrivain lowdb.
      //
      // La tâche `db:seed` de l'amont a été retirée : deux contrats de seeding
      // coexistaient (`db:seed` non typée et `db:reset` typée par TaskMap), et
      // le prochain contributeur en aurait choisi un au hasard.
      on("task", enregistrerTachesDb(config.expose.apiUrl));
      // `log` : la seule façon de faire sortir un relevé sur le terminal depuis
      // le navigateur. Utilisée par `support/a11y.ts` pour publier les
      // violations non bloquantes, qui seraient invisibles autrement.
      on("task", {
        log: (message: string) => {
          console.log(message);
          return null;
        },
      });

      on("task", {
        "env:validate": () =>
          validerEnvironnement(config.expose.apiUrl, config.env.defaultPassword),
      });

      on("task", {
        // `filter:database` et `find:database` de l'amont sont RETIRÉES.
        //
        // Elles n'étaient appelées par aucune spec — la suite qui les utilisait
        // a été supprimée en semaine 0 — et elles portaient les huit `any`
        // implicites que l'IDE signalait. Les typer aurait été typer du code
        // mort ; deux dépendances les accompagnaient (`lodash`, `bluebird`),
        // dont c'était le seul usage dans ce fichier.
        //
        // Elles doublonnaient de toute façon `enregistrerTachesDb` : même
        // endpoint `/testData`, mais sans contrat `TaskMap`. C'est le défaut
        // déjà corrigé pour `db:seed` en semaine 4 — deux contrats de seeding
        // qui coexistent, et le prochain contributeur qui en choisit un au
        // hasard.
        /**
         * Identifiants SECRETS du login programmatique Auth0 (ADR-009).
         *
         * Le client secret en fait partie : `/oauth/token` en grant
         * `password-realm` l'exige. Il transite par une tâche, donc par le
         * process Node, et jamais par `expose` — lisible par la page.
         *
         * Les variables manquantes sont NOMMÉES une par une. Un message
         * générique laisse chercher laquelle des six manque, et c'est
         * exactement ce qui fait passer une configuration incomplète pour un
         * tenant mal réglé.
         */
        getAuth0Credentials() {
          // Le chemin IMPLÉMENTÉ est `cy.origin` (ADR-009, révision) : il ne
          // demande PAS de client secret. `AUTH0_CLIENT_SECRET` reste documenté
          // dans `.env` pour la variante programmatique, mais n'est pas exigé.
          const { requis, manquantes } = variablesAuth0(config.env);
          if (manquantes.length) {
            throw new Error(
              `Login Auth0 impossible : ${manquantes.length} variable(s) absente(s) de .env.local — ` +
                `${manquantes.join(", ")}. Voir docs/adr/009-login-auth0-programmatique-vs-cy-origin.md.`
            );
          }
          return { username: requis.AUTH0_USERNAME, password: requis.AUTH0_PASSWORD };
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
      // La tâche `getAuth0Credentials` lit `process.env.AUTH0_USERNAME` — ce que
      // `.env` demande de renseigner. Le drapeau ne lisait que `config.env` :
      // les deux moitiés ne regardaient pas la même source, et un utilisateur
      // conforme à `.env` obtenait une tâche qui marche et un drapeau faux,
      // donc des specs qui se taisent au lieu d'échouer (ADR-009).
      // Le drapeau exige l'ENSEMBLE des variables du chemin programmatique, pas
      // seulement le nom d'utilisateur : une configuration partielle produisait
      // un drapeau vrai puis un échec au premier appel, loin de sa cause.
      const auth0 = variablesAuth0(config.env);
      config.expose.auth0_configured = auth0.manquantes.length === 0;
      // Publiées pour que la spec puisse NOMMER ce qui manque au lieu de se
      // taire. Ce ne sont que des noms de variables, jamais leurs valeurs.
      config.expose.auth0_manquantes = auth0.manquantes;
      // « Auth0 est EXIGÉ ici » : sans ce drapeau, une configuration absente met
      // la spec en attente et le run s'affiche vert — un job dédié passerait
      // sans rien tester. Le job CI `auth0` le pose ; la suite générale non.
      config.expose.auth0_required = Boolean(process.env.AUTH0_REQUIRED);
      config.expose.okta_configured = Boolean(config.env.okta_username);
      config.expose.cognito_configured = Boolean(config.env.cognito_username);
      // Google's gate is its public client id, which already lives in expose.
      config.expose.google_configured = Boolean(config.expose.googleClientId);

      return config;
    },
  },
});
