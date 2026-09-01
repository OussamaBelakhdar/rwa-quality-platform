# Semaine 2 — brouillon LinkedIn

`cy.session` a fait gagner 35 % à ma suite de tests. Pas pour la raison que j'attendais.

On explique toujours `cy.session` par le cache du cookie : on s'authentifie une fois, on rejoue le cookie, on économise des allers-retours réseau.

Sur cette application, le cookie n'était pas le sujet.

L'état d'authentification de la Cypress Real World App est persisté par une machine XState dans `localStorage`. La machine démarre en `unauthorized` et ne consulte jamais `/checkAuth` d'elle-même — elle reprend ce qu'elle trouve. Un `cy.request('POST /login')` parfaitement valide pose donc un cookie que le serveur reconnaît, devant une interface qui vous croit déconnecté.

Ce que `cy.session` met en cache et qu'on oublie de citer : `localStorage`. C'est de là que vient le gain.

Le chiffre, à périmètre égal — mêmes 8 specs, mêmes 20 tests : **12-13 s avant, 8 s après**. Deux chargements de page par test, ramenés à un.

Et la vérification qui compte davantage que le chiffre : trois exécutions en ordre aléatoire, 22 tests sur 22. Un cache partagé entre tests est un couplage potentiel ; l'annoncer plus rapide sans prouver qu'il reste isolé, c'est vendre une dette.

Quand vous mesurez un gain de perf sur une suite, vous vérifiez quoi d'autre que le chronomètre ?
