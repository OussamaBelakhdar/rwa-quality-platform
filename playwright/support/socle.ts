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

  // ── ATTENDRE QUE L'ÉCRITURE SOIT STABILISÉE ──────────────────────────────
  //
  // La route rend 200 dès qu'elle a lancé l'écriture, pas quand lowdb a fini de
  // la poser sur disque. Naviguer aussitôt fait tomber la première requête de
  // l'application dans cette fenêtre : elle échoue, et l'écran affiche
  // « Network Error » au lieu du formulaire attendu.
  //
  // Ce n'est pas une supposition. L'amont documente la même course dans
  // `vite.config.ts` — « #1666: Run tests sequentially to avoid race conditions
  // with shared database.json file » — et impose `fileParallelism: false` pour
  // la même raison. Mesuré ici : 2 échecs sur 3 exécutions de la suite, jamais
  // en lançant la spec seule.
  //
  // Une temporisation fixe serait la mauvaise réponse — la règle #3 l'interdit
  // côté Cypress et rien ne justifie de l'autoriser ici. On interroge donc
  // l'état jusqu'à ce qu'il soit lisible.
  await attendreLisible(api);
}

/** Interroge la base jusqu'à ce qu'elle réponde une collection non vide. */
async function attendreLisible(api: APIRequestContext, msMax = 5000): Promise<void> {
  const debut = Date.now();
  for (;;) {
    const r = await api.get(`${API}/testData/users`);
    if (r.ok()) {
      const corps = (await r.json()) as { results?: unknown[] };
      if ((corps.results?.length ?? 0) > 0) return;
    }
    if (Date.now() - debut > msMax) {
      throw new Error(`Le seed n'est pas devenu lisible en ${msMax} ms.`);
    }
  }
}

/** Une entité du seed, lue par l'API de test. Sert à choisir un utilisateur réel. */
export async function lire<T>(api: APIRequestContext, entite: string): Promise<T[]> {
  const reponse = await api.get(`${API}/testData/${entite}`);
  if (!reponse.ok()) throw new Error(`Lecture de « ${entite} » : HTTP ${reponse.status()}`);
  const corps = (await reponse.json()) as { results?: T[] } & Record<string, T[]>;
  return corps.results ?? corps[entite] ?? [];
}

/**
 * Attend qu'une écriture soit RELUE par le serveur avant de continuer.
 *
 * ── Pourquoi c'est nécessaire, et pourquoi ce n'est pas une temporisation ──
 * `PATCH /users/:id` répond 204 dès qu'il a lancé l'écriture dans lowdb. La
 * requête SUIVANTE — celle que fait l'application au chargement de page — peut
 * tomber pendant la réécriture du fichier. Passport ne retrouve alors pas
 * l'utilisateur, invalide la session, et l'application repart sur l'écran de
 * connexion.
 *
 * Mesuré : `GET /checkAuth` n'est pas refusé, il est ANNULÉ. Ni 401, ni erreur
 * serveur — la requête n'aboutit pas. Trois échecs sur quatre essais sur WebKit,
 * jamais dans la suite Cypress, qui laisse plus de temps entre les deux gestes.
 *
 * L'amont connaît cette course et la contourne ailleurs : `vite.config.ts` porte
 * « #1666: Run tests sequentially to avoid race conditions with shared
 * database.json file ». Le défaut est dans l'application, pas dans le test.
 *
 * On n'attend donc pas UNE DURÉE, on attend un FAIT : que le serveur relise ce
 * qu'il vient d'écrire. Une temporisation fixe masquerait la course sans la
 * supprimer, et la règle #3 l'interdit côté Cypress — rien ne justifie de
 * l'autoriser ici.
 */
export async function attendreEcritureRelue(
  api: APIRequestContext,
  entite: string,
  predicat: (ligne: Record<string, unknown>) => boolean,
  msMax = 5000
): Promise<void> {
  const debut = Date.now();
  for (;;) {
    const r = await api.get(`${API}/testData/${entite}`);
    if (r.ok()) {
      const corps = (await r.json()) as { results?: Record<string, unknown>[] };
      if ((corps.results ?? []).some(predicat)) return;
    }
    if (Date.now() - debut > msMax) {
      throw new Error(`L'écriture sur « ${entite} » n'était pas relisible en ${msMax} ms.`);
    }
  }
}
