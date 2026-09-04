# ADR-010 — Un fournisseur OIDC local par défaut, le tenant Auth0 par variable

**Statut** : accepté après revue `adr-challenger`
**Date** : 2026-09-03
**Semaine du plan** : 9

## Contexte

`docs/PLAN.md` ouvre la semaine 9 par « Compte Auth0 gratuit, tenant SPA ». Le
livrable, lui, est « le flux Auth0 testé avec `cy.session` + `cy.origin` ».
L'étape et le livrable ne disent pas la même chose, et l'étape **contredit un
principe de l'architecture**.

**P6 — aucune dépendance à un service tiers.** ADR-003 lui a sacrifié Cypress
Cloud, Currents et sorry-cypress, après mesure, pour que la suite tourne « sans
compte, sans clé ».

**Mais le précédent d'ADR-003 ne se transpose pas tel quel, et la première
rédaction de cet ADR s'appuyait dessus comme s'il le faisait.** Cypress Cloud
était de l'**outillage d'exécution** : le retirer ne change rien à ce que la
suite prouve de l'application. Auth0, en semaine 9, est le **sujet du test** —
la ligne du référentiel visée est « Authentification (Expert) ».

Le vrai conflit n'est donc pas « P6 contre une étape du plan », mais **P3 contre
P6**. P3 demande le niveau le plus bas qui prouve le comportement ; or pour du
SSO, le comportement à prouver **est** l'intégration à un fournisseur réel.
Remplacer ce tiers par notre propre simulateur revient, pour cette part précise,
à tester notre code contre lui-même.

C'est le compromis réellement en jeu, et il est tranché en connaissance de
cause : la suite doit rester exécutable par quiconque clone le dépôt, et la part
que le simulateur ne prouve pas est énumérée ci-dessous plutôt que passée sous
silence.

Le conflit était latent depuis la semaine 0, quand le plan a été écrit. Il
devient bloquant maintenant, parce que la semaine 9 est la première à en
dépendre.

### Ce qu'un fournisseur local doit satisfaire, vérifié

Pour que la **même** commande `cy.loginAuth0()` fonctionne contre un serveur
local et contre un vrai tenant, le SDK ne doit voir aucune différence.

| Contrainte                              | Vérifiée où                                                                                                                                                                                                                                                                                         | Conséquence                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Le domaine peut être non-HTTPS          | `auth0-spa-js`, `getDomain` : un domaine commençant par `http://` est utilisé **tel quel**                                                                                                                                                                                                          | `http://localhost:3100` est accepté sans contournement        |
| L'issuer attendu vaut `${domaine}/`     | `auth0-spa-js`, `getTokenIssuer`                                                                                                                                                                                                                                                                    | le serveur local doit émettre `iss: "http://localhost:3100/"` |
| Le flux est _authorization_code + PKCE_ | le SDK émet un `code_challenge`                                                                                                                                                                                                                                                                     | le serveur doit vérifier `code_verifier` en S256              |
| Le backend valide RS256 contre un JWKS  | `backend/helpers.ts:15-27`                                                                                                                                                                                                                                                                          | le serveur doit publier `/.well-known/jwks.json`              |
| Une seule dépendance déclarée           | `jwks-rsa`, `express` et `cors` déjà présents ; `crypto` exporte un JWK nativement. **`jsonwebtoken` ne l'était PAS** : il n'existait dans `node_modules` que par le hoisting d'`express-jwt` — une dépendance fantôme, dont rien ne garantissait la version. Déclarée en `devDependencies` (8.5.1) | le coût est en lignes, plus une dépendance rendue explicite   |

## Options considérées

