# Semaine 0 — brouillon LinkedIn

J'ai forké la Cypress Real World App pour reconstruire sa suite de tests de zéro. Le plan disait : semaine 0, migrer Cypress vers la 15 et écrire l'ADR des breaking changes.

J'ai ouvert le `package.json` : `"cypress": "15.17.0"`. La migration était déjà faite. Et la config avait déjà basculé de `Cypress.env()` vers `Cypress.expose()` — 11 clés publiques d'un côté, 1 secret de l'autre.

Écrire l'ADR d'une migration que je n'ai pas faite, ça se vérifie en trente secondes. J'ai changé de sujet : l'ADR-001 porte désormais sur la frontière config/secret, qui est la vraie décision qui restait.

En lisant `src/`, j'ai trouvé mieux. Cinq services XState exposés sur `window` depuis six fichiers — et l'un d'eux, `TransactionCreateContainer.tsx:41`, sans aucun garde. Une surface de test qui part dans tous les builds de production.

Le chiffre de la semaine : **0**. Zéro spec dans la suite, et c'est l'état voulu. `specPattern` basculé sur `.cy.ts` maintenant, pendant qu'il y a zéro fichier à renommer — contre une quarantaine si j'avais attendu la semaine 5.

Vous auriez gardé le sujet d'ADR initial pour ne pas casser le plan ?
