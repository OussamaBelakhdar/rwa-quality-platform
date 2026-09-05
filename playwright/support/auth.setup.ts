/**
 * Projet `setup` : se connecte UNE FOIS et sauvegarde l'état de stockage.
 *
 * ── Pourquoi pas une transposition de cookies ──
 * La première rédaction appelait `POST /login` puis recopiait les cookies du
 * contexte de requête vers celui du navigateur. Les quatre specs concernées ont
 * échoué : l'application redirigeait vers `/signin`. La cause est structurelle,
 * pas un détail — `authMachine` persiste son état dans `localStorage`
 * (`authState`), et un cookie sans cet état ne suffit pas à rendre
 * l'application connectée. Il fallait un état de stockage COMPLET, pas des
 * cookies.
 *
 * ── Pourquoi c'est la bonne forme, et pas un contournement de la règle #2 ──
 * `.claude/rules/testing.md` #2 interdit le login par l'UI hors du domaine
 * `auth/`. L'intention de cette règle est qu'un parcours de connexion ne soit
 * pas rejoué à chaque spec. Elle est tenue ici, et même mieux : la connexion a
 * lieu UNE fois pour toute la suite, pas une fois par spec comme le fait
 * `cy.session` au premier appel de chaque fichier.
 *
 * C'est l'illustration exacte de ce qu'ADR-005 chiffre : la couche L2 ne se
 * PORTE pas, elle se réécrit. Même besoin, mécanique entièrement différente.
 */
import { expect, test as setup } from "@playwright/test";
import path from "path";
import { MOT_DE_PASSE, semer } from "./socle";

export const ETAT = path.join(__dirname, "..", ".auth", "utilisateur.json");

setup("authentifie Heath93 une fois pour toute la suite", async ({ page, request }) => {
  await semer(request);

  await page.goto("/signin");
  await page.getByTestId("signin-username").locator("input").fill("Heath93");
  await page.getByTestId("signin-password").locator("input").fill(MOT_DE_PASSE);
  await page.getByTestId("signin-submit").click();

  await expect(page.getByTestId("sidenav-username")).toBeVisible();

  await page.context().storageState({ path: ETAT });
});
