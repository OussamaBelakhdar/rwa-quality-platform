#!/usr/bin/env bash
# Bloque (exit 2) les anti-patterns dans les fichiers de test et les couches L1/L2.
# Reçoit le JSON de l'outil sur stdin ; on extrait le chemin.
set -euo pipefail
# Extraction du chemin par node et non par `jq`.
#
# `jq` n'est PAS une dépendance déclarée du projet : absent, la substitution
# rendait une chaîne vide et le hook sortait en 0 — il se désactivait en
# silence, ce qui est pire qu'absent. Constaté sur le premier run CI : l'image
# `cypress/browsers` n'a pas `jq`, et `yarn check:hook` a vu les quatre cas de
# code passer au lieu d'être bloqués. Node, lui, est le runtime du projet.
file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s)?.tool_input?.file_path||""))}catch(e){}})' 2>/dev/null || true)
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

# Périmètre : les règles L3 ne s'appliquent qu'aux specs de la SUITE.
# cypress/manual/ (démonstrations) et cypress/build-gate/ (gate de production)
# sont hors specPattern par conception.
case "$file" in
  cypress/e2e/*|cypress/api/*|*/cypress/e2e/*|*/cypress/api/*) est_suite=1 ;;
  *) est_suite=0 ;;
esac

fail=0

# ---- Règles communes specs + couches (L1/L2) ----
if grep -nE "require\(.*lowdb|from ['\"]lowdb|data/database\.json" <<< "$code"; then
  echo "P1/L1 violé : aucune écriture ni lecture directe de lowdb depuis cypress/ — passer par les endpoints /testData (cy.seed / cy.task)." >&2; fail=1
fi
if grep -nE "['\"]s3cret['\"]" <<< "$code"; then
  echo "Mot de passe en dur — utiliser cy.env(['defaultPassword']) (rules/testing.md #3, ADR-001)." >&2; fail=1
fi
if grep -nE '@ts-ignore' "$file"; then
  echo "@ts-ignore interdit — utiliser @ts-expect-error commenté, ou corriger le type (rules/typescript.md)." >&2; fail=1
fi
# ── Vue CODE SEUL, calculée une fois ────────────────────────────────────────
# Les lignes de commentaire sont BLANCHIES (pas supprimées) : `grep -n` garde
# ainsi les vrais numéros de ligne.
#
# Pourquoi : ce hook a bloqué deux fois sa propre documentation. D'abord la
# règle « pas de any », sur un commentaire citant la signature de `cy.task`.
# Puis la règle « pas de cy.wait(ms) », sur un commentaire expliquant
# précisément pourquoi cy.wait(5500) serait la mauvaise réponse. La première
# fois j'ai corrigé l'instance ; la seconde a montré que le défaut était de
# CLASSE. Toutes les règles lisent désormais la même vue.
#
# EXCEPTION : `@ts-ignore` est lui-même un commentaire. Cette règle-là doit
# continuer de lire le fichier entier, sans quoi elle ne détecterait plus rien.
#
# Un commentaire de FIN de ligne reste couvert : `const x: any = 1; // note`
# ne commence pas par un marqueur de commentaire.
code=$(awk '{ if ($0 ~ /^[[:space:]]*(\/\/|\*|\/\*)/) print ""; else print }' "$file")

if grep -nE '(:|as|<)[[:space:]]*any\b' <<< "$code"; then
  echo "'any' interdit — utiliser unknown + narrowing (rules/typescript.md)." >&2; fail=1
fi

# ---- Règles propres aux specs (L3) ----
if [[ $is_spec -eq 1 ]]; then
  if grep -nE 'cy\.wait\(\s*[0-9]+' <<< "$code"; then
    echo "P4 violé : cy.wait(ms) interdit — utiliser cy.wait('@alias') ou une assertion avec retry." >&2; fail=1
  fi
  if grep -nE "cy\.get\(['\"](#|\.)" <<< "$code"; then
    echo "Sélecteur fragile (#id / .class) — utiliser cy.getBySel ou cy.findByRole." >&2; fail=1
  fi
  # data-test écrit en dur : cy.getBySel existe et sa clé est typée. Sans cette
  # règle, `cy.get('[data-test="transacton-list"]')` compile, passe le lint, et
  # échoue au bout de 4 s de retry — exactement ce que le typage devait éviter.
  # cy.get('@alias') reste autorisé : c'est la lecture d'un alias, pas un sélecteur.
  if grep -nE "cy\.get\([^)]*data-test" <<< "$code"; then
    echo "data-test écrit en dur — utiliser cy.getBySel(key) : la clé est typée, la faute de frappe devient une erreur de compilation (rules/testing.md #9)." >&2; fail=1
  fi
  if grep -nE 'it\.skip|describe\.skip|it\.only|describe\.only' <<< "$code"; then
    echo "skip/only interdits — utiliser le tag @quarantine avec ticket (voir rules/testing.md)." >&2; fail=1
  fi
  if [[ $est_suite -eq 1 ]] && grep -nE "cy\.window\(" <<< "$code"; then
    echo "Accès window inline — passer par une app action de support/app-actions/ (rules/testing.md #12)." >&2; fail=1
  fi
  if grep -nE "cy\.visit\(['\"]/signin" <<< "$code" && [[ "$file" != *auth/* ]]; then
    echo "P2 violé : login UI hors du domaine auth/ — utiliser cy.login()." >&2; fail=1
  fi

  # cy.task brut : les surcharges natives de Cypress sont permissives, donc le
  # nom de tâche et l'entrée ne sont vérifiés par personne. Les commandes typées
  # (cy.seed, cy.createUser, cy.createTransaction) le sont, elles.
  if grep -nE "cy\.task\(" <<< "$code"; then
    echo "cy.task brut dans une spec — utiliser cy.seed / cy.createUser / cy.createTransaction, qui sont typées (cy.task ne l'est pas, voir support/typage.contract.ts)." >&2; fail=1
  fi

  # Règle #1 : la base est remise dans un état connu AVANT CHAQUE TEST.
  # Dans le beforeEach et non n'importe où : c'est ce qui empêche le couplage
  # entre deux `it` voisins. L'ordre aléatoire ne mélange que les FICHIERS
  # (voir l'en-tête de scripts/run-random-order.js) ; l'isolation intra-fichier
  # est donc garantie ici, par construction, et non par échantillonnage.
  # Sur `$code` et non `$file` : ici le défaut s'inverserait. Un `cy.seed`
  # laissé en commentaire satisferait la règle sans rien seeder — faux négatif,
  # bien pire qu'un faux positif : la règle laisserait passer ce qu'elle existe
  # pour bloquer.
  if [[ $est_suite -eq 1 ]] && ! awk '/beforeEach\(/,/^\s*\}\);/' <<< "$code" | grep -qE 'cy\.seed\('; then
    echo "Règle #1 : aucun cy.seed dans le beforeEach — un test qui hérite de l'état laissé par le précédent n'est pas isolé (P1)." >&2; fail=1
  fi

  # Règle #6 : un tag de domaine ET un tag de niveau sur chaque describe.
  # Ne s'applique qu'aux specs de la suite : cypress/manual/ est hors du
  # specPattern par conception (démonstrations lancées à la main).
  case "$file" in
    cypress/e2e/*|cypress/api/*|*/cypress/e2e/*|*/cypress/api/*)
      # Même raison : un `tags:` en commentaire ne doit pas satisfaire la règle.
      if grep -qE '^describe\(' <<< "$code" || grep -qE '^\s*describe\(' <<< "$code"; then
        if ! grep -qE 'tags:\s*\[' <<< "$code"; then
          echo "Règle #6 : aucun tag sur le describe — un domaine (@auth, @transactions, @foundations…) ET un niveau (@smoke ou @regression)." >&2; fail=1
        elif ! grep -qE '@(smoke|regression|quarantine)' <<< "$code"; then
          echo "Règle #6 : tag de niveau manquant — @smoke, @regression ou @quarantine." >&2; fail=1
        fi
      fi
      ;;
  esac
fi

[[ $fail -eq 1 ]] && exit 2
exit 0
