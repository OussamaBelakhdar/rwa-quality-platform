import "@cypress/code-coverage/support";
import "./commands";
import { mount } from "cypress/react";

Cypress.Commands.add("mount", mount);
