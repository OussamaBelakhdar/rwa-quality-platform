# Journal — semaine par semaine

Le détail de chaque semaine : le problème rencontré, la décision, le chiffre.
Ce fichier était le README jusqu'en semaine 10 ; il en a été extrait pour que
le README redevienne ce que le plan demande — **une page**.

Rien n'a été réécrit en le déplaçant.

## État

**Semaine 9 — SSO Auth0.** Le fork livrait `src/index.auth0.tsx` et `AppAuth0.tsx`, mais **personne ne les chargeait** : `index.html` déclare `/src/index.tsx` en dur, et `yarn dev:auth0` montait `checkAuth0Jwt` côté backend pendant que le front gardait Passport — l'application exigeait un jeton qu'elle n'émettait jamais. Sept défauts amont corrigés avant le premier appel Auth0, dont `audience` et `scope` perdus parce que les options étaient écrites pour `auth0-react` v1 alors que la 2.2.4 est installée, et `AppAuth0` qui n'enregistrait pas son service — `cy.login` aurait été inopérant. [ADR-009](docs/adr/009-login-auth0-programmatique-vs-cy-origin.md) a d'abord retenu le login programmatique sur un argument de coût, « payé par 20 specs sur 22 » : **faux**, mesuré côté API, les 27 appels à `cy.login` produisent **11 connexions réelles** parce que `cy.session` amortit déjà. Décision inversée — `cy.origin` dans `cy.session`, ce que fait l'amont pour cette application et ce que le plan demandait mot pour mot. Conséquence : **aucun client secret**. Le flux tourne contre un fournisseur OIDC local ([ADR-010](docs/adr/010-fournisseur-oidc-local-pour-le-flux-auth0.md)), **sans compte tiers** comme P6 l'exige : **2 tests, 4 s, 0,00 % de flake sur 10 exécutions**, un job CI dédié, et **aucune dépendance ajoutée**. Le faire marcher a révélé deux pièges qu'aucune lecture n'aurait donnés — `<button name="action">` masque `form.action` et la soumission n'aboutit pas (6 GET, 0 POST), puis l'absence d'en-têtes CORS bloque l'échange du code (9 OPTIONS, 0 POST).

**Semaine 8 — component testing et accessibilité.** La suite comptait **60 tests et zéro test de composant**, pour une cible affichée de 40 %. [ADR-004](docs/adr/004-grille-composant-api-e2e.md) tranche : une grille décide comportement par comportement, et le ratio est **publié, jamais ciblé** — atteindre un pourcentage obligerait à écrire des tests que la grille ne réclame pas.

Appliquée rétroactivement, elle me met en défaut : les deux défauts trouvés en semaine 5 — `--$5.00` et `-0` — sont **props → rendu**. Mesuré, médianes sur 13 et 8 exécutions : **18 ms en composant contre 283 ms en E2E**, et l'E2E exige en plus une base seedée, une session et deux serveurs. 23 tests de composant les recouvrent au bon niveau, en 1 seconde.

