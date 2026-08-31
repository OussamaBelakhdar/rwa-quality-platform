#!/usr/bin/env bash
# Bloque (exit 2) les anti-patterns dans les fichiers de test et les couches L1/L2.
# Reçoit le JSON de l'outil sur stdin ; on extrait le chemin.
set -euo pipefail
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[[ -z "$file" ]] && exit 0
[[ -f "$file" ]] || exit 0

is_spec=0; is_layer=0
case "$file" in
  *.cy.ts|*.cy.tsx) is_spec=1 ;;
esac
case "$file" in
  cypress/support/*.ts|cypress/plugins/*.ts|*/cypress/support/*.ts|*/cypress/plugins/*.ts)
    [[ $is_spec -eq 0 ]] && is_layer=1 ;;
esac
[[ $is_spec -eq 0 && $is_layer -eq 0 ]] && exit 0

fail=0

# ---- Règles communes specs + couches (L1/L2) ----
if grep -nE "require\(.*lowdb|from ['\"]lowdb|data/database\.json" "$file"; then
  echo "P1/L1 violé : aucune écriture ni lecture directe de lowdb depuis cypress/ — passer par les endpoints /testData (cy.seed / cy.task)." >&2; fail=1
fi
if grep -nE "['\"]s3cret['\"]" "$file"; then
  echo "Mot de passe en dur — utiliser cy.env(['defaultPassword']) (rules/testing.md #3, ADR-001)." >&2; fail=1
fi
if grep -nE '@ts-ignore' "$file"; then
  echo "@ts-ignore interdit — utiliser @ts-expect-error commenté, ou corriger le type (rules/typescript.md)." >&2; fail=1
fi
if grep -nE '(:|as|<)[[:space:]]*any\b' "$file"; then
  echo "'any' interdit — utiliser unknown + narrowing (rules/typescript.md)." >&2; fail=1
fi

# ---- Règles propres aux specs (L3) ----
if [[ $is_spec -eq 1 ]]; then
  if grep -nE 'cy\.wait\(\s*[0-9]+' "$file"; then
    echo "P4 violé : cy.wait(ms) interdit — utiliser cy.wait('@alias') ou une assertion avec retry." >&2; fail=1
  fi
  if grep -nE "cy\.get\(['\"](#|\.)" "$file"; then
    echo "Sélecteur fragile (#id / .class) — utiliser cy.getBySel ou cy.findByRole." >&2; fail=1
  fi
  if grep -nE 'it\.skip|describe\.skip|it\.only|describe\.only' "$file"; then
    echo "skip/only interdits — utiliser le tag @quarantine avec ticket (voir rules/testing.md)." >&2; fail=1
  fi
  if grep -nE "cy\.window\(" "$file"; then
    echo "Accès window inline — passer par une app action de support/app-actions/ (rules/testing.md #12)." >&2; fail=1
  fi
  if grep -nE "cy\.visit\(['\"]/signin" "$file" && [[ "$file" != *auth/* ]]; then
    echo "P2 violé : login UI hors du domaine auth/ — utiliser cy.login()." >&2; fail=1
  fi
fi

[[ $fail -eq 1 ]] && exit 2
exit 0
