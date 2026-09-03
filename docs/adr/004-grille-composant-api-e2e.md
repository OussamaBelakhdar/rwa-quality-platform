# ADR-004 — Grille de décision composant / API / E2E, et ce qu'elle reproche à la semaine 5

**Statut** : proposé
**Date** : 2026-09-02
**Semaine du plan** : 8

## Contexte

P3 énonce « le niveau de test le plus bas qui prouve le comportement ». Depuis
la semaine 0, `ARCHITECTURE.md` §7 en donne un **résumé** de sept lignes, en
renvoyant à un ADR-004 qui n'existait pas. Une règle citée par un document
absent n'est pas une règle : c'est une intention.

Le manque n'est pas théorique. **La suite compte 60 tests et zéro test de
composant** — 15 % d'API, 85 % d'E2E, contre une cible affichée de 40/20/40. Le
déséquilibre n'a jamais été arbitré, seulement subi.

## La mesure qui décide

Le même comportement — `TransactionAmount` sur un montant négatif — écrit aux
deux niveaux, mesuré sur les artefacts `mochawesome` de plusieurs exécutions :

| Niveau        | n   | Durées observées | Médiane    | Ce qu'il exige pour tourner                                               |
| ------------- | --- | ---------------- | ---------- | ------------------------------------------------------------------------- |
| **Composant** | 13  | 5 à 26 ms        | **18 ms**  | rien : le composant, des props                                            |
| **E2E**       | 8   | 250 à 334 ms     | **283 ms** | base seedée, session, front + API démarrés, intercept qui mute la réponse |

**Rapport médian : 16×**, et une chaîne de prérequis dont aucun n'est le sujet
du test.

Trois précisions, parce que ce chiffre a d'abord été publié faux :

- **La première rédaction annonçait « 36 ms contre 480 ms », soit 13×.** Les
  deux termes étaient inexacts. 36 ms était la durée du prototype à test unique
  — donc le coût de montage inclus — et 480 ms venait d'une ligne de log lue de
  mémoire, qu'aucune mesure ne confirme. La conclusion tient, et elle est même
  plus forte ; j'y étais arrivé par chance et non par mesure. Corrigé après
  revue `adr-challenger`.
- **La bimodalité du chiffre composant est réelle et n'est pas lissée** : 23 à
  26 ms quand le test est le PREMIER de sa spec (coût du premier montage), 5 à
  6 ms ensuite. La médiane de 18 ms recouvre les deux.
- **Trois exécutions ont été écartées** — 119, 97 et 86 ms, toutes en échec.
  Elles précèdent l'ajout des alias `@support/*` au serveur Vite : elles
  mesurent un harnais cassé, pas un test lent. Les écarter est légitime ; ne
  pas le dire ne l'était pas.

Commande pour rejouer :

```
yarn cy:component --spec src/components/TransactionAmount.cy.tsx
yarn cy:run --spec cypress/e2e/network/reponse-modifiee.cy.ts
```

## Ce que la grille reproche à la semaine 5

`e2e/network/reponse-modifiee.cy.ts` a trouvé deux défauts réels — un montant
négatif rendu `--$5.00`, un montant nul rendu `-0`. Ces deux défauts sont
**props → rendu** : la ligne « composant » de la grille, sans ambiguïté.

La nuance compte, et l'ADR ne la gomme pas : ces tests n'étaient pas hors-sujet.
Leur objet déclaré était la **mutation de réponse à la volée**, une capacité
réseau qui n'existe qu'en E2E, et le montant n'était que l'observable choisi.
Mais le choix de l'observable n'était pas neutre : il a fait découvrir en E2E,
à 480 ms et avec une base seedée, ce qu'un test de composant aurait attrapé en
36 ms sans rien démarrer.

**Correction retenue** : la semaine 8 recouvre ces cas au niveau composant. Les
E2E de la semaine 5 restent, avec leur objet réel — démontrer `mutate…`, pas
valider un formatage.

**Et l'assertion dupliquée, alors ?** Les E2E continuent d'asserter la chaîne
rendue (`have.text "--$5.00"`), la même que le test de composant. La
duplication est réelle : trois assertions. Elle est **assumée**, pour une
raison précise — remplacer l'assertion de rendu par une assertion sur le corps
de la réponse prouverait que l'intercept a muté quelque chose, pas que la
mutation a **atteint l'interface**, ce qui est justement l'objet du test. La
règle si cela devait croître : un E2E de mutation asserte l'identité de la
ligne et UN champ rendu, jamais le format complet — c'est le composant qui
détient le format.

