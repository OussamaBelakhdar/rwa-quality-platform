import NotificationList from "./NotificationList";

// Niveau COMPOSANT (ADR-004, ligne 2) : rendu conditionnel sur des props.
// L'E2E `network/erreurs-par-domaine.cy.ts` prouve que la MACHINE arrive bien
// en `failure` ; ici on prouve ce que le composant en fait.

describe("NotificationList", () => {
  it("montre l'écran d'erreur plutôt que « aucune notification »", () => {
    // RÉGRESSION — avant la semaine 5, une panne retombait sur EmptyList, donc
    // sur le même écran qu'une boîte réellement vide.
    cy.mount(
      <NotificationList
        notifications={[]}
        updateNotification={() => undefined}
        hasError
        errorMessage="Network Error"
      />
    );
    cy.getBySel("error-state-message").should("have.text", "Network Error");
    cy.getBySel("empty-list-header").should("not.exist");
  });

  it("montre « aucune notification » quand la liste est vraiment vide", () => {
    cy.mount(<NotificationList notifications={[]} updateNotification={() => undefined} />);
    cy.getBySel("empty-list-header").should("have.text", "No Notifications");
    cy.getBySel("error-state").should("not.exist");
  });
});
