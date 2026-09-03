import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import { createTheme, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import App from "./containers/App";
import { history } from "./utils/historyUtils";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
  typography: {
    // htmlFontSize: 18.285714285714286,
    fontSize: 14 * 0.875,
    body1: {
      lineHeight: 1.43,
      letterSpacing: "0.01071em",
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          padding: "6px 0 7px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          padding: "6px 0 7px",
        },
      },
    },
    // MuiInput: {
    //   defaultProps: {
    //     inputProps: {
    //       backgroundColor: "green",
    //       height: "300px",
    //     },
    //   },
    // },
  },
});

// `index.html` charge ce fichier EN DUR ; c'est donc ici, et nulle part
// ailleurs, que la variante Auth0 peut être atteinte (ADR-009, défaut 1).
// Sans cette bascule, `yarn dev:auth0` monte `checkAuth0Jwt` côté backend
// pendant que le front garde le login Passport : l'application exige un jeton
// qu'elle n'émet jamais.
//
// L'import est DYNAMIQUE pour que Vite garde le bundle Auth0 hors du chemin
// par défaut — le mode local ne le télécharge pas. La variante crée sa propre
// racine React, d'où le `return` implicite de cette branche.
if (process.env.VITE_AUTH0) {
  import("./index.auth0");
} else {
  const root = createRoot(document.getElementById("root")!);

  root.render(
    <Router history={history}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  );
}
