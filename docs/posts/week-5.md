# Semaine 5 — brouillon LinkedIn

Trois causes. Un seul écran.

Sur l'application que je teste, une erreur 500, une coupure réseau et une liste réellement vide produisent exactement le même rendu : « No Transactions ». Ni message, ni bouton pour réessayer.

Ce n'est pas un oubli d'affichage. La machine d'état capture bien l'erreur : elle entre dans un état `failure` et y range le message du serveur. Aucun composant ne le lit. Le rendu retombe sur la branche « liste vide » — et l'utilisateur ne peut pas savoir s'il n'a rien, ou si le service est tombé.

Aucun test contre le vrai backend ne pouvait trouver ça : ce backend ne renvoie jamais 500 et ne se coupe pas. Il a fallu fabriquer la panne. Même méthode, deuxième trouvaille : un montant négatif s'affiche `--$5.00`.

12 tests réseau, 120 exécutions, 0 % de flake.

Votre application distingue-t-elle « pas de données » de « le service est tombé » ?
