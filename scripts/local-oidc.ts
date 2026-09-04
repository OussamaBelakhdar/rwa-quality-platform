/**
 * Fournisseur OIDC local, compatible `@auth0/auth0-spa-js` (ADR-010).
 *
 * Il existe pour que la suite tourne **sans compte tiers** (P6, le principe au
 * nom duquel ADR-003 a écarté Cypress Cloud). Pointer `VITE_AUTH0_DOMAIN` sur
 * un vrai tenant suffit à exécuter les mêmes tests contre Auth0 : ce serveur
 * est une cible interchangeable, pas un chemin parallèle.
 *
 * Il est VOLONTAIREMENT minimal. Ce qu'il n'implémente pas, il ne le simule
 * pas : pas de consentement, pas de rafraîchissement, pas de déconnexion
 * fédérée. Un faux serveur généreux ferait passer des tests que le vrai
 * refuserait — c'est le défaut exact que l'ADR s'engage à ne pas créer.
 *
 * Les sélecteurs du formulaire (`#username`, `#password`, `button[value=default]`)
 * reproduisent ceux de l'Universal Login d'Auth0, pour que `cy.loginAuth0()`
 * soit identique contre les deux cibles.
 */
import express, { Request, Response } from "express";
import cors from "cors";
import { createHash, generateKeyPairSync, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

const PORT = Number(process.env.LOCAL_OIDC_PORT || 3100);
const ISSUER = `http://localhost:${PORT}/`;
const KID = "cle-locale";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const JWK = { ...publicKey.export({ format: "jwk" }), kid: KID, use: "sig", alg: "RS256" };
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }) as string;

/** Identifiants acceptés. Mêmes variables que le chemin tenant réel. */
const UTILISATEUR = process.env.AUTH0_USERNAME || "test@rwa.local";
const MOT_DE_PASSE = process.env.AUTH0_PASSWORD || "s3cret1234$";

interface Autorisation {
  codeChallenge: string;
  nonce: string;
  audience: string;
  scope: string;
  clientId: string;
}

/** Codes d'autorisation en attente d'échange. À usage unique. */
const enAttente = new Map<string, Autorisation>();

const app = express();
app.use(express.urlencoded({ extended: false }));
// Le SDK échange le `code` depuis l'origine de l'application, donc en
// cross-origin : sans en-têtes CORS, le navigateur envoie un préflight qui
// échoue et le POST /oauth/token ne part JAMAIS. Constaté ici — neuf OPTIONS,
// zéro POST. Auth0 les émet nativement ; un fournisseur local doit le faire
// aussi, sous peine de tester un flux qui ne ressemble pas au vrai.
app.use(cors({ origin: true, credentials: true }));

// Trace minimale : sans elle, diagnostiquer « le clic n'a pas soumis » revient à
// deviner. Une ligne par requête suffit à distinguer un GET sans POST d'un POST
// refusé.
app.use((req, _res, next) => {
  console.log(`[oidc] ${req.method} ${req.path}`);
  next();
});

const echapper = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Formulaire de connexion. Le SDK y arrive par redirection depuis
 * l'application : c'est cette redirection qui fait de `cy.origin` autre chose
 * qu'une formalité.
 *
 * Le bouton n'a délibérément PAS d'attribut `name="action"`, contrairement à
 * l'Universal Login d'Auth0 : un contrôle de formulaire nommé `action` masque
 * `form.action` (DOM clobbering) et la soumission n'aboutit pas. Constaté ici —
 * le clic réussissait, aucune requête ne partait, et l'URL restait sur la page
 * d'autorisation. Le sélecteur de `cy.loginAuth0()` porte sur `value`, pas sur
 * le nom : il reste identique contre les deux cibles.
 */
