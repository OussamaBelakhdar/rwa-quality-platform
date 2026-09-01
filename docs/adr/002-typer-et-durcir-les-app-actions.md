# ADR-002 — Typer et durcir les App Actions héritées de l'amont, sans couche par-dessus

**Statut** : accepté
**Date** : 2026-09-01
**Semaine du plan** : 3
**Révision** : v2 — après revue `adr-challenger`. La v1 affirmait plusieurs crans au-dessus de ce qu'elle démontrait, s'appuyait sur une justification circulaire, et estimait un coût pour un travail déjà réalisé.

## Contexte

**L'argument d'architecture d'abord.** Cette application pilote son état par des machines XState. Une App Action envoie un événement à la machine et l'état change ; un Page Object rejouerait le même changement **par l'interface**, plus lentement et avec plus de points de rupture, pour aboutir au même état. Sur une application à machines exposées, le Page Object n'est pas une abstraction supplémentaire : c'est un détour.

**Le fait historique ensuite, en confirmation** : l'amont n'a jamais eu de Page Objects. `cypress/support/commands.ts` fournissait déjà `getBySel`, `getBySelLike`, `login` (UI), `loginByApi`, `loginByXstate`, `logoutByXstate`, `reactComponent`, `setTransactionAmountRange` — des App Actions et des sélecteurs, dans un fichier unique et sans typage utile. La question n'est donc pas « POM ou App Actions » mais **que faire de ce qui existe**.

Trois faits contraignent la réponse, tous vérifiables dans le dépôt :

1. **L'App Action est le seul chemin qui produise un état cohérent.** `authMachine.ts:43` démarre en `unauthorized` et les lignes 264-281 reprennent l'état depuis `localStorage.authState`, sans jamais interroger `/checkAuth`. Un `cy.request('POST /login')` valide pose donc un cookie que le serveur reconnaît devant une interface déconnectée.
2. **L'interface peut mentir sur l'authentification** — et c'est **prouvé par un test** : `cypress/e2e/auth/session.cy.ts` détruit la session serveur puis vérifie que `validate()` rejoue le setup. Vérifié par mutation : sans `validate()`, le test échoue. Toute assertion d'authentification qui ne traverse pas l'API est un faux positif en puissance.
3. **Le typage manque, pas l'abstraction.** `getBySel(selector: string)` acceptait n'importe quelle chaîne.

## Options considérées

Le coût de l'option retenue est **mesuré**, pas estimé : elle est livrée. Les autres sont ancrées sur un périmètre — 13 conteneurs dans `src/containers/`, 75 sélecteurs typés.

| Option                                                     | Avantages                                                                                                                                                        | Inconvénients                                                                                                                                                                      | Coût                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **1 — Garder `commands.ts` tel quel**                      | 0 travail                                                                                                                                                        | Aucun typage : `getBySel("transacton-list")` compile et échoue après 4 s de retry. Un fichier unique qui grossit                                                                   | 0, dette permanente                                                               |
| **2 — Ajouter des Page Objects par-dessus**                | Point unique de renommage quand un écran change ; vocabulaire métier lisible par un non-Cypress. **C'est le vrai argument adverse, et il n'est pas négligeable** | Rejoue par l'UI un état que l'App Action atteint directement. Ajoute une couche à maintenir **sans supprimer celle du dessous** : la redondance est l'objection, pas la profondeur | ~13 conteneurs × leurs sélecteurs, plus la maintenance à chaque évolution d'écran |
| **3 — Typer, découper, brancher `cy.session`** _(retenue)_ | La faute de frappe devient une erreur de compilation au point d'appel ; une responsabilité par fichier ; les abstractions restent nommées L2                     | Divergence avec l'amont sur l'organisation des fichiers ; empaquette trois décisions orthogonales (typage, découpage, session)                                                     | **Mesuré : 14 fichiers, 513 lignes dont 205 de commentaires**                     |
| **4 — Tout réécrire en ignorant les patterns amont**       | Liberté totale                                                                                                                                                   | Perdrait `loginByXstate`, dont le fait 1 montre qu'il est la seule voie viable                                                                                                     | Supérieur à l'option 3 pour un résultat probablement pire                         |

Le gain de `cy.session` (**12–13 s → 8 s sur 20 tests, en local, Electron, non shardé**) n'apparaît pas dans la colonne « avantages » : il aurait été obtenu sous n'importe quelle option. Il ne départage rien, il est simplement livré dans le même lot.

## Décision

**Conserver les patterns de l'amont, en durcir le contrat, ne rien empiler par-dessus.**

Ce que le projet ajoute : typage fermé des entrées (`DataTestKey`, `DataTestPrefix`, `SeedScenario`, `ServiceName`, `InterceptAlias`, `ServiceXState` — 6 exports dans 3 fichiers), une responsabilité par fichier, `cy.session` avec `validate()`, des factories d'intercept qui rendent leur alias typé, et un registre unique de services XState (ADR-006).

Ce que le projet refuse : aucune couche Page Object, aucun framework maison, aucune abstraction qui masque l'API — compte tenu du fait 2, une assertion d'authentification doit pouvoir traverser le réseau.

