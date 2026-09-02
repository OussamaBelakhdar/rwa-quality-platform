# Semaine 5 — brouillon LinkedIn

Trois causes. Un seul écran.

Sur l'application que je teste, une erreur 500, une coupure réseau et une liste réellement vide produisaient exactement le même rendu : « No Transactions ». Ni message, ni bouton pour réessayer.

Pas un oubli d'affichage : la machine d'état entrait bien dans un état `failure`, aucun composant ne le lisait. L'utilisateur ne pouvait pas savoir s'il n'avait rien, ou si le service était tombé.

En écrivant le correctif, un deuxième défaut est tombé : la machine croyait ranger le message du serveur, mais lisait `event.message` là où XState range l'erreur dans `event.data`. Le message était toujours vide. Personne ne s'en était aperçu — puisque personne ne l'affichait.

Aucun test contre le vrai backend ne trouvait ça : il ne renvoie jamais 500 et ne se coupe pas. Il a fallu fabriquer la panne.

Les deux sont corrigés, chacun verrouillé par un test qui échoue si on annule le correctif — vérifié, pas supposé.

Votre application distingue-t-elle « pas de données » de « le service est tombé » ?
