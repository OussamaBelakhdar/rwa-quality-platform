# ADR-007 — Ouvrir des endpoints d'écriture dans le backend pour le seeding des tests

**Statut** : accepté
**Date** : 2026-09-01
**Semaine du plan** : 4

## Contexte

La semaine 4 est la première où ce projet **modifie le code applicatif pour servir les tests**. Trois endpoints ont été ajoutés à `backend/testdata-routes.ts` : `POST /testData/seed/:scenario`, `POST /testData/user`, `POST /testData/transaction`. Une décision non tracée par un ADR n'existe pas (CLAUDE.md) ; celui-ci la trace.

Le besoin vient d'un constat vérifié : **un test ne peut pas écrire dans lowdb.** Le serveur Express tient son instance en mémoire (`backend/database.ts`) ; écrire `data/database.json` depuis une tâche Node diverge de l'état du serveur ou se fait écraser au flush suivant. La couche L1 doit donc passer par le serveur — ce que l'amont faisait déjà pour `POST /testData/seed`.

Le besoin est réel, pas théorique : le domaine `onboarding` était **intestable**. Le dialogue ne s'ouvre que pour un utilisateur sans compte bancaire, et les cinq utilisateurs de la graine en ont tous un.

## Options considérées

| Option                                                                        | Avantages                                                                                                                              | Inconvénients                                                                                                                                   | Coût                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **1 — Écrire dans lowdb depuis une tâche Node**                               | Aucun code applicatif touché                                                                                                           | **Ne fonctionne pas** : divergence d'état avec le serveur. Vérifié sur le fonctionnement de lowdb en mémoire                                    | inacceptable                       |
| **2 — Multiplier les fichiers de graine** (`data/onboarding-seed.json`, etc.) | Aucun endpoint d'écriture                                                                                                              | Un fichier par situation testable ; le contenu n'est lisible qu'en ouvrant le JSON ; combinatoire explosive dès qu'un test veut deux conditions | faible au début, ingérable ensuite |
| **3 — Endpoints granulaires sous `/testData`** _(retenue)_                    | Composable et lisible sur la ligne d'appel : `userBuilder().withoutBankAccount()` dit ce qu'il fait. Le backend reste le seul écrivain | Surface d'écriture arbitraire dans le code applicatif                                                                                           | 3 routes, ~50 lignes               |
| **4 — Serveur de test séparé**                                                | Isolation totale                                                                                                                       | Deux serveurs à maintenir, deux instances lowdb, et le problème de divergence revient entre elles                                               | disproportionné                    |

## Décision

Étendre `/testData` avec trois endpoints granulaires, **et s'appuyer sur la garde qui existait déjà**.

### La garde, et sa vérification

`backend/app.ts:72` ne monte le routeur que si `NODE_ENV` vaut `test` ou `development` :

```ts
if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
  app.use("/testData", testDataRoutes);
}
```

**Vérifié**, et non supposé — sous `NODE_ENV=production` :

| Route                       | Réponse                      |
| --------------------------- | ---------------------------- |
| `POST /testData/seed`       | **404**                      |
| `POST /testData/user`       | **404**                      |
| `GET /testData/users`       | **404**                      |
| `GET /checkAuth` (contrôle) | 401 — le serveur tourne bien |

C'est le pendant serveur de `VITE_TEST_HOOKS` (ADR-006) : deux mécanismes différents, une même garantie, aux deux extrémités de l'application.

### Asymétrie assumée avec ADR-006

Les deux gardes ne sont pas de même nature, et il faut le dire :

|                        | Front (ADR-006)                      | Back (celui-ci)                                            |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Mécanisme              | drapeau de **build** (`--mode test`) | variable d'environnement au **démarrage**                  |
| Rejouable après coup ? | non — il faut reconstruire           | **oui** — `NODE_ENV=development` sur un déploiement suffit |
| Gate automatisé        | **livré** (`yarn check:surface`)     | **livré** (même commande)                                  |

Le back reste structurellement plus faible que le front : une mauvaise configuration d'environnement rouvre la surface, là où le front demanderait un rebuild. **Le gate couvre désormais les deux** — `yarn check:surface` construit sans le drapeau, sert le bundle, vérifie que `window.__services__` est absent, puis démarre l'API en `NODE_ENV=production` et vérifie que les quatre routes `/testData` répondent 404. Vérifié par mutation dans les deux sens. Il constate néanmoins l'état d'un artefact : il rend l'écart visible, il ne le referme pas.

### Ce que les routes garantissent

- Un scénario de graine inconnu est **refusé en 400** avec la liste des scénarios acceptés, plutôt que seedé au hasard.
- Un `username` déjà pris est **refusé en 409**. Sans cette garde, `createUser` créait un homonyme silencieusement et `POST /login` en retournait un au hasard : le test se serait authentifié sous une identité qu'il n'avait pas créée. Vérifié avant correction.

## Conséquences

- Positives : le domaine `onboarding` devient testable ; les données de test sont composables et lisibles ; le backend reste le seul écrivain lowdb, ce qui préserve le contrat de migration du §10 (passer à Postgres ne touche que lui).
- Négative assumée : trois routes d'écriture arbitraire existent dans le code applicatif. Elles sont inertes hors mode test, mais leur inertie dépend d'une variable d'environnement.
- Négative de dette : `POST /testData/user` et `/transaction` n'ont pas de validation d'entrée, là où `GET /:entity` en a une. Un corps mal formé produit un 500 au lieu d'un 400 explicite. À corriger quand une tâche L1 s'y cassera les dents — signalé plutôt que découvert.
- Surveillé via : les 9 tests de contrat de `cypress/api/testdata.cy.ts`, et `yarn check:surface`.

## Réversibilité

Retirer les trois routes : ~50 lignes dans un fichier, plus `db.task.ts` et les commandes L2 qui s'appuient dessus. Les specs qui utilisent `cy.createUser` devraient revenir à des fichiers de graine — c'est-à-dire l'option 2, avec sa combinatoire. Le coût réel de la réversibilité n'est pas la suppression, c'est le retour à une solution moins bonne.
