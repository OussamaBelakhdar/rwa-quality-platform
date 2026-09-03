# ADR-010 — Un fournisseur OIDC local par défaut, le tenant Auth0 par variable

**Statut** : proposé
**Date** : 2026-09-03
**Semaine du plan** : 9

## Contexte

`docs/PLAN.md` ouvre la semaine 9 par « Compte Auth0 gratuit, tenant SPA ». Le
livrable, lui, est « le flux Auth0 testé avec `cy.session` + `cy.origin` ».
L'étape et le livrable ne disent pas la même chose, et l'étape **contredit un
principe de l'architecture**.

**P6 — aucune dépendance à un service tiers.** Ce principe n'est pas décoratif :
ADR-003 lui a sacrifié Cypress Cloud, Currents et sorry-cypress, après mesure,
pour que la suite tourne « sans compte, sans clé ». Exiger un compte Auth0 pour
exécuter la suite rétablit exactement ce qui avait été écarté — et le rétablit
sur le chemin d'authentification, c'est-à-dire sur le prérequis de 20 specs
sur 22.

Le conflit était latent depuis la semaine 0, quand le plan a été écrit. Il
devient bloquant maintenant, parce que la semaine 9 est la première à en
dépendre.

### Ce qu'un fournisseur local doit satisfaire, vérifié

Pour que la **même** commande `cy.loginAuth0()` fonctionne contre un serveur
local et contre un vrai tenant, le SDK ne doit voir aucune différence.

| Contrainte                              | Vérifiée où                                                                                | Conséquence                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Le domaine peut être non-HTTPS          | `auth0-spa-js`, `getDomain` : un domaine commençant par `http://` est utilisé **tel quel** | `http://localhost:3100` est accepté sans contournement        |
| L'issuer attendu vaut `${domaine}/`     | `auth0-spa-js`, `getTokenIssuer`                                                           | le serveur local doit émettre `iss: "http://localhost:3100/"` |
| Le flux est _authorization_code + PKCE_ | le SDK émet un `code_challenge`                                                            | le serveur doit vérifier `code_verifier` en S256              |
| Le backend valide RS256 contre un JWKS  | `backend/helpers.ts:15-27`                                                                 | le serveur doit publier `/.well-known/jwks.json`              |
| Aucune dépendance nouvelle              | `jsonwebtoken`, `jwks-rsa`, `express` déjà présents ; `crypto` exporte un JWK nativement   | le coût est en lignes, pas en surface de dépendances          |

## Options considérées

| Option                                                        | Avantages                                                                                                                                                                                                                                              | Inconvénients                                                                                                                                                                          | Coût                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **A. Tenant Auth0 réel uniquement**                           | Prouve la configuration d'un vrai tenant, y compris ses pièges                                                                                                                                                                                         | **Viole P6** : la suite ne tourne plus sans compte tiers. En CI, il faudrait des secrets de tenant dans le dépôt d'actions. Et le flux devient indisponible à quiconque clone le dépôt | un compte, des secrets en CI, et P6 abandonné |
| **B. Fournisseur local uniquement**                           | Suite auto-portante, CI verte sans compte, conforme à P6                                                                                                                                                                                               | Ne prouve **rien** de la configuration d'un vrai tenant : ni la connexion à une base d'utilisateurs, ni les règles, ni les pièges d'un dashboard                                       | ~250 lignes, mais une preuve amputée          |
| **C. Local par défaut, tenant réel par variable** _(retenue)_ | La suite tourne sans compte (P6) ; le **même** code s'exécute contre un vrai tenant en changeant `VITE_AUTH0_DOMAIN`. Le mécanisme testé — deux origines, `cy.origin`, PKCE, retour de redirection, validation RS256 — est identique dans les deux cas | Deux cibles à garder compatibles ; le serveur local peut diverger d'Auth0 sans qu'on le voie                                                                                           | ~250 lignes, aucune dépendance nouvelle       |

## Décision

**C.** Le fournisseur OIDC local est la cible **par défaut**. Pointer
`VITE_AUTH0_DOMAIN` sur un tenant réel suffit à exécuter exactement les mêmes
tests contre Auth0 — la commande, la spec et le backend ne changent pas.

Ce que cela **ne fait pas** : cocher le critère « Compte Auth0 gratuit ». Ce
critère reste **non tenu**, et `docs/PLAN.md` le porte comme tel. Substituer un
serveur local et déclarer l'étape satisfaite serait exactement l'adaptation de
critère que le skill `close-week` interdit. Ce qui est fait ici est autre chose :
constater qu'une **étape** du plan contredit un **principe** de l'architecture,
et trancher en faveur du principe — par un ADR, pas en silence.

## Ce que le fournisseur local prouve, et ce qu'il ne prouve pas

Cette section est la raison d'être de l'ADR. Un lecteur qui ne lit qu'elle doit
pouvoir juger.

| Prouvé                                                                                        | Non prouvé                                                                 |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `cy.origin` franchit une vraie frontière d'origine                                            | Qu'un tenant Auth0 est correctement configuré                              |
| Le retour de redirection est câblé — `onRedirectCallback`, échange du `code`, route d'arrivée | Que la connexion « Username-Password-Authentication » du tenant fonctionne |
| PKCE : le `code_verifier` est vérifié en S256                                                 | Les règles, actions et hooks propres à Auth0                               |
| Le backend valide un JWT **RS256 contre un JWKS**, avec `audience` et `issuer`                | Que le JWKS d'Auth0 est joignable depuis la CI                             |
| `cy.session` met la session en cache et la restaure                                           | Le comportement du formulaire hébergé d'Auth0 quand il change              |

La colonne de droite n'est pas une excuse : elle dit ce qu'il reste à faire le
jour où un tenant existe, et la réponse est « lancer la même commande ».

## Conséquences

- Positives :
  - La suite complète tourne sans compte ni clé, **P6 tenu jusqu'au bout**.
  - La CI exécute le flux au lieu de le mettre en attente.
  - Le prérequis à la charge du propriétaire passe de deux à **zéro** pour le
    chemin par défaut.
- Négatives assumées :
  - Le serveur local peut diverger du comportement réel d'Auth0. Il est
    volontairement **minimal** : ce qu'il n'implémente pas, il ne le simule pas.
  - Deux cibles à maintenir compatibles.
- Surveillé via :
  - Le serveur local vit dans `scripts/`, **hors du bundle applicatif**.
  - `backend/helpers.ts` accepte un domaine déjà préfixé par un schéma, comme
    le SDK — une seule règle, appliquée des deux côtés.

## Réversibilité

Revenir à l'option A ne touche **aucune spec** : il suffit de renseigner
`VITE_AUTH0_DOMAIN` avec le domaine d'un tenant. C'est précisément ce qui rend
la décision peu coûteuse — le fournisseur local n'est pas un chemin parallèle,
c'est une **cible interchangeable** du même chemin.
