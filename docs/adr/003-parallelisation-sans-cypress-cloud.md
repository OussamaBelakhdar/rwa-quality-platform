# ADR-003 — Paralléliser par `cypress-split`, sans Cypress Cloud, et retirer les workflows hérités qui échouent

**Statut** : accepté
**Date** : 2026-09-02
**Semaine du plan** : 6

> Passé à « accepté » après revue `adr-challenger`, qui a relevé sept points. Le principal : le coût fixe d'un runner était **estimé** à « plus de 8 s » alors que c'était `33 / 4` — de l'arithmétique déguisée en observation. Il est désormais **mesuré** sur les runs échoués de l'amont (job `install`, médiane 127 s), ce qui retourne la conclusion : quatre shards gagnent ~11 s d'horloge pour ~380 s de temps machine, et le seuil de rentabilité est à ~210 tests. Sont aussi issus de la revue : le choix de 4 justifié, le seuil de 2× rendu opérationnel (et déjà déclenché), la source des données de pondération, l'argument protocolaire non vérifié assumé comme tel, l'effet de bord de resynchronisation amont, et l'option « paralléliser par type de job » ajoutée à la grille — adoptée en plus de la découpe, puisque c'est le seul parallélisme qui rapporte aujourd'hui.

## Contexte

P6 exige qu'un inconnu reproduise la suite en trois commandes, **sans compte
Cloud, sans secret**. La semaine 6 doit pourtant paralléliser : c'est la ligne
« CI/CD & parallélisation (Expert) » du référentiel.

Le point de départ n'est pas neutre, et c'est le fait central de cet ADR.
L'amont livre `.github/workflows/main.yml`, qui se déclenche sur **chaque
push** (`branches-ignore: renovate/**`) et enregistre vers Cypress Cloud
(`record: true`, `CYPRESS_RECORD_KEY`). Ce dépôt n'a pas ce secret.

Relevé le 2026-09-02 sur les 100 derniers runs de l'API Actions du dépôt :

| Workflow hérité                | Succès | Échecs | Déclencheur          |
| ------------------------------ | ------ | ------ | -------------------- |
| `main.yml` (« Cypress Tests ») | **0**  | **60** | chaque push          |
| `add_issue_to_triage_board`    | **0**  | **10** | ouverture d'issue/PR |
| `triage_new_comment_workflow`  | **0**  | **8**  | commentaire d'issue  |

**78 exécutions rouges avant qu'une seule ligne de CI n'ait été écrite ici.**
Les deux derniers appellent des workflows réutilisables de `cypress-io/cypress`
avec `secrets: inherit` : ils ne peuvent pas aboutir dans un fork. Le premier
échoue faute de clé Cloud — c'est-à-dire précisément pour la raison que P6
anticipait.

Ne rien faire n'est donc pas une option neutre : c'est publier un dépôt
portfolio dont l'onglet Actions est rouge en permanence, pour des raisons qui
ne parlent pas de la qualité du travail.

## Options considérées