| Option                                                        | Avantages                                                                                                                                                                                                                                              | Inconvénients                                                                                                                                                                          | Coût                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **A. Tenant Auth0 réel uniquement**                           | Prouve la configuration d'un vrai tenant, y compris ses pièges                                                                                                                                                                                         | **Viole P6** : la suite ne tourne plus sans compte tiers. En CI, il faudrait des secrets de tenant dans le dépôt d'actions. Et le flux devient indisponible à quiconque clone le dépôt | un compte, des secrets en CI, et P6 abandonné |
| **B. Fournisseur local uniquement**                           | Suite auto-portante, CI verte sans compte, conforme à P6                                                                                                                                                                                               | Ne prouve **rien** de la configuration d'un vrai tenant : ni la connexion à une base d'utilisateurs, ni les règles, ni les pièges d'un dashboard                                       | **177 lignes**, mais une preuve amputée       |
| **C. Local par défaut, tenant réel par variable** _(retenue)_ | La suite tourne sans compte (P6) ; le **même** code s'exécute contre un vrai tenant en changeant `VITE_AUTH0_DOMAIN`. Le mécanisme testé — deux origines, `cy.origin`, PKCE, retour de redirection, validation RS256 — est identique dans les deux cas | Deux cibles à garder compatibles ; le serveur local peut diverger d'Auth0 sans qu'on le voie                                                                                           | **177 lignes**, une dépendance déclarée       |

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

| Prouvé                                                                                                     | Non prouvé                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cy.origin` franchit une vraie frontière d'origine                                                         | Qu'un tenant Auth0 est correctement configuré                                                                                                                             |
| Le retour de redirection est câblé — `onRedirectCallback`, échange du `code`, route d'arrivée              | Que la connexion « Username-Password-Authentication » du tenant fonctionne                                                                                                |
| PKCE : le `code_verifier` est vérifié en S256                                                              | Les règles, actions et hooks propres à Auth0                                                                                                                              |
| Le backend valide un JWT **RS256 contre un JWKS**, avec `audience` et `issuer`                             | Que le JWKS d'Auth0 est joignable depuis la CI                                                                                                                            |
| `cy.session` met la session en cache et la restaure                                                        | Le comportement du formulaire hébergé d'Auth0 quand il change                                                                                                             |
| Le code d'autorisation est à **usage unique** — un rejeu échoue _(asserté : `scripts/local-oidc.test.ts`)_ | Qu'un `client_id`, une `audience` ou un `scope` **non enregistrés** soient refusés : le serveur local réémet ce qu'il reçoit, là où un tenant vérifie contre son registre |
| Les mauvais identifiants sont **refusés** (401), pas acceptés                                              | L'expiration d'un code d'autorisation, et le contrôle de `code_challenge_method` — supposé S256, jamais vérifié                                                           |

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

## Ce que devient le critère « Compte Auth0 gratuit »

La revue a relevé que la première rédaction laissait ce point en suspens. Il est
tranché ici, parce qu'un critère laissé « rouge sans suite » est un critère qui
finit par être ignoré.

**Il reste non tenu, et la semaine 9 reste ouverte.** Le skill `close-week`
exige que chaque critère de `docs/PLAN.md` soit prouvé ; celui-ci ne l'est pas,
et cet ADR **ne le supersède pas**. Il documente un renoncement délimité, pas
une équivalence.

Deux issues, et une seule les ferme :

| Issue                                       | Effet                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Un tenant Auth0 est créé                    | `VITE_AUTH0_DOMAIN` change, **rien d'autre** ne bouge : mêmes commande, spec, backend et job CI. Le critère devient tenu, la semaine se clôt |
| Le dépôt assume de rester sans compte tiers | Alors c'est **`docs/PLAN.md` qu'il faut modifier**, par une décision explicite retirant l'étape — pas cet ADR qui la contournerait           |

La seconde issue n'est pas prise ici : réécrire un critère pour le satisfaire est
exactement ce que `close-week` interdit, et ce serait le faire au moment précis
où il gêne. Le choix appartient au propriétaire du dépôt, pas à l'ADR qui a
introduit l'alternative.

## Réversibilité

Revenir à l'option A ne touche **aucune spec** : il suffit de renseigner
`VITE_AUTH0_DOMAIN` avec le domaine d'un tenant. C'est précisément ce qui rend
la décision peu coûteuse — le fournisseur local n'est pas un chemin parallèle,
c'est une **cible interchangeable** du même chemin.
