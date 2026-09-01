import { muter } from "@support/intercepts/factories";
import type { InterceptAlias } from "@support/types";
import type { User } from "../../../src/models";

/** Corps de `GET /checkAuth` (`backend/auth.ts:62`). Composé, jamais redéclaré. */
export interface ReponseCheckAuth {
  user: User;
}

/**
 * Factories d'intercept pour l'authentification. Chaque factory retourne son
 * alias, pour que l'appelant fasse `cy.wait(interceptLogin())` sans jamais
 * réécrire la chaîne (ARCHITECTURE.md §4, couche L2).
 */
export const interceptLogin = (): InterceptAlias => {
  cy.intercept("POST", "/login").as("loginUser");
  return "@loginUser";
};

/**
 * Modifie le profil renvoyé par `/checkAuth` avant qu'il n'atteigne
 * l'application — solde négatif, par exemple, que le backend ne produit pas.
 *
 * `/checkAuth` n'est appelé qu'à la demande : `authMachine` ne le consulte que
 * dans l'état `refreshing`, atteint par l'événement `REFRESH`
 * (`authMachine.ts:81-86`). La spec doit donc le déclencher par une app action.
 */
export const mutateCheckAuth = (mutation: (corps: ReponseCheckAuth) => void): InterceptAlias =>
  muter<ReponseCheckAuth>("/checkAuth", "checkAuthMute", mutation);