| Option                                  | Avantages                                                                                                       | Inconvénients                                                                                                                                                                               | Coût                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **A. Cypress Cloud** (choix de l'amont) | Équilibrage automatique par durée observée, Test Replay, historique de flake                                    | **Viole P6** : un compte et un secret deviennent nécessaires pour reproduire. Le free tier plafonne en résultats/mois, donc la CI casse par palier                                          | 0 € jusqu'au plafond, puis abonnement            |
| **B. Currents**                         | Compatible protocole Cypress récent, équilibrage, remplace Cloud sans changer le code                           | Même violation de P6 : service tiers, compte, clé. Déplace la dépendance, ne la supprime pas                                                                                                | payant dès l'usage sérieux                       |
| **C. sorry-cypress auto-hébergé**       | Pas de service tiers si l'on héberge soi-même                                                                   | **Dernier push le 2025-09-14**, soit ~12 mois d'inactivité pendant que Cypress publiait toute la branche 15.x. Et héberger un service pour un dépôt portfolio contredit « trois commandes » | infrastructure à tenir                           |
| **D. `cypress-split`** _(retenue)_      | Aucun service, aucun compte, aucune clé. Découpe par nombre de specs ou par durées mesurées. MIT, 8 dépendances | Découpe **statique** : pas de rééquilibrage à chaud si un shard traîne. Un seul mainteneur                                                                                                  | 1 dépendance de dev (1.25.0, publiée 2026-06-15) |
| **E. Aucune parallélisation**           | Zéro complexité                                                                                                 | La ligne « parallélisation » du référentiel n'est pas couverte, et le sujet est justement celui qu'un entretien creuse                                                                      | 0                                                |

`docs/PLAN.md` annonçait un argument supplémentaire contre C — une
incompatibilité de protocole depuis Cypress 12.6.0. **Il n'est pas repris ici :
je ne l'ai pas vérifié.** Un argument non vérifié affaiblit ceux qui le sont, et
les deux ci-dessus suffisent. L'écart avec le plan est écrit plutôt que masqué.

**Option manquante à la grille initiale, ajoutée après revue : paralléliser par
TYPE de job.** `yarn types`, `yarn lint`, `yarn test:unit` et `yarn cy:run` sont
des commandes indépendantes. Les faire tourner comme des jobs distincts donne un
gain **réel et immédiat**, sans `cypress-split` et sans payer quatre fois le
coût fixe. Elle n'est pas concurrente de D : elle est **adoptée en plus**, et
c'est même le seul parallélisme qui rapporte aujourd'hui (voir le point 3 de la
décision). Ne pas l'avoir mise au tableau était une omission.

L'option qu'un lecteur propose spontanément est **A** : c'est celle de l'amont,
elle est excellente, et c'est la raison pour laquelle il faut dire précisément
pourquoi elle perd **ici**. Elle ne perd pas techniquement — elle perd sur une
contrainte que ce projet s'est donnée en semaine 0 et qui vaut plus que le
confort : la suite doit tourner chez quelqu'un qui n'a rien signé.

## Décision

**Option D.** Un workflow `.github/workflows/e2e.yml`, matrice de 4 runners,
image `cypress/browsers`, découpe par `cypress-split`. Aucun `record`, aucune
clé, aucun service tiers.

Trois précisions que cet ADR doit énoncer explicitement, parce qu'elles seront
lues comme des omissions sinon :

1. **J'ajoute GitHub Actions, je ne migre pas CircleCI.** `.circleci/config.yml`
   de l'amont reste en place et n'est pas touché. Migrer un pipeline qui ne
   tourne pas dans ce fork serait du travail invisible et invérifiable.

2. **Je retire les workflows hérités qui s'exécutent et échouent**, et je garde
   ceux qui sont inertes. La règle tient en une phrase : _on supprime ce qui
   tourne et ment, on garde ce qui ne tourne pas._

   | Fichier                             | Sort      | Raison                                                                                                                    |
   | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
   | `main.yml`                          | supprimé  | tourne à chaque push, 60 échecs, dépend d'un secret Cloud absent                                                          |
   | `add_issue_to_triage_board.yml`     | supprimé  | tourne à l'ouverture de PR, 10 échecs, cible le board de `cypress-io`                                                     |
   | `triage_new_comment_workflow.yml`   | supprimé  | tourne au commentaire, 8 échecs, même cause                                                                               |
   | `merge-develop-into-flake-demo.yml` | **gardé** | `on: push` vers `develop` — branche qui n'existe pas ici. Inerte, et il documente d'où vient le flake étudié en semaine 7 |
   | `.circleci/config.yml`              | **gardé** | aucun projet CircleCI n'est connecté : inerte                                                                             |

   L'histoire Git conserve les fichiers supprimés ; ce qui disparaît, c'est le
   bruit rouge, pas la référence.

3. **Le gain de temps n'est pas l'argument — et cette fois il est mesuré.**

   La première rédaction de cet ADR estimait le coût fixe d'un runner à « plus
   de 8 s ». C'était `33 / 4`, de l'arithmétique déguisée en observation. Les
   60 runs échoués de `main.yml` contiennent la vraie donnée : leur job
   `install` s'exécute **avant** l'échec sur la clé Cloud. Relevé par l'API
   Actions sur les 6 derniers runs :

   | Mesure                                            | Valeur                                   |
   | ------------------------------------------------- | ---------------------------------------- |
   | Job `install` (install + build, conteneur amont)  | **médiane 127 s** (succès : 127/131/143) |
   | Chacun des 20 jobs de shard, avant même d'échouer | **82 à 100 s**                           |
   | Suite complète en local, machine libre            | 33 s pour 58 tests / 19 fichiers         |
   | 4 shards en local (`SPLIT=4`)                     | 10,5 / 11,5 / **21,6** / 11,4 s          |

   D'où le calcul honnête, en temps d'horloge : séquentiel ≈ 127 + 33 = **160 s**,
   quatre shards ≈ 127 + 21,6 = **149 s**. **Onze secondes gagnées, pour
   environ 380 s de temps machine supplémentaire.**

   Le seuil de rentabilité se calcule avec les mêmes chiffres : à 0,57 s par
   test, il faut ~210 tests pour que la suite atteigne deux minutes et que la
   découpe pèse enfin plus que son coût fixe. Le dépôt en compte 58. **Le
   sharding ne se rentabilisera pas dans l'horizon de ce plan**, et le dire est
   plus utile que de l'espérer.

   Ce qui est acheté est donc explicitement le mécanisme, monté et prouvé
   pendant qu'il coûte 33 s de le vérifier. Le parallélisme qui rapporte
   aujourd'hui est celui de l'option F : le job `qualite` (types, lint, quatre
   gates, tests unitaires) tourne en parallèle des shards, pas après eux.

4. **Pourquoi 4 runners.** Pas pour la vitesse — le point 3 vient de montrer
   qu'elle n'y est pas. Quatre est le nombre du référentiel visé, et c'est le
   plus petit qui exerce le cas intéressant : 19 fichiers ne se divisent pas en
   4, la découpe donne 5/5/5/4 et met à l'épreuve le reste. Deux shards
   partageraient 19 en 10/9 sans rien apprendre. Le nombre est porté par la
   variable `SHARDS` du workflow, dont la matrice dérive : le changer est une
   ligne, pas une refonte.

5. **Épinglage par SHA.** `.github/dependabot.yml` déclare déjà que les actions
   sont épinglées par SHA au titre de la gate §6. `e2e.yml` l'honore : chaque
   `uses:` porte un SHA de commit complet, le tag restant en commentaire pour
   la lecture humaine. Un tag est mutable ; `@v4` est une promesse que le
   mainteneur peut réécrire après coup.

## Conséquences

- Positives :
  - `yarn && yarn dev:test && yarn cy:run` reste vrai pour un inconnu : aucun
    compte, aucune clé (P6).
  - L'onglet Actions redevient un signal : ce qui est rouge parle du code.
  - Le sharding est configuré par variables d'environnement, sans toucher aux
    specs (L3 intacte).
- Négatives assumées :
  - Découpe statique : un shard peut traîner sans que les autres l'aident.
    L'écart mesuré est déjà de 2,06× — le déséquilibre n'est pas hypothétique.
    `cypress-split` sait pondérer par durées via un fichier `SPLIT_FILE`, mais
    **cette donnée doit venir de quelque part** : soit un JSON de timings
    commité et régénéré à la main, soit un artefact téléchargé entre deux runs.
    Ce n'est donc pas un basculement de configuration mais un second chantier,
    et il n'est pas ouvert ici : à 33 s de suite, rééquilibrer 11 s de shard le
    plus long ne se paie pas. Le jour où le point 3 s'inverse, ce chantier
    passe avant l'augmentation du nombre de runners.
  - Pas de Test Replay ni d'historique de flake côté serveur. La semaine 7 s'en
    passe : `yarn cy:burn` mesure le flake localement, et le plan prévoit un
    run Cloud de **démonstration** — hors CI, hors chemin critique.
  - Un seul mainteneur sur `cypress-split`. Le jour où il s'arrête, la découpe
    se réécrit à la main en une trentaine de lignes : c'est la raison pour
    laquelle cette dépendance est acceptable et pas une autre.
- Surveillé via :

  - **Écart entre le shard le plus long et le plus court.** Lu sur les durées
    de job affichées par GitHub Actions, ou en local par
    `for i in 0 1 2 3; do time SPLIT=4 SPLIT_INDEX=$i yarn cy:run; done`.
    Calculé **à la main, à la clôture de chaque semaine** — c'est une
    heuristique de revue, pas une gate automatisée, et l'écrire évite de faire
    croire à une garantie qui n'existe pas (même position qu'ADR-008).
    **Ce seuil s'est déclenché à la première mesure** : 21,6 s contre 10,5 s,
    soit **2,06×**. La suite de la décision en tient compte ci-dessous.
  - Toute réapparition de `record:` ou de `CYPRESS_RECORD_KEY` dans `.github/` :
    interdite par P6. La commande de contrôle vise les **clés YAML** et non le
    mot :

    ```
    grep -rnE '^\s*(record:\s*true|CYPRESS_RECORD_KEY:)' .github/
    ```

    La version initiale — `grep -rn "record\|RECORD_KEY"` — remontait ses
    propres commentaires, ceux du workflow qui expliquent justement l'absence
    de Cloud. C'est la troisième fois dans ce dépôt qu'un contrôle confond le
    code et la prose qui le documente, après la règle « pas de `any` » et la
    règle `cy.wait(ms)` du hook.

