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

Le même comportement — le rendu d'un montant négatif par `TransactionAmount` —
écrit aux deux niveaux :

| Niveau        | Durée du test | Ce qu'il exige pour tourner                                               |
| ------------- | ------------- | ------------------------------------------------------------------------- |
| **Composant** | **36 ms**     | rien : le composant, des props                                            |
| **E2E**       | **~480 ms**   | base seedée, session, front + API démarrés, intercept qui mute la réponse |

**Treize fois plus lent, et une chaîne de prérequis dont aucun n'est le sujet
du test.** C'est P3 en une ligne.

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
  - Ratio composant / API / E2E publié à chaque clôture dans `metrics.md`.
  - Toute nouvelle spec passe par le skill `new-spec`, dont l'étape 1 impose de
    justifier le niveau **en une ligne de commentaire de tête** — cette
    justification existe déjà dans les 21 fichiers de la suite.

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
