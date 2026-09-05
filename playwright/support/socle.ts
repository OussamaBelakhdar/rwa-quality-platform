/**
 * Socle partagé avec la suite Cypress — et c'est le seul (ADR-005, borne 2).
 *
 * Ce fichier ne « réutilise » rien : il consomme les MÊMES endpoints HTTP que
 * `cypress/plugins/db.task.ts`. C'est la différence entre du code partagé, qui
 * couple deux outils, et un CONTRAT partagé, qui ne couple personne.
 *
 * La mesure d'ADR-005 le rend visible : sur 3 301 lignes de suite, les 535 qui
 * survivraient à une migration sont exactement celles qui passent par HTTP
 * (ADR-007) ou par du TypeScript pur. Ce module en est la démonstration
 * exécutable.
 */
import type { APIRequestContext } from "@playwright/test";

export const API = process.env.PW_API_URL ?? "http://localhost:3001";
export const APP = process.env.PW_BASE_URL ?? "http://localhost:3000";

/** Mot de passe public du seed. Jamais un secret — il vit dans `.env` commité. */
export const MOT_DE_PASSE = process.env.PW_DEFAULT_PASSWORD ?? "s3cret";

/**
 * Remet la base dans un état connu. Équivalent strict de `cy.seed(...)` : même
 * endpoint, même effet, aucun code commun.
 */
export async function semer(
  api: APIRequestContext,
  scenario: "default" | "empty" = "default"
): Promise<void> {
  const reponse = await api.post(`${API}/testData/seed/${scenario}`);
  if (!reponse.ok()) {
    throw new Error(
      `Seed « ${scenario} » refusé : HTTP ${reponse.status()}. ` +
        `L'application tourne-t-elle avec \`yarn dev:test\` ?`
    );
  }
}

/** Une entité du seed, lue par l'API de test. Sert à choisir un utilisateur réel. */
export async function lire<T>(api: APIRequestContext, entite: string): Promise<T[]> {
  const reponse = await api.get(`${API}/testData/${entite}`);
  if (!reponse.ok()) throw new Error(`Lecture de « ${entite} » : HTTP ${reponse.status()}`);
  const corps = (await reponse.json()) as { results?: T[] } & Record<string, T[]>;
  return corps.results ?? corps[entite] ?? [];
}
