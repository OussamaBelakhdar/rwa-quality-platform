# Rapport de flakiness

Semaine 7. Méthode imposée par le skill `flake-diagnosis` : reproduire →
classer → **prouver** → corriger au bon niveau → documenter. Jamais de
« relance pour voir », jamais de `cy.wait(ms)` comme correction.

## Le terrain : du flake réel, pas fabriqué

Le flake vient de `upstream/flake-demo`, branche maintenue par l'équipe Cypress
via le workflow `merge-develop-into-flake-demo`. Ses trois patches sont repris
tels quels sur la branche `flake-demo` de ce fork, **jamais mergée sur `main`**.

Un flake que j'aurais écrit moi-même ne prouverait que ma capacité à écrire un
bug. Et le point décisif : **l'amont injecte le flake dans l'APPLICATION, pas
dans les tests**. Les tests qui échouent le font donc pour une bonne raison.

| #   | Fichier                                     | Nature injectée                                         |
| --- | ------------------------------------------- | ------------------------------------------------------- |
| 1   | `backend/database.ts`                       | commentaires renvoyés dans un ordre aléatoire           |
| 2   | `backend/like-routes.ts`                    | délai serveur aléatoire jusqu'à 5,5 s sur le like       |
| 3   | `src/machines/publicTransactionsMachine.ts` | `throw new Error("FLAKE")` une fois sur deux au `FETCH` |

---

## Reproduire ces chiffres

Tous les chiffres de ce rapport ont été mesurés sur la branche `flake-demo`,
qui n'est **pas** sur `main` — un lecteur de `main` ne la voit pas. Sans les
commandes ci-dessous, ce document serait une suite de nombres invérifiables,
exactement ce que ce dépôt refuse ailleurs.

```bash
git fetch origin flake-demo && git checkout flake-demo
yarn dev:test                        # dans un second terminal

yarn cy:burn                         # ampleur      → 22 tests, 37,93 %
yarn cy:run                          # ce que les retries cachent → 4 échecs

# isolation de la cause : retirer le seul bloc `throw new Error("FLAKE")`
# de src/machines/publicTransactionsMachine.ts, puis
CY_BURN_RUNS=5 yarn cy:burn          # → 0,00 %
```

Les deux specs de commentaires et de likes vivent sur `main`, elles : les
lancer sur `flake-demo` reproduit le tableau de la mutation.

## Mesure 1 — l'ampleur

`yarn cy:burn` (10 exécutions, retries **forcés à zéro**) :

```
Tests observés : 58 sur 10 exécutions
Taux de flake : 37.93 %  (seuil §6 : 2 %)
22 tests flaky, de 30 % à 90 % d'échec
```

Le script a prononcé la gate lui-même : `Gate §6 rouge : 37.93 % > 2 %`.

## Mesure 2 — une cause, vingt-deux symptômes

**Hypothèse** : les 22 tests ne représentent pas 22 causes. Tout ce qui charge
le flux public traverse `publicTransactionsMachine`, donc la source 3.

**Preuve** — expérience d'isolation : retirer **uniquement** le patch 3, tout le
reste inchangé, et remesurer.

| Configuration    | Exécutions | Taux de flake |
| ---------------- | ---------- | ------------- |
| Les 3 sources    | 580        | **37,93 %**   |
| Sans la source 3 | 290        | **0,00 %**    |

Une cause. Les sources 1 et 2 ne produisent **aucun** échec — et ce n'est pas un
compliment pour la suite : elle n'a **aucune couverture des commentaires ni des
likes**. Deux des trois flakes de l'amont sont invisibles ici par absence de
tests, pas par robustesse. C'est un trou de couverture, écrit comme tel.

## Mesure 3 — ce que les retries cachent

C'est le résultat le plus important de la semaine, et il est mesuré, pas déduit.

| Commande       | Retries | Ce qu'on voit                   |
| -------------- | ------- | ------------------------------- |
| `yarn cy:burn` | 0       | **22 tests instables**, 37,93 % |
| `yarn cy:run`  | 2       | **4 échecs** sur 58, 3 specs    |

**Les retries masquent 18 des 22 tests instables.** `network/erreurs-serveur`
(5/5 vert), `network/latence` (2/2), `auth/session` (3/3) passent au vert alors
que le burn les mesure entre 40 % et 70 % d'échec.

Une équipe qui ne regarde que `cy:run` conclurait « quatre tests flaky, on les
met en quarantaine » — et passerait à côté du fait que **l'application échoue
une fois sur deux sur sa requête de données principale**.

Deux effets de bord mesurés au passage :

- **La durée triple** : 2 min 17 avec retries contre 36 s sur une suite saine.
  Un pipeline lent est souvent un pipeline qui réessaie.
- Les captures d'écran gardent la trace des tentatives 2 et 3 : la preuve est
  là, mais seulement pour qui va la chercher.

C'est exactement ce que la règle #10 énonce : `runMode: 2` est une **mesure**,
pas une solution, et tout test ayant nécessité un retry est traité comme flaky.

