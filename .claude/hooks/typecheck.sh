#!/usr/bin/env bash
# À la fin de chaque tour : typecheck du dossier cypress uniquement (rapide).
# Ne bloque pas, mais remonte les erreurs dans le contexte.
set -uo pipefail
if git diff --name-only HEAD 2>/dev/null | grep -qE '^cypress/.*\.tsx?$'; then
  npx tsc --noEmit -p cypress/tsconfig.json 2>&1 | head -40 || true
fi
exit 0
