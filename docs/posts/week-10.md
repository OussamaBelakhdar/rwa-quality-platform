# Semaine 10 — brouillon LinkedIn

Mon hook de qualité écrivait `unbound variable` sur stderr depuis des semaines. Personne ne lit stderr quand un contrôle passe au vert.

Deux de ses règles étaient mortes — les deux plus dures : pas d'accès direct à la base, pas de mot de passe en dur. Une spec contenant `s3cret` en clair est passée sans un mot.

J'ai compté. **Sept garde-fous de ce dépôt avaient cessé de garder. Cinq laissaient passer ce qu'ils existaient pour bloquer.** Aucun n'a été trouvé par la CI : elle était verte à chaque fois, par construction.

Le pire est le septième : il était dans le code que j'écrivais pour empêcher les six autres.

J'avais prouvé chaque correction par mutation. Puis j'ai vu qu'il n'en restait rien — ces preuves vivaient dans un terminal.

Elles tournent maintenant à chaque `lint`.

Vos quality gates, quelqu'un a vérifié qu'elles savent encore échouer ?
