import React from "react";
import { Container, Typography } from "@mui/material";

import CypressLogo from "../components/SvgCypressLogo";

export default function Footer() {
  return (
    <Container maxWidth="sm" style={{ marginTop: 50 }}>
      <Typography variant="body2" color="textSecondary" align="center">
        Built by
        {/*
          `aria-label` : le seul contenu de ce lien est un SVG inline, donc il
          n'avait AUCUN nom accessible — violation `link-name` relevée par axe
          sur les cinq pages clés, le pied de page étant partagé par le layout.
          Un lecteur d'écran annonçait « lien » sans dire vers quoi.
        */}
        <a
          style={{ textDecoration: "none" }}
          target="_blank"
          rel="noopener noreferrer"
          href="https://cypress.io"
          aria-label="Cypress"
        >
          <CypressLogo
            style={{
              marginTop: -2,
              marginLeft: 5,
              height: "20px",
              width: "55px",
              verticalAlign: "middle",
            }}
          />
        </a>
      </Typography>
    </Container>
  );
}
