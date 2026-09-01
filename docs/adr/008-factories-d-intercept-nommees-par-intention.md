# ADR-008 — Nommer les factories d'intercept par intention plutôt que paramétrer une factory unique

**Statut** : proposé
**Date** : 2026-09-01
**Semaine du plan** : 5

## Contexte

`docs/ARCHITECTURE.md` §3 annonçait depuis la semaine 0 une interface unique et
paramétrée : `interceptTransactions({ status: 500 })`. La semaine 5 est la
première à l'exercer pour de bon — cinq specs, dix tests, six cas réseau.

En l'écrivant, la forme paramétrée s'est révélée fausse pour une raison qui n'a
rien de cosmétique : **elle cache la seule distinction qui compte en test
réseau**, celle entre observer et remplacer.

Les six cas de la semaine se rangent dans trois familles, qui n'ont ni les
mêmes garanties ni les mêmes risques :

| Famille                                   | Le backend est-il joint ?            | Ce que le test prouve                                         | Ce que le test cesse de couvrir           |
| ----------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| **Espion** (`intercept…`)                 | oui                                  | le contrat réel entre l'application et son API                | rien                                      |
| **Espion modifiant** (`delay…`/`mutate…`) | oui — la réponse est ensuite altérée | le rendu d'une vraie réponse à un détail près                 | rien, hors le détail modifié              |
| **Stub** (`stub…`)                        | **non**                              | un cas hors du domaine du backend (500, coupure, corps forgé) | **le contrat** : le stub peut avoir menti |

Un stub qui diverge du contrat réel produit un test vert sur une application
cassée. C'est le risque propre à cette famille, et à elle seule. Le site
d'appel doit donc dire à quelle famille il appartient — sans quoi la revue ne
peut pas le voir, et aucun outil ne peut l'énumérer.

Le point de départ n'est pas neutre : l'amont ne publie **aucune** factory
d'intercept. Ses specs contiennent **36 `cy.intercept` inline répartis sur 11
fichiers** (`git grep -c cy.intercept upstream/develop -- 'cypress/tests/**'`),
et `support/commands.ts` en aligne quatre de plus au fil des commandes de
login. C'est l'option C ci-dessous, et c'est ce que la règle #8 refuse.

## Options considérées

