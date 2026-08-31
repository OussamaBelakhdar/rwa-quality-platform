---
name: write-adr
description: Rédige un Architecture Decision Record dans docs/adr/ au format du projet (contexte, options, décision, conséquences, réversibilité). À invoquer avant tout choix structurant — nouvel outil, nouvelle couche, changement de stratégie de test.
---

# Rédiger un ADR

Fichier : `docs/adr/<nnn>-<slug>.md`, numéro suivant l'index de `docs/ARCHITECTURE.md`. Commité **avant** le code. Partir de `docs/adr/000-template.md`.

## Règles
- Au moins deux options. Celle retenue n'est pas forcément la "meilleure" en absolu — c'est la meilleure ici, et l'ADR dit pourquoi.
- Chiffrer dès que possible (temps de suite, coût mensuel, nombre de fichiers touchés).
- Nommer l'alternative écartée qu'un recruteur proposerait spontanément (ex. Page Objects, Cypress Cloud) et dire pourquoi elle perd ici.
- Réversibilité : quelles couches L0-L5 sont touchées si on revient en arrière, et coût estimé.
- Mettre à jour l'index des ADR dans `docs/ARCHITECTURE.md`.
- Faire passer l'agent `adr-challenger` avant le statut "accepté".
