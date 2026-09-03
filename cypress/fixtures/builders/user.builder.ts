import { DefaultPrivacyLevel, User } from "../../../src/models";
import type { NouvelUtilisateur } from "@plugins/db.task";

/**
 * Builder d'utilisateur — couche L1 (docs/ARCHITECTURE.md §4).
 *
 * Interface fluide publiée par l'architecture : `userBuilder().withBankAccount().build()`.
 *
 * Pourquoi un builder plutôt qu'un JSON de fixture : des defaults valides, des
 * écarts explicites, et aucun fichier `user-sans-compte-bancaire.json` à
 * maintenir. Ce qui varie est lisible sur la ligne d'appel.
 *
 * Le mot de passe n'est PAS dans le builder : `cy.createUser` l'injecte depuis
 * `cy.env(['defaultPassword'])`. Un mot de passe en dur est interdit par
 * .claude/rules/testing.md #3 et bloqué par le hook.
 */
export type UtilisateurSansMotDePasse = Omit<NouvelUtilisateur, "password">;

let compteur = 0;

export const userBuilder = (): UserBuilder => new UserBuilder();

class UserBuilder {
  private etat: UtilisateurSansMotDePasse;

  constructor() {
    // Unicité du username. Le compteur seul ne suffit pas : sa portée est le
    // FICHIER de spec, pas la suite — Cypress recharge le module pour chaque
    // spec, donc deux specs repartent toutes deux à 1. `Date.now()` seul ne
    // suffit pas non plus : deux specs démarrant dans la même milliseconde
    // collisionneraient, cas qui devient plausible avec le sharding de la
    // semaine 6. On combine les trois, dont un aléatoire.
    compteur += 1;
    const empreinte = `${compteur}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    // Defaults RÉELLEMENT valides (§4). Sans `defaultPrivacyLevel`, toute
    // transaction créée par cet utilisateur reçoit `privacyLevel: null`
    // (backend/database.ts) et devient invisible du flux public, qui filtre
    // sur `privacyLevel === "public"`. Vérifié : un builder incomplet
    // produisait des données inexploitables par la moitié de l'application.
    this.etat = {
      firstName: "Test",
      lastName: `Utilisateur${compteur}`,
      username: `test_user_${empreinte}`,
      email: `${empreinte}@example.test`,
      phoneNumber: "555-0100",
      avatar: `https://avatars.dicebear.com/api/human/${empreinte}.svg`,
      defaultPrivacyLevel: DefaultPrivacyLevel.public,
      withBankAccount: true,
    };
  }

  /** Défaut. Explicite quand la spec veut le dire. */
  withBankAccount(): this {
    this.etat.withBankAccount = true;
    return this;
  }

  /** Déclenche le dialogue d'onboarding au premier chargement. */
  withoutBankAccount(): this {
    this.etat.withBankAccount = false;
    return this;
  }

  named(username: string): this {
    this.etat.username = username;
    return this;
  }

  build(): UtilisateurSansMotDePasse {
    return { ...this.etat };
  }
}

/**
 * Utilisateur COMPLET, tel que l'API le renvoie — pour monter un composant.
 *
 * À ne pas confondre avec `userBuilder()` ci-dessus, qui produit un
 * `NouvelUtilisateur` destiné au SEED : celui-là n'a ni `id`, ni `uuid`, ni
 * `balance`, parce que c'est le backend qui les attribue. Un composant, lui,
 * reçoit l'objet déjà créé — deux besoins distincts, deux fabriques.
 *
 * Signature `(overrides?: Partial<User>): User` conforme à
 * .claude/rules/typescript.md : defaults valides, écarts explicites.
 */
export const userResponseBuilder = (overrides: Partial<User> = {}): User => ({
  id: "u1",
  uuid: "3f1a6c2e-0000-4000-8000-000000000001",
  firstName: "Heath",
  lastName: "Hills",
  username: "Heath93",
  // Le champ existe dans `User` ; aucun composant ne le lit. Chaîne vide
  // plutôt qu'un faux secret (.claude/rules/testing.md #3).
  password: "",
  email: "heath@example.com",
  phoneNumber: "615-555-0134",
  balance: 0,
  avatar: "",
  defaultPrivacyLevel: DefaultPrivacyLevel.public,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  modifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
