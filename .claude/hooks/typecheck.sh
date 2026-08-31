#!/usr/bin/env bash
# À la fin de chaque tour : typecheck du dossier cypress uniquement (rapide).
# Ne bloque pas, mais remonte les erreurs dans le contexte.
# git status --porcelain -uall (et non git diff HEAD) : les fichiers NON TRACKÉS
# — typiquement une spec qui vient d'être créée — sont invisibles pour git diff.
# -uall est indispensable : sans lui, git replie un répertoire non tracké en
# une seule ligne "?? cypress/" et le motif ne matche jamais.
set -uo pipefail
if git status --porcelain -uall 2>/dev/null | grep -qE 'cypress/.*\.tsx?$'; then
  npx tsc --noEmit -p cypress/tsconfig.json 2>&1 | head -40 || true
fi
exit 0
