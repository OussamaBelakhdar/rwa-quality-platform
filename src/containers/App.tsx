import React from "react";
import { styled } from "@mui/material/styles";
import { Switch, Route, Redirect } from "react-router-dom";
import { useActor, useMachine } from "@xstate/react";
import { CssBaseline } from "@mui/material";

import { snackbarMachine } from "../machines/snackbarMachine";
import { notificationsMachine } from "../machines/notificationsMachine";
import { authService } from "../machines/authMachine";
import AlertBar from "../components/AlertBar";
import SignInForm from "../components/SignInForm";
import SignUpForm from "../components/SignUpForm";
import { bankAccountsMachine } from "../machines/bankAccountsMachine";
import PrivateRoutesContainer from "./PrivateRoutesContainer";
import { registerScopedService, registerService } from "../utils/testHooks";

const PREFIX = "App";

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

// Registre du projet (ADR-006). Le bloc ci-dessus vient de l'amont et reste
// intact — pas de conflit lors d'une resynchronisation. C'est celui-ci que la
// couche L2 lit. authService est un singleton de module : il s'enregistre ici.
registerService("auth", authService);

const App: React.FC = () => {
  const [authState] = useActor(authService);
  const [, , notificationsService] = useMachine(notificationsMachine);

  const [, , snackbarService] = useMachine(snackbarMachine);

  const [, , bankAccountsService] = useMachine(bankAccountsMachine);

  // Services portés par ce composant : enregistrés au montage, retirés au
  // démontage (ADR-006). Leur durée de vie n'est pas celle d'authService.
  React.useEffect(
    () => registerScopedService("notifications", notificationsService),
    [notificationsService]
  );
  React.useEffect(() => registerScopedService("snackbar", snackbarService), [snackbarService]);
  React.useEffect(
    () => registerScopedService("bankAccounts", bankAccountsService),
    [bankAccountsService]
  );

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
      {authState.matches("unauthorized") && (
        <Switch>
          <Route exact path="/signup">
            <SignUpForm authService={authService} />
          </Route>
          <Route exact path="/signin">
            <SignInForm authService={authService} />
          </Route>
          <Route path="/*">
            <Redirect
              to={{
                pathname: "/signin",
              }}
            />
          </Route>
        </Switch>
      )}
      <AlertBar snackbarService={snackbarService} />
    </Root>
  );
};

export default App;
