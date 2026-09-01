# ADR-002 — Typer et durcir les App Actions héritées de l'amont, sans ajouter de couche par-dessus

**Statut** : accepté
**Date** : 2026-09-01
**Semaine du plan** : 3

## Contexte

Le plan annonçait un ADR « Page Objects vs App Actions ». La question ne se pose pas dans ces termes : **l'amont n'a jamais eu de Page Objects.** `cypress/support/commands.ts` fournit déjà `getBySel`, `getBySelLike`, `login` (UI), `loginByApi`, `loginByXstate`, `logoutByXstate`, `reactComponent`, `setTransactionAmountRange` — soit des App Actions et des sélecteurs, dans un fichier unique et sans typage utile.

La vraie décision est donc : **que faire de ce qui existe ?**

Trois faits établis en semaines 1 et 2 la contraignent :

1. **L'App Action n'est pas une commodité ici, c'est le seul chemin.** Un `cy.request('POST /login')` valide pose un cookie que le serveur reconnaît devant une interface déconnectée : `authMachine` démarre en `unauthorized` (`authMachine.ts:43`) et reprend son état depuis `localStorage`, sans jamais interroger `/checkAuth`. Les quatre premiers tests de la semaine 1 l'ont démontré en échouant.
2. **L'interface peut mentir sur l'authentification.** `cy.session` restaurant `localStorage`, l'application paraît connectée alors que la session serveur est morte. Toute assertion d'authentification qui ne traverse pas l'API est un faux positif en puissance. Une couche qui masquerait l'API derrière des abstractions de page aggraverait ce risque.
3. **Le typage est ce qui manque, pas l'abstraction.** `getBySel(selector: string)` accepte n'importe quelle chaîne : une faute de frappe devient un échec au bout de 4 secondes de retry, sur toutes les machines, pour toujours.

## Options considérées

| Option                                                     | Avantages                                                                                                                                                                          | Inconvénients                                                                                                                                                                           | Coût                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **1 — Garder `commands.ts` tel quel**                      | 0 travail ; conforme à l'amont                                                                                                                                                     | Aucun typage : `getBySel("transacton-list")` compile. Un fichier unique qui grossit — signal n°1 d'une suite non maintenue (§3)                                                         | 0, dette permanente                    |
| **2 — Ajouter des Page Objects par-dessus**                | Familier ; ce qu'un recruteur attend                                                                                                                                               | Redondant : les App Actions atteignent l'état directement, un POM le rejouerait par l'UI. Ajoute une couche à maintenir entre L2 et L3 sans supprimer celle du dessous. Et §11 l'exclut | ~1 semaine + maintenance               |
| **3 — Typer, découper, brancher `cy.session`** _(retenue)_ | La faute de frappe devient une erreur de compilation ; une responsabilité par fichier ; le gain de session est mesuré (−35 %) ; les abstractions s'arrêtent à L2 comme §11 l'exige | Divergence avec l'amont sur l'organisation des fichiers                                                                                                                                 | ~2 j                                   |
| **4 — Tout réécrire en ignorant les patterns amont**       | Liberté totale                                                                                                                                                                     | Perdrait `loginByXstate`, dont la semaine 1 a montré qu'il était la seule voie viable. Réinventer pour se distinguer est un coût sans contrepartie                                      | ~1 semaine, résultat probablement pire |

## Décision

**Conserver les patterns de l'amont, en durcir le contrat, ne rien empiler par-dessus.**

Ce que le projet ajoute :

- **Typage fermé des entrées.** `getBySel(key: DataTestKey)` — union littérale des 75 clés relevées dans `src/`, tenue à jour par `yarn check:selectors`, qui compare les deux sens et est chaîné dans `yarn lint`. Idem `DataTestPrefix` pour `getBySelLike`, `SeedScenario` pour `cy.seed`, `ServiceName` pour `cy.appState`.
- **Une responsabilité par fichier.** `commands/{dom,data,auth,app-state}.commands.ts`, `app-actions/`, `intercepts/`, `selectors/`, `types.ts`.
- **`cy.session` avec `validate()`.** Mesuré : 12–13 s → 8 s à périmètre égal.
- **Des factories d'intercept qui rendent leur alias**, typé `` `@${string}` `` : une factory qui oublie le `@` ne compile pas.
- **Un registre unique de services XState** (ADR-006) au lieu des six expositions dispersées.

Ce que le projet refuse d'ajouter :

- **Aucune couche Page Object.** Les abstractions s'arrêtent à L2 (§11).
- **Aucun framework maison.** Les commandes restent des commandes Cypress.
- **Aucune abstraction qui masque l'API.** Compte tenu du fait n°2, une assertion d'authentification doit pouvoir traverser le réseau ; l'encapsuler serait dangereux.

## Conséquences

- Positives : une faute de frappe de sélecteur est une erreur de compilation, pas un échec à 4 s. Le contrat est vérifié par le compilateur (`cypress/support/typage.contract.ts` : chaque `@ts-expect-error` échoue si l'erreur attendue disparaît). Les fichiers restent lisibles.
- Négatives assumées : l'union des clés doit être maintenue — d'où le garde-fou. Et le découpage diverge de l'amont, ce qui rendra une resynchronisation de `cypress/` bruyante ; sans importance, la suite étant réécrite (ADR-001).
- Négative de lisibilité : un lecteur habitué au POM ne trouvera pas ce qu'il cherche. Le README doit dire pourquoi en une phrase, pas laisser deviner.
- Surveillé via : `yarn check:selectors`, le contrat de typage, ESLint (`no-explicit-any` et `ban-ts-comment` en `error` sur `cypress/**`) et la revue `test-reviewer`.

## Réversibilité

| À défaire                 | Périmètre                                                                        |
| ------------------------- | -------------------------------------------------------------------------------- |
| Le typage fermé           | 4 types dans `support/types.ts` et `selectors/`, élargis à `string`              |
| Le découpage              | `git mv` vers un `commands.ts` unique                                            |
| `cy.session`              | 1 bloc dans `auth.commands.ts`                                                   |
| Ajouter un POM par-dessus | possible à tout moment **sans toucher les specs** : elles n'appellent que `cy.*` |

Le dernier point est ce qui rend la décision peu risquée : refuser le POM aujourd'hui n'interdit pas de l'ajouter demain, alors que l'inverse — retirer une couche dont 200 specs dépendent — coûterait la réécriture de L3.
