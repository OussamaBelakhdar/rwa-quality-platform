# Semaine 8 — brouillon LinkedIn

J'ai trouvé deux bugs en 283 millisecondes. Il en fallait 18.

Deux bugs réels : un montant négatif affiché `--$5.00`, un montant nul affiché `-0`. Trouvés trois semaines plus tôt par un test de bout en bout — base seedée, session ouverte, deux serveurs, une réponse réseau modifiée à la volée.

Or ces deux bugs sont `props → rendu`. Rien d'autre.

Réécrits en test de composant : **18 ms de médiane contre 283**, et plus rien à démarrer.

Ma suite comptait 60 tests et **zéro test de composant**, pour une cible affichée de 40 %. Le principe existait depuis le premier jour — il renvoyait à une décision d'architecture qui, elle, n'existait pas. Une règle citée par un document absent n'est pas une règle.

Le niveau de test le plus bas n'est pas une préférence : c'est un chiffre.

Le vôtre, vous l'avez mesuré ?