### Portée exacte de la garantie de typage

L'affirmation « une faute de frappe est une erreur de compilation » est vraie **au point d'appel**, et il faut dire où elle s'arrête :

| Écriture                                     | Rattrapée par                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `cy.getBySel("transacton-list")`             | **le compilateur** (union fermée)                                                                                 |
| `cy.getBySelLike("prefixe-faux")`            | **le compilateur** (`DataTestPrefix`)                                                                             |
| `cy.get('[data-test="transacton-list"]')`    | **le hook `check-spec.sh`** — ajouté après cette revue, qui avait montré que rien ne l'attrapait                  |
| `cy.get('#id')`, `cy.get('.classe')`         | le hook                                                                                                           |
| `cy.findByRole("buton")`                     | **rien** — rôle et nom accessible sont des chaînes libres. Reste à la revue                                       |
| Un nouveau `data-test` dynamique dans `src/` | **rien dans ce sens** : `check-selectors.js` vérifie que chaque préfixe déclaré existe dans `src/`, pas l'inverse |

Deux trous connus, écrits ici plutôt que découverts.

### Sort des commandes de l'amont

Les quatre commandes citées au Contexte — `loginByApi`, `logoutByXstate`, `reactComponent`, `setTransactionAmountRange` — **n'existent pas dans le code livré** : la suite héritée a été supprimée en semaine 0. « Conserver les patterns » signifie conserver l'approche, pas les fichiers. Elles reviendront typées quand une spec en aura besoin (`logoutByXstate` en semaine 2 si un test de déconnexion arrive, `setTransactionAmountRange` en semaine 5 avec les filtres). Les nommer sans les livrer aurait laissé croire à un patrimoine qui n'existe plus.

### Ce qui devient portable en semaine 10

`DataTestKey` et `check-selectors.js` sont le seul actif de cette décision **indépendant du runner** : un test Playwright a les mêmes sélecteurs à désigner. Ils vivent aujourd'hui dans `cypress/support/selectors/`, c'est-à-dire dans la couche que §10 annonce comme réécrite lors d'une migration. **À trancher en semaine 10** : les monter dans `shared/` avec les builders, ou accepter de les dupliquer. Ce n'est pas tranché ici parce que le coût dépend de ce que le module Playwright consommera réellement.

## Conséquences

- Positives : la faute de frappe est rattrapée au point d'appel par le compilateur, ailleurs par le hook. Le contrat est vérifié par le compilateur (`typage.contract.ts`) et par le service de langage (`check-autocompletion.js`), tous deux chaînés dans `yarn lint`.
- Négatives assumées : l'union doit être maintenue — d'où le garde-fou. Le découpage diverge de l'amont, ce qui rendra une resynchronisation de `cypress/` bruyante ; sans importance, la suite étant réécrite (ADR-001).
- **Exception assumée à la règle de dépendance du §2.** Cette règle veut qu'une couche n'appelle que celle du dessous. `session.cy.ts` fait un `cy.request` direct vers `/logout` — une spec (L3) qui parle à L0. C'est délibéré : invalider une session serveur est précisément ce que le test doit provoquer, et l'encapsuler dans une commande masquerait ce que le test démontre. L'exception est bornée aux assertions et provocations d'état d'authentification, et elle est nommée ici plutôt que laissée en contradiction silencieuse avec §2.
- Négative de lisibilité : un lecteur habitué au POM ne trouvera pas ce qu'il cherche. Le README doit dire pourquoi en une phrase.
- Surveillé via : `check-selectors`, `check-autocompletion`, `typage.contract.ts`, ESLint (`no-explicit-any`, `ban-ts-comment` en `error` sur `cypress/**`), `check-spec.sh` et la revue `test-reviewer`.

## Quand cette décision devrait être réexaminée

- **Un domaine sans machine XState.** L'argument central — « l'App Action atteint l'état directement » — ne s'y applique plus. `user-settings` et `bank-accounts` sont dans ce cas ; ils arrivent en semaines 4 et 8. Si leurs specs deviennent longues et répétitives, le POM redevient un candidat sérieux **pour ces domaines-là**.
- **À l'échelle du §10** (500 specs) : si le coût de renommage d'un écran devient mesurable, le point unique qu'offre un POM cesse d'être théorique.

## Réversibilité

| À défaire                 | Périmètre                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Le typage fermé           | 6 exports dans 3 fichiers (`types.ts`, `selectors/data-test.ts`, `app-actions/xstate.actions.ts`), élargis à `string`                                      |
| Le découpage              | `git mv` vers un `commands.ts` unique — 14 fichiers                                                                                                        |
| `cy.session`              | 1 bloc dans `auth.commands.ts`                                                                                                                             |
| Ajouter un POM par-dessus | Les specs ne dépendent d'**aucune abstraction de page**. Leurs imports L2 sont des factories d'intercept et des app actions, qu'un POM n'invaliderait pas. |

La dernière ligne est ce qui rend la décision peu risquée : refuser le POM aujourd'hui n'interdit pas de l'ajouter demain, alors que retirer un POM dont les specs dépendent coûterait la réécriture de L3.
