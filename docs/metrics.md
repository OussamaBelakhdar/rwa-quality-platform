# Métriques

Mises à jour à chaque clôture de semaine. Définitions au §8 de `docs/ARCHITECTURE.md`.
Une case vide signifie « pas encore mesurable », jamais « non mesuré ».

## Semaine 0 — fondation (2026-08-31)

| Métrique                       | Valeur                          | Note                                                                                                                                                            |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cypress                        | 15.17.0                         | hérité de l'amont, aucune migration effectuée                                                                                                                   |
| Node                           | 22.20.0                         | `.node-version`                                                                                                                                                 |
| Specs E2E                      | **0**                           | suite héritée supprimée (23 fichiers)                                                                                                                           |
| Component tests                | **0**                           | 5 fichiers supprimés, reconstruits en semaine 8                                                                                                                 |
| Tests unitaires Vitest hérités | 8                               | conservés, hors périmètre du projet                                                                                                                             |
| `yarn types`                   | vert, 1,7 s                     | racine                                                                                                                                                          |
| `tsc -p cypress/tsconfig.json` | vert                            | strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`                                                                                              |
| `yarn lint`                    | vert                            | eslint + prettier                                                                                                                                               |
| `yarn install`                 | 77 s                            | `patch-package` inclus                                                                                                                                          |
| Dépendances retirées           | 2                               | `@percy/cypress`, `@percy/cli`                                                                                                                                  |
| Vulnérabilités Dependabot      | voir l'onglet Security du dépôt | héritées de l'amont, non introduites ici. Le compte varie tant que GitHub scanne ; à figer et traiter en semaine 6 avec la gate chaîne d'approvisionnement (§6) |
| Durée de suite                 | —                               | pas de suite                                                                                                                                                    |
| Taux de flake                  | —                               | pas de suite                                                                                                                                                    |
| Quarantaine                    | 0                               | —                                                                                                                                                               |
| Ratio composant / API / E2E    | —                               | pas de suite                                                                                                                                                    |

## Semaine 1 — fondations (2026-08-31)

| Métrique                                      | Valeur                                                          | Note                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs E2E                                     | **8**                                                           | `cypress/e2e/00-foundations/`                                                                                                                         |
| Tests                                         | **20**                                                          | 20 passants, 0 en quarantaine. Dont un test qui échoue réellement, son échec intercepté par `cy.on("fail")` et asserté                                |
| Durée de suite (séquentiel, Electron)         | **12 s**                                                        | mesure locale, non shardée                                                                                                                            |
| Stabilité                                     | **3/3 exécutions consécutives vertes**                          | aucun retry déclenché                                                                                                                                 |
| Filtrage par tag                              | **CETTE LIGNE ÉTAIT FAUSSE** — corrigée en semaine 4            | `--env grep=@foundations` retournait « 8 specs », c'est-à-dire la totalité de la suite d'alors : rien n'était filtré. Voir la section de la semaine 4 |
| Capacités L2 livrées                          | 4 commandes, 1 app action, 3 factories d'intercept              | `getBySel`, `getBySelLike`, `seed`, `login`                                                                                                           |
| Clés `data-test` typées                       | 75                                                              | union littérale, faute de frappe = erreur de compilation                                                                                              |
| `yarn types` / `tsc -p cypress` / `yarn lint` | verts                                                           | —                                                                                                                                                     |
| Isolation (`yarn cy:random`)                  | **3 ordres aléatoires, 19/19 à chaque fois**                    | graines 989457388, 43520517, 162811761 ; ordre rejouable via `CY_RANDOM_SEED`                                                                         |
| Taux de flake (`yarn cy:burn`)                | **0,00 %**                                                      | 10 exécutions × 19 tests = 190 exécutions, 0 échec, retries désactivés. Seuil §6 : 2 %                                                                |
| Durée du burn                                 | 3 min 04                                                        | 10 exécutions séquentielles                                                                                                                           |
| Revue `test-reviewer`                         | **passée, 8 points bloquants corrigés**                         | dont `yarn types` qui ne compilait pas `cypress/`                                                                                                     |
| Assertions vérifiées par mutation             | 2/2 discriminantes                                              | specs 05 et 06 : inverser l'attendu fait bien échouer                                                                                                 |
| Garde-fou sélecteurs                          | `yarn check:selectors`                                          | 75 clés, `src/` et l'union comparées dans les deux sens ; chaîné dans `yarn lint`                                                                     |
| Règles TS appliquées au code de test          | `no-explicit-any`, `ban-ts-comment` en `error` sur `cypress/**` | vérifié par sonde : les deux rejettent                                                                                                                |
| **Base de référence semaine 2**               | **12–13 s** pour 20 tests                                       | sans `cy.session` : `cy.login` charge `/signin` puis la spec charge sa page — deux chargements par test                                               |

## Semaine 2 — `cy.session` (2026-09-01)

Mesure à périmètre égal : les **8 specs de la semaine 1**, 20 tests, même machine, Electron.

| Métrique                     | Avant                                 | Après   | Écart     |
| ---------------------------- | ------------------------------------- | ------- | --------- |
| Durée de suite               | 12–13 s                               | **8 s** | **−35 %** |
| Chargements de page par test | 2 (`/signin` puis la page de la spec) | 1       | −50 %     |

| Autre                                   | Valeur                                                          |
| --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite complète (22 tests, auth incluse) | 10–11 s                                                         |
| Isolation `yarn cy:random`              | 3 ordres, 22/22 — le cache de session ne crée pas de couplage   |
| `yarn cy:burn`                          | 10 × 22 = 220 exécutions, **0,00 %**                            |
| Login UI restant                        | **1 spec** (`e2e/auth/login.cy.ts`, 2 tests)                    |
| Chemin d'échec de `validate()`          | **exercé et prouvé**                                            | `e2e/auth/session.cy.ts` ; sans `validate()` le test échoue (vérifié par mutation)                                                          |
| `Cypress.stop()`                        | contrat vérifié en suite, démonstration réelle hors specPattern | `yarn cy:demo:stop`                                                                                                                         |
| Règle #6 (tags) outillée                | `check-spec.sh`                                                 | vérifié par 3 sondes : sans tag → bloqué, domaine seul → bloqué, conforme → passe                                                           |
| Garde-fou préfixes                      | `check:selectors` couvre `DataTestPrefix`                       | vérifié : un préfixe inventé est nommé                                                                                                      |
| Assertions vérifiées par mutation       | 4                                                               | specs 05, 06 et les deux tests de `auth/session.cy.ts`                                                                                      |
| Coût réel de `cy.seed()`                | **1,5–5 ms** par appel                                          | mesuré, pas supposé : ~40 ms sur les 25 tests, soit **0,25 %** d'une suite de 16 s. L'hypothèse « prochain gisement de temps » était fausse |
| Déterminisme du seed                    | mêmes IDs après reseed                                          | c'est ce qui permet au cache `cy.session` de survivre d'un test à l'autre                                                                   |
| Assertions vérifiées par mutation       | **6**                                                           | specs 05, 06, 08 et les deux de `auth/session.cy.ts`                                                                                        |

## Semaine 3 — App Actions typées (2026-09-01)

| Métrique                                     | Valeur                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                                        | **26** (25 + `cy.appState`)                                                                                                                                                          |
| Expositions `window` non gardées dans `src/` | **0** (9 sur 9 gardées ; la fuite de `TransactionCreateContainer` est fermée)                                                                                                        |
| Points d'exposition lus par L2               | **1** (`window.__services__`) au lieu de 6 dispersés                                                                                                                                 |
| Casts non vérifiés dans `cypress/`           | **0**                                                                                                                                                                                |
| Contrat de typage                            | `support/typage.contract.ts` — 6 `@ts-expect-error`, vérifié par mutation : élargir `DataTestKey` à `string` casse `yarn types`                                                      |
| Registre absent d'un build par défaut        | **vérifié à l'exécution** : `window.__services__ === undefined` après `yarn build` ; présent après `yarn build:test`                                                                 |
| ADR acceptés                                 | 001, 002, 006                                                                                                                                                                        |
| `yarn cy:burn`                               | 10 × 26 = 260 exécutions, **0,00 %**                                                                                                                                                 |
| Suite                                        | 26/26, 17 s ; ordre aléatoire 26/26                                                                                                                                                  |
| Note d'environnement                         | le burn échoue au lancement du navigateur si des processus Cypress traînent (`browser CRI connection was reset`) — le script le distingue d'un échec de suite et le dit              |
| Autocomplétion                               | **prouvée**, pas capturée                                                                                                                                                            | `yarn check:autocompletion` interroge le service de langage TypeScript : `cy.getBySel("` propose les 75 clés. Discriminant — élargir `DataTestKey` à `string` fait tomber la liste à 0 |
| Services enregistrés                         | 8                                                                                                                                                                                    | dont `userOnboarding`, livré mais non exercé (aucun utilisateur seedé sans compte bancaire — semaine 4)                                                                                |
| Revue `adr-challenger` sur ADR-002           | passée, 5 points corrigés                                                                                                                                                            | dont une faille réelle : un `data-test` écrit en dur échappait au typage                                                                                                               |
| Couche L2                                    | 14 fichiers, 513 lignes dont 205 de commentaires                                                                                                                                     | coût **mesuré** de l'option retenue, pas estimé                                                                                                                                        |
| `yarn cy:burn` semaine 3                     | 10 × 26 = 260 exécutions, **0,00 %**                                                                                                                                                 |
| `yarn cy:run` / `cy:random`                  | **34/34** dans les deux cas (l écart de 4 est corrigé)                                                                                                                               |
| `yarn cy:burn`                               | 10 × 34 = **340 exécutions, 0,00 %**                                                                                                                                                 |
| Tests                                        | **35** (+1 contrat : refus du doublon de username)                                                                                                                                   |
| Garde serveur `/testData`                    | **vérifiée** : 404 sous `NODE_ENV=production`, `/checkAuth` à 401 comme contrôle                                                                                                     |
| Isolation, preuve déterministe               | les **deux ordres adverses** passent : la spec qui vide la base placée en premier, puis en dernier. La garantie vient du `cy.seed()` de chaque `beforeEach`, pas d'un tirage heureux |
| Doublon de `username`                        | **refusé en 409**. Avant : deux utilisateurs homonymes créés silencieusement, et `POST /login` en retournait un au hasard                                                            |

## Semaine 4 — après revue `test-reviewer`

| Métrique                          | Valeur                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests                             | **37** · `cy:run` et `cy:random` tous deux à 37/37 · burn 10 × 37 = **370 exécutions, 0,00 %**                                                                                                                                           |
| ADR                               | 001, 002, 006, **007** — tous acceptés                                                                                                                                                                                                   |
| `TaskMap`                         | branchée **côté handler** (vérifié par mutation). Côté appel, impossible à durcir : les surcharges natives de `cy.task` sont permissives et le declaration merging ajoute sans retirer. Le hook refuse donc `cy.task` brut dans une spec |
| Règle #1 (`cy.seed`)              | **outillée** — le hook la fait respecter ; elle ne l'était par personne, et `api/testdata.cy.ts` la violait                                                                                                                              |
| `cy.appState`                     | **query retriable** (`cy.window().its().its().invoke().its()`). Une version bâtie sur `.then` capturait la valeur une fois : `.should()` ne relisait jamais la machine                                                                   |
| Bug fonctionnel corrigé           | le builder produisait des utilisateurs sans `defaultPrivacyLevel` : leurs transactions recevaient `privacyLevel: null` et étaient **invisibles du flux public**                                                                          |
| Doublon de `username`             | refusé en 409 (avant : homonyme créé et `POST /login` en retournait un au hasard)                                                                                                                                                        |
| Ordre `--spec` honoré par Cypress | **vérifié** dans les deux sens en comparant les lignes `Running:`                                                                                                                                                                        |
| `data/database.json`              | **retiré du suivi git** — le commit précédent y avait embarqué un utilisateur de test, hash bcrypt inclus                                                                                                                                |
| Casts dans `cypress/`             | **0**                                                                                                                                                                                                                                    |

## Semaine 4 — points « Recommandé » de la revue, traités

| Amélioration                   | Preuve                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Tests                          | **40** · `cy:run` et `cy:random` à 40/40                                                                                        |
| Validation d'entrée des routes | `400` qui **nomme les champs manquants** au lieu d'un 500 au corps vide ; `senderId` inconnu nommé aussi                        |
| Traversée de chemin            | `POST /seed/..%2F..%2Fpackage` → **400**. `seedDatabaseWith` prend une union fermée, plus une chaîne libre                      |
| Ancre de chemin                | `__dirname` partout dans `database.ts` ; `process.cwd()` et `__dirname` coexistaient et auraient cassé sous un `WORKDIR` Docker |
| Source unique des scénarios    | le backend publie `GET /testData/seed/scenarios`, un contrat le compare au type `SeedScenario`                                  |
| `env:validate` (§4, §5)        | **livré et prouvé** : contre un serveur sans `dev:test`, arrêt en **119 ms** avec la cause et les ADR cités                     |
| Contrats de seeding            | **1** — la tâche `db:seed` de l'amont est retirée, `db:reset` typée reste seule                                                 |
| Duplication P5                 | la lecture de `defaultPassword` était copiée mot pour mot entre deux commandes — factorisée dans `env.commands.ts`              |
| `cypress/plugins/index.ts`     | créé : la règle le référençait, le fichier n'existait pas                                                                       |
| Tag de domaine de la spec API  | `@seeding` — `@api` décrivait le niveau, pas le domaine (règle #6)                                                              |
| `yarn cy:burn`                 | 10 × 40 = **400 exécutions, 0,00 %**                                                                                            |

## Maintenance — faker 6 → 10 (2026-09-03)

Dependabot #38, 27 erreurs de compilation, 35 appels traduits sur 4 fichiers.
Renommages mécaniques pour 34 d'entre eux (`random.uuid` → `string.uuid`,
`name.*` → `person.*`, `helpers.randomize` → `helpers.arrayElement`,
`finance.account` → `finance.accountNumber`, `company.companyName` →
`company.name`…). **Le 35e n'était pas mécanique**, et c'est le seul qui comptait.

| Champ         | faker 6 (`phone.phoneNumberFormat(0)`) | faker 10, remplaçant naturel |
| ------------- | -------------------------------------- | ---------------------------- |
| `phoneNumber` | `398-225-9900`                         | `691-531-1666 x9017`         |

Le remplaçant ajoute une extension. Le seed est un **contrat de données** — le
formulaire de réglages valide le téléphone par regex — donc la forme est
réaffirmée explicitement via `helpers.fromRegExp` plutôt que déléguée à un
`style` dont la sortie change entre versions.

### Ce que rien ne vérifiait

`yarn types` passe, les 44 tests unitaires passent, et `data/database-seed.json`
n'est régénéré qu'à la main : **aucun contrôle du dépôt ne voyait la forme des
données de seed**. Le défaut serait apparu des semaines plus tard, au premier
`yarn db:seed` de quelqu'un d'autre.

`scripts/check-seed-contract.js` déclare le contrat et le vérifie — 8e gate,
chaînée dans `yarn lint`, 39 invariants sur 8 collections et 735
enregistrements. Elle accepte un chemin en argument, pour contrôler un seed
fraîchement généré avant de le committer.

| Contrôle                                      | Résultat                          |
| --------------------------------------------- | --------------------------------- |
| seed committé (faker 6)                       | **39 invariants tenus**           |
| seed régénéré avec faker 10                   | **les mêmes 39**                  |
| mutation : extension, uuid invalide, n° alpha | **3 ruptures signalées**, nommées |

La ligne du milieu est la preuve de la migration ; la dernière est la preuve du
contrôle. Le contre-exemple attrapé est mot pour mot `691-531-1666 x9017` —
celui que `phone.number()` aurait produit sans la décision ci-dessus.

## Semaine 8 — component testing et accessibilité (2026-09-02)

| Métrique                        | Valeur                       | Note                                                                                                                            |
| ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tests de composant              | 0 → **27**                   | 10 composants, **2 s** pour l'ensemble ; validation des réglages prouvée par mutation                                           |
| Tests E2E                       | 60 → **65**                  | dont 5 pages auditées par axe                                                                                                   |
| Ratio des niveaux               | **31 % / 3 % / 66 %**        | composant / API / E2E — **publié, non ciblé** (ADR-004)                                                                         |
| Sélecteurs typés                | 79 → **84 clés, 8 préfixes** | 5 clés posées via `inputProps` de MUI étaient invisibles du contrôle statique                                                   |
| Coût par test, mesuré           | **18 ms** contre **283 ms**  | composant contre E2E, médianes sur n=13 et n=8                                                                                  |
| Violations a11y **corrigées**   | **3 règles**                 | `link-name` (10 nœuds), `image-alt` (24) et `list` (10) éliminées                                                               |
| Violations bloquantes restantes | **3 règles, sur 1 page**     | 4 pages sur 5 n'en ont plus aucune. Les 2 par page qui subsistent sont `moderate` (`region`, `heading-order`), sous le seuil §6 |
| Couverture (statements)         | **80,25 %**                  | `src/` 78,1 % · `backend/` 84,4 % — mesurée par la suite E2E instrumentée                                                       |
| Couverture (branches)           | **57,33 %**                  | l'écart avec les statements est le chiffre intéressant : les chemins d'erreur restent sous-couverts                             |
| Gates outillées                 | 6 → **7**                    | `check:levels` — chaque spec déclare son niveau, l'emplacement le confirme                                                      |
| Jobs CI                         | 6 → **7**                    | `component`, bloquant (gate §6)                                                                                                 |

### La base de référence a exigé sa propre réduction

La première correction de `list` était **incomplète** : j'avais remplacé le
`<div>` qui enveloppait les items du tiroir par un fragment, sans voir que les
`ListItem` rendaient des `<a>` via `component={RouterLink}` — un `<ul>`
contenant des `<a>` viole la même règle. Je l'avais écrit dans le commit plutôt
que de laisser croire à une correction.

Complétée : `ListItem disablePadding` + `ListItemButton`, cinq items, ce qui
rend enfin `<li><a>…</a></li>`. Effet de bord bienvenu — les quatre
`// @ts-ignore` que le typage de `component={RouterLink}` imposait ont disparu.

**C'est le test qui a exigé la suite.** `list` étant corrigée sur les cinq
pages, la base a refusé de la garder :

```
AssertionError: règles corrigées sur flux public — les retirer de la base : list
```

Une base de dérogations qui ne peut que rétrécir n'est pas une commodité : ici,
elle a transformé une correction partielle en correction complète, sans que
personne ait à s'en souvenir.

### Deux scripts hérités qui ne pouvaient pas fonctionner ensemble

`yarn dev:coverage` lançait `start:react`, **sans `--mode test`** : la suite
échouait dessus faute de `VITE_TEST_HOOKS` (ADR-006), puisque `window.__services__`
est absent de tout build sans le drapeau. La couverture E2E était donc
inatteignable en l'état, et personne ne l'avait constaté parce que personne ne
l'avait lancée.

`yarn dev:coverage:test` combine les deux. Et `expose.coverage`, figé à `false`,
dépend désormais de la **même** variable que l'instrumentation Vite : deux
interrupteurs pour une seule intention, c'est un interrupteur qu'on oubliera.

### Ce que la grille a désigné, et que l'E2E faisait à sa place

ADR-004 appliquée rétroactivement montre que les quatre premières lignes de la
grille étaient couvertes en E2E ou pas couvertes du tout. Les deux défauts
trouvés en semaine 5 — `--$5.00` et `-0` — sont **props → rendu** : 283 ms et
une base seedée là où 18 ms suffisaient.

Les E2E de la semaine 5 restent : leur objet est la mutation de réponse, pas le
formatage. La duplication d'assertion est assumée et bornée à trois lignes.

### Le contrôle statique prouvait la déclaration, pas la livraison

Trouvé en instruisant la montée MUI de Dependabot #11, qui saute quatre
versions majeures. MUI 9 retire `inputProps` de `TextField` au profit du slot
`htmlInput` — vérifié dans le paquet publié, la prop a disparu des
`propTypes`. **Six `data-test` du dépôt transitent par cette prop** : le source
reste valide, et l'attribut disparaît du DOM.

La suite E2E n'en attrapait qu'un, faute de couvrir les cinq autres pages. Et
`check-selectors.js` ne pouvait structurellement rien voir : il compare deux
textes. Pire, son extraction de clés statiques ne reconnaissait que
`data-test="cle"` et manquait l'écriture MUI `"data-test": "cle"` — les cinq
clés étaient absentes de `dansSrc` **et** de l'union, donc ni « manquante » ni
« fantôme ». Un garde-fou vert sur des sélecteurs qu'il ne gardait pas.

| Mutation sur `UserListSearchForm`             | `yarn types` | `check:selectors` | test de composant |
| --------------------------------------------- | ------------ | ----------------- | ----------------- |
| `inputProps` → `InputProps` (signature MUI 9) | vert         | vert              | **rouge**         |
| ligne supprimée                               | vert         | **rouge**         | rouge             |

La première ligne est la panne réelle : les deux gardes statiques restent verts,
seul le rendu trahit — `expected <div.MuiOutlinedInput-root> to match 'input'`.
Les deux contrôles se complètent, l'un sur la **déclaration**, l'autre sur la
**livraison**. Trois tests de composant couvrent les six sélecteurs en 559 ms.

### Un échec de composant non reproduit

Une exécution de `yarn cy:component` sur dix a échoué (22/23), immédiatement
après un `yarn install` qui remplaçait `node_modules` sous le serveur Vite du
runner. **Non reproduit en 15 exécutions consécutives depuis**, ni en CI (#34 :
18 jobs verts). Consigné plutôt que passé sous silence : 1 sur 16, cause
probable d'environnement et non de test, à re-regarder s'il réapparaît.

## Semaine 9 — Auth0 (2026-09-03)

### Le flux s'exécute — fournisseur OIDC local (ADR-010)

Le critère « Compte Auth0 gratuit » reste **non tenu** : il exige un compte
tiers. Mais cette ÉTAPE contredit **P6**, le principe au nom duquel ADR-003 a
écarté Cypress Cloud « après mesure ». ADR-010 tranche en faveur du principe et
livre un fournisseur OIDC local — **cible interchangeable**, pas chemin
parallèle : `VITE_AUTH0_DOMAIN` pointé sur un vrai tenant exécute le même code.

| Mesure                                   | Valeur                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tests Auth0                              | **2 passants**, 4 s                                                                               |
| Taux de flake (`cy:burn`, 10 exécutions) | **0,00 %** — seuil §6 à 2 %                                                                       |
| Vidéo                                    | `cypress/videos/auth0.cy.ts.mp4`, 1,07 Mo, 4 s — **non commitée** (rules/git.md)                  |
| Dépendances ajoutées                     | **aucune** — `jsonwebtoken`, `cors`, `express` déjà présents ; `crypto` exporte un JWK nativement |
| Jobs CI                                  | 7 → **8** — le flux s'exécute au lieu d'être en attente                                           |

### Deux défauts trouvés en le faisant marcher

Aucun n'était devinable ; les deux viennent d'une trace ajoutée au fournisseur
parce que « le clic ne soumet pas » ne se diagnostique pas à l'œil.

| Symptôme                                   | Cause                                                                                            | Preuve                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Le clic réussit, l'URL ne bouge pas        | `<button name="action">` **masque** `form.action` (DOM clobbering) — la soumission n'aboutit pas | 6 GET `/authorize`, **0 POST**       |
| La soumission passe, le jeton n'arrive pas | Pas d'en-têtes CORS : le préflight du navigateur échoue et l'échange du `code` ne part jamais    | **9 OPTIONS `/oauth/token`, 0 POST** |

Auth0 émet ces en-têtes nativement. Un fournisseur local qui les oublie teste un
flux qui ne ressemble pas au vrai — c'est exactement le risque que l'ADR
s'engageait à ne pas créer, et il s'est présenté au premier essai.

### Ce que la CI exécute désormais

Un job **séparé**, et il ne peut pas en être autrement : `VITE_AUTH0=true` est
figé au build, donc dans ce mode les 20 specs qui utilisent `cy.login`
(Passport) échoueraient. Les deux modes ne cohabitent pas dans un même artefact.

| Métrique                              | Valeur              | Note                                                     |
| ------------------------------------- | ------------------- | -------------------------------------------------------- |
| Tests E2E                             | 65 → **67**         | 2 en attente tant qu'aucun tenant n'est configuré        |
| Défauts amont corrigés                | **7**               | tous trouvés avant qu'un seul appel Auth0 ne soit tenté  |
| Prérequis à la charge du propriétaire | 6 → **3**           | trois supprimés par du code, pas par de la documentation |
| Sélecteurs typés                      | 84 clés, 8 préfixes | inchangé                                                 |

### La décision de l'ADR s'est inversée, et c'est une mesure qui l'a fait

ADR-009 retenait d'abord le **login programmatique**, sur un argument de coût :
« payé par 20 specs sur 22 ». Faux. `cy.session` avec `cacheAcrossSpecs` amortit
déjà le login : comptées côté API sur une exécution complète, les **27**
invocations de `cy.login` produisent **11** `POST /login` réels.

|                                |        |
| ------------------------------ | ------ |
| Appels `cy.login` dans le code | 27     |
| Connexions réelles, mesurées   | **11** |

S'y ajoutent deux faits que le raisonnement initial ignorait : l'amont teste
Auth0 sur cette application avec `cy.origin` enveloppé dans `cy.session`, et
`docs/PLAN.md` énonce ce livrable mot pour mot. **L'ADR contredisait le livrable
qu'il servait.**

Conséquence directe : le chemin retenu ne demande **aucun client secret**. Le
prérequis le plus lourd disparaît — et avec lui le premier vrai secret du
projet.

### Ce qui est vérifiable sans tenant, et vérifié

| Contrôle                                                       | Résultat                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Suite complète, spec présente et non configurée                | **67 tests, 65 passants, 2 en attente, 0 échec**              |
| La spec attend au lieu d'échouer                               | `Pending: 2`, `Failing: 0`                                    |
| Le garde n'est pas vide — drapeau forcé, sans identifiants     | la tâche **nomme** les variables absentes                     |
| Le garde n'est pas vide — drapeau forcé, identifiants factices | la spec **atteint `cy.origin`** et échoue sur le faux domaine |

La dernière ligne est celle qui compte : elle prouve que le chemin s'exécute
jusqu'à la frontière d'origine, et que seul le tenant manque.

### Un résidu attrapé par la mutation

Le drapeau acceptait `CYPRESS_auth0_username` quand la tâche ne lisait que
`process.env.AUTH0_USERNAME` — drapeau vrai, tâche en échec. Exactement le
défaut que ce lot corrigeait, reparu un cran plus loin. Les deux consultent
désormais la même expression.

## Audit de clôture des semaines 7 et 8 (2026-09-03)

Relecture des critères de `docs/PLAN.md` et de la checklist `close-week`, un par
un, après coup. Deux manques trouvés, tous deux comblés ici — la semaine 8 était
mergée avec sa CI verte, ce qui n'est pas la même chose que « complète ».

| Critère                                                                | État avant l'audit                                  | Après                                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| S7 — étudier `fileParallelism: false`                                  | **non tenu** : aucune mention hors du plan lui-même | mesuré et écrit dans [`flakiness-report.md`](flakiness-report.md) |
| S8 — `close-week` §2 : `yarn cy:random`                                | non exécuté                                         | **65/65**                                                         |
| S8 — `close-week` §2 : `yarn cy:burn` sur les specs touchées           | non exécuté                                         | **0,00 %** sur 10 exécutions (spec a11y, 5 tests × 10)            |
| S7 — flake réel de `flake-demo`, non fabriqué                          | tenu                                                | —                                                                 |
| S7 — quarantaine, job CI non bloquant, `cy:burn`                       | tenus                                               | —                                                                 |
| S8 — composants nommés par le plan                                     | tenu après ajout de `TransactionCreateStepOne`      | —                                                                 |
| S8 — ADR-004 sur 10 comportements, axe sur 5 pages, couverture publiée | tenus                                               | —                                                                 |

La leçon tient en une ligne : **une CI verte prouve que ce qui est écrit passe,
pas que ce qui était demandé est écrit.** Seule la relecture des critères
attrape un critère jamais commencé.

## Semaine 7 — flakiness (2026-09-02)

| Métrique                      | Valeur                      | Note                                                                   |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| Tests                         | **60** (58 → 60)            | commentaires et likes, domaines jusque-là non couverts                 |
| Suite complète                | vert, **37 s**              | 60/60, hors flake injecté                                              |
| Flake mesuré sur `flake-demo` | **37,93 %**, 22 tests       | `cy:burn`, 580 exécutions, retries forcés à zéro                       |
| Cause réelle                  | **1**                       | retirer un seul `throw` ramène le taux à **0,00 %** sur 290 exécutions |
| Ce que les retries cachent    | **18 tests sur 22**         | `cy:run` n'en montre que 4. Durée 36 s → **2 min 17**                  |
| Specs correctes vs naïves     | **0,00 %** contre **100 %** | même application, même flake : seule l'écriture de l'assertion change  |
| Gates outillées               | 4 → **6**                   | `check:quarantine` et l'extension de `check:hook` (8 → 17 cas)         |
| Blocs en quarantaine          | **0**                       | plafond §6 : 5, ticket daté de moins de 14 jours exigé                 |

### Ce que la semaine a trouvé, et où

Le rendement n'est pas le nombre de tests ajoutés — deux — mais ce que le flake
réel a mis au jour. Détail complet dans [`flakiness-report.md`](flakiness-report.md),
avec les commandes pour reproduire chaque chiffre.

| Constat                                                                | Statut                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 22 tests flaky ne faisaient qu'**une seule cause**                     | prouvé par isolation, pas déduit                                               |
| Les retries transforment 22 tests instables en **4 échecs visibles**   | une équipe qui ne lit que `cy:run` conclurait « quatre tests flaky »           |
| Deux des trois flakes amont étaient **invisibles faute de couverture** | comblé : specs commentaires et likes                                           |
| `check-selectors.js` refusait un préfixe **présent** dans `src/`       | corrigé — son motif ignorait la forme MUI `inputProps={{ "data-test": … }}`    |
| `check-spec.sh` bloquait un commentaire citant `cy.wait(5500)`         | corrigé **par classe** : j'avais réparé l'instance en semaine 5, pas la classe |
| La gate §6 sur la quarantaine n'était **pas exécutable**               | `yarn check:quarantine`, mutation-testé sur 5 cas                              |

### Un point du plan non livré, et pourquoi

« Activer Test Replay sur le free tier Cypress Cloud pour un run de
démonstration » figurait au plan de la semaine 7. **Il n'est pas livré.**

La ligne a été écrite en semaine 0 ; ADR-003 a été accepté en semaine 6, après
mesure, et son argument central est que ce dépôt tourne **sans compte ni clé**.
Il a écarté Cypress Cloud, Currents et sorry-cypress pour cette seule raison.
Ouvrir un compte six jours plus tard pour une capture d'écran affaiblirait
l'ADR sans rien prouver de plus : **un plan écrit avant une décision ne
l'emporte pas sur elle.**

Ce que Test Replay apporte — le post-mortem d'un échec CI — est couvert
autrement, sans compte : artefacts sur échec seulement, rapport HTML agrégé
publié à chaque run, annotations `::error::` lisibles sans authentification, et
`cy:burn` qui mesure le flake en forçant les retries à zéro, ce que Test Replay
ne fait pas. La couverture n'est pas identique, et ce paragraphe existe pour ne
pas prétendre le contraire.

### La grille de diagnostic avait un trou

Les six classes du skill `flake-diagnosis` — race réseau, détachement DOM, sujet
capturé, animation, isolation, timing CI — supposent **toutes** que le flake est
dans le test. Le cas le plus instructif de la semaine est celui où il n'y est
pas : une requête qui échoue une fois sur deux est un défaut applicatif, et un
test qui l'absorbe transforme un bug déterministe en bruit de fond.

Une septième classe a été ajoutée, dont la correction est, pour la première
fois, **ne pas toucher au test** — et pour laquelle la quarantaine est refusée :
elle isole un test instable, elle ne fait pas taire une application cassée.

## Semaine 6 — CI/CD (2026-09-02)

| Métrique                     | Valeur                               | Note                                                                                                                                                  |
| ---------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline                     | `.github/workflows/e2e.yml`          | 5 jobs : `qualite`, `e2e` (4 shards), `report`, `pages`, `firefox`                                                                                    |
| Dépendance à Cypress Cloud   | **aucune**                           | pas de `record`, pas de clé, pas de service tiers (P6, ADR-003)                                                                                       |
| Actions épinglées            | **13 sur 13, par SHA complet**       | SHA résolus par `git ls-remote`, donc par un autre protocole que l'API REST                                                                           |
| Droits `pages: write`        | **1 job sur 5**                      | le job `pages` seul ; les 4 shards tournent en `contents: read`                                                                                       |
| Shards en CI                 | **157 à 215 s**                      | écart 1,04× à 1,23× sur trois runs — contre 2,06× en local : le coût fixe écrase le déséquilibre                                                      |
| Workflows hérités supprimés  | 3                                    | 78 échecs et 0 succès sur 100 runs. `merge-develop-into-flake-demo` et `.circleci/` gardés : inertes                                                  |
| Artefacts produits par run   | **6**                                | `rapport-html` (374 Ko), `junit` (10 Ko), et les résultats bruts des 4 shards                                                                         |
| Conclusion du run            | **success**, tous jobs verts         | `qualite`, 4 shards, `report` et `pages` — plus aucun rouge permanent                                                                                 |
| **Firefox**                  | **58/58 en 1 min 02**, Firefox 144   | job non bloquant, hebdomadaire (lundi 6 h UTC), avec ouverture d'issue automatique si rouge                                                           |
| `retries`                    | `runMode: 2`, `openMode: 0`          | les DEUX écrits, y compris celui qui vaut zéro par défaut : une valeur implicite n'est pas une décision. Justification en tête de `cypress.config.ts` |
| `yarn cy:burn` suite entière | **10 × 58 = 580 exécutions, 0,00 %** | à la clôture, retries forcés à zéro                                                                                                                   |
| `patch-package` en CI        | ✔ vérifié dans le log               | `react-virtualized@9.22.5 ✔` — pas de `--ignore-scripts`, comme le plan l'exige                                                                      |

### Où passe le temps en CI — décomposition mesurée d'un shard

C'est le chiffre que le plan demandait, et il ne dit pas ce que j'espérais.

| Étape                           | Durée     |
| ------------------------------- | --------- |
| Initialisation du conteneur     | 24 s      |
| Checkout                        | 1 s       |
| **`yarn install`**              | **73 s**  |
| `yarn build:test`               | 16 s      |
| Démarrage de l'application      | 11 s      |
| **Cypress (un quart de suite)** | **23 s**  |
| Artefacts                       | 1 s       |
| **Total**                       | **151 s** |

**Coût fixe par runner : 128 s** — soit tout sauf les 23 s de Cypress. La
valeur estimée dans ADR-003 avant écriture du workflow était de 127 s, tirée
des runs échoués de l'amont : elle est confirmée à 1 s près, par une mesure
indépendante.

### Séquentiel contre 4 shards

| Configuration                       | Temps d'horloge | Temps machine |
| ----------------------------------- | --------------- | ------------- |
| 1 runner, suite entière _(calculé)_ | ~218 s          | ~218 s        |
| 4 runners shardés _(observé)_       | **163 s**       | **~604 s**    |

**Gain : ~55 s d'horloge, pour ~390 s de temps machine supplémentaire.**

Deux honnêtetés à poser sur ce tableau :

1. La ligne « 1 runner » est **calculée** à partir de parties mesurées
   (128 s de coût fixe + 4 × 23 s de Cypress), pas observée en un seul run. Pour
   l'observer il faudrait un run non shardé, que `workflow_dispatch` permet mais
   qui demande une authentification dont je ne dispose pas ici.
2. **ADR-003 avait annoncé ~11 s de gain, la mesure en donne ~55.** La direction
   était juste — le gain est marginal au regard du temps machine — mais la
   magnitude était fausse, parce que la prédiction utilisait la durée LOCALE de
   la suite (33 s) alors que la CI la met à ~90 s, soit **2,7× plus lent**. La
   leçon n'est pas que l'ADR se trompait sur le fond ; c'est qu'un chiffre local
   ne se transpose pas en CI, et que je l'avais transposé.

### Les retries, et ce qu'ils ne font pas

Le critère du plan disait « `retries: { runMode: 2, openMode: 0 }` et
justification écrite ». La config ne portait que `runMode` — `openMode` valait
zéro par défaut, donc le comportement était juste, mais **une valeur implicite
n'est pas une décision** : le lecteur devait consulter la doc de Cypress pour
savoir ce que fait le dépôt. Les deux sont maintenant écrits, et la
justification vit là où la valeur vit, en tête de `cypress.config.ts` :

- **Pourquoi en CI** — une suite E2E partage sa machine avec quatre shards, un
  serveur applicatif et un backend. Mesuré en semaine 5 : sous charge
  concurrente, la même graine est passée de 33 s à 37 minutes et deux tests ont
  cédé sur un budget de 4 s. Sans retry, ce bruit d'infrastructure deviendrait
  un rouge indiscernable d'une régression.
- **Pourquoi pas en local** — un test qu'on écrit doit échouer tout de suite et
  une seule fois. Un retry pendant le développement transforme un bug
  déterministe en énigme intermittente.
- **Ce que ça ne fait pas** — un retry n'est pas un correctif. La règle #10
  traite tout test ayant nécessité un retry en CI comme flaky. `yarn cy:burn`
  mesure le taux réel en **forçant les retries à zéro** : il mesure le test, pas
  le filet.

### Firefox : une case cochée sans preuve, jusqu'au premier run

« Matrice Chrome + Firefox » était coché dans le plan alors que **le job
Firefox n'avait jamais tourné** : sa condition le réservait à
`workflow_dispatch`, et rien n'avait jamais été dispatché. Une capacité qu'on
n'a pas exercée n'est pas une capacité, c'est une intention.

Déclenché pour de bon : **Firefox 144, 58 tests, 1 min 02, vert**, job total
213 s. La suite passe donc bien sur les deux navigateurs — maintenant c'est
mesuré.

La gate §6 disait « 100 % vert · non bloquant · **job hebdo, issue auto si
rouge** ». Les deux dernières parties n'existaient pas :

| Partie de la gate   | Avant                  | Après                                                               |
| ------------------- | ---------------------- | ------------------------------------------------------------------- |
| 100 % vert          | jamais exécuté         | **vérifié**, 58/58                                                  |
| Non bloquant        | ✔ `continue-on-error` | inchangé                                                            |
| Job hebdo           | absent                 | `cron: "0 6 * * 1"`                                                 |
| Issue auto si rouge | absente                | `gh issue create` sur `failure()`, `issues: write` isolé sur ce job |

Un job non bloquant dont personne ne regarde le résultat ne mesure rien : sans
l'ouverture d'issue, cette ligne du tableau des gates était décorative.

### Le job de publication : vérifier plutôt qu'échouer

`pages` a échoué à chaque run pendant trois itérations, et c'était un défaut de
conception, pas un accident. **Un job qui ne peut pas réussir tant qu'un réglage
manuel n'est pas fait ne doit pas échouer : il doit se déclarer ignoré et dire
quoi faire.** Un rouge permanent, on apprend à l'ignorer — et le jour où il
signale autre chose, personne ne le voit.

Deux pistes ont été vérifiées avant de coder, dont une fausse :

| Piste                                                                    | Verdict                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `actions/configure-pages` sait activer Pages via son option `enablement` | Vrai, mais elle « requires a token other than `GITHUB_TOKEN` » — un PAT `repo`. **Écartée** : ajouter un secret contredirait ADR-003 |
| L'environnement `github-pages` restreint les déploiements à `main`       | **Faux.** Il existe avec `protection_rules: []` — rien ne bloquait la publication depuis une branche de travail                      |

Le job interroge donc `GET /repos/:owner/:repo/pages` avec le `GITHUB_TOKEN` et
conditionne ses quatre étapes au résultat. Pages désactivé : annotation
`::notice::`, job vert en **4 s**, rapport toujours téléchargeable en artefact.
L'annotation est lisible sans authentification :

> **Publication ignoree** — GitHub Pages est desactive sur le depot (HTTP 404).
> Reglage unique, une fois pour toutes : Settings > Pages > Build and
> deployment > Source : GitHub Actions. Le rapport HTML reste telechargeable en
> artefact a chaque run.

`continue-on-error` est descendu du job à la seule étape de déploiement : un
échec réel reste visible dans la liste des étapes sans faire rougir un run dont
les 58 tests sont verts. Publier un rapport ne gouverne pas le signal de test.

Le rapport porte enfin la branche, le commit court et le numéro de run dans son
titre : **une URL unique doit dire ce qu'elle montre**, sinon elle change de sens
en silence à chaque publication depuis une branche différente.

### Ce que la CI a trouvé, et que rien d'autre ne pouvait trouver

Trois défauts, tous invisibles en local, tous du même genre : **supposer présent
ce qui n'a jamais été déclaré.**

| Défaut                                               | Effet                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `check-spec.sh` extrayait son argument avec **`jq`** | Absent de l'image : le hook sortait en 0, il **échouait ouvert**, en silence              |
| Ma sonde de démarrage utilisait **`curl`**           | Absent aussi : la boucle tournait 90 fois sur des valeurs vides sans rien dire            |
| La CI lançait **`yarn dev:test`**                    | Pré-bundling Vite à froid + backend sous `nodemon`+`nyc`+`ts-node` : jamais prêt en 120 s |

Les deux premiers ont la même forme que les défauts de la semaine 5 : un
garde-fou qui se désactive au lieu de bloquer. Le troisième est un choix : la CI
teste désormais l'**artefact construit** (`build:test` 16 s + `start:ci` 11 s),
pas un serveur de développement — ce qui est à la fois plus rapide et plus juste.

Et c'est `yarn check:hook`, ajouté à la clôture de la semaine 5 « parce qu'une
règle vérifiée une fois n'est pas une garantie », qui a attrapé le premier — à
sa toute première exécution en CI.

## Semaine 5 — réseau (2026-09-01)

| Métrique                      | Valeur                                      | Note                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs E2E                     | 19 fichiers (13 → 19)                       | `cypress/e2e/network/` : 6 fichiers                                                                                                                                                                                                                        |
| Tests                         | **58** (40 → 58)                            | 18 tests réseau, sur 6 fichiers                                                                                                                                                                                                                            |
| Suite complète                | vert, **34 s** (2 mesures identiques)       | 58/58. Les 48-50 s relevés plus tôt l'étaient avec des tâches de fond concurrentes — cf. « mesures écartées »                                                                                                                                              |
| `cypress/e2e/network/` seul   | **14 s**, 18/18                             | 3 exécutions consécutives vertes                                                                                                                                                                                                                           |
| `yarn cy:random`              | vert, **10 ordres sur 10**                  | preuve d'isolation (P1) maintenue. Deux mesures écartées : voir ci-dessous                                                                                                                                                                                 |
| `yarn cy:burn` sur `network/` | **10 × 18 = 180 exécutions, 0,00 %**        | retries forcés à zéro ; seuil §6 : 2 %                                                                                                                                                                                                                     |
| Factories d'intercept         | **13 exports, 4 corps** de fonction         | ADR-008 vérifié sur 3 domaines : les exports sont des noms, la logique de chaque famille vit dans `factories.ts` et n'existe qu'en un exemplaire                                                                                                           |
| Alias TypeScript              | +1 (`@fixtures/*`)                          | supprime les derniers imports relatifs vers `cypress/fixtures/` (6 sites, dont 2 en dette depuis la semaine 4)                                                                                                                                             |
| Sélecteurs `data-test`        | 75 → **79**                                 | 4 clés ajoutées : 3 pour l'écran d'erreur, partagées par les 4 surfaces, et l'indicateur de chargement du détail. `check:selectors` et `check:autocompletion` verts                                                                                        |
| Correctifs dans `src/`        | **7 défauts, 12 fichiers**                  | écran d'erreur partagé (`ErrorState` + 4 surfaces `dataMachine`), message d'erreur perdu (`dataMachine`), chargement invisible du détail, double signe et montant nul (`TransactionAmount`). Chacun verrouillé par un test de régression mutation-testé    |
| `expose.apiUrl`               | dérivé de `VITE_BACKEND_PORT`               | il était écrit en dur pendant que l'application lisait `.env`. Sans conséquence tant que les matchers étaient relatifs ; depuis qu'ils sont tous ancrés dessus, un port divergent ferait rater chaque intercept — en silence pour un espion sans `cy.wait` |
| Nouvelles gates               | `yarn check:hook` · `yarn check:references` | le hook n'avait aucune couverture, et rien ne détectait qu'une citation `fichier.ts:ligne` de la doc avait pourri — quatre l'avaient fait, décalées par mes propres correctifs. Les deux scripts sont mutation-testés                                      |

### Ce que le stub réseau a trouvé, que le backend ne pouvait pas produire

C'est le rendement de la semaine : onze comportements que la suite ne pouvait
pas atteindre avant. **Neuf sont corrigés ici** — sept dans l'application, deux
dans l'outillage de test. Les deux restants, un risque et une contrainte de
conception, sont documentés sans être traités, et le plan dit pourquoi.

| Constat                                                              | Preuve                                                                                                                                                                                                                        | Statut                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un **500 se rendait comme une liste vide** — pas de message d'erreur | `dataMachine` entrait bien en `failure`, mais aucun composant ne le lisait : le rendu retombait sur `showEmptyList` (`TransactionList.tsx`)                                                                                   | **corrigé dans l'application** — composant `ErrorState` partagé (message + reprise) ; `showEmptyList` exclut désormais `hasError`                                                                                                 |
| Une **coupure réseau** produisait le même écran qu'un 500            | même état `failure`, même `empty-list-header`                                                                                                                                                                                 | **corrigé** par le même changement — les deux causes affichent maintenant leur propre message (« Request failed with status code 500 » / « Network Error »)                                                                       |
| Le **message d'erreur était toujours vide**                          | `setMessage` lisait `event.message` alors que XState v4 range l'erreur d'un `invoke` dans `event.data`. La machine « capturait » une erreur sans contenu                                                                      | **corrigé dans `dataMachine.ts`** — défaut trouvé en voulant AFFICHER le message, pas en le cherchant                                                                                                                             |
| Le **même défaut sur trois autres surfaces**                         | notifications et comptes bancaires retombaient sur « No Notifications » / « No Bank Accounts » ; le détail d'une transaction ne rendait **rien du tout** — page blanche                                                       | **corrigé** — `ErrorState` câblé sur les quatre surfaces `dataMachine`, 3 tests dédiés                                                                                                                                            |
| Le détail d'une transaction restait **blanc pendant le chargement**  | le conteneur n'affichait « Loading... » que sur `idle`, état quitté dès le `FETCH` ; l'état `loading` n'était rendu nulle part                                                                                                | **corrigé** — une ligne, trouvée en câblant l'écran d'erreur au même endroit                                                                                                                                                      |
| Un **montant négatif** se rendait `--$5.00`                          | `TransactionAmount.tsx` préfixait `-` pour tout paiement et `formatAmount` en produisait un second. `backend/validators.ts:87` ne valide `amount` qu'avec `isNumeric()` : rien n'interdit un négatif côté API                 | **corrigé dans l'application** — signe = SENS, montant en valeur absolue. Verrouillé par test de régression, mutation-testé                                                                                                       |
| Un **montant nul** se rendait `-0`                                   | `{transaction.amount && formatAmount(...)}` rendait le nombre `0`, que React affiche tel quel. La garde ne protégeait rien : `amount` est requis par le modèle                                                                | **corrigé dans l'application** — même correctif d'une ligne, test de régression dédié                                                                                                                                             |
| Un **`FETCH` envoyé pendant `loading` est perdu en silence**         | l'état `loading` de `dataMachine` ne déclare aucune transition sur `FETCH` ; la requête de page 2 ne partait jamais                                                                                                           | contrainte de conception, documentée dans la spec et dans `PLAN.md`                                                                                                                                                               |
| L'application **n'a aucun timeout applicatif**                       | `asyncUtils.ts:4` crée axios sans `timeout` ; axios 1.20.0 vaut `timeout: 0` par défaut (« a timeout is not created »). L'E2E qui le prouvait par le succès a été **retiré** : 9 s pour une propriété statique, refusé par P3 | risque amont, constaté. Un backend lent laisse la liste en `loading` sans fin                                                                                                                                                     |
| `cy.appState` rendait un **objet sous un type `string`**             | `dataMachine.success` a trois sous-états (l'état `success` de `dataMachine`) ; le type L2 affirmait que « toutes les machines ont des états plats »                                                                           | **défaut du code de test, corrigé et verrouillé** — type `EtatDonnees` dérivé de `DataSchema`, contrat mutation-testé dans `typage.contract.ts`                                                                                   |
| `check-spec.sh` bloquait sa **propre documentation**                 | la règle « pas de `any` » grepait le fichier entier : un commentaire citant `task(event: string, arg?: any)` la déclenchait. Préexistant sur `main`                                                                           | **corrigé et outillé** — règle rendue sensible aux commentaires, et `yarn check:hook` rejoue les 8 cas à chaque `yarn lint`. Le script est lui-même mutation-testé : remettre le grep naïf le fait échouer sur les 3 cas de prose |

Les neuf premiers ne sont atteignables que par intercept : le backend réel ne
renvoie ni 500 ni montant négatif, ne se coupe pas, et répond trop vite pour
qu'un timeout se pose.

Les deux derniers ne viennent pas d'un intercept mais du fait d'en écrire un, et
ce sont les plus instructifs — **l'outillage de test a produit deux faux
témoignages** : un type qui affirmait une propriété du domaine qui était fausse,
et un garde-fou qui refusait sa propre documentation. Les deux disaient « tout
va bien » à leur manière. C'est le motif de la semaine 4, une couche plus bas.

### Deux mesures d'isolation écartées, et pourquoi elles sont écrites ici

Deux exécutions de `cy:random` ont échoué pendant la clôture — 2 tests de
`e2e/onboarding/premier-acces.cy.ts` (semaine 4), sur un `POST /login` en 401.
Ni l'une ni l'autre n'est retenue comme mesure, et la raison est vérifiable :

| Fait                                                                   | Mesure                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Les deux échecs ont eu lieu pendant qu'un **autre run Cypress** vivait | 5 processus `cypress` concurrents constatés au moment du second          |
| Durée de la première : **37 min 19 s** pour une suite de 48 s          | **46× le nominal** — le budget de 4 s des assertions n'a plus aucun sens |
| Rejeu de la graine exacte, machine libre (`CY_RANDOM_SEED=1566325581`) | **52/52** — donc ni dépendance d'ordre, ni couplage entre specs          |
| `cy:burn` sur la spec incriminée, isolée                               | **40 exécutions, 0 échec**                                               |
| `cy:random`, machine libre                                             | **6 ordres, 6 verts**, 48 s chacun                                       |

Écrit ici plutôt que supprimé pour deux raisons. La première : un vert obtenu
après avoir jeté un rouge doit dire ce qu'il a jeté, sinon c'est le vert qui
ment. La seconde : la conclusion « c'est un flake » a été formulée AVANT d'être
mesurée, et elle était fausse — le coupable est le banc de mesure, pas la spec.
C'est le même piège que la semaine 4, à l'envers.

**Ce que ça laisse ouvert** : ces tests tiennent un aller-retour `POST /login`
dans le budget de 4 s par défaut. Sous une charge 46× supérieure, ils cèdent.
Le sharding de la semaine 6 mettra plusieurs runs en parallèle sur une même
machine — c'est exactement cette condition. À revérifier là, pas à supposer.

### Deux pièges d'API relevés en écrivant

| Piège                                                       | Ce qui se passe réellement                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cy.intercept(url, { delay })` pour « retarder la réponse » | construit un `StaticResponse` : c'est un **stub vide** servi en retard. Retarder la vraie réponse demande `req.continue((res) => res.setDelay(ms))` |
| Deux alias sur le même endpoint pour séquencer deux pages   | Cypress résout du **dernier** intercept déclaré au premier. L'ordre inverse fait résoudre les deux requêtes sur le même alias                       |

## Semaine 4 — isolation intra-spec : deux approches mesurées, une retenue

P1 parle de « chaque test », or `cy:random` ne mélangeait que les **fichiers**.
Deux façons de mélanger les `it` ont été essayées, et **mesurées** :

| Approche                                             | Mesure                                            | Verdict                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Réordonner `suite.tests` depuis un `before()` racine | spec de 4 tests → **3 exécutés, 1 « Skipped »**   | abandonnée — Mocha tient un pointeur sur le tableau qu'il parcourt. Un mélange qui perd des tests est pire que pas de mélange |
| Isoler chaque `it` par `--env grep=<titre>`          | un motif **inexistant** laisse passer les 4 tests | inutilisable — le filtrage par titre ne filtre pas. `grepTags` filtre, mais au niveau des fichiers                            |

**Retenu, par construction et non par échantillonnage** : `testIsolation` (défaut Cypress) réinitialise l'état navigateur entre deux `it`, et `check-spec.sh` exige désormais un `cy.seed()` **dans le `beforeEach`** — pas n'importe où dans le fichier. Le couplage entre deux `it` voisins est donc empêché à l'écriture, au lieu d'être cherché après coup par tirage.

La règle est bornée à `cypress/e2e/` et `cypress/api/` ; `cypress/manual/` est hors specPattern par conception. Vérifié : une spec e2e avec `cy.seed` hors du `beforeEach` est bloquée, les 15 specs du dépôt passent.

## Semaine 4 — le filtrage par tag ne filtrait rien

Affirmé fonctionnel depuis la semaine 1, sur la foi d'un « 8 specs found » qui
était en réalité la suite entière.

**Cause** : `@cypress/grep` 7.0.0 lit toutes ses options depuis `config.expose`
(côté Node) et `Cypress.expose()` (côté navigateur) — la même migration que
celle d'ADR-001. Or `--env grep=…` écrit dans `config.env`. Le plugin ne
trouvait donc rien, et sortait en vert après avoir tout exécuté.

**Diagnostic** : un motif volontairement inexistant (`grep=ZZZINEXISTANT`)
laissait passer les 4 tests d'une spec. Un filtre qui ne filtre pas est pire
qu'un filtre absent, parce qu'on lui fait confiance.

**Correctif** : un pont `config.env` → `config.expose` dans `setupNodeEvents`,
plus `grepFilterSpecs` activé pour le pré-filtrage des fichiers.

**Vérifié aux deux niveaux :**

| Commande                                    | Résultat                              |
| ------------------------------------------- | ------------------------------------- |
| aucun filtre                                | 13 specs, **40/40**                   |
| `--env grepTags=@auth`                      | **2 specs** (login, session), 5 tests |
| `--env grepTags=@smoke`                     | **1 spec** (login)                    |
| `--env grep=CORRIG` sur une spec de 4 tests | **1 exécuté, 3 en attente**           |
| `--env grepTags=@nexistepas`                | aucune spec retenue                   |

## Dettes soldées avant la semaine 5

| Dette                                                        | État                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Gate de surface de test (ADR-006 + ADR-007, dû en semaine 6) | **livré** — `yarn check:surface`, 17 s                                                               |
| Cypress 15.17.0 → 15.21.1 (Dependabot #8)                    | **mergé** après évaluation : 40/40, `cy:random` 40/40, burn 400 exécutions à 0,00 %, filtrage intact |
| PR amont #1735                                               | **bloquée par le CLA Cypress non signé** — pas par l'équipe. Les 2 commentaires sont automatiques    |

### Le gate, vérifié dans les deux sens

| Contrôle                                         | Nominal              | Sous mutation                                                                   |
| ------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------- |
| `window.__services__` absent du build par défaut | ✔                   | build fait avec `build:test` → **détecté**                                      |
| `/testData` injoignable en `NODE_ENV=production` | ✔ (4 routes en 404) | backend en `NODE_ENV=development` → **4 routes détectées** (200, 400, 400, 200) |

Un `grep` du bundle aurait produit un faux positif permanent : `__services__` **est** présent dans le bundle par défaut, seule la garde est fausse à l'exécution. Le gate vérifie le comportement, pas le texte.
