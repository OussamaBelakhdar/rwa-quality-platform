import { DefaultPrivacyLevel } from "../../../src/models";
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