## La grille, appliquée à dix comportements de cette application

| #   | Comportement                                                      | Niveau              | Raison                                                                |
| --- | ----------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------- |
| 1   | Signe et format d'un montant (`TransactionAmount`)                | **Composant**       | props → rendu, aucun réseau                                           |
| 2   | Écran « aucune donnée » (`EmptyList`)                             | **Composant**       | rendu conditionnel sur une prop                                       |
| 3   | Écran d'erreur : message, bouton, absence de liste (`ErrorState`) | **Composant**       | props → rendu ; le bouton se teste par son `onRetry`                  |
| 4   | Validation d'un champ du formulaire de connexion                  | **Composant**       | pas de réseau, pas de navigation                                      |
| 5   | Contrat de `POST /testData/user` (champs manquants, doublon)      | **API**             | le front n'est pas le sujet ; déjà couvert par `api/testdata.cy.ts`   |
| 6   | Contrat de pagination `?page=2` sur `/transactions/public`        | **API**             | la forme de la réponse se prouve sans navigateur                      |
| 7   | Accumulation des pages dans le contexte XState puis dans le DOM   | **E2E**             | l'intégration machine + rendu est précisément le sujet                |
| 8   | Onboarding déclenché par l'absence de compte bancaire             | **E2E**             | condition portée par la donnée, parcours multi-écrans                 |
| 9   | Un 500 rendu comme écran d'erreur plutôt que comme liste vide     | **E2E + intercept** | le backend réel ne produit pas de 500 à la demande                    |
| 10  | Absence de violation a11y sur une page assemblée                  | **E2E + axe**       | une violation naît souvent de la COMPOSITION, pas d'un composant seul |

### Trois classes ajoutées en clôturant la semaine 8

Le tableau ci-dessus reste celui des dix comportements sur lesquels la grille a
été construite. Ces trois lignes ont été ajoutées ensuite, quand les composants
nommés par `docs/PLAN.md` ont été couverts : elles relèvent de classes de
décision que les dix premières ne contenaient pas.

| #   | Comportement                                                                       | Niveau        | Raison                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 11  | Un `data-test` posé par une prop de la bibliothèque UI (`inputProps` de MUI)       | **Composant** | `check:selectors` compare deux textes : il prouve la DÉCLARATION, pas la LIVRAISON au DOM. Seul le rendu distingue les deux |
| 12  | Câblage d'un composant de composition (`TransactionCreateStepOne` → `setReceiver`) | **Composant** | un E2E prouve le parcours de virement entier sans dire si c'est CE composant qui a perdu le clic                            |
| 13  | Validation des champs et état du bouton du formulaire de réglages                  | **Composant** | même classe que la ligne 4, autre formulaire : Formik et Yup, ni réseau ni navigation                                       |

La ligne 11 n'a pas été déduite : elle vient de la montée MUI de Dependabot #11,
qui retire `inputProps` de `TextField`. Six `data-test` du dépôt disparaissaient
du DOM avec un source resté valide et un contrôle statique resté vert.

Deux enseignements de ce tableau, plus utiles que le tableau lui-même :

- **Les lignes 1 à 4 étaient toutes couvertes en E2E, ou pas couvertes du
  tout.** La grille n'a pas seulement classé : elle a désigné du travail.
- **La ligne 10 justifie de garder axe en E2E** et non en composant. Un
  contraste insuffisant ou un ordre de titres incohérent apparaît quand les
  composants sont assemblés ; les tester isolément passerait à côté.

## Options considérées

| Option                                                      | Avantages                                                                        | Inconvénients                                                                                                                                                                      | Coût                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **A. Jugement au cas par cas, sans grille écrite**          | Zéro cérémonie ; l'auteur décide                                                 | C'est l'état des sept dernières semaines, et il a produit **0 % de composant** pour 85 % d'E2E. Le jugement seul dérive vers le niveau le plus familier                            | 0, et une dette invisible       |
| **B. Grille écrite + cible de ratio 40/20/40**              | Un objectif chiffré, facile à suivre                                             | **La cible se retourne contre la grille** : atteindre 40 % obligerait à écrire des tests de composant que la grille ne réclame pas. Un ratio est une conséquence, pas une consigne | risque de tests décoratifs      |
| **C. Grille écrite, ratio PUBLIÉ et non ciblé** _(retenue)_ | La grille décide, le ratio constate. L'écart devient une question, pas une faute | Aucun seuil ne peut être « raté », donc aucune alerte automatique                                                                                                                  | 1 ADR, 1 ligne de metrics       |
| **D. Grille + script qui refuse un E2E « rétrogradable »**  | Contrainte exécutable, dans l'esprit des cinq autres gates                       | **Indécidable** : rien dans un fichier ne dit si un test avait besoin du réseau. Un tel script produirait des faux positifs sur des E2E légitimes                                  | élevé, pour une garantie fausse |

