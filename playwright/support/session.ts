/**
 * Connexion par l'UI, rejouée à chaque test — l'équivalent Playwright de
 * `cy.login`, et la démonstration qu'il n'y a PAS d'équivalent direct.
 *
 * ── Trois conceptions essayées, deux abandonnées, et pourquoi ──
 *
 * 1. `POST /login` puis transposition des cookies vers le contexte du
 *    navigateur. **Échec** : `authMachine` persiste son état dans
 *    `localStorage` (`authState`) ; un cookie sans cet état ne rend pas
 *    l'application connectée. Elle redirigeait vers `/signin`.
 *
 * 2. Un projet `setup` qui se connecte une fois et sauvegarde le
 *    `storageState`, réutilisé par toutes les specs — le motif documenté par
 *    Playwright. **Échec mesuré** : reseeder avant chaque test faisait perdre
 *    la session en cours de suite, 3 fois sur 5, la page retombant sur l'écran
 *    de connexion avec « Network Error ».
 *
 *    Et retirer le reseed pour garder la session a été pire : les données
 *    s'accumulent d'un test à l'autre, la base grossit, et les échecs
 *    reviennent après quelques exécutions. Constaté en redémarrant
 *    l'application — deux runs verts, puis la dérive reprend.
 *
 * 3. Reseed ET connexion à chaque test *(retenue)*. Coût : environ une seconde
 *    par test. C'est le prix de l'isolation, et il est visible dans la durée de
 *    la suite plutôt que caché dans un flake d'une fois sur trois.
 *
 * Ce fichier est donc la pièce la plus parlante d'ADR-005 : `cy.session` amortit
 * la connexion sans sacrifier l'isolation parce que Cypress restaure la session
 * ET l'état applicatif. Reproduire cela ici demanderait de réimplémenter
 * `cy.session`. Les 895 lignes de couche L2 que la migration coûterait, ce sont
 * des fichiers comme celui-là.
 */
import { expect, type Page } from "@playwright/test";
import { MOT_DE_PASSE } from "./socle";

export async function connecter(page: Page, username: string): Promise<void> {
  await page.goto("/signin");
  await page.getByTestId("signin-username").locator("input").fill(username);
  await page.getByTestId("signin-password").locator("input").fill(MOT_DE_PASSE);
  await page.getByTestId("signin-submit").click();
  // On n'avance qu'une fois la session établie SUR LE BON UTILISATEUR : c'est
  // l'assertion qui a démasqué la spec d'onboarding, laquelle croyait connecter
  // un utilisateur neuf alors que la page restait celle de Heath93.
  await expect(page.getByTestId("sidenav-username")).toContainText(username);
}
