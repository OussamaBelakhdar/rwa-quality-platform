import axios from "axios";
import type { Transaction, User } from "../../src/models";
import type { SeedScenario } from "../support/types";

/**
 * Tâches Node de la couche L1 (docs/ARCHITECTURE.md §4).
 *
 * PROXY HTTP, PAS D'ÉCRITURE LOWDB. Le serveur Express tient son instance
 * lowdb en mémoire : écrire `data/database.json` derrière son dos diverge ou
 * se fait écraser. Ces tâches appellent donc les endpoints `/testData`, qui
 * sont le seul écrivain.
 */

export interface NouvelUtilisateur {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  /** `false` pour obtenir un utilisateur qui déclenche l'onboarding. */
  withBankAccount?: boolean;
}

export interface NouvelleTransaction {
  senderId: User["id"];
  receiverId: User["id"];
  amount: number;
  description: string;
  transactionType?: "payment" | "request";
}

/**
 * Contrat des tâches : entrée et sortie typées pour chaque nom
 * (.claude/rules/typescript.md). Sans lui, `cy.task` rend `any` et le typage
 * de la suite s'arrête à la frontière Node.
 */
export interface TaskMap {
  "db:reset": { entree: SeedScenario; sortie: null };
  "db:createUser": { entree: NouvelUtilisateur; sortie: User };
  "db:createTransaction": { entree: NouvelleTransaction; sortie: Transaction };
}

export const enregistrerTachesDb = (apiUrl: string): Cypress.Tasks => ({
  async "db:reset"(scenario: SeedScenario) {
    await axios.post(`${apiUrl}/testData/seed/${scenario}`);
    return null;
  },

  async "db:createUser"(details: NouvelUtilisateur) {
    const { data } = await axios.post(`${apiUrl}/testData/user`, details);
    return data.user as User;
  },

  async "db:createTransaction"(details: NouvelleTransaction) {
    const { data } = await axios.post(`${apiUrl}/testData/transaction`, details);
    return data.transaction as Transaction;
  },
});
