# Règles Git

- Branches : `week-<n>/<sujet>` (ex. `week-3/app-actions`). Une branche par semaine du plan.
- Commits conventionnels : `test(transactions): …`, `feat(support): …`, `docs(adr): …`, `ci: …`, `chore: …`.
- Une PR par semaine, titre = livrable de `docs/PLAN.md`. La description liste les critères de fin cochés.
- Jamais de `--force` sur `main`. Jamais de commit de `.env`, `cypress.env.json`, vidéos, screenshots.
- Un ADR est commité **avant** le code qu'il justifie.
