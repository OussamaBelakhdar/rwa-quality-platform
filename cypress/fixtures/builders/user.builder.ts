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
    // Suffixe incrémental : deux appels dans une même spec ne collisionnent
    // pas sur le username, qui est unique côté backend.
    compteur += 1;
    this.etat = {
      firstName: "Test",
      lastName: `Utilisateur${compteur}`,
      username: `test_user_${compteur}_${Date.now()}`,
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
