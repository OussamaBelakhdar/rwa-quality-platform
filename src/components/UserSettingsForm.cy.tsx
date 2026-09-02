import UserSettingsForm from "./UserSettingsForm";
import { DefaultPrivacyLevel, User } from "../models";

// Niveau COMPOSANT (ADR-004, ligne 3). Quatre `data-test` posés via `inputProps`
// de MUI, quatre attributs dont seul le rendu peut attester. Aucune spec E2E ne
// visite encore les réglages utilisateur : sans ce fichier, les quatre clés
// seraient typées sans être vérifiées nulle part.

const CHAMPS = [
  "user-settings-firstName-input",
  "user-settings-lastName-input",
  "user-settings-email-input",
  "user-settings-phoneNumber-input",
] as const;

// Le composant ne lit ni `password` ni `balance` ; ils sont présents parce que
// `User` les exige, pas parce que le test en dépend. Chaîne vide plutôt qu'un
// faux mot de passe : rien à confondre avec un secret (rules/testing.md #3).
const profil: User = {
  id: "u1",
  uuid: "3f1a6c2e-0000-4000-8000-000000000001",
  firstName: "Heath",
  lastName: "Hills",
  username: "Heath93",
  password: "",
  email: "heath@example.com",
  phoneNumber: "615-555-0134",
  balance: 0,
  avatar: "",
  defaultPrivacyLevel: DefaultPrivacyLevel.public,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  modifiedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("UserSettingsForm", () => {
  beforeEach(() => {
    cy.mount(<UserSettingsForm userProfile={profil} updateUser={() => undefined} />);
  });

  it("pose chaque data-test sur l'<input> lui-même, pas sur un conteneur", () => {
    for (const cle of CHAMPS) cy.getBySel(cle).should("match", "input");
  });

  it("préremplit les champs depuis le profil reçu", () => {
    cy.getBySel("user-settings-firstName-input").should("have.value", "Heath");
    cy.getBySel("user-settings-email-input").should("have.value", "heath@example.com");
  });
});
