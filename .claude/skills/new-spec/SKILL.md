---
name: new-spec
description: Crée une nouvelle spec Cypress conforme au contrat L3 (seed, login, visit, tags, niveau de test). À invoquer pour tout nouveau fichier *.cy.ts ; ne jamais écrire une spec sans passer par ce skill.
---

# Créer une spec

## 1. Vérifier le niveau (ADR-004)

Poser la question avant d'écrire : ce comportement se prouve-t-il

- en **component test** (props → rendu, pas de réseau) → `src/<Composant>.cy.tsx`, arrêter ici ;
- via **`cy.request`** (contrat de route) → `cypress/api/<route>.cy.ts` ;
- uniquement en **E2E** (parcours multi-écrans, intégration front/XState/API, erreur réseau injectée) → continuer.

Écrire la justification en une ligne en commentaire de tête du fichier.

## 2. Emplacement et nom

`cypress/e2e/<domaine-metier>/<comportement>.cy.ts` — domaine parmi : auth, transactions, notifications, bank-accounts, user-settings, network, 00-foundations.

## 3. Squelette obligatoire

```ts
// Niveau E2E : <justification ADR-004 en une ligne>
import { interceptTransactions } from "@support/intercepts/transactions.intercepts";

describe("<Domaine> — <comportement>", { tags: ["@<domaine>", "@regression"] }, () => {
  beforeEach(() => {
    cy.seed("default");
    cy.login("Heath93");
    cy.visit("/<route>");
  });

  it("<comportement observable en une phrase>", () => {
    // Arrange : intercept via factory si réseau
    // Act
    // Assert : une assertion de comportement, avec retry
  });
});
```

## 4. Capacités manquantes

Si la spec a besoin d'une commande, d'une app action, d'un intercept ou d'un builder qui n'existe pas : le créer **d'abord** dans la couche L2/L1 correspondante, avec ses types, puis revenir à la spec. Ne jamais mettre la logique dans la spec "en attendant".

## 5. Vérification avant de proposer

- `yarn types` passe.
- `yarn cy:run --spec <fichier>` passe 3 fois de suite.
- Le hook `check-spec.sh` n'a rien bloqué.
- Lancer l'agent `test-reviewer` sur le fichier.