Côté accessibilité, `cypress-axe` sur 5 pages a relevé 6 règles violées. **Deux sont éliminées** — `link-name` (10 nœuds : un logo SVG sans nom accessible, un lecteur d'écran annonçait « lien » sans dire vers quoi) et `image-alt` (24 nœuds : les `<Avatar>` MUI rendent un `<img>` sans `alt`). Les quatre restantes, antérieures au projet, entrent dans une **base de référence qui ne peut que rétrécir** : toute violation nouvelle échoue, et une règle corrigée qu'on laisserait dans la liste échoue aussi. Ce second garde-fou a mordu à son premier run, sur une règle que j'avais listée à tort.

Couverture enfin mesurable — `dev:coverage` lançait un serveur sans `VITE_TEST_HOOKS`, donc la suite ne pouvait pas tourner dessus : **80,25 % de statements, 57,33 % de branches**. C'est l'écart qui parle, pas le premier chiffre.

**Semaine 7 — flakiness.** Le flake vient de `upstream/flake-demo`, maintenue par l'équipe Cypress, et il est injecté **dans l'application** : un flake que j'aurais écrit ne prouverait que ma capacité à écrire un bug. Résultat brut : **22 tests flaky à 37,93 %**. Mais 22 symptômes ne font pas 22 causes — retirer un seul `throw` ramène le taux à **0,00 %** sur 290 exécutions. Prouvé par isolation, pas déduit.

Le chiffre qui compte est ailleurs. `cy:burn` (retries à zéro) voit 22 tests instables ; `cy:run` (`runMode: 2`) n'en montre que **4**. **Dix-huit masqués**, et la durée qui passe de 36 s à 2 min 17. Une équipe qui ne lit que `cy:run` conclurait « quatre tests flaky, quarantaine » — et manquerait que l'application échoue une fois sur deux sur sa requête principale. C'est la démonstration que `runMode: 2` est une mesure, pas une solution.

Le diagnostic refuse la quarantaine : elle isole un test instable, elle ne fait pas taire une application cassée. Et la grille du skill `flake-diagnosis` s'est révélée trouée — ses six classes supposent toutes que le flake est dans le _test_. Une septième a été ajoutée, dont la correction est **ne pas toucher au test**.

Les deux autres sources amont — ordre non garanti, latence variable — décrivent des comportements **légitimes** et appellent l'inverse : là, c'est au test de s'adapter. Elles ne cassaient rien faute de couverture ; deux specs comblent le trou. Preuve par mutation, même application et même flake : version correcte **0,00 %**, version naïve **70 % et 30 %**. Détail et commandes de reproduction dans [`flakiness-report.md`](docs/flakiness-report.md).

**Semaine 6 — CI/CD.** Le dépôt hérité totalisait **78 runs rouges et zéro vert** avant qu'une ligne de CI n'y soit écrite : `main.yml` exige une clé Cypress Cloud absente, deux workflows de triage appellent des workflows réutilisables de `cypress-io` inaccessibles depuis un fork. Ne rien faire n'était donc pas neutre. Le pipeline livré tourne en 4 shards `cypress-split` **sans compte ni clé** ([ADR-003](docs/adr/003-parallelisation-sans-cypress-cloud.md)), 13 actions épinglées par SHA de commit complet, et `pages: write` isolé dans 1 job sur 5.

Le chiffre demandé contredit en partie l'ADR qui l'avait prédit : coût fixe **128 s par runner** (dont 73 s de `yarn install`) pour 23 s de Cypress. Séquentiel ~218 s contre **163 s** en 4 shards — 55 s d'horloge pour ~390 s de temps machine. L'ADR annonçait 11 s : direction juste, magnitude fausse, parce qu'il transposait la durée _locale_ de la suite alors que la CI la met 2,7× plus lent. C'est écrit tel quel dans [`metrics.md`](docs/metrics.md), avec la ligne « 1 runner » marquée calculée et non observée.

La CI a trouvé trois défauts invisibles en local, tous de la même famille — **supposer présent ce qui n'a jamais été déclaré** : `check-spec.sh` dépendait de `jq` et **échouait ouvert** en son absence ; ma sonde de démarrage dépendait de `curl`, absent de l'image ; et lancer un serveur de dev en CI ne tenait pas — le pipeline construit puis sert l'artefact. Allure a été écarté parce qu'il stocke son état dans `Cypress.env`, fermé par ADR-001 : **rouvrir une frontière de sécurité pour un rapport est un mauvais échange**.

**Semaine 5 — réseau.** Cinq specs dans `cypress/e2e/network/`, douze tests, pour les cas que le backend ne produit jamais. Le rendement n'est pas le nombre de tests : c'est **trois défauts de l'application** qu'aucun test contre le vrai backend ne pouvait atteindre. Un 500 s'affichait comme une liste vide — `dataMachine` entrait bien en `failure`, mais aucun composant ne le lisait, et une coupure réseau donnait exactement le même écran. **Corrigé** : un composant `ErrorState` unique — message distinct par cause, bouton de reprise testé — câblé sur les **quatre** surfaces qui dérivent de `dataMachine`. Le défaut n'était pas propre aux transactions : les notifications et les comptes bancaires retombaient sur le même écran « aucune donnée », et le détail d'une transaction ne rendait rien du tout. En voulant afficher ce message, un troisième défaut est apparu — `setMessage` lisait `event.message` alors que XState range l'erreur dans `event.data`, donc le message était toujours vide ; et un montant négatif injecté dans une réponse réelle se rendait `--$5.00`, parce que le composant préfixait un `-` que le formateur produit déjà. Ce dernier est **corrigé dans l'application** — le signe affiché est le sens de la transaction, le montant est rendu en valeur absolue — et le correctif est verrouillé par un test de régression : annuler le correctif fait échouer le test, vérifié. Les specs constatent ces défauts au lieu d'affirmer un comportement que l'application n'a pas. S'y ajoute un risque, constaté et **volontairement non testé** : `asyncUtils.ts:4` crée axios **sans `timeout`**, et axios vaut `timeout: 0` par défaut — sa doc dit « a timeout is not created ». Un backend lent laisse donc la liste en chargement sans fin, sans que l'application puisse l'interrompre. L'E2E qui le prouvait coûtait 9 s pour une propriété statique du code — retiré au nom du même principe qui interdit les E2E inutiles (P3), et documenté à la place.

La frontière qui structure la couche : `intercept…` observe, `stub…` coupe le backend — donc peut mentir sur le contrat. Elle est portée par le **nom** de la factory et non par un champ d'options, pour que `grep -rn "stub" cypress/e2e/` énumère en une commande les tests qui n'exercent plus le contrat réel ([ADR-008](docs/adr/008-factories-d-intercept-nommees-par-intention.md)). Huit exports, quatre corps de fonction.

Le test le plus utile de la semaine a trouvé un bug **dans le code de test** : `cy.appState` était typée `string` au motif que « toutes les machines de cette application ont des états plats ». C'était faux — `dataMachine.success` en a trois — et la commande rendait donc un objet sous un type qui promettait une chaîne. Une liste vide stubée l'a mis au jour.

**Semaine 4 — seeding et isolation.** Trois endpoints `/testData` côté backend ([ADR-007](docs/adr/007-endpoints-de-test-dans-le-backend.md)), des tâches Node typées, des builders fluides. Le backend reste **le seul écrivain lowdb**. Ce qui débloque un domaine entier : l'onboarding ne s'ouvre que pour un utilisateur sans compte bancaire, et les cinq de la graine en ont tous un.

**Semaine 3 — App Actions typées.** Un registre unique `window.__services__` remplace six expositions dispersées, sous un drapeau de build absent par défaut — vérifié à l'exécution, pas supposé. Une faute de frappe de sélecteur est désormais une erreur de compilation, et ce contrat est lui-même testé : `cypress/support/typage.contract.ts` casse `yarn types` si le typage se relâche. Pas de Page Objects ([ADR-002](docs/adr/002-typer-et-durcir-les-app-actions.md)) — l'amont n'en a jamais eu, et l'App Action n'est pas ici une commodité mais le seul chemin qui produise un état cohérent.

**Semaine 2 — session.** `cy.session` avec `validate()` sur `/checkAuth`. Sur les 8 specs de la semaine 1, à périmètre égal : **12–13 s → 8 s, soit −35 %**, en passant de deux chargements de page par test à un seul. Un seul test parcourt encore le formulaire de connexion.

Le gain ne vient pas du cache de cookie mais du cache de `localStorage` : l'état d'authentification de cette application est persisté par sa machine XState, pas porté par la session serveur. Un `cy.request('/login')` seul laisse l'interface déconnectée — c'est ce que les quatre premiers tests de la semaine 1 ont démontré en échouant.

**Semaine 1 — fondations.** 8 specs, 19 tests, 12 s, vertes sur 3 exécutions consécutives.

### Ce que la file de commandes change

```
  écriture de la spec          exécution
 ┌─────────────────────┐     ┌──────────────────────────────┐
 │ cy.getBySel(...)    │ ──▶ │ query  ─┐                    │
 │ cy.click()          │     │ action  │ rejouées ensemble  │
 │ .should(...)        │     │ assert ─┘ jusqu'au succès    │
 │ const x = ...       │     └──────────────────────────────┘
 └─────────────────────┘        ▲
   tout s'empile d'abord        └── le code hors chaîne, lui,
   rien ne s'exécute                a déjà fini de tourner
```

**Trois règles qui en découlent :**

1. **Ce qui est hors de la chaîne s'exécute avant elle.** Un `if` autour d'un `cy.*`, une variable lue juste après, un `try/catch` : tous évalués pendant la collecte, quand la file n'a encore rien fait.
2. **Un sujet capturé est mort ; un sujet relu est vivant.** Stocker `$el` dans une variable survit à un re-render — le noeud, lui, non. C'est l'origine de « element is detached from the DOM ».
3. **Le retry s'arrête à la première action.** Toutes les queries qui précèdent une assertion sont rejouées ensemble ; un `.click()` ou un `.then()` borne la zone rejouable. C'est pourquoi `cy.wait(<nombre>)` n'est jamais la réponse.

**Semaine 0 — fondation.** Suite Cypress à 0 test, `specPattern` en `.cy.ts`, `tsconfig` strict sur `cypress/`, aucune dépendance à Cypress Cloud. Voir [ADR-001](docs/adr/001-frontiere-expose-env-et-conventions-de-specs.md).

---

# README de l'application amont

Conservé tel quel : il documente l'application testée, ses fournisseurs d'authentification et ses scripts. Projet original sous licence MIT, voir [`LICENSE`](LICENSE).

<p align="center">
  <!-- We use two SVGs here so that this displays correctly
    on Github. This might not look right in other Markdown previewers. -->
  <img alt="Cypress Real World App Logo" src="./src/svgs/rwa-logo-light.svg#gh-dark-mode-only" />
  <img alt="Cypress Real World App Logo" src="./src/svgs/rwa-logo.svg#gh-light-mode-only" />
</p>

<p align="center">
  <a href="https://cypress.io">
    <img width="140" alt="Cypress Logo" src="./src/svgs/built-by-cypress.svg" />
    </a>
</p>

<p align="center">
   <a href="https://cloud.cypress.io/projects/7s5okt/runs">
    <img src="https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/7s5okt/develop&style=flat&logo=cypress" />
  </a>

  <a href="https://codecov.io/gh/cypress-io/cypress-realworld-app">
    <img src="https://codecov.io/gh/cypress-io/cypress-realworld-app/branch/develop/graph/badge.svg" />
  </a>

  <a href="https://percy.io/cypress-io/cypress-realworld-app">
    <img src="https://percy.io/static/images/percy-badge.svg" />
  </a>

   <a href="#contributors-">
    <img src="https://img.shields.io/badge/all_contributors-6-green.svg?style=flat" />
  </a>
</p>

<p align="center">
A payment application to demonstrate <strong>real-world</strong> usage of <a href="https://cypress.io">Cypress</a> testing methods, patterns, and workflows.
</p>

<p align="center">
  <img style='width: 70%' alt="Cypress Real World App" src="./public/img/rwa-readme-screenshot.png" />
</p>

> 💬 **Note from maintainers**
>
> This application is purely for demonstration and educational purposes. Its setup and configuration resemble typical real-world applications, but it's not a full-fledged production system. Use this app to learn, experiment, tinker, and practice application testing with Cypress.
>
> Happy Testing!

---

## Features

🛠 Built with [React][reactjs], [XState][xstate], [Express][express], [lowdb][lowdb], [Material-UI][material-ui] and [TypeScript][typescript]
⚡️ Zero database dependencies
🚀 Full-stack [Express][express]/[React][reactjs] application with real-world features and tests
👮‍♂️ Local Authentication
🔥 Database Seeding with End-to-end Tests
💻 CI/CD + [Cypress Cloud][cypresscloud]

## Getting Started

The Cypress Real-World App (RWA) is a full-stack Express/React application backed by a local JSON database ([lowdb]).

The app is bundled with [example data](./data/database.json) (`data/database.json`) that contains everything you need to start using the app and run tests out-of-the-box.

> 🚩 **Note**
>
> You can login to the app with any of the [example app users](./data/database.json#L2). The default password for all users is `s3cret`.
> Example users can be seen by running `yarn list:dev:users`.

### Prerequisites

This project requires [Node.js](https://nodejs.org/en/) to be installed on your machine. Refer to the [.node-version](./.node-version) file for the exact version.

[Yarn Classic](https://classic.yarnpkg.com/) is also required. Once you have [Node.js](https://nodejs.org/en/) installed, execute the following to install the npm module [yarn](https://www.npmjs.com/package/yarn) (Classic - version 1) globally.

```shell
npm install yarn@1 -g
```

If you have Node.js' experimental [Corepack](https://nodejs.org/dist/latest/docs/api/corepack.html) feature enabled,
then you should skip the step `npm install yarn@1 -g` to install Yarn Classic globally.
The RWA project is locally configured for `Corepack` to use Yarn Classic (version 1).

#### Yarn Modern

**This project is not compatible with [Yarn Modern](https://yarnpkg.com/) (version 2 and later).**

### Installation

To clone the repo to your local system and install dependencies, execute the following commands:

```shell
git clone https://github.com/cypress-io/cypress-realworld-app
cd cypress-realworld-app
yarn
```

#### Mac users with M-series chips will need to prepend `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.

```shell
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true yarn install
```

### Run the app

```shell
yarn dev
```

> 🚩 **Note**
>
> The app will run on port `3000` (frontend) and `3001` (API backend) by default. Please make sure there are no other applications or services running on both ports.
> If you want to change the default ports, you can do so by modifying `PORT` and `VITE_BACKEND_PORT` variables in `.env` file.
> However, make sure the modified port numbers in `.env` are not committed into Git since the CI environments still expect the application to run on the default ports.

### Start Cypress

```shell
yarn cypress:open
```

> 🚩 **Note**
>
> If you have changed the default ports, then you need to update Cypress configuration file (`cypress.config.ts`) locally.
> There are three properties that you need to update in `cypress.config.ts`: `e2e.baseUrl`, `expose.apiUrl`, and `expose.codeCoverage.url`.
> The port number in `e2e.baseUrl` corresponds to `PORT` variable in `.env` file. Similarly, the port number in `expose.apiUrl` and `expose.codeCoverage.url` correspond to `VITE_BACKEND_PORT`.
> For example, if you have changed `PORT` to `13000` and `VITE_BACKEND_PORT` to `13001` in `.env` file, then your `cypress.config.ts` should look similar to the following snippet:
>
> ```js
> {
>   expose: {
>     apiUrl: "http://localhost:13001",
>     codeCoverage: {
>       url: "http://localhost:13001/__coverage__"
>     },
>   },
>   e2e: {
>     baseUrl: "http://localhost:13000"
>   }
> }
> ```
>
> Avoid committing the modified `cypress.config.ts` into Git since the CI environments still expect the application to be run on default ports.

## Tests

| Type      | Location                                 |
| --------- | ---------------------------------------- |
| api       | [cypress/tests/api](./cypress/tests/api) |
| ui        | [cypress/tests/ui](./cypress/tests/ui)   |
| component | [src/(next to component)](./src)         |
| unit      | [`src/__tests__`](./src/__tests__)       |

## Database

- The local JSON database is located in [data/database.json](./data/database.json) and is managed with [lowdb].

- The database is [reseeded](./data/database-seed.json) each time the application is started (via `yarn dev`). Database seeding is done in between each [Cypress End-to-End test](./cypress/tests).

- Updates via the React frontend are sent to the [Express][express] server and handled by a set of [database utilities](backend/database.ts)

- Generate a new database using `yarn db:seed`.

- An [empty database seed](./data/empty-seed.json) is provided along with a script (`yarn start:empty`) to view the application without data.

## Additional NPM Scripts

| Script         | Description                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dev            | Starts backend in watch mode and frontend                                                                                                                                         |
| dev:coverage   | Starts backend in watch mode and frontend with instrumented code coverage enabled                                                                                                 |
| dev:auth0      | Starts backend in watch mode and frontend; [Uses Auth0 for Authentication](#auth0) > [Read Guide](http://on.cypress.io/auth0)                                                     |
| dev:okta       | Starts backend in watch mode and frontend; [Uses Okta for Authentication](#okta) > [Read Guide](http://on.cypress.io/okta)                                                        |
| dev:cognito    | Starts backend in watch mode and frontend; [Uses Cognito for Authentication](#amazon-cognito) > [Read Guide](http://on.cypress.io/amazon-cognito)                                 |
| dev:google     | Starts backend in watch mode and frontend; [Uses Google for Authentication](#google) > [Read Guide](https://docs.cypress.io/guides/testing-strategies/google-authentication.html) |
| start          | Starts backend and frontend                                                                                                                                                       |
| types          | Validates types                                                                                                                                                                   |
| db:seed        | Generates fresh database seeds for json files in /data                                                                                                                            |
| start:empty    | Starts backend, frontend and Cypress with empty database seed                                                                                                                     |
| tsnode         | Customized ts-node command to get around react-scripts restrictions                                                                                                               |
| list:dev:users | Provides id and username for users in the dev database                                                                                                                            |

For a complete list of scripts see [package.json](./package.json)

## Code Coverage Report

The Cypress Real-World App uses the [@cypress/code-coverage](https://github.com/cypress-io/code-coverage) plugin to generate code coverage reports for the app frontend and backend.

To generate a code coverage report:

1. Start the development server with coverage enabled by running `yarn dev:coverage`.
2. Run `yarn cypress:run --env coverage=true` and wait for the test run to complete.
3. Once the test run is complete, you can view the report at `coverage/index.html`.

## 3rd Party Authentication Providers

Support for 3rd party authentication is available in the application to demonstrate the concepts on logging in with a 3rd party provider.

The app contains different entry points for each provider. There is a separate **index** file for each provider, and to use one, you must replace the current **index.tsx** file with the desired one. The following providers are supported:

- [Auth0](#auth0) (index.auth0.tsx)
- [Okta](#okta) (index.okta.tsx)
- [Amazon Cognito](#amazon-cognito) (index.cognito.tsx)
- [Google](#google) (index.google.tsx)

### Auth0

The [Auth0](https://auth0.com/) tests have been rewritten to take advantage of our [`cy.session`](https://docs.cypress.io/api/commands/session) and [`cy.origin`](https://docs.cypress.io/api/commands/origin) commands.

Prerequisites include an Auth0 account and a Tenant configured for use with a SPA. Environment variables from Auth0 are to be placed in the [.env](./.env). For more details see [Auth0 Application Setup](http://on.cypress.io/auth0#Auth0-Application-Setup) and [Setting Auth0 app credentials in Cypress](http://on.cypress.io/auth0#Setting-Auth0-app-credentials-in-Cypress).

To start the application with Auth0, replace the current **src/index.tsx** file with the **src/index.auth0.tsx** file and start the application with `yarn dev:auth0` and run Cypress with `yarn cypress:open`.

The only passing spec on this branch will be the [auth0 spec](./cypress/tests/ui-auth-providers/auth0.spec.ts); all others will fail. Please note that your test user will need to authorize your Auth0 app before the tests will pass.

### Okta

A [guide has been written with detail around adapting the RWA](http://on.cypress.io/okta) to use [Okta][okta] and to explain the programmatic command used for Cypress tests.

Prerequisites include an [Okta][okta] account and [application configured for use with a SPA][oktacreateapp]. Environment variables from [Okta][okta] are to be placed in the [.env](./.env).

To start the application with Okta, replace the current **src/index.tsx** file with the **src/index.okta.tsx** file and start the application with `yarn dev:okta` and run Cypress with `yarn cypress:open`.

The **only passing spec on this branch** will be the [okta spec](./cypress/tests/ui-auth-providers/okta.spec.ts); all others will fail.

### Amazon Cognito

A [guide has been written with detail around adapting the RWA](http://on.cypress.io/amazon-cognito) to use [Amazon Cognito][cognito] as the authentication solution and to explain the programmatic command used for Cypress tests.

Prerequisites include an [Amazon Cognito][cognito] account. Environment variables from [Amazon Cognito][cognito] are provided by the [AWS Amplify CLI][awsamplify].

- A user pool is required (identity pool is not used here)
  - The user pool must have a hosted UI domain configured, which must:
    - allow callback and sign-out URLs of `http://localhost:3000/`,
    - allow implicit grant Oauth grant type,
    - allow these OpenID Connect scopes:
      - aws.cognito.signin.user.admin
      - email
      - openid
  - The user pool must have an app client configured, with:
    - enabled auth flow `ALLOW_USER_PASSWORD_AUTH`, only for programmatic login flavor of test.
    - The `cy.origin()` flavor of test only requires auth flow `ALLOW_USER_SRP_AUTH`, and does not require `ALLOW_USER_PASSWORD_AUTH`.
  - The user pool must have a user corresponding to the `AWS_COGNITO` env vars mentioned below, and the user's Confirmation Status must be `Confirmed`. If it is `Force Reset Password`, then use a browser to log in once at `http://localhost:3000` while `yarn dev:cognito` is running to reset their password.

The test knobs are in a few places:

- The `.env` file has `VITE_AUTH_TOKEN_NAME` and vars beginning `AWS_COGNITO`. Be careful not to commit any secrets.
- Both `scripts/mock-aws-exports.js` and `scripts/mock-aws-exports-es5.js` must have the same data; only their export statements differ. These files can be edited manually or exported from the amplify CLI.
- `cypress.config.ts` has `cognito_programmatic_login` to control flavor of the test.

To start the application with Cognito, replace the current **src/index.tsx** file with the **src/index.cognito.tsx** file and start the application with `yarn dev:cognito` and run Cypress with `yarn cypress:open`. `yarn dev` may need to have been run once first.

The **only passing spec on this branch** will be the [cognito spec](./cypress/tests/ui-auth-providers/cognito.spec.ts); all others will fail.

### Google

A [guide has been written with detail around adapting the RWA](https://docs.cypress.io/guides/testing-strategies/google-authentication.html) to use [Google][google] as the authentication solution and to explain the programmatic command used for Cypress tests.

Prerequisites include an [Google][google] account. Environment variables from [Google][google] are to be placed in the [.env](./.env).

To start the application with Google, replace the current **src/index.tsx** file with the **src/index.google.tsx** file and start the application with `yarn dev:google` and run Cypress with `yarn cypress:open`.

The **only passing spec** when run with `yarn dev:google` will be the [google spec](./cypress/tests/ui-auth-providers/google.spec.ts); all others will fail.

## License

[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/cypress-io/cypress/blob/master/LICENSE)

This project is licensed under the terms of the [MIT license](/LICENSE).

[reactjs]: https://reactjs.org
[xstate]: https://xstate.js.org
[express]: https://expressjs.com
[lowdb]: https://github.com/typicode/lowdb
[typescript]: https://typescriptlang.org
[cypresscloud]: https://cloud.cypress.io/projects/7s5okt/runs
[material-ui]: https://material-ui.com
[okta]: https://okta.com
[auth0]: https://auth0.com
[oktacreateapp]: https://developer.okta.com/docs/guides/sign-into-spa/react/create-okta-application/
[cognito]: https://aws.amazon.com/cognito
[awsamplify]: https://amplify.aws
[google]: https://google.com

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.kevinold.com"><img src="https://avatars0.githubusercontent.com/u/21967?v=4" width="100px;" alt=""/><br /><sub><b>Kevin Old</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/amirrustam"><img src="https://avatars0.githubusercontent.com/u/334337?v=4" width="100px;" alt=""/><br /><sub><b>Amir Rustamzadeh</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/be_mann"><img src="https://avatars2.githubusercontent.com/u/1268976?v=4" width="100px;" alt=""/><br /><sub><b>Brian Mann</b></sub></a></td>
    <td align="center"><a href="https://glebbahmutov.com/"><img src="https://avatars1.githubusercontent.com/u/2212006?v=4" width="100px;" alt=""/><br /><sub><b>Gleb Bahmutov</b></sub></a></td>
    <td align="center"><a href="http://www.bencodezen.io"><img src="https://avatars0.githubusercontent.com/u/4836334?v=4" width="100px;" alt=""/><br /><sub><b>Ben Hong</b></sub></a></td>
    <td align="center"><a href="https://github.com/davidkpiano"><img src="https://avatars2.githubusercontent.com/u/1093738?v=4" width="100px;" alt=""/><br /><sub><b>David Khourshid</b></sub></a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!!
