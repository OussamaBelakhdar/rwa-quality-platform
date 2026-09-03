/**
 * Nom de la clé `localStorage` sous laquelle le jeton d'accès SSO est déposé.
 *
 * Pourquoi cette constante existe : les cinq sites qui manipulaient ce nom
 * lisaient `process.env.VITE_AUTH_TOKEN_NAME!`, une variable **commentée par
 * défaut** dans `.env`. Non définie, `localStorage.setItem(undefined, jeton)`
 * range le jeton sous la chaîne littérale `"undefined"` — et la lecture, faite
 * de la même façon, le retrouve. Symétrique, donc silencieux : rien n'échoue,
 * et la clé est fausse.
 *
 * Le `!` non-null aggravait le cas : il affirmait à TypeScript une garantie que
 * la configuration ne donnait pas.
 *
 * Le défaut vaut `authAccessToken` — la valeur que `.env` propose en
 * commentaire, donc celle qu'un lecteur du dépôt attend. La variable reste
 * prioritaire : un déploiement qui la définit garde son nom.
 */
export const AUTH_TOKEN_NAME = process.env.VITE_AUTH_TOKEN_NAME || "authAccessToken";
