import { MemoryRouter } from "react-router-dom";
import { interpret } from "xstate";
import SignInForm from "./SignInForm";
import { authMachine } from "../machines/authMachine";

// Niveau COMPOSANT (ADR-004, ligne 4) : la validation de champ est purement
// cliente — Formik et Yup, aucun appel réseau. L'E2E `auth/login.cy.ts` couvre
// le parcours complet ; il n'a pas à re-prouver qu'un mot de passe court est
// refusé.
//
// La machine d'authentification est interprétée pour de vrai : elle démarre en
// `unauthorized` et n'émet aucune requête tant qu'aucun `LOGIN` n'est envoyé.
// La monter est donc moins coûteux que de la simuler, et plus fidèle.

describe("SignInForm — validation de champ", () => {
  beforeEach(() => {
    // `MemoryRouter` : le formulaire rend un `<Link>` vers l'inscription, et
    // react-router refuse d'être utilisé hors Router. C'est un besoin de
    // MONTAGE, pas un signe que le comportement relèverait de l'E2E — la
    // validation reste purement cliente.
    cy.mount(
      <MemoryRouter>
        <SignInForm authService={interpret(authMachine).start()} />
      </MemoryRouter>
    );
  });

  it("refuse un mot de passe de moins de 4 caractères", () => {
    cy.getBySel("signin-username").type("utilisateur");
    cy.getBySel("signin-password").type("abc");
    // `cy.focused()` et non `.blur()` sur le sujet : `data-test` est posé sur
    // le conteneur MUI, l'élément focalisé est l'<input> interne. `type` le
    // traverse tout seul, `blur` non.
    cy.focused().blur();
    cy.contains("Password must contain at least 4 characters").should("be.visible");
    cy.getBySel("signin-submit").should("be.disabled");
  });

  it("accepte un mot de passe de 4 caractères ou plus", () => {
    cy.getBySel("signin-username").type("utilisateur");
    cy.getBySel("signin-password").type("abcd");
    cy.focused().blur();
    cy.contains("Password must contain at least 4 characters").should("not.exist");
    cy.getBySel("signin-submit").should("not.be.disabled");
  });
});
