#!/usr/bin/env bash
# Bloque (exit 2) les anti-patterns dans les fichiers de test modifiés.
# Reçoit le JSON de l'outil sur stdin ; on extrait le chemin.
set -euo pipefail
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[[ -z "$file" ]] && exit 0
[[ "$file" != *.cy.ts && "$file" != *.cy.tsx ]] && exit 0
[[ -f "$file" ]] || exit 0

fail=0
if grep -nE 'cy\.wait\(\s*[0-9]+' "$file"; then
  echo "P4 violé : cy.wait(ms) interdit — utiliser cy.wait('@alias') ou une assertion avec retry." >&2; fail=1
fi
if grep -nE "cy\.get\(['\"](#|\.)" "$file"; then
  echo "Sélecteur fragile (#id / .class) — utiliser cy.getBySel ou cy.findByRole." >&2; fail=1
fi
if grep -nE 'it\.skip|describe\.skip|it\.only|describe\.only' "$file"; then
  echo "skip/only interdits — utiliser le tag @quarantine avec ticket (voir rules/testing.md)." >&2; fail=1
fi
if grep -nE 'lowdb|database\.json' "$file"; then
  echo "P1/L1 violé : une spec n'accède jamais à lowdb — passer par cy.seed / cy.task." >&2; fail=1
fi
if grep -nE "cy\.visit\(['\"]/signin" "$file" && [[ "$file" != *auth/* ]]; then
  echo "P2 violé : login UI hors du domaine auth/ — utiliser cy.login()." >&2; fail=1
fi
[[ $fail -eq 1 ]] && exit 2
exit 0
