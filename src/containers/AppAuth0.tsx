/* istanbul ignore next */
import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import { useActor, useMachine } from "@xstate/react";
import { CssBaseline } from "@mui/material";

import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { registerScopedService, registerService } from "../utils/testHooks";

const PREFIX = "appAuth0";

const classes = {
  root: `${PREFIX}-root`,
};

const Root = styled("div")(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: "flex",
  },
}));

// @ts-ignore
if (window.Cypress) {
  // Expose authService on window for Cypress
  // @ts-ignore
  window.authService = authService;
}

// Registre du projet (ADR-006), à l'identique d'App.tsx : le bloc ci-dessus
// vient de l'amont et reste intact — pas de conflit lors d'une
// resynchronisation. C'est celui-ci que la couche L2 lit.
//
// Sans cette ligne, `cy.login` est INOPÉRANT en mode Auth0 : il passe par
// `sendToService("auth", …)`, donc par `window.__services__.auth`, que ce
// shell n'alimentait pas. ADR-006 avait reporté ce chantier « à l'ADR-005 »,
// qui n'existe pas ; ADR-009 le referme pour Auth0.
registerService("auth", authService);

/* istanbul ignore next */
const AppAuth0: React.FC = () => {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();

  const [authState] = useActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

  // Services portés par ce composant : enregistrés au montage, retirés au
  // démontage (ADR-006). Leur durée de vie n'est pas celle d'authService.
  useEffect(
    () => registerScopedService("notifications", notificationsService),
    [notificationsService]
  );
  useEffect(() => registerScopedService("snackbar", snackbarService), [snackbarService]);
  useEffect(
    () => registerScopedService("bankAccounts", bankAccountsService),
    [bankAccountsService]
  );

  useEffect(() => {
    (async function waitForToken() {
      const token = await getAccessTokenSilently();
      authService.send("AUTH0", { user, token });
    })();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  const isLoggedIn =
    authState.matches("authorized") ||
    authState.matches("refreshing") ||
    authState.matches("updating");

  return (
    <Root className={classes.root}>
      <CssBaseline />

      {isLoggedIn && (
        <PrivateRoutesContainer
          isLoggedIn={isLoggedIn}
          notificationsService={notificationsService}
          authService={authService}
          snackbarService={snackbarService}
          bankAccountsService={bankAccountsService}
        />
      )}

      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

const appAuth0 = withAuthenticationRequired(AppAuth0);
export default appAuth0;