| Option                                                       | Avantages                                                                                                                                          | Inconvénients                                                                                                                                                                                          | Coût                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **A. Factory unique, options plates**                        | Une seule fonction à connaître                                                                                                                     | La famille disparaît du site d'appel : `{ status: 500 }` coupe le backend, `{ delay: 500 }` non, et les deux se lisent pareil. Combinaisons illégales représentables (`{ status, forceNetworkError }`) | 1 fonction, ~8 clés optionnelles                          |
| **A-bis. Factory unique, union discriminée** (`{ kind: … }`) | La famille redevient visible et le compilateur interdit les combinaisons illégales — l'objection contre A tombe                                    | Le discriminant est **un argument**, pas un nom : aucun outil ne l'énumère sans analyser les appels. Et il faut nommer chaque `kind` de toute façon : on paie le nommage sans gagner la lisibilité     | 1 export, 1 union à 4 branches                            |
| **B. Un export nommé par famille × endpoint** _(retenue)_    | Le préfixe dit la famille en un mot. `grep -rn "stub" cypress/e2e/` **énumère** les tests qui ont cessé d'exercer le contrat. Signatures minimales | 8 exports pour un seul endpoint, et le nombre croît avec les domaines                                                                                                                                  | 8 exports, ~120 lignes commentées, 1 fichier              |
| **D. Un export générique par famille, endpoint en argument** | 4 exports pour tout le projet, quel que soit le nombre de domaines                                                                                 | L'URL remonte dans la spec : `delay("/transactions/public*", 1500)`. C'est exactement ce que `intercepts/` existe pour empêcher — L3 se remet à connaître les matchers                                 | 4 exports, mais 1 matcher écrit en dur par site d'appel   |
| **C. `cy.intercept` inline dans chaque spec** (l'amont)      | Zéro couche, zéro indirection                                                                                                                      | Interdit par la règle #8 ; l'alias se réécrit à chaque appel et une faute de frappe ne se voit qu'après 5 s de `cy.wait`                                                                               | 0 au départ ; 36 occurrences sur 11 fichiers chez l'amont |

**Pourquoi A-bis perd, alors qu'elle réfute l'objection principale contre A.**
C'est l'alternative sérieuse, et il faut lui répondre autre chose qu'un
argument de goût. Deux raisons, dont une seule est décisive :

1. _Non décisive_ : le site d'appel passe de un à trois tokens à lire
   (`stubPublicTransactionsEnErreur()` contre
   `interceptTransactions({ kind: "stub", statusCode: 500 })`). C'est une
   préférence, pas un argument.
2. _Décisive_ : **la famille cesse d'être auditable par grep.** Avec B, la
   question « quels tests ne vérifient plus le contrat réel ? » se répond en
   une commande, sans parser du TypeScript. Avec A-bis, le discriminant est un
   argument au milieu d'un appel : il faut lire chaque site, ou écrire un
   analyseur. Ce projet outille ses garanties (`check-spec.sh`,
   `check:selectors`, `check:surface`) plutôt que de les confier à la
   discipline — la forme qui reste vérifiable en une ligne gagne.

**Pourquoi D est adoptée à l'intérieur, et refusée à la frontière.**
D a raison sur le fond : `delayPublicTransactions` et
`stubPublicTransactionsEnErreur` sont identiques à l'URL près, et dupliquer
huit corps de fonction par domaine serait absurde. Le corps de chaque famille
est donc écrit **une seule fois** — `espionner`, `retarder`, `muter`,
`simuler`, non exportés — et les exports par endpoint ne sont plus que des
noms d'une ligne. Ce que D propose en plus, c'est d'exporter ces génériques
tels quels ; c'est là qu'elle est refusée, parce que l'URL remonterait dans
les specs.

**Croissance, chiffrée.** Quatre domaines réseau sont prévus d'ici la fin du
plan (transactions, notifications, bank-accounts, user-settings). Aucun ne
demandera les huit variantes : le décompte réaliste est de 3 à 5 exports par
domaine, soit **15 à 25 noms** au total. Ce sont des lignes de nommage, pas de
logique : les quatre génériques restent quatre. Si un domaine dépasse une
dizaine d'exports, c'est le signal que ses cas réseau sont mal découpés — et
l'ADR est à rouvrir.

## Décision

**Option B à la frontière, option D à l'intérieur.**
`cypress/support/intercepts/*.ts` publie des factories nommées par intention,
groupées par famille, dont le corps délègue à un générique privé :

```
intercept…            espion            le backend répond, rien n'est modifié
delay… / mutate…      espion modifiant  le backend répond, la réponse est altérée
stub…                 stub              le backend n'est pas joint
```

Le contrat commun est conservé : **toute factory retourne son alias**, typé
`` `@${string}` ``, pour que `cy.wait(alias)` ne réécrive jamais une chaîne.

Un point de mise en œuvre mérite d'être écrit ici, parce qu'il fonde la
distinction entre deux familles et non un détail d'API : **retarder une vraie
réponse ne se fait pas avec `{ delay }`.** `cy.intercept(url, { delay })`
construit un `StaticResponse` — un stub vide servi en retard, pas la réponse
du serveur. Retarder la vraie réponse demande
`req.continue((res) => res.setDelay(ms))`. Deux formes voisines, deux familles
différentes : argument de plus contre A.

(La priorité de résolution des intercepts, qui gouverne le séquençage de deux
pages, n'est pas une conséquence de cette décision : elle est documentée là où
elle s'applique, dans `interceptPublicTransactionsPage`.)

## Conséquences

- Positives :
  - La revue lit la famille sur la ligne d'appel, sans ouvrir la factory.
  - `grep -rn "stub" cypress/e2e/` énumère les tests qui n'exercent plus le
    contrat réel — audit en une commande, sans outil à écrire.
  - Aucune combinaison illégale n'est représentable : `stubPublicTransactionsInjoignable()`
    ne prend pas de corps, `delayPublicTransactions(ms)` ne prend pas de statut.
  - La logique de chaque famille n'existe qu'en un exemplaire.
- Négatives assumées :
  - 15 à 25 exports en fin de plan. C'est le prix payé pour l'auditabilité.
  - Chaque nouveau cas réseau demande un nom, donc une décision — et c'est le
    moment où l'on se demande si le cas mérite un test.
  - `docs/ARCHITECTURE.md` §3 et le tableau L2 annonçaient A : ils sont corrigés
    par cet ADR, qui documente l'écart plutôt que de le faire disparaître.
- Surveillé via :
  - Règle #8 (`.claude/rules/testing.md`) : pas de `cy.intercept` inline de plus
    de 3 lignes dans une spec — contrôlé en revue par `test-reviewer`.
  - **Heuristique de revue humaine, pas de garde automatisée** : `grep -c "^export const" cypress/support/intercepts/<domaine>.intercepts.ts`.
    Au-delà d'une dizaine sur un même domaine, rouvrir l'ADR. Le seuil n'est pas
    câblé dans un hook — l'écrire comme une gate donnerait une fausse garantie.

## Réversibilité

Revenir à A-bis touche **L2 et L3 seulement** :

| Couche | Impact                                                                            |
| ------ | --------------------------------------------------------------------------------- |
| L0/L1  | aucun — les builders et le backend ne connaissent pas les intercepts              |
| L2     | 1 fichier ; les 4 génériques deviennent les 4 branches de l'union, 8 noms tombent |
| L3     | 5 specs, 10 sites d'appel à réécrire                                              |
| L4/L5  | aucun                                                                             |

Coût **estimé, non mesuré** : de l'ordre de l'heure, mécanique, sans changement
de comportement des tests — les génériques existant déjà, la conversion est une
réécriture de signatures. C'est cette faiblesse d'engagement qui justifie de
trancher maintenant plutôt que d'attendre d'avoir plus de cas.
