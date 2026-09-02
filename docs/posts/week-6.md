# Semaine 6 — brouillon LinkedIn

Mon garde-fou ne bloquait plus rien. Et il ne le disait pas.

Un hook du dépôt refuse tout `any` qui entre dans le code de test. Pour savoir quel fichier examiner, il lisait son argument avec `jq`.

`jq` n'est pas une dépendance déclarée du projet. Il est absent de l'image Docker de la CI. Sans lui, la variable restait vide et le hook sortait en 0 : il acceptait tout, en silence.

Ce n'est pas le hook qui l'a signalé. C'est un script écrit la semaine précédente — huit cas connus, rejoués à chaque `yarn lint`. Première exécution en CI, quatre lignes :

```
attendu BLOQUÉ, obtenu accepté
```

Un garde-fou qui échoue **ouvert** est pire qu'un garde-fou absent : celui-là, on lui fait confiance.

L'extraction passe maintenant par node, le runtime du projet, donc garanti partout où le dépôt tourne.

Vos hooks, vous savez ce qu'ils font quand une commande manque ?
