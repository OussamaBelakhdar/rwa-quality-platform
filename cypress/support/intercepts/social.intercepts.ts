import { api, espionner } from "@support/intercepts/factories";
import type { InterceptAlias } from "@support/types";

/**
 * Factories d'intercept pour les likes et les commentaires — couche L2,
 * familles nommées par intention (ADR-008).
 *
 * Ce sont des ESPIONS : le backend répond vraiment. C'est voulu, et c'est même
 * tout l'intérêt ici. La branche `flake-demo` fait délibérément traîner
 * `POST /likes/:id` jusqu'à 5,5 s ; un stub effacerait exactement le
 * comportement qu'on cherche à absorber.
 *
 * Le matcher porte `*` en fin de chemin : la route est `/likes/:transactionId`,
 * donc l'identifiant fait partie de l'URL.
 */

/** `POST /likes/:transactionId` — latence serveur variable, par conception. */
export const interceptLike = (): InterceptAlias => espionner(api("/likes/*"), "like", "POST");

/** `POST /comments/:transactionId` — la réponse ne garantit pas l'ordre. */
export const interceptComment = (): InterceptAlias =>
  espionner(api("/comments/*"), "comment", "POST");
