# Semaine 9 — brouillon LinkedIn

Mon test a attendu dix minutes sans rien dire. Trois fois.

J'avais construit un fournisseur OIDC local pour tester le SSO sans dépendre d'un compte tiers. Il validait tout : PKCE, JWKS, redirection cross-origin, session en cache. **0,00 % de flake sur 10 exécutions.**

Puis j'ai branché un vrai tenant Auth0. Trois défauts de configuration sont sortis en vingt minutes — dont aucun n'était devinable, et aucun que mon simulateur ne pouvait produire.

Le pire n'était pas l'erreur. C'était le silence : Auth0 refusait la demande, l'application retentait, et les deux se renvoyaient la balle. Aucun message, aucun échec, juste une attente.

La cause était écrite dans l'URL depuis le début. Je l'ai obtenue en interrogeant `/authorize` **hors du navigateur** : trois minutes.

Un test qui échoue vous coûte une minute. Un test qui attend vous coûte la soirée.

Le vôtre, quand il bloque, il vous dit pourquoi ?
