# ADR-005 — Coexistence Playwright, bornée par une seule raison : WebKit

**Statut** : proposé
**Date** : 2026-09-05
**Semaine du plan** : 10

## Contexte

La suite Cypress est complète : 27 specs, 71 tests, 0,00 % de flake, 11 gates. La question que pose un employeur — ou un client — n'est donc pas « quel outil est le meilleur », c'est **« combien coûterait d'en changer, et qu'est-ce que ça achèterait ? »**

`docs/ARCHITECTURE.md` §10 avance déjà une réponse : le coût d'une migration serait « L2 réécrit, L3 réécrit ; L1 intégral, L4 quasi intégral, L5 intégral ». Cet ADR existe d'abord pour **vérifier cette affirmation**, écrite en semaine 3, quand il n'y avait pas de suite à migrer.

### Une erreur de lecture, corrigée avant de continuer

La première rédaction de cet ADR « corrigeait » §10 en affirmant que L5 ne survivrait pas. **C'était faux, et pour une raison qu'il faut écrire :** j'avais renuméroté les couches à mon usage — appelant « L4 » les builders et « L5 » les tests de composant. Les couches canoniques de §2 sont autres :

> **L1** données & env (plugin Node, builders, fixtures, config) · **L2** capacités · **L3** specs, _y compris composant_ · **L4** exécution (CI, sharding, reporting) · **L5** gouvernance (gates, métriques, ADR)

Dans ce vocabulaire — le seul qui fasse foi — §10 avait raison sur L5 : la gouvernance survit à un changement d'outil. Les tests de composant, eux, sont dans L3, que §10 marquait déjà « réécrit ». **Je corrigeais une affirmation que personne n'avait faite.**

### Ce que coûterait une migration complète, recompté sur les bonnes couches

| Couche canonique     | Ce qui la compose ici                                                                          | Fichiers | Lignes | Survit ?                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------- | -------: | -----: | ---------------------------------------------------------------------------- |
| **L1** données & env | `cypress/plugins` (172) · `cypress/fixtures/builders` (211) · `cypress.config.ts` (369)        |        6 |    752 | **partiellement** — 211 lignes de TS pur oui, 541 écrites contre Cypress non |
| **L2** capacités     | `commands` (7 f., 393) · `app-actions` (1, 107) · `intercepts` (5, 292) · `selectors` (1, 103) |       14 |    895 | **non**                                                                      |
| **L3** specs         | `e2e` (26, 1 515) · `api` (1, 135) · composant (10, 356)                                       |       37 |  2 006 | **non**                                                                      |
| **L4** exécution     | workflows, sharding, reporting                                                                 |        — |      — | **non**, mais moins cher : Playwright shard nativement                       |
| **L5** gouvernance   | 11 gates, 12 ADR, métriques                                                                    |        — |      — | **oui, intégral** — §10 disait vrai                                          |

**3 442 lignes réécrites sur 3 653, soit 94 %.** Le seul actif portable est les 211 lignes de builders : du TypeScript sans dépendance à l'outil.

**§10 est donc bien optimiste — mais sur L1, pas sur L5.** « L1 intégral » ignore que `cypress.config.ts` (369 lignes) est écrit contre Cypress de bout en bout. La correction porte là.

### Ce que le module livré démontre, et qui n'était pas dans le plan

`playwright/support/socle.ts` **n'importe aucun builder.** Il réimplémente `semer()` et `lire()` contre les mêmes endpoints HTTP. Ce n'était pas une négligence, et le constat mérite d'être retenu :

> Même une suite bien découpée ne partage pas du **code** entre deux outils. Elle partage un **contrat**.

Le contrat, ici, ce sont les endpoints `/testData` d'ADR-007 — qui vivent dans le backend, donc du côté du système sous test, donc hors des couches de la suite. Les 211 lignes de builders _pourraient_ être partagées, mais elles habitent `cypress/fixtures/` et sont résolues par un alias de `cypress/tsconfig.json` : les réutiliser demanderait soit de les déménager, soit de dupliquer l'alias. **Aucune des deux n'a été faite, et le module ne réutilise donc zéro ligne.**

L'argument économique de la coexistence n'est pas « on réutilise 211 lignes ». C'est : **le seul actif qui traverse un changement d'outil est une frontière HTTP décidée trois semaines plus tôt.**

### Ce qu'une migration achèterait

| Critère               | Cypress 15.21.1 (ici)                                                  | Playwright 1.63                                                  |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **WebKit**            | `experimentalWebKitSupport` — expérimental, absent de la CI            | **moteur de première classe**                                    |
| **Parallélisation**   | exige `cypress-split` (ADR-003) — un paquet tiers pour éviter le Cloud | `--shard=i/n` **natif**                                          |
| **Component testing** | mature, 27 tests ici                                                   | `mount()` **intégré** (`playwright/types/test.d.ts:8088`, v1.63) |
| **Diagnostic**        | time-travel dans le runner, `cy:burn` maison                           | trace viewer, `--repeat-each` natif                              |
| **Équipe**            | une personne, 11 gates écrites autour de Cypress                       | tout serait à réoutiller                                         |

Deux constats désagréables pour Cypress, qu'il faut écrire : **ADR-003 n'existe que parce que Cypress rend la parallélisation sans Cloud difficile.** Et le component testing de Playwright vient de perdre son étiquette expérimentale — le paquet `@playwright/experimental-ct-react` s'arrête à 1.62.1 quand le cœur passe à 1.63.0, ce que `npm view` confirme et que la présence de `fixtures.mount()` dans les types installés vérifie localement.

