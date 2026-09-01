import { interceptLogin } from "@support/intercepts/auth.intercepts";
import type { ServiceXState } from "@support/types";

/**
 * Accès aux services XState de l'application — couche L2 (ADR-006).
 *
 * Seul endroit du dépôt autorisé à toucher `cy.window()` : les specs passent
 * par ces app actions (.claude/rules/testing.md #12).
 *
 * Lit `window.__services__`, peuplé uniquement si `VITE_TEST_HOOKS === "true"`
 * au build. La suite doit donc tourner contre `yarn dev:test`, pas `yarn dev`.
 *
 * Chaque accès ATTEND que le service apparaisse au lieu de le supposer
 * présent : `auth` existe dès l'évaluation du bundle, mais les services portés
 * par un composant n'existent que pendant qu'il est monté.
 */

/** Noms enregistrés dans le registre. Fermer l'union évite d'attendre indéfiniment un service qui n'existe pas. */
export type ServiceName =
  | "auth"
  | "notifications"
  | "snackbar"
  | "bankAccounts"
  | "publicTransactions"
  | "contactsTransactions"
  | "personalTransactions"
  | "createTransaction"
  | "userOnboarding";

/**
 * Envoie un événement à un service, en attendant qu'il soit enregistré.
 *
 * `.should("have.nested.property", …)` rejoue jusqu'à ce que le service
 * apparaisse : c'est ce qui empêche le `TypeError` non retriable qu'un
 * déréférencement direct produirait sur un composant pas encore monté.
 */
/**
 * Attend qu'un service soit enregistré, puis le rend.
 *
 * `should(callback)` rejoue jusqu'à l'apparition du service : c'est ce qui
 * empêche le TypeError non retriable qu'un déréférencement direct produirait
 * sur un composant pas encore monté.
 *
 * On n'utilise PAS `cy.its("__services__.x.state.value")` : sur un Interpreter
 * XState v4, `state` est un getter de PROTOTYPE et le parcours de chemin de
 * `cy.its` ne le traverse pas. `getSnapshot()` est une méthode, et le snapshot
 * rendu porte `value` en propriété propre.
 */
const serviceEnregistre = (nom: ServiceName): Cypress.Chainable<ServiceXState> =>
  cy
    .window({ log: false })
    .should((win) => {
      expect(win.__services__?.[nom], `service « ${nom} » enregistré`).to.not.be.undefined;
    })
    .then((win) => {
      const service = win.__services__?.[nom];
      if (!service) {
        // Inatteignable après le should ci-dessus, sauf si le service est
        // retiré entre les deux — une garde vaut mieux qu'un cast qui
        // affirmerait au compilateur ce que rien ne garantit.
        throw new Error(`Service « ${nom} » absent du registre après attente.`);
      }
      return service;
    });

/** Envoie un événement à un service, en attendant qu'il soit enregistré. */
export const sendToService = (
  nom: ServiceName,
  evenement: string,
  charge: Record<string, unknown> = {}
): void => {
  serviceEnregistre(nom).then((service) => service.send(evenement, charge));
};

/**
 * Lit l'état courant d'une machine, sans passer par l'UI.
 * Interface annoncée par ARCHITECTURE.md §4 (couche L2).
 */
export const appState = (nom: ServiceName): Cypress.Chainable<unknown> =>
  serviceEnregistre(nom).then((service) => service.getSnapshot().value);

/** Connecte un utilisateur en pilotant la machine d'authentification. */
export const loginByXstate = (username: string, password: string): void => {
  const login = interceptLogin();

  cy.visit("/signin", { log: false });
  sendToService("auth", "LOGIN", { username, password });

  cy.wait(login).its("response.statusCode").should("eq", 200);
};

/** Force un rafraîchissement de la liste publique par la machine, sans changer de route. */
export const fetchPublicTransactions = (filtre: Record<string, number> = {}): void => {
  sendToService("publicTransactions", "FETCH", filtre);
};

/**
 * Termine l'onboarding sans parcourir le dialogue.
 *
 * Envoie `NEXT` jusqu'à l'état final `done` (`userOnboardingMachine.ts:26-48`)
 * plutôt que d'écrire l'état directement : la machine garde ses invariants, et
 * l'app action reste vraie si le nombre d'étapes change.
 *
 * NON EXERCÉE PAR LA SUITE aujourd'hui : les cinq utilisateurs seedés ont tous
 * un compte bancaire, donc le dialogue ne s'ouvre jamais avec `cy.seed
 * ("default")`. Il faudra un utilisateur sans compte — livrable des endpoints
 * `/testData` granulaires de la semaine 4. Livrée maintenant parce que le
 * registre l'exige, signalée comme non couverte plutôt que présentée comme
 * acquise.
 */
export const completeOnboarding = (): void => {
  const avancer = (restant: number): void => {
    if (restant === 0) return;
    appState("userOnboarding").then((etat) => {
      if (etat === "done") return;
      sendToService("userOnboarding", "NEXT");
      avancer(restant - 1);
    });
  };
  avancer(6);
};
