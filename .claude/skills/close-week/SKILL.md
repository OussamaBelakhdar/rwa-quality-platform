---
name: close-week
description: Clôture une semaine du plan — vérifie les critères de fin de docs/PLAN.md, met à jour README, metrics et ADR, prépare la PR et le brouillon LinkedIn. À invoquer quand le livrable de la semaine est fonctionnel.
---

# Clôturer une semaine

Aucune semaine N+1 ne démarre tant que ces étapes ne sont pas toutes faites.

## 1. Critères de fin
Ouvrir `docs/PLAN.md`, section de la semaine. Pour chaque critère : prouvé (commande, fichier, chiffre) ou non. Un critère non prouvé = la semaine n'est pas finie. Ne pas "adapter" le critère.

## 2. Qualité
- `yarn types`, `yarn lint`, `yarn cy:run` verts.
- `yarn cy:random` vert (isolation).
- `yarn cy:burn` sur les specs touchées : taux < 2 %.
- Agent `test-reviewer` passé sur les fichiers de la semaine, remarques traitées.

## 3. Documentation
- Section README de la semaine écrite : problème → décision → chiffre. 10 lignes max. Pas de tuto.
- `docs/metrics.md` mis à jour (durée de suite, flake, quarantaine, ratio de niveaux).
- ADR de la semaine au statut "accepté", index mis à jour.

## 4. PR
- Branche `week-<n>/<sujet>` → `main`. Titre = livrable du plan.
- Description : critères cochés, chiffres, lien ADR.
- Merge uniquement si les quality gates (§6 ARCHITECTURE) sont verts.

## 5. Brouillon LinkedIn
Écrire dans `docs/posts/week-<n>.md` : le problème rencontré (concret, avec le vrai message d'erreur si pertinent) → la décision → le chiffre → une question fermée aux lecteurs. 150 mots max. Jamais "j'ai appris".

## 6. Critère d'abandon
Si la semaine 3 n'est pas mergée 5 semaines après le début : réduire le plan à 0-1-2-3-6 et publier. Le rappeler explicitement si la date est dépassée.
