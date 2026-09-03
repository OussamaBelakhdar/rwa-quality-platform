import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import {
  createTheme,
  ThemeProvider,
  Theme,
  StyledEngineProvider,
  adaptV4Theme,
} from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";
import { auth0ProviderOptions } from "./utils/auth0Options";
import AppAuth0 from "./containers/AppAuth0";
import { history } from "./utils/historyUtils";

const theme = createTheme(
  adaptV4Theme({
    palette: {
      secondary: {
        main: "#fff",
      },
    },
  })
);

/* istanbul ignore next */
const onRedirectCallback = (appState: any) => {
  history.replace((appState && appState.returnTo) || window.location.pathname);
};

const root = createRoot(document.getElementById("root")!);

/* istanbul ignore if */
if (process.env.VITE_AUTH0) {
  root.render(
    // Les options sont dans un module TYPÉ (`utils/auth0Options.ts`) : ce
    // fichier-ci n'entre pas dans le programme de `yarn types`, donc une prop
    // invalide y passerait inaperçue — c'est exactement ce qui est arrivé avec
    // `audience` et `scope` restés au premier niveau (ADR-009, défaut 2).
    <Auth0Provider
      {...auth0ProviderOptions(window.location.origin)}
      onRedirectCallback={onRedirectCallback}
    >
      <Router history={history}>
        <StyledEngineProvider injectFirst>
          <ThemeProvider theme={theme}>
            <AppAuth0 />
          </ThemeProvider>
        </StyledEngineProvider>
      </Router>
    </Auth0Provider>
  );
} else {
  console.error("Auth0 is not configured.");
}
