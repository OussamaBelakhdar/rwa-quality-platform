# Semaine 4 — brouillon LinkedIn

Mon script de preuve d'isolation exécutait 30 tests. Ma suite en compte 34. Il affichait « All specs passed » depuis trois jours.

En semaine 3 j'avais élargi le `specPattern` de Cypress à `cypress/{e2e,api}`. Le script d'ordre aléatoire, lui, balayait toujours `cypress/e2e` en dur. Personne ne ment : les 30 tests passaient vraiment. Simplement, la preuve couvrait moins que ce qu'elle prétendait couvrir.

Je ne l'ai vu qu'en comparant deux chiffres côte à côte dans la même sortie de terminal. `cy:run` : 34. `cy:random` : 30.

C'est le deuxième outil de vérification de ce projet à se tromper sur son propre périmètre. Le premier, `yarn types`, ne compilait pas le dossier `cypress/` — celui-là même qu'il était censé garder. Les deux affichaient vert.

La correction n'est pas de recompter à la main. C'est d'ajouter la garde qui rend l'erreur impossible : le script signale désormais toute spec de `cypress/` qu'il ne balaie pas, et sort en erreur.

Ce que je retiens : **un outil de mesure qui ne vérifie pas son propre périmètre est un outil qui vous ment poliment.** Il ne dit jamais « je n'ai pas regardé » — il dit « tout va bien ».

Le chiffre de la semaine : 34 tests, 3 ordres aléatoires, 340 exécutions au burn, 0 % de flake. Il vaut ce que vaut le périmètre qu'il couvre — et cette fois, le périmètre est vérifié.

Vos scripts de CI, ils vérifient qu'ils regardent bien tout ?
