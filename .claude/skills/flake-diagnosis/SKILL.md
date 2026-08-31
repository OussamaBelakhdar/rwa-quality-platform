---
name: flake-diagnosis
description: Diagnostique un test Cypress flaky selon la méthode symptôme → hypothèse → preuve → correction, et produit l'entrée correspondante dans docs/flakiness-report.md. À invoquer dès qu'un test a nécessité un retry en CI ou échoue de façon intermittente.
---

# Diagnostic de flakiness

Jamais de "relance pour voir". Jamais de `cy.wait(ms)` comme correction.

## 1. Reproduire
```
yarn cy:burn --spec <fichier>   # 10 runs, taux d'échec
```
Noter : taux, navigateur, mode (open/run), CI ou local.

## 2. Classer le symptôme (une seule case)
| Classe | Indice typique |
|---|---|
| Race réseau | échec sur assertion juste après une action qui déclenche un appel ; pas de `cy.wait('@alias')` |
| Détachement DOM | "element is detached from the DOM" ; re-render XState entre `cy.get` et l'action |
| Sujet capturé trop tôt | variable assignée dans `.then` puis utilisée hors chaîne |
| Animation / transition | échec sur `click` avec "element is being covered" |
| Donnée non isolée | passe seul, échoue en suite ; dépend d'un état d'un test précédent |
| Timing CI | passe en local, échoue en CI ; shard lent |

## 3. Prouver
Une preuve = un artefact : vidéo, screenshot, Command Log, ou un test minimal qui reproduit à 100 %. Sans preuve, pas de correction.

## 4. Corriger au bon niveau
- Race réseau → intercept factory + `cy.wait('@alias')`.
- Détachement → re-query juste avant l'action, ou assertion sur l'état stable avant `cy.get`.
- Sujet → rester dans la chaîne, ou `cy.then` / alias.
- Animation → attendre la fin de transition par assertion CSS, jamais par délai.
- Isolation → corriger le seed, pas le test.
- Timing CI → réduire le travail du test (session, seed), pas augmenter le timeout.

## 5. Documenter
Ajouter dans `docs/flakiness-report.md` :
```
### <fichier>::<it>
- Date, taux avant / après (yarn cy:burn)
- Classe : …
- Hypothèse : …
- Preuve : lien artefact
- Correction : commit <sha>
```
Si non corrigeable dans la session : tag `@quarantine`, commentaire `// QUARANTINE: #<issue> <date>`, issue GitHub créée. Quarantaine > 14 jours = PR refusée (gate §6).
