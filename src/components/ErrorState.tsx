import React from "react";
import { Button, Grid, Typography } from "@mui/material";

export interface ErrorStateProps {
  /** Ce que l'on n'a pas pu charger, au pluriel : « transactions », « notifications ». */
  entity: string;
  /** Message porté par la machine d'état. Affiché tel quel. */
  message?: string;
  /** Relance la requête. Sans elle, l'écran d'erreur est une impasse. */
  onRetry?: () => void;
}

/**
 * Écran d'échec de chargement, partagé par toutes les surfaces bâties sur
 * `dataMachine`.
 *
 * Il existe parce que l'état `failure` n'était rendu nulle part : une erreur
 * serveur et une liste réellement vide produisaient le même « No <entity> »,
 * et l'utilisateur ne pouvait pas distinguer « je n'ai rien » de « le service
 * est tombé ». Sur le détail de transaction, l'échec ne rendait carrément rien.
 *
 * Un seul composant et des `data-test` FIXES plutôt qu'un bloc recopié par
 * écran : le contrat d'erreur est le même partout, donc une seule assertion le
 * couvre, et un correctif sur l'un profite à tous.
 */
const ErrorState: React.FC<ErrorStateProps> = ({ entity, message, onRetry }) => (
  <Grid
    container
    direction="column"
    justifyContent="center"
    alignItems="center"
    spacing={2}
    style={{ padding: 24, width: "100%" }}
    data-test="error-state"
  >
    <Grid item>
      <Typography component="h2" variant="h6" color="error">
        Unable to load {entity}
      </Typography>
    </Grid>
    <Grid item>
      <Typography variant="body2" color="textSecondary" data-test="error-state-message">
        {message}
      </Typography>
    </Grid>
    {onRetry && (
      <Grid item>
        <Button variant="contained" color="primary" data-test="error-state-retry" onClick={onRetry}>
          Retry
        </Button>
      </Grid>
    )}
  </Grid>
);

export default ErrorState;
