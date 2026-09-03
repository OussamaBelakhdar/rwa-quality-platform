# ADR-009 — Login Auth0 : programmatique par défaut, `cy.origin` pour une seule spec

**Statut** : accepté
**Date** : 2026-09-03
**Semaine du plan** : 9

## Contexte

La semaine 9 demande de tester le flux Auth0. Deux techniques sont présentées
partout comme interchangeables :

- **login programmatique** — obtenir un jeton d'Auth0 (`POST /oauth/token`,
  grant `password`), le déposer là où le SDK le cherche, envelopper dans
  `cy.session` ;
- **`cy.origin`** — piloter le formulaire hébergé par Auth0, sur une origine
  différente de celle de l'application.

Elles ne prouvent pas la même chose. Trancher exige de savoir ce que ce dépôt
fait, pas ce que la documentation d'Auth0 décrit.

### Ce que le code impose

| Fait                                                                  | Où                             | Conséquence                                                                                                                                                                        |
| --------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Le backend valide le JWT en **RS256 contre le JWKS** du tenant        | `backend/helpers.ts:15-27`     | Un jeton signé par une clé inconnue du JWKS est rejeté                                                                                                                             |
| `/testData` est monté **avant** `checkAuth0Jwt` et termine la requête | `backend/app.ts:73` puis `:80` | Le seeding reste joignable en mode Auth0 : `cy.seed` fonctionne (ADR-007). Le `.unless({ path: ["/testData/*"] })` de `helpers.ts:94` est une **ceinture-bretelles**, pas la cause |
| Le SDK est configuré en `cacheLocation="localstorage"`                | `src/index.auth0.tsx:42`       | Le cache du SDK est capturable et restaurable par `cy.session`                                                                                                                     |
| **20 specs sur 22** appellent `cy.login` (27 appels)                  | `cypress/e2e/`, `cypress/api/` | Le coût du login est payé par presque toute la suite ; celui de `cy.origin` ne doit l'être qu'une fois                                                                             |

Le troisième fait rend le login programmatique praticable. Sans lui — cache en
mémoire, le défaut du SDK — il faudrait passer par l'UI.

### Ce qui existe déjà, et qu'il ne faut pas réécrire

`cypress.config.ts` porte déjà le câblage, conforme à ADR-001 :
`auth0_domain` en `expose` (ligne 114), la tâche `getAuth0Credentials` lisant
`AUTH0_USERNAME`/`AUTH0_PASSWORD` depuis `process.env` (lignes 191-198), et un
drapeau `auth0_configured` (ligne 264).

**Ce drapeau est défectueux** : il vaut `Boolean(config.env.auth0_username)`
alors que la tâche lit `process.env.AUTH0_USERNAME`. Les deux moitiés ne
regardent pas la même source. Un utilisateur qui suit `.env:21` renseigne
`AUTH0_USERNAME` — la tâche fonctionne, le drapeau reste **faux**, et toute
spec gardée par lui se tait au lieu d'échouer. Corrigé dans le même lot :
le drapeau honore les deux sources.

### Trois défauts du câblage amont, trouvés avant d'ouvrir un compte

Ils bloqueraient la semaine sous une forme trompeuse. Chacun est vérifié.

1. **`src/index.auth0.tsx` n'est chargé par personne.** `index.html:36` déclare
   en dur `<script type="module" src="/src/index.tsx">`, `vite.config.ts` ne
   bascule pas d'entrée, aucun fichier ne l'importe. Or `yarn dev:auth0` pose
   `VITE_AUTH0=true`, ce qui monte `checkAuth0Jwt` côté **backend**
   (`backend/app.ts:79-81`) pendant que le **front** garde le login Passport.
   L'application exige un jeton qu'elle n'émet jamais.

2. **`audience` et `scope` sont perdus.** Le SDK installé est
   `@auth0/auth0-react` 2.2.4, où ces options vivent dans `authorizationParams`.
   Nuance qui compte, et que la première rédaction de cet ADR avait fausse :
   **`redirectUri` n'est pas perdu** — la fonction `deprecateRedirectUri()`
   du SDK le remappe vers
   `authorizationParams.redirect_uri` en émettant un `console.warn`. Seuls
   `audience` et `scope` n'ont aucun shim : `auth0-spa-js` ne lit que
   `options.authorizationParams.audience` et `.scope`. `audience` perdu signifie
   un jeton sans audience d'API, que `checkAuth0Jwt` rejette — un 401 sur chaque
   appel, dont la cause apparente serait « mon tenant est mal configuré ».