## Effet de bord : la resynchronisation avec l'amont

La relation à l'amont est **active** — une PR y est ouverte (#1735, bloquée par
le CLA Cypress, cf. `docs/metrics.md`). Un `git merge upstream/develop` futur
**réintroduira les trois workflows supprimés**, puisque la suppression vit dans
l'histoire de ce fork et non dans la leur.

Le coût de suppression n'est donc pas payé une fois mais à chaque
resynchronisation. Il est faible — trois `git rm` — mais il doit être _su_, et
c'est cet ADR qui le dit. Le contrôle est cherchable en une commande :
`ls .github/workflows/` doit ne contenir que `e2e.yml` et
`merge-develop-into-flake-demo.yml`.

Effet de bord favorable, à l'inverse : supprimer ces trois fichiers tarit aussi
les PR Dependabot `github-actions` qui les mettaient à jour — des mises à jour
d'actions employées par des workflows qui ne tourneront jamais ici.

## Réversibilité

Revenir à l'option A ou B touche **L4 seulement** :

| Couche | Impact                                                                    |
| ------ | ------------------------------------------------------------------------- |
| L0-L2  | aucun — l'application, les capacités et les données ignorent le découpage |
| L3     | aucun — aucune spec ne sait qu'elle tourne dans un shard                  |
| L4     | 1 fichier de workflow, 1 dépendance de dev, 1 bloc de `cypress.config.ts` |
| L5     | l'index des ADR et la section CI de `metrics.md`                          |

Coût estimé : une demi-journée, dont l'essentiel est la création du compte et
la mise en place du secret. C'est précisément parce que le retour en arrière
est bon marché que la contrainte P6 peut être tenue sans se condamner.
