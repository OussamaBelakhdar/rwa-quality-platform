/**
 * Chemins NÉGATIFS du fournisseur OIDC local (ADR-010).
 *
 * ADR-010 range dans sa colonne « prouvé » que les mauvais identifiants sont
 * refusés, que le `code_verifier` est vérifié en S256 et que le code
 * d'autorisation est à usage unique. C'était généreux : rien ne l'assertait.
 * Un fournisseur complaisant ferait passer des tests que le vrai refuserait —
 * le défaut exact que l'ADR s'engage à ne pas créer.
 *
 * Niveau CONTRAT et non E2E (ADR-004) : ce sont des propriétés d'un serveur
 * HTTP, elles se prouvent sans navigateur. Le seul chemin qui exige un
 * navigateur — la redirection cross-origin — reste dans `auth0.cy.ts`.
 *
 * Le serveur est démarré dans un processus enfant plutôt qu'importé : le module
 * appelle `app.listen()` au chargement, donc l'importer dans le worker de test
 * laisserait un port ouvert et ferait dépendre les tests de l'ordre des
 * fichiers (`fileParallelism: false` masque déjà assez de couplages ici).
 */
import { spawn, ChildProcess } from "child_process";
import { createHash, randomBytes } from "crypto";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
const UTILISATEUR = "test@rwa.local";
const MOT_DE_PASSE = "s3cret1234$";

let serveur: ChildProcess;

/**
 * Le port doit être LIBRE avant de démarrer.
 *
 * Sans ce contrôle, un serveur resté d'une exécution précédente répond à sa
 * place et les tests passent en interrogeant un fantôme — vérifié : deux
 * mutations du fournisseur (mot de passe accepté, code rejouable) laissaient
 * les trois tests VERTS parce qu'ils parlaient à l'ancien processus. Un test
 * qui passe pour la mauvaise raison est pire qu'un test absent.
 */
const portLibre = async () => {
  try {
    await fetch(`${BASE}/.well-known/jwks.json`, { signal: AbortSignal.timeout(500) });
  } catch {
    return; // personne n'écoute : c'est ce qu'on veut
  }
  throw new Error(
    `Un serveur écoute déjà sur ${BASE} — probablement une exécution précédente ` +
      `mal arrêtée. Les tests interrogeraient CE serveur, pas celui qu'ils démarrent.`
  );
};

const attendre = async (limiteMs = 20000) => {
  const debut = Date.now();
  while (Date.now() - debut < limiteMs) {
    try {
      if ((await fetch(`${BASE}/.well-known/jwks.json`)).ok) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("le fournisseur local n'a pas démarré");
};

/** Obtient un code d'autorisation valide pour le `code_challenge` donné. */
const codeAutorisation = async (challenge: string): Promise<string> => {
  const reponse = await fetch(`${BASE}/authorize`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: UTILISATEUR,
      password: MOT_DE_PASSE,
      redirect_uri: "http://localhost:3000",
      state: "ST",
      nonce: "N",
      code_challenge: challenge,
      audience: "http://localhost:3001",
      scope: "openid",
      client_id: "client-local",
    }),
    redirect: "manual",
  });
  const emplacement = reponse.headers.get("location");
  if (!emplacement) throw new Error(`pas de redirection : ${reponse.status}`);
  const code = new URL(emplacement).searchParams.get("code");
  if (!code) throw new Error("pas de code dans la redirection");
  return code;
};

const echanger = (code: string, verifier: string) =>
  fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: "client-local" }),
  });

const s256 = (v: string) => createHash("sha256").update(v).digest("base64url");

describe("Fournisseur OIDC local — chemins négatifs", () => {
  beforeAll(async () => {
    await portLibre();
    serveur = spawn(
      "npx",
      ["ts-node", "-T", "-P", "tsconfig.tsnode.json", path.join("scripts", "local-oidc.ts")],
      {
        env: { ...process.env, LOCAL_OIDC_PORT: String(PORT), LOCAL_OIDC_CONSENT: "" },
        stdio: "ignore",
        // `detached` crée un GROUPE de processus. Sans lui, `kill()` ne tue que
        // l'enveloppe `npx` et le `ts-node` qui détient le port survit —
        // constaté, c'est ce qui produisait le serveur fantôme.
        detached: true,
      }
    );
    await attendre();
  }, 40000);

  afterAll(() => {
    // Le groupe entier, pas seulement l'enveloppe : `-pid` vise le groupe.
    if (serveur?.pid) {
      try {
        process.kill(-serveur.pid, "SIGTERM");
      } catch {
        serveur.kill();
      }
    }
  });

  it("refuse un mot de passe faux au lieu de délivrer un code", async () => {
    const reponse = await fetch(`${BASE}/authorize`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: UTILISATEUR,
        password: "mauvais",
        redirect_uri: "http://localhost:3000",
        state: "ST",
        code_challenge: "CC",
      }),
      redirect: "manual",
    });
    expect(reponse.status).toBe(401);
    expect(reponse.headers.get("location")).toBeNull();
  });

  it("refuse un `code_verifier` qui ne correspond pas au challenge (PKCE S256)", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const code = await codeAutorisation(s256(verifier));

    const reponse = await echanger(code, "un-autre-verifier");
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error).toBe("invalid_grant");
  });

  it("refuse un code d'autorisation rejoué — usage unique", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const code = await codeAutorisation(s256(verifier));

    const premier = await echanger(code, verifier);
    expect(premier.status).toBe(200);
    expect((await premier.json()).access_token).toBeTypeOf("string");

    const rejeu = await echanger(code, verifier);
    expect(rejeu.status).toBe(400);
    expect((await rejeu.json()).error).toBe("invalid_grant");
  });
});
