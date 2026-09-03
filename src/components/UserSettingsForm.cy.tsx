import UserSettingsForm from "./UserSettingsForm";
import { userResponseBuilder } from "@fixtures/builders/user.builder";

// Niveau COMPOSANT (ADR-004, lignes 11 et 13).
//
// Ligne 11 — quatre `data-test` posés via `inputProps` de MUI : c'est la
// bibliothèque, pas notre code, qui décide de les poser sur l'`<input>`.
// `check:selectors` prouve leur déclaration, pas leur livraison au DOM.
//
// Ligne 13 — la validation Formik/Yup et l'état du bouton, purement clients.
// Aucune spec E2E ne visite encore les réglages : sans ce fichier, la
// validation de ce formulaire n'est prouvée nulle part.

const CHAMPS = [
  "user-settings-firstName-input",
  "user-settings-lastName-input",
  "user-settings-email-input",
  "user-settings-phoneNumber-input",
] as const;

const profil = userResponseBuilder();

describe("UserSettingsForm", () => {
  beforeEach(() => {
    cy.mount(<UserSettingsForm userProfile={profil} updateUser={() => undefined} />);
  });

  it("pose chaque data-test sur l'<input> lui-même, pas sur un conteneur", () => {
    // Si le premier champ échoue, la queue s'arrête et les trois autres ne sont
    // pas rapportés. C'est assumé : le comportement prouvé est « MUI livre
    // l'attribut », qui est vrai ou faux pour les quatre à la fois.
    for (const cle of CHAMPS) cy.getBySel(cle).should("match", "input");
  });

  it("préremplit les quatre champs depuis le profil reçu", () => {
    cy.getBySel("user-settings-firstName-input").should("have.value", profil.firstName);
    cy.getBySel("user-settings-lastName-input").should("have.value", profil.lastName);
    cy.getBySel("user-settings-email-input").should("have.value", profil.email);
    cy.getBySel("user-settings-phoneNumber-input").should("have.value", profil.phoneNumber);
  });

  it("refuse une adresse e-mail mal formée et désactive l'envoi", () => {
    // `.blur()` porte directement sur le sujet, contrairement à SignInForm qui
    // doit passer par `cy.focused()` : ici le `data-test` est sur l'<input>,
    // pas sur le conteneur MUI. C'est exactement ce que le test ci-dessus
    // garantit — les deux se tiennent.
    cy.getBySel("user-settings-email-input").clear().type("pas-une-adresse").blur();
    cy.contains("Must contain a valid email address").should("be.visible");
    cy.getBySel("user-settings-submit").should("be.disabled");
  });

  it("accepte une adresse e-mail valide et réactive l'envoi", () => {
    cy.getBySel("user-settings-email-input").clear().type("heath@example.org").blur();
    cy.contains("Must contain a valid email address").should("not.exist");
    cy.getBySel("user-settings-submit").should("not.be.disabled");
  });

  it("refuse un champ obligatoire vidé", () => {
    cy.getBySel("user-settings-firstName-input").clear().blur();
    cy.contains("Enter a first name").should("be.visible");
    cy.getBySel("user-settings-submit").should("be.disabled");
  });
});
