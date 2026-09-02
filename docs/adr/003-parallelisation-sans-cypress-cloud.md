# ADR-003 — Paralléliser par `cypress-split`, sans Cypress Cloud, et retirer les workflows hérités qui échouent

**Statut** : proposé
**Date** : 2026-09-02
**Semaine du plan** : 6

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

3. **Le gain de temps n'est pas l'argument, et il ne faut pas prétendre qu'il
   l'est.** La suite complète tourne en **33 s** pour 58 tests sur 19 fichiers
   (mesure locale, machine libre). Découpée en 4, chaque shard paie son propre
   `yarn install`, son propre build et son propre démarrage de serveurs — un
   coût fixe qui dépasse largement 8 s. **Le total en 4 shards sera très
   probablement plus lent que le séquentiel**, et le chiffre sera publié tel
   quel dans `metrics.md`, y compris s'il est défavorable.

   Ce qui est acheté ici n'est pas de la vitesse aujourd'hui : c'est le
   mécanisme, monté et prouvé pendant qu'il coûte 33 s de le vérifier, pour le
   jour où la suite en coûtera 20 minutes. Une parallélisation installée le
   jour où elle devient urgente est une parallélisation qu'on installe mal.

## Conséquences

- Positives :
  - `yarn && yarn dev:test && yarn cy:run` reste vrai pour un inconnu : aucun
    compte, aucune clé (P6).
  - L'onglet Actions redevient un signal : ce qui est rouge parle du code.
  - Le sharding est configuré par variables d'environnement, sans toucher aux
    specs (L3 intacte).
- Négatives assumées :
  - Découpe statique : un shard peut traîner sans que les autres l'aident.
    Atténué par la découpe pondérée par durées de `cypress-split`, à activer
    seulement si le déséquilibre se mesure.
  - Pas de Test Replay ni d'historique de flake côté serveur. La semaine 7 s'en
    passe : `yarn cy:burn` mesure le flake localement, et le plan prévoit un
    run Cloud de **démonstration** — hors CI, hors chemin critique.
  - Un seul mainteneur sur `cypress-split`. Le jour où il s'arrête, la découpe
    se réécrit à la main en une trentaine de lignes : c'est la raison pour
    laquelle cette dépendance est acceptable et pas une autre.
- Surveillé via :
  - Écart entre le shard le plus long et le plus court, publié dans
    `metrics.md`. Au-delà de 2×, activer la pondération par durées.
  - Toute réapparition de `record:` ou de `CYPRESS_RECORD_KEY` dans
    `.github/` : interdite par P6, cherchable en une commande.

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