---

## Diagnostic

### `src/machines/publicTransactionsMachine.ts` — 22 tests, 37,93 %

- **Date** : 2026-09-02
- **Taux avant / après** : 37,93 % → 0,00 % une fois la source retirée
- **Classe** : **aucune des six de la grille** — voir ci-dessous
- **Hypothèse** : cause unique en amont de tous les symptômes
- **Preuve** : expérience d'isolation, 290 exécutions sans un seul échec
- **Correction** : **aucune, côté test.**

Ce dernier point est le cœur du sujet. Une requête de données qui échoue une
fois sur deux n'est pas un problème de synchronisation, d'attente ou de
sélecteur : c'est un **défaut de l'application**. Un test qui l'absorberait —
par un retry, un timeout allongé, une boucle de tentatives — transformerait un
bug déterministe en bruit de fond, et le rendrait invisible.

La bonne correction est dans `src/`. Sur cette branche elle n'a pas lieu d'être :
la branche existe pour porter le défaut.

**Mise en quarantaine : refusée.** Quarantiner 22 tests reviendrait à éteindre
la moitié de la suite pour masquer un défaut applicatif unique. La quarantaine
sert à isoler un test instable, pas à faire taire une application cassée.

---

## Ce que ce diagnostic a révélé sur la grille elle-même

La grille du skill `flake-diagnosis` propose six classes : race réseau,
détachement DOM, sujet capturé trop tôt, animation, donnée non isolée, timing
CI. **Aucune ne convient ici**, et pour une raison structurelle : les six
supposent que le flake est dans le TEST.

Le cas le plus intéressant de la semaine est celui où il n'y est pas. La grille
a donc gagné une septième ligne — et surtout une colonne « corriger au bon
niveau » dont la réponse est, pour la première fois, _ne pas toucher au test_.

---

---

## Sources 1 et 2 — le diagnostic inverse

Les deux autres sources décrivent des comportements applicatifs **légitimes** :
une API qui ne promet pas d'ordre, un serveur dont la latence varie. Elles
appellent donc l'inverse du diagnostic précédent — ici, c'est au test de
s'adapter.

Elles ne cassaient rien faute de couverture. Deux specs comblent le trou :
`transactions/commentaires.cy.ts` et `transactions/likes.cy.ts`.

### `commentaires.cy.ts` — ordre non garanti

- **Classe** : donnée non ordonnée (aucune promesse de contrat)
- **Correction** : assertion de **présence**, jamais de position.
  `should("contain", "premier").and("contain", "second")`. Un test qui asserte
  `.eq(0)` invente une garantie que l'API ne donne pas — c'est le test qui a
  tort, pas le serveur.

### `likes.cy.ts` — latence variable

- **Classe** : race réseau
- **Correction** : `cy.wait(alias, { timeout: 10000 })`. La borne est justifiée
  par le comportement observé du serveur — jusqu'à 5,5 s, au-delà du
  `defaultCommandTimeout` de 4 s. **On attend la réponse, pas une durée** :
  `cy.wait(5500)` serait la mauvaise réponse à la même question, et le hook du
  dépôt la refuse.

### Preuve par mutation

Même application, même flake injecté, seule l'écriture du test change :

| Version                               | Commentaires | Likes    | Taux global |
| ------------------------------------- | ------------ | -------- | ----------- |
| Correcte (présence / attente d'alias) | 0 %          | 0 %      | **0,00 %**  |
| Naïve (position / pas d'attente)      | **70 %**     | **30 %** | **100 %**   |

Vingt exécutions de chaque. C'est la démonstration que la semaine cherchait :
face à un flake identique, la même suite peut être stable ou inutilisable selon
la façon dont elle assère.

---

## Ce que la semaine a aussi corrigé dans l'outillage

Deux gardes du dépôt se sont révélés faux pendant l'écriture de ces specs.

| Garde                | Défaut                                                                                                          | État    |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| `check-selectors.js` | refusait un préfixe **présent** dans `src/` : son motif ignorait la forme MUI `inputProps={{ "data-test": … }}` | corrigé |
| `check-spec.sh`      | bloquait un commentaire citant `cy.wait(5500)` comme contre-exemple                                             | corrigé |

Le second mérite d'être noté pour ce qu'il dit de ma propre méthode : ce défaut
avait **déjà** été corrigé en semaine 5, sur la règle « pas de `any` ». J'avais
corrigé l'instance sans regarder si les autres règles souffraient du même mal.
Elles en souffraient toutes.

Toutes les règles lisent désormais une vue « code seul » — sauf `@ts-ignore`,
qui est lui-même un commentaire. Et les règles de **présence** aussi, où le
défaut s'inverse : un `cy.seed` laissé en commentaire les satisferait sans rien
seeder, faux négatif bien plus grave qu'un faux positif. `check-hook.js` passe
de 8 à 17 cas et garde la classe, pas une instance.