3. **`AppAuth0.tsx` n'enregistre pas son service.** `App.tsx:39` appelle
   `registerService("auth", authService)` ; `AppAuth0.tsx:28-31` en est resté à
   `window.Cypress` / `window.authService`, le mécanisme qu'ADR-006 a remplacé.
   Or `cy.login` passe par `loginByXstate` → `sendToService("auth", …)` →
   `window.__services__.auth` (règle #12). **Le login programmatique ne peut
   donc pas s'appuyer sur la L2 existante en mode Auth0.**

   Ce trou n'est pas neuf : ADR-006 (ligne 107) écrit que la normalisation de
   ces gardes est « reportée à l'ADR-005, pas tranchée ici ». **ADR-005 n'existe
   pas** — le numéro est réservé à la coexistence Playwright (semaine 10). La
   décision est orpheline depuis. Cet ADR la referme, mais **pour Auth0
   seulement** : voir « Périmètre » ci-dessous.

### Un angle mort du gate, et ce qu'il cachait

`src/index.auth0.tsx` **n'est pas dans le `include` de `tsconfig.json`**. Le
contrôle d'excès de propriétés de TypeScript aurait signalé les props JSX
invalides du défaut 2 ; il ne l'a pas fait parce que le fichier n'entre pas dans
le programme compilé.

L'y ajouter a été tenté, et **mesuré** : le fichier tire `AppAuth0` puis tout le
graphe de l'application, et fait apparaître **35 erreurs latentes**. Le
diagnostic est celui déjà rencontré pour Express : quatre paquets déclarent
`"@types/react": "*"`, donc une **seconde copie en 19.0.1** cohabite avec la
18.3.17 du sommet, pour une application React 18. Une `resolutions` ramène 35 à 25. Les 25 restantes sont d'authentiques défauts amont, dont `toggleDrawer()`
appelé sans argument à quatre endroits de `NavDrawer` alors qu'il en exige un —
introduit en amont, commit `24848db`, jamais vu parce que jamais typé.

Corriger 25 erreurs dans neuf composants **dépourvus de test de composant**
serait exactement le risque refusé plus haut pour les shells Okta et Google :
échanger un défaut connu contre un défaut invisible. Le besoin réel est plus
étroit — empêcher la classe du défaut 2 de revenir. Les options du provider sont
donc extraites dans `src/utils/auth0Options.ts`, un module qui n'importe que les
**types du SDK** : il entre dans `yarn types` sans rien tirer d'autre, et son
annotation `Auth0ProviderOptions` casse la compilation si les options dérivent.

La couverture de `src/` par `yarn types` reste donc partielle : elle ne tient
qu'aux composants ayant un test de composant, qui les fait entrer dans le
programme. Dette nommée, chiffrée à 25 erreurs et une `resolutions`, non
refermée ici.

### Ce que le chemin programmatique exige du tenant

Vérifié contre la documentation Cypress, qui décrit ce même flux pour cette même
application. Ces prérequis ne sont pas des détails d'installation : deux d'entre
eux changent ce que l'ADR peut promettre.

| Réglage                                                    | Où                                            | Pourquoi                                                                                                                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type d'application **SPA**                                 | Applications                                  | Auth0 _déconseille_ le grant `password` aux clients publics, mais le tableau de bord permet de l'activer et Cypress documente ce cas pour les tests. La crainte inverse — « un SPA ne peut pas » — est fausse |
| Grant type **Password**                                    | Application → Advanced Settings → Grant Types | sans lui, `/oauth/token` répond `unauthorized_client`                                                                                                                                                         |
| **Default Directory** = `Username-Password-Authentication` | Tenant Settings → API Authorization Settings  | sans lui, le grant `password` échoue même une fois activé, avec une erreur qui ne nomme pas la cause                                                                                                          |
| Une **API** dont l'Identifier devient l'`audience`         | Applications → APIs                           | sans audience d'API, Auth0 rend un jeton **opaque** et non un JWT : `checkAuth0Jwt` le rejette (RS256 + JWKS + audience)                                                                                      |
| **Client Secret** de l'application                         | Application → Settings                        | `/oauth/token` en grant `password` l'exige. C'est le prérequis le plus lourd de conséquence : voir ci-dessous                                                                                                 |
| `VITE_AUTH_TOKEN_NAME` décommenté                          | `.env`                                        | `asyncUtils.ts:15` lit `localStorage[VITE_AUTH_TOKEN_NAME]` pour poser l'en-tête `Bearer`. Commenté, la clé vaut la chaîne `"undefined"` — symétrique, donc silencieux, mais faux                             |

**Le client secret est un vrai secret, et il tombe du bon côté d'ADR-001.** Il va
dans `env` (`cypress.env.json`, non commité), **jamais** dans `expose` : les
valeurs d'`expose` sont lisibles par le code de la page sous test. C'est
exactement la frontière qu'ADR-001 a tracée, et le premier secret du projet qui
n'est pas un mot de passe public.

C'est aussi un argument que l'option A (`cy.origin`) n'a pas : **elle ne
nécessite aucun secret client.** Elle reste écartée pour son coût — 20 specs
contre 1 — mais l'écart de surface d'exposition est réel et doit être écrit
plutôt que tu.

## Options considérées

| Option                                                              | Avantages                                                                                                                                                                                                                  | Inconvénients                                                                                                                                                                                                                                                                                                                                                                                                  | Coût                                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **A. `cy.origin` partout**                                          | Prouve le flux réel de bout en bout                                                                                                                                                                                        | Chaque login paie une redirection cross-origin et le rendu d'un formulaire tiers ; le corps de `cy.origin` est **sérialisé** — il ne voit ni la portée englobante ni les commandes personnalisées, donc `cy.getBySel` et les app actions y sont indisponibles ; toute évolution du formulaire d'Auth0 casse des tests qui ne testent pas notre code                                                            | payé par **20 specs sur 22**                                                                                             |
| **B. Programmatique partout**                                       | Rapide, `cy.session` met en cache, le jeton est réel donc l'API est réellement exercée                                                                                                                                     | **Ne prouve jamais le retour de redirection** : sans `code`/`state` dans l'URL, `handleRedirectCallback()` n'est jamais invoqué, donc `onRedirectCallback` et le routage post-login ne sont jamais exécutés. Un `redirect_uri` mal déclaré passerait inaperçu                                                                                                                                                  | rapide, angle mort là où l'intégration casse                                                                             |
| **C. Programmatique par défaut + une spec `cy.origin`** _(retenue)_ | Le coût de l'UI est payé **une fois** au lieu de 20 ; le reste de la suite garde le prix du programmatique                                                                                                                 | Deux chemins d'authentification à maintenir, et il faut écrire quand utiliser lequel — c'est l'objet de cet ADR                                                                                                                                                                                                                                                                                                | 1 spec lente, 19 rapides                                                                                                 |
| **D. JWKS local et jetons signés en test**                          | Supprime **à la fois** la dépendance réseau à Auth0 et la dépendance à l'UI ; le chemin RS256+JWKS du backend reste réellement exercé — ce n'est pas un contournement de la sécurité, seulement une autre autorité de clés | `jwksUri` est dérivé de `VITE_AUTH0_DOMAIN` au démarrage (`backend/helpers.ts:20`) : il faut un serveur JWKS de test, une paire de clés, et une variable d'environnement dédiée. Surtout, **le livrable de la semaine est « le flux Auth0 testé »** — un tenant simulé ne prouve ni la configuration du tenant réel, ni le grant `password`, ni le retour de redirection. On testerait notre propre simulateur | ~1 serveur de test + 1 variable ; **écartée pour ce que la semaine doit démontrer**, pas parce qu'elle serait impossible |

L'option D mérite d'être nommée précisément parce qu'elle est la bonne réponse
dans un autre contexte : une suite qui doit tourner hors ligne, ou sans compte
tiers, la choisirait. Ici, le sujet **est** l'intégration à un fournisseur
réel — la retenir viderait la semaine de son objet.

## Décision

**C.** Le login programmatique est le chemin par défaut, exposé par `cy.login()`
(règle #2 : pas de login UI hors de `cypress/e2e/auth/`). **Une seule spec**
utilise `cy.origin`, dans `cypress/e2e/auth/`, et prouve ce que le
programmatique ne peut pas prouver : que le retour de redirection est câblé.

| Ce qu'on veut prouver                                                                       | Variante                                  | Pourquoi                                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Être connecté pour tester autre chose                                                       | programmatique + `cy.session`             | l'authentification est un prérequis, pas le sujet       |
| Le retour de redirection est câblé (`onRedirectCallback`, échange du code, route d'arrivée) | **`cy.origin`, une fois**                 | c'est notre code, et seul le passage par l'UI l'exécute |
| L'API rejette un jeton absent, expiré ou d'audience fausse                                  | `cy.request` avec le jeton programmatique | contrat de route, niveau API (ADR-004, ligne 5)         |
| Le formulaire d'Auth0 valide un mot de passe faible                                         | **aucune**                                | ce n'est pas notre code                                 |

### Périmètre du lot

| Correctif                                                                                                                              | Fichiers                                               | Ampleur           |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------- |
| Charger l'entrée Auth0 sous `VITE_AUTH0` (import dynamique dans `index.tsx`, pour que le bundle Auth0 reste hors du chemin par défaut) | `src/index.tsx`                                        | ~6 lignes         |
| `authorizationParams` pour `audience`, `scope`, `redirect_uri`                                                                         | `src/index.auth0.tsx`                                  | ~5 lignes         |
| `registerService` + les trois services de composant, **en gardant** le bloc `window.Cypress` amont comme le fait `App.tsx`             | `src/containers/AppAuth0.tsx`                          | 4 enregistrements |
| Drapeau `auth0_configured` aligné sur la source que lit la tâche                                                                       | `cypress.config.ts`                                    | 1 ligne           |
| Options du provider extraites dans un module typé, entré dans `yarn types`                                                             | `src/utils/auth0Options.ts` (nouveau), `tsconfig.json` | ~30 lignes        |

**Hors périmètre, et assumé comme tel** : `AppOkta.tsx`, `AppCognito.tsx` et
`AppGoogle.tsx` conservent leurs 6 gardes `window.Cypress` restantes. Chez Okta
et Google, ces gardes ne font pas qu'exposer — elles **changent l'application
montée** (ADR-006 le documente). Les normaliser sans tenant pour les vérifier
échangerait un défaut connu contre un défaut invisible. L'orphelin d'ADR-006 est
donc refermé pour Auth0 et **explicitement rouvert, avec sa raison**, pour les
trois autres.

## Conséquences

- Positives :
  - Le coût de la redirection est payé une fois, pas vingt.
  - Le jeton est réel : l'API est exercée telle qu'en production, JWKS compris.
  - `cy.seed` reste utilisable en mode Auth0 — l'isolation (P1) survit au
    changement d'authentification.
  - Trois défauts amont et un angle mort du gate sont refermés avant la
    première spec, au lieu d'être découverts un par un contre un tenant réel.
- Négatives assumées :
  - Deux chemins d'authentification coexistent ; la grille et la limite « une
    seule spec `cy.origin` » les bornent.
  - Le grant `password` doit être autorisé sur le tenant. C'est une
    configuration à documenter, pas un choix de test.
  - Trois shells SSO gardent un mécanisme d'exposition hérité. Dette nommée,
    datée, et rattachée à la semaine qui pourra la vérifier.
- Surveillé via :
  - `grep -rn "cy.origin" cypress/e2e/` doit retourner **une seule spec**.
    Au-delà, la décision a dérivé.
  - `yarn check:surface` — `/testData` doit rester injoignable en production, y
    compris en mode Auth0 (ADR-007).
  - `yarn types` couvre désormais `src/utils/auth0Options.ts` : la classe de
    défaut 2 ne peut plus repasser silencieusement. **Vérifié par mutation** —
    remettre `redirectUri`/`audience`/`scope` au premier niveau produit
    `TS2353: 'redirectUri' does not exist in type 'Auth0ProviderOptions'`.

## À mesurer, une fois le tenant disponible

Ces chiffres exigent un tenant réel. Les inventer serait pire que les laisser
vides — c'est la leçon d'ADR-004, dont la figure centrale avait dû être
remesurée.

| Mesure                                                      | Protocole                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Durée d'un login `cy.origin` contre un login programmatique | 10 exécutions de chaque, médiane, même machine, protocole d'ADR-004                      |
| Gain de `cy.session`                                        | la même suite avec et sans cache, comme ADR-002 (12-13 s → 8 s sur 20 tests)             |
| Taux d'échec du chemin `cy.origin`                          | `yarn cy:burn` sur la seule spec concernée ; au-delà de 2 %, elle passe en `@quarantine` |

## Réversibilité

Revenir à l'option A (`cy.origin` partout) touche **L2 uniquement** : la
commande `cy.login`. Les 20 specs qui l'appellent ne nomment pas la technique —
elles écrivent `cy.login(username)`, exactement comme aujourd'hui avec Passport.

Cette promesse n'était **pas** tenable avant ce lot : `cy.login` transite par
`window.__services__.auth`, qu'`AppAuth0.tsx` n'enregistrait pas. C'est le
correctif du défaut 3 qui la rend vraie, et c'est pourquoi il est dans le
périmètre plutôt que renvoyé plus loin.

Revenir à l'authentification locale ne touche que le point d'entrée du front et
la configuration ; aucune spec ne bouge.