## Options considérées

| Option                                            | Avantages                                         | Inconvénients                                                                                                                  | Coût                  |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| **A — Garder Cypress seul**                       | Zéro travail. 11 gates, 0,00 % de flake           | **Aucune couverture WebKit.** Sur une application bancaire grand public, ignorer Safari est indéfendable                       | 0                     |
| **B — Migrer intégralement**                      | Un seul outil, WebKit natif, sharding natif       | **3 442 lignes réécrites** pour une suite qui ne défaille pas. Jeter 11 gates prouvées pour regagner la même chose ailleurs    | ~3 semaines           |
| **C — Coexistence bornée par WebKit** _(retenue)_ | Comble le seul manque réel, pour 7 tests et 6,9 s | Deux chaînes d'outils, deux CI, une frontière à tenir. Coût **permanent**                                                      | 5 scénarios, ~1 jour  |
| **D — Coexistence sans critère**                  | —                                                 | **C'est l'option C sans raison de s'arrêter.** La duplication s'étend spec par spec jusqu'à payer deux fois la même couverture | croissant, sans borne |

L'option qu'un recruteur proposerait spontanément est **B** — « Playwright a gagné, migre ». Elle perd ici pour une raison qui n'est pas une préférence : **la suite Cypress ne défaille pas.** Réécrire 3 442 lignes pour obtenir la même couverture plus WebKit, quand 5 scénarios suffisent à obtenir WebKit, c'est payer trois semaines une capacité qui en coûte une.

**Sur deux ans**, le calcul se resserre et il faut le dire : deux montées de version par an, deux CI à maintenir, une frontière à faire respecter en revue — soit de l'ordre de 3 à 5 jours par an. La coexistence redevient plus chère que la migration vers **2029**. C'est loin, mais ce n'est pas jamais, et le critère de réévaluation ci-dessous en tient compte.

## Décision

**Option C.** Playwright entre pour **une raison unique et écrite : couvrir WebKit sur les cinq parcours critiques.**

1. `playwright/` est un **module séparé** — son `package.json`, sa configuration, ses `node_modules`. Il n'importe aucun fichier de `cypress/`, et réciproquement.
2. Il partage un **contrat**, pas du code : les endpoints `/testData` (ADR-007). C'est la seule chose qui traverse la frontière, et `socle.ts` le dit dans son en-tête.
3. Il couvre **exactement cinq parcours** : connexion, création de transaction, notifications, paramètres, onboarding.
4. Il tourne **sur WebKit seulement**. L'y faire tourner sur Chromium dupliquerait Cypress sans rien ajouter.
5. **Frontière outillée, pas seulement écrite** : `scripts/check-playwright.js` exige de chaque spec une ligne justifiant pourquoi WebKit change son résultat, et refuse les anti-patrons que `check-spec.sh` bloque côté Cypress. Sans cette gate, la règle 5 aurait été une intention — ce qu'ADR-012 vient de démontrer inutile six fois.

## Ce qui ferait changer cette décision

- **`experimentalWebKitSupport` sort d'expérimental chez Cypress** → l'option C perd sa raison d'être ; retour à A, `playwright/` supprimé.
- **Un deuxième besoin apparaît que Cypress ne couvre pas** (multi-onglets, multi-utilisateurs simultanés) → la frontière s'élargit par un ADR, jamais par glissement.
- **La suite Cypress se met à défaillir** — flake durable au-dessus de 2 %, ou blocage sur une montée de version → B redevient la bonne réponse.
- **Le coût cumulé de la coexistence dépasse celui d'une migration** — estimé à 2029 ci-dessus. À rouvrir si le rythme des montées de version double.

## Conséquences

- **Positives** : WebKit couvert, 7 tests en 6,9 s. Le coût d'une migration est **mesuré et publié**, pas estimé. La compétence sur les deux outils est démontrée par du code.
- **Négatives assumées** :
  - Deux chaînes d'outils, deux montées de version. Coût **permanent**.
  - **P6 est entamé.** « Reproductible en 3 commandes » devient quatre : `yarn`, `yarn dev:test`, `yarn cy:run`, puis `cd playwright && yarn && yarn install:browsers && yarn test`. C'est une exception réelle à un principe fondateur, et elle est le prix de la borne 1 — un module séparé ne peut pas partager le `node_modules` du dépôt.
  - La logique de connexion existe en deux exemplaires. `auth.setup.ts` et `cy.login` répondent au même besoin par des mécaniques entièrement différentes : c'est la démonstration exécutable des 895 lignes de L2 que la migration coûterait.
  - `cy.getBySel` est typé par l'union `DataTestKey` ; `getByTestId` ne l'est pas. Une faute de frappe redevient un échec à l'exécution au lieu d'une erreur de compilation.
- **Surveillé via** : `scripts/check-playwright.js` (chaîné dans `yarn lint`, sous contrat d'ADR-012) et le job CI `playwright`, non bloquant.

## Réversibilité

Supprimer `playwright/`, sa gate et son job CI. **Aucune couche L0-L5 de la suite Cypress n'est touchée** — conséquence directe de la borne 1 : le module n'importe rien. Coût du retour arrière : trois suppressions.

C'est la migration inverse qui coûterait 3 442 lignes, et c'est précisément pourquoi elle n'a pas été faite.
