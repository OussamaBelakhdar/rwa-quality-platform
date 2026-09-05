/**
 * Connexion programmatique, l'équivalent Playwright de `cy.login`.
 *
 * ── Pourquoi ce fichier existe alors que `cy.login` fait déjà cela ──
 * C'est exactement le coût qu'ADR-005 chiffre : la couche L2 ne survit PAS à un
 * changement d'outil. `cy.login` s'appuie sur `cy.session`, qui n'a pas
 * d'équivalent direct ; Playwright met en cache un ÉTAT DE STOCKAGE sur disque,
 * ce qui est une autre mécanique pour le même besoin.
 *
 * Les 895 lignes de L2 comptées dans ADR-005 sont faites de fichiers comme
 * celui-ci. Le voir en double est la démonstration du chiffre, pas un oubli.
 */
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { API, APP, MOT_DE_PASSE } from "./socle";

/**
 * Connecte par l'API et injecte la session dans le contexte du navigateur.
 *
 * Le passage par l'API — et non par le formulaire — suit la même règle que la
 * suite Cypress (`.claude/rules/testing.md` #2) : le login par l'UI n'est testé
 * QUE dans la spec qui a pour objet de le tester. Partout ailleurs il est une
 * précondition, et une précondition ne se rejoue pas par l'interface.
 */
export async function connecter(
  contexte: BrowserContext,
  api: APIRequestContext,
  username: string
): Promise<void> {
  const reponse = await api.post(`${API}/login`, {
    data: { username, password: MOT_DE_PASSE },
  });
  if (!reponse.ok()) {
    throw new Error(
      `Connexion refusée pour « ${username} » : HTTP ${reponse.status()}. ` +
        `L'utilisateur existe-t-il dans le seed courant ?`
    );
  }

  // Les cookies de la réponse API sont portés par le contexte de requête ; on
  // les transpose sur le contexte du navigateur, qui est un espace distinct.
  const cookies = await api.storageState();
  await contexte.addCookies(cookies.cookies);
}

/** Ouvre une page déjà authentifiée sur la route demandée. */
export async function ouvrirConnecte(page: Page, route: string): Promise<void> {
  await page.goto(`${APP}${route}`);
}