app.get("/authorize", (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const champs = [
    "redirect_uri",
    "state",
    "nonce",
    "code_challenge",
    "audience",
    "scope",
    "client_id",
  ]
    .map((n) => `<input type="hidden" name="${n}" value="${echapper(q[n] || "")}">`)
    .join("");
  res.type("html").send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Connexion — fournisseur local</title></head><body>
<h1>Fournisseur OIDC local</h1>
<form method="post" action="/authorize">${champs}
  <label for="username">Adresse e-mail</label>
  <input id="username" name="username" type="text" autocomplete="username">
  <label for="password">Mot de passe</label>
  <input id="password" name="password" type="password" autocomplete="current-password">
  <button type="submit" value="default">Continue</button>
</form></body></html>`);
});

app.post("/authorize", (req: Request, res: Response) => {
  const b = req.body as Record<string, string>;
  if (b.username !== UTILISATEUR || b.password !== MOT_DE_PASSE) {
    // Refus explicite : un fournisseur qui accepte tout ne prouve rien.
    res.status(401).type("html").send('<p id="erreur">Wrong email or password.</p>');
    return;
  }
  const code = randomBytes(24).toString("hex");
  enAttente.set(code, {
    codeChallenge: b.code_challenge,
    nonce: b.nonce,
    audience: b.audience,
    scope: b.scope,
    clientId: b.client_id,
  });
  const url = new URL(b.redirect_uri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", b.state);

  // Écran de CONSENTEMENT, sous drapeau (`LOCAL_OIDC_CONSENT=true`).
  //
  // Précision qui a manqué à la première rédaction : Auth0 a DEUX écrans
  // intermédiaires distincts. Celui-ci reproduit le **consentement**, dont le
  // bouton porte `value=accept` — il n'apparaît pour une application
  // first-party que si `prompt=consent` est demandé, et « Allow Skipping User
  // Consent » le supprime.
  //
  // L'autre est la **confirmation de connexion**, qu'Auth0 affiche pour un
  // callback non vérifiable comme `localhost` et que ce réglage ne supprime
  // pas. Son balisage n'est pas documenté : il n'est donc PAS simulé ici.
  // Reproduire un écran qu'on n'a jamais vu donnerait une fausse assurance —
  // c'est exactement ce que l'ADR-010 s'engage à ne pas faire.
  //
  // Ce mode sert à exécuter la branche « accepter » de `cy.loginAuth0()` : une
  // branche jamais exécutée ne prouve rien.
  if (process.env.LOCAL_OIDC_CONSENT === "true") {
    // `code` et `state` passent par des champs cachés, PAS par la query de
    // l'`action` : un formulaire `method="get"` remplace la query string de son
    // action par ses propres champs. L'y laisser produirait une redirection
    // sans `code`, et un échec dont la cause serait invisible.
    const base = `${url.origin}${url.pathname}`;
    res.type("html").send(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Confirmer</title></head><body>
<h1>Autoriser l'application ?</h1>
<form method="get" action="${echapper(base)}">
  <input type="hidden" name="code" value="${echapper(code)}">
  <input type="hidden" name="state" value="${echapper(b.state)}">
  <button type="submit" value="accept">Accept</button>
</form>
</body></html>`);
    return;
  }

  res.redirect(url.toString());
});

app.post("/oauth/token", (req: Request, res: Response) => {
  const b = req.body as Record<string, string>;
  const attendu = enAttente.get(b.code);
  if (!attendu) {
    res
      .status(400)
      .json({ error: "invalid_grant", error_description: "Code inconnu ou déjà échangé." });
    return;
  }
  enAttente.delete(b.code);

  // PKCE : c'est la seule vérification cryptographique du flux côté client, et
  // l'omettre rendrait le test complaisant.
  const verifie = createHash("sha256")
    .update(b.code_verifier || "")
    .digest("base64url");
  if (verifie !== attendu.codeChallenge) {
    res
      .status(400)
      .json({ error: "invalid_grant", error_description: "code_verifier invalide (S256)." });
    return;
  }

  const commun = { iss: ISSUER, sub: `auth0|${UTILISATEUR}`, iat: Math.floor(Date.now() / 1000) };
  const idToken = jwt.sign(
    {
      ...commun,
      aud: attendu.clientId,
      nonce: attendu.nonce,
      email: UTILISATEUR,
      name: UTILISATEUR,
    },
    PEM,
    { algorithm: "RS256", keyid: KID, expiresIn: "1h" }
  );
  const accessToken = jwt.sign({ ...commun, aud: attendu.audience, scope: attendu.scope }, PEM, {
    algorithm: "RS256",
    keyid: KID,
    expiresIn: "1h",
  });
  res.json({
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: attendu.scope,
  });
});

/** Ce que `jwks-rsa` interroge côté backend pour valider la signature. */
app.get("/.well-known/jwks.json", (_req: Request, res: Response) => res.json({ keys: [JWK] }));

app.listen(PORT, () => {
  console.log(`fournisseur OIDC local sur ${ISSUER} (utilisateur : ${UTILISATEUR})`);
});
