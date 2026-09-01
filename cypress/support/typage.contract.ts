/**
 * Contrat de typage de la couche L2 — vérifié par le compilateur, pas par une
 * capture d'écran.
 *
 * Le plan de la semaine 3 demandait « autocomplétion IDE vérifiée (capture
 * d'écran dans le README) ». Une capture prouve qu'un écran affichait quelque
 * chose un jour donné ; elle ne détecte aucune régression. Ce fichier fait
 * mieux : chaque `@ts-expect-error` ÉCHOUE À LA COMPILATION si l'erreur
 * attendue disparaît. Si quelqu'un élargit `DataTestKey` à `string`, `yarn
 * types` devient rouge — la garantie devient exécutable.
 *
 * Ce fichier n'est pas une spec (pas de `.cy.ts`) : il n'est jamais exécuté,
 * seulement compilé.
 */

import type { EtatDonnees } from "@support/types";

export function contratDeTypage(): void {
  // ── cy.getBySel : clé exacte, issue de l'union générée depuis src/ ──
  cy.getBySel("sidenav-username");
  cy.getBySel("transaction-list");
  // @ts-expect-error une clé absente de src/ ne compile pas
  cy.getBySel("cle-qui-nexiste-pas");
  // @ts-expect-error une chaîne quelconque non plus
  cy.getBySel("transaction-lis");

  // ── cy.getBySelLike : préfixes fermés ──
  cy.getBySelLike("transaction-item");
  // @ts-expect-error un préfixe non déclaré ne compile pas
  cy.getBySelLike("transaction-");

  // ── cy.seed : scénarios publiés par ARCHITECTURE.md §4 ──
  cy.seed();
  cy.seed("default");
  cy.seed("empty"); // compile — non livré, échoue à l'exécution avec un message explicite
  // @ts-expect-error un scénario hors contrat ne compile pas
  cy.seed("gigantesque");

  // ── cy.appState : noms du registre ADR-006 ──
  cy.appState("auth");
  cy.appState("createTransaction");
  // @ts-expect-error un service non enregistré ne compile pas
  cy.appState("inexistant");

  // ── cy.login ──
  cy.login("Heath93");
  // @ts-expect-error le nom d'utilisateur est obligatoire
  cy.login();

  // ── EtatDonnees : dérivé de DataSchema, pas recopié ──
  // Semaine 5 : `cy.appState` était typée `string` au motif que « les machines
  // de cette application ont toutes des états plats ». Six des neuf services
  // du registre sont bâtis sur `dataMachine`, dont `success` est composite.
  // Ces quatre lignes empêchent la même erreur de revenir en silence.
  const etatPlat: EtatDonnees = "failure";
  const etatCompose: EtatDonnees = { success: "withoutData" };
  // @ts-expect-error une faute de frappe dans un sous-état ne compile pas
  const sousEtatFaux: EtatDonnees = { success: "withoutDta" };
  // @ts-expect-error `success` n'est PAS une feuille : la chaîne seule est refusée
  const successAplati: EtatDonnees = "success";
  void [etatPlat, etatCompose, sousEtatFaux, successAplati];
}

/**
 * Ce que `TaskMap` garantit — et ce qu'elle ne garantit pas.
 *
 * CÔTÉ HANDLER : garanti. `enregistrerTachesDb` est typé `Handlers`, dérivé de
 * `TaskMap` ; un handler qui rend le mauvais type ne compile pas. Vérifié par
 * mutation.
 *
 * CÔTÉ APPEL : IMPOSSIBLE à durcir. Les surcharges natives de `cy.task` sont
 * permissives (`task(event: string, arg?: any)`), et le declaration merging
 * AJOUTE une signature sans retirer les autres : TypeScript choisit toujours
 * la plus permissive. Une première tentative de surcharge dérivée de `TaskMap`
 * a été écrite puis retirée — elle ne rejetait ni un nom de tâche inconnu ni
 * une entrée mal formée.
 *
 * La protection du côté appel passe donc par les commandes typées
 * (`cy.seed`, `cy.createUser`, `cy.createTransaction`), et par le hook, qui
 * refuse un `cy.task` brut dans une spec.
 */
export function contratDesCommandesDeDonnees(): void {
  cy.seed("empty");
  cy.seed("default");
  // @ts-expect-error un scénario hors contrat ne compile pas
  cy.seed("gigantesque");

  cy.createTransaction({ senderId: "a", receiverId: "b", amount: 1, description: "x" });
  // @ts-expect-error une entrée mal formée ne compile pas
  cy.createTransaction({ senderId: 42 });
}