L'option **E** mérite d'être retenue comme dette explicite plutôt qu'écartée :
le jour où une transition de machine devra être prouvée sans son rendu, la
grille aura une ligne de trop peu. Elle n'est pas ouverte en semaine 8 parce
qu'aucune des dix lignes ne l'exige aujourd'hui — les lignes 7 et 9 veulent
toutes deux la conséquence visible.

L'option qu'un lecteur propose spontanément est **B** — c'est celle qu'annonçait
`ARCHITECTURE.md` §7, et elle a l'apparence de la rigueur. Elle perd ici parce
qu'un ratio cible transforme un principe en quota : le jour où la grille dit
« E2E » pour dix comportements d'affilée, atteindre 40 % de composant impose
d'écrire des tests que personne ne réclame.

## Décision

**Option C.** La grille ci-dessus décide, comportement par comportement. Le
ratio est **publié dans `metrics.md` et commenté**, il n'est plus une cible.
`ARCHITECTURE.md` §7 est corrigé en conséquence : il annonçait « ratio cible
~40/20/40 », il annoncera un ratio observé.

Ce que cela change concrètement, dès la semaine 8 : les quatre premières lignes
de la grille deviennent des tests de composant, et deux défauts trouvés en
semaine 5 sont recouverts au niveau où ils auraient dû l'être.

## Conséquences

- Positives :
  - La question « à quel niveau ? » a une réponse écrite et datée, appuyée sur
    une mesure (36 ms contre 480 ms) plutôt que sur une préférence.
  - Le ratio cesse d'être un objectif qu'on pourrait atteindre en écrivant de
    mauvais tests.
  - La grille a immédiatement désigné du travail réel : quatre comportements
    mal placés ou absents.
- Négatives assumées :
  - Sans seuil, rien n'alerte si la suite redevient 100 % E2E. Le garde-fou est
    humain : le ratio est relu à chaque clôture de semaine.
  - La grille vieillira. Elle porte une date, et l'ADR sera rouvert plutôt que
    corrigé en silence.
- Surveillé via :

  - **`yarn check:levels`** — toute spec doit déclarer son niveau en tête, en
    une ligne `// Niveau <COMPOSANT|API|E2E> : <justification>`. C'est
    décidable, contrairement au niveau lui-même, et cela transforme une
    convention en gate.

    Ce point vient de la revue, et il corrigeait une incohérence de doctrine :
    la première rédaction confiait la surveillance à « une relecture humaine à
    chaque clôture », alors que ce dépôt a documenté **trois garde-fous non
    outillés qui se sont désactivés en silence** — `jq` absent, un hook
    bloquant sa propre documentation, un job Firefox jamais déclenché. Choisir
    la relecture humaine ici aurait répété exactement ce que le projet a appris
    à ne pas faire.

    Ce que la gate NE fait pas : décider du niveau à votre place. Elle exige
    que le choix soit écrit, pas qu'il soit juste.

  - Ratio composant / API / E2E publié à chaque clôture dans `metrics.md`,
    **sans cible** — voir la décision ci-dessus.

## Réversibilité

Revenir à l'option B — réintroduire une cible de ratio — ne touche **aucun
code** : c'est une ligne de `ARCHITECTURE.md` §7 et une colonne de
`metrics.md`. Coût : quelques minutes.

Revenir à l'option A — supprimer la grille — coûterait davantage, non en
édition mais en information : les 21 justifications de niveau déjà écrites en
tête des specs deviendraient orphelines.

| Couche | Impact d'un retour en arrière                                         |
| ------ | --------------------------------------------------------------------- |
| L0-L2  | aucun                                                                 |
| L3     | aucun sur le code ; les commentaires de niveau perdent leur référence |
| L4     | aucun                                                                 |
| L5     | `ARCHITECTURE.md` §7, `metrics.md`, l'index des ADR                   |
