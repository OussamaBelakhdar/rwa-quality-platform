# Configuration Claude Code du projet

| Fichier                  | Rôle                                                                                                                                                                                                              | Chargé                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `/CLAUDE.md`             | Contexte projet, commandes, structure, interdits                                                                                                                                                                  | Toujours               |
| `settings.json`          | Permissions (deny `.env.local`/`cypress.env.json`, force-push ; allow `src/` et `backend/`), hooks                                                                                                                | Toujours               |
| `rules/*.md`             | Contraintes dures test / TS / git                                                                                                                                                                                 | Toujours               |
| `skills/new-spec`        | Procédure de création d'une spec                                                                                                                                                                                  | À l'invocation         |
| `skills/flake-diagnosis` | Méthode de diagnostic de flakiness                                                                                                                                                                                | À l'invocation         |
| `skills/write-adr`       | Format et règles des ADR                                                                                                                                                                                          | À l'invocation         |
| `skills/close-week`      | Checklist de clôture hebdomadaire                                                                                                                                                                                 | À l'invocation         |
| `agents/test-reviewer`   | Revue de specs contre P1-P6 (lecture seule)                                                                                                                                                                       | Sous-agent             |
| `agents/flake-hunter`    | Analyse cy:burn / CI, classe les flakes                                                                                                                                                                           | Sous-agent             |
| `agents/adr-challenger`  | Lead dev sceptique pour durcir un ADR                                                                                                                                                                             | Sous-agent             |
| `hooks/check-spec.sh`    | Specs `.cy.ts` : cy.wait(ms), only/skip, sélecteurs fragiles, `cy.window` inline, login UI hors auth/. Specs **et** couches `cypress/support`+`cypress/plugins` : lowdb, mot de passe en dur, `any`, `@ts-ignore` | PostToolUse Edit/Write |
| `hooks/typecheck.sh`     | tsc strict sur cypress/ en fin de tour (`git status --porcelain -uall` : voit les fichiers non trackés)                                                                                                           | Stop                   |

`.mcp.json` (gitignoré) : copier `.mcp.json.example` et pointer vers les serveurs MCP locaux. Pas de token dans le dépôt.

`.env` **est commité** (ports, tailles de seed, mot de passe public `s3cret`) et donc lisible. Les secrets vont dans `.env.local` et `cypress.env.json`, tous deux en deny.

Prérequis des hooks : `jq` installé.
