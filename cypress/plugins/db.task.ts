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

/**
 * Entrée de `db:createUser`. Dérivée de `User` plutôt que redéclarée
 * (.claude/rules/typescript.md), plus le mot de passe en clair et le drapeau
 * de compte bancaire, qui n'existent pas sur le modèle.
 */
export type NouvelUtilisateur = Pick<
  User,
  "firstName" | "lastName" | "username" | "email" | "phoneNumber" | "avatar" | "defaultPrivacyLevel"
> & {
  password: string;
  /** `false` pour obtenir un utilisateur qui déclenche l'onboarding. */
  withBankAccount?: boolean;
};

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
/** Identifiants d'un fournisseur SSO, rendus par une tâche Node. */
export interface IdentifiantsSSO {
  username: string;
  password: string;
}

export interface TaskMap {
  "db:reset": { entree: SeedScenario; sortie: null };
  "db:createUser": { entree: NouvelUtilisateur; sortie: User };
  "db:createTransaction": { entree: NouvelleTransaction; sortie: Transaction };
  /**
   * Les tâches d'identifiants SSO entrent au contrat (ADR-009).
   *
   * Elles vivaient hors de `TaskMap`, enregistrées par un `on("task", …)` brut,
   * et la commande retypait leur sortie à la main. C'est exactement la dérive
   * déjà corrigée pour `db:seed` en semaine 4 : deux contrats coexistaient et
   * le contributeur suivant en aurait choisi un au hasard. Une seule source.
   */
  getAuth0Credentials: { entree: void; sortie: IdentifiantsSSO };
}

/**
 * Handlers dérivés de `TaskMap`. Sans ce type, `on("task", …)` accepte
 * n'importe quelle signature et `TaskMap` reste décorative — ce qu'elle était
 * jusqu'à la revue de la semaine 4.
 *
 * `TachesDb` restreint la dérivation aux tâches de CE module. `TaskMap` est le
 * contrat de toutes les tâches du projet, y compris celles enregistrées
 * ailleurs (les identifiants SSO, dans `cypress.config.ts`) ; sans cette
 * restriction, ce fichier devrait implémenter des tâches qui ne le concernent
 * pas. Le contrat reste unique, sa mise en œuvre est répartie.
 */
type TachesDb = Pick<TaskMap, "db:reset" | "db:createUser" | "db:createTransaction">;

type Handlers = {
  [K in keyof TachesDb]: (arg: TachesDb[K]["entree"]) => Promise<TachesDb[K]["sortie"]>;
};

/**
 * Fait remonter le message d'erreur écrit par la route plutôt que le
 * « Request failed with status code 409 » d'axios. Sans cela, le soin mis
 * côté serveur à expliquer le refus est annulé côté client.
 */
const appel = async <T>(action: () => Promise<T>): Promise<T> => {
  try {
    return await action();
  } catch (erreur) {
    const detail =
      typeof erreur === "object" && erreur !== null && "response" in erreur
        ? (erreur as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
    // `cause` préservée : sans elle, le message de la route remplace la
    // trace d'origine et le diagnostic s'arrête là. ESLint l'exige, à raison.
    throw new Error(detail ?? (erreur instanceof Error ? erreur.message : String(erreur)), {
      cause: erreur,
    });
  }
};

export const enregistrerTachesDb = (apiUrl: string): Handlers => ({
  async "db:reset"(scenario) {
    await appel(() => axios.post(`${apiUrl}/testData/seed/${scenario}`));
    return null;
  },

  async "db:createUser"(details) {
    const { data } = await appel(() =>
      axios.post<{ user: User }>(`${apiUrl}/testData/user`, details)
    );
    return data.user;
  },

  async "db:createTransaction"(details) {
    const { data } = await appel(() =>
      axios.post<{ transaction: Transaction }>(`${apiUrl}/testData/transaction`, details)
    );
    return data.transaction;
  },
});
