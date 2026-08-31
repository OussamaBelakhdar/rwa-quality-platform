# Référentiel « Expert Cypress » 2026 — Compétences Cypress + Ingénierie logicielle

## TL;DR
- **Un « expert Cypress » en 2026 = maîtrise de l'architecture interne de Cypress (queue de commandes, retry-ability, gestion du sujet) + réseau/auth avancés (cy.intercept, cy.session, cy.origin) + component testing + CI/CD à l'échelle + une base solide de génie logiciel (JS/TS profond, Node.js, HTTP, Git, Docker) — le tout doublé désormais d'une gouvernance de l'IA (cy.prompt, Studio AI, self-healing). Il n'existe AUCUNE certification Cypress officielle ni vendeur-neutre en 2026.**
- **État du marché 2026 : Cypress a plateauté (~7,4 M de téléchargements npm hebdo) tandis que Playwright l'a dépassé d'un facteur supérieur à dix (~78 M) ; le State of JS 2025 (publié janvier 2026) donne ~91 % de satisfaction Playwright vs ~72 % Cypress, « l'écart le plus large jamais enregistré entre les deux principaux outils E2E ». Le marché francophone recrute majoritairement des profils « QA automaticien » polyvalents, pas des « experts Cypress » purs — le titre vendable en 2026 est « ingénieur QA polyglotte Cypress + Playwright ».**
- **Pour un bootcamp honnête : réservez le label « Expert » aux sujets qui exigent une compréhension des internes et des arbitrages d'architecture (diagnostic de flakiness, cy.origin multi-domaine, plugins Node, parallélisation, typings TS des custom commands, stratégie E2E/composant/API), et non à la simple connaissance des commandes.**

## État de Cypress en 2026 (versions et dates vérifiées)

- **Version stable actuelle** : branche 15.x. Cypress 15.7.1 est sortie le **2 décembre 2025** (Wikipedia « Cypress (software) » : « Stable release: 15.7.1 / 2 December 2025 », citant la Release GitHub). La cadence est bimensuelle ; des versions 15.x plus tardives (jusqu'à v15.17.0, 9 juin 2026) apparaissent dans les agrégateurs de release notes.
- **Cypress 15.0** : sortie le **20 août 2025** (blog officiel Cypress, Jennifer Shehane, « Cypress 15: The foundation for what's next » — « It's the beginning of our vision for AI-assisted test creation »). Changements majeurs : suppression du support Node.js 18 et 23, Webpack 4, Vite 4, Angular 17, Firefox via CDP ; abandon de la signature à 3 arguments de `cy.stub` ; suppression du support TypeScript 4 ; remplacement de `ts-node` par `tsx` pour le parsing de la config ; renommage de `Cypress.SelectorPlayground` en `Cypress.ElementSelector` ; ajout du support Vite 7 et Angular 20 ; refonte visuelle du Command Log ; correction de 19 issues TypeScript/ESM.
- **Cypress 14.0** : sortie le **16 janvier 2025** (blog officiel « Cypress 14 is Here »). Support component testing étendu (React, Angular, Next.js, Svelte, Vite) ; gestion de la dépréciation de `document.domain` par Chrome (via `cy.origin`) ; Electron/Chromium 130 ; nouvelles commandes `cy.press()` et `cy.stop()` ; retry des commandes dans les hooks `after`/`afterEach`.
- **Cypress Studio** : refondu en v15 (mode expérimental via `experimentalStudio`), enregistrement + édition inline des tests — présenté comme « le début de notre vision de la création de tests assistée par IA ».
- **IA / cy.prompt()** : commande expérimentale annoncée à CypressConf 2025 par le fondateur Brian Mann, disponible pour tous à partir de **Cypress 15.4.0**. Elle traduit des étapes en langage naturel en commandes Cypress. **Nécessite un compte Cypress Cloud** (les prompts transitent par le Cloud pour communiquer avec les LLM). Fonctionnalités « Cypress AI » : génération de specs, suggestions d'assertions, self-healing des sélecteurs (sélecteurs mis en cache ou régénérés par IA). Cypress affirme ne jamais utiliser les prompts pour entraîner ses modèles et permet de désactiver l'IA. **Réception mitigée** : Gleb Bahmutov (Cypress Tips, août 2025) déconseille fermement son usage — « Should you try / use this new cy.prompt command? If you ask me: NO… You are surrendering executing YOUR tests on YOUR cloud with delegating the test logic to Cypress Cloud and its 'LLM' black box » ; des tests indépendants (Bondar Academy) montrent des résultats mitigés et déconseillent l'exécution non supervisée en CI.
- **Cypress Cloud & produits payants** : Test Replay (débogage time-travel des runs CI, disponible depuis fin 2023, Chromium uniquement) ; Cypress Accessibility et UI Coverage sont passés en disponibilité générale (GA) à CypressConf 2024 — ce sont des add-ons **payants** du Cloud. Génération de tests par IA dans UI Coverage lancée en 2025. Cloud MCP permet d'apporter les données de run/échec à un assistant IA dans l'IDE.
- **Support navigateurs** : Chrome/Edge/Electron (Chromium) en primaire, Firefox supporté, **pas de WebKit/Safari** — limite structurelle vs Playwright.

## Référentiel à 3 niveaux — Compétences CYPRESS

| Domaine | Intermédiaire | Avancé | Expert |
|---|---|---|---|
| **Commandes & internes** | Écrire des tests avec cy.get/click/type, assertions .should() | Comprendre queries vs actions vs assertions ; retry-ability de base | Maîtriser la queue de commandes, la gestion du sujet, les frontières de retry (mid-chain assertions), le détachement DOM ; savoir réécrire en `.should(callback)` |
| **Réseau (cy.intercept)** | Stubber une réponse simple, attendre un alias | Spy vs stub, modifier requêtes/réponses, matchers dynamiques | Chaînes d'interception complexes, throttling/latence, tests d'edge cases réseau, séquençage d'alias, contrôle du serveur pour tests déterministes |
| **Authentification** | Login via UI | cy.session avec cache, login programmatique via API | cy.session + cy.origin pour SSO/Auth0/Okta/Cognito multi-domaines ; stratégie de cache de session à l'échelle |
| **Custom commands** | Créer une commande simple | Overwrite de commandes, options | Typings TypeScript (declaration merging), autocomplétion IDE, publication en plugin |
| **Architecture de test** | Page Objects basiques | App Actions vs Page Objects, fixtures | Arbitrage POM/App Actions ; seeding via API/cy.task ; architecture monorepo, centaines de specs |
| **Component testing** | Monter un composant simple | React/Vue/Angular avec props/events | Signals Angular, harnais personnalisés, arbitrage composant vs E2E vs API |
| **Node / plugins** | Utiliser cy.task | Écrire des tâches Node, variables d'env | Authoring de plugins, seeding BD, système de fichiers, preprocessors |
| **CI/CD & parallélisation** | Lancer en CI (GitHub Actions) | Docker, sharding, reporting (mochawesome/JUnit/Allure) | Parallélisation Cloud vs alternatives (Currents/Sorry-Cypress), orchestration, optimisation du temps de suite |
| **Diagnostic** | Lire le Command Log | Debug DevTools, retries de test | Diagnostic systématique de flakiness, Test Replay, profiling de suite |
| **Qualité transverse** | — | Visual testing, cypress-axe (accessibilité) | Stratégie a11y à l'échelle, visual regression, coexistence/migration avec Playwright |

## Référentiel — Compétences PROGRAMMATION & INGÉNIERIE (et pourquoi)

| Compétence | Niveau attendu (expert) | Pourquoi c'est critique pour Cypress |
|---|---|---|
| **JavaScript profond** | Event loop, closures, promesses | Les chaînes Cypress ne sont PAS des promesses natives (pas d'async/await sur `cy.*`) ; confondre les deux est la première source de bugs de test |
| **TypeScript** | Generics, declaration merging, strict mode | Indispensable pour typer les custom commands, les fixtures et obtenir l'autocomplétion ; standard de fait des suites 2026 |
| **Node.js** | Tasks, plugins, FS, env vars | `cy.task` et les plugins s'exécutent en Node ; le seeding et l'isolation d'environnement en dépendent |
| **HTTP / REST / GraphQL** | Verbes, statuts, headers, sérialisation | Pré-requis à `cy.intercept` et `cy.request` ; seeding via API |
| **DOM / CSS / sélecteurs** | Sélecteurs accessibility-first (Testing Library) | Sélecteurs robustes = tests non-flaky ; `data-*` et rôles ARIA plutôt que sélecteurs fragiles |
| **Git** | Workflows, branches, revue | Tests versionnés, revue de code de test comme du code applicatif |
| **Docker & CI/CD YAML** | Images Cypress, pipelines | Exécution reproductible, parallélisation, isolation |
| **Design logiciel** | SOLID/DRY appliqués au code de test | Suites maintenables à l'échelle ; arbitrage DRY vs lisibilité |
| **Debugging & profiling** | DevTools, Command Log, Test Replay | Réduction du coût de maintenance (le poste de coût principal des suites) |
| **Sécurité** | Secrets, isolation d'env | Ne pas fuiter de credentials en CI ; environnements isolés |
| **Gouvernance de l'IA** | cy.prompt, Copilot, MCP, revue | En 2026, savoir QUAND utiliser l'IA et VÉRIFIER son output (traiter les tests générés comme une PR de junior) est une compétence experte |

## Signal marché (chiffres et sources)

- **Téléchargements npm** : d'après TestMu AI (août 2026), « the playwright package on npm draws roughly 78 million weekly downloads against about 7.4 million for cypress, a gap of more than ten to one ». Snapshot npmtrends corroborant : cypress 15.20.0 = 7 409 061 dl/sem et 50 912 stars GitHub ; playwright 1.62.1 = 78 954 076 dl/sem et 94 081 stars. **Playwright a dépassé Cypress en volume mi-2024** (analyse Checkly relayée par TestDino) ; Cypress est « plateauté entre 5 et 6,5 M/sem depuis 2023, avec une croissance annuelle à un chiffre ».
- **State of JS 2025** (publié janvier 2026) : satisfaction Playwright ~91 % vs Cypress ~72 % — d'après l'analyse QASkills, « the widest gap recorded between the two leading end-to-end tools ». Playwright et Vitest partagent la plus forte hausse d'usage : « both gained 14 percentage points year-over-year » (stateofjs.com).
- **GitHub stars** : Playwright ~78 000-94 000 vs Cypress ~49 000-51 000.
- **TestGuild Automation Guild 2026** : d'après Crosscheck, « Playwright usage exceeding Selenium for the first time, with Playwright at 45.1% adoption among QA professionals and Selenium declining to 22.1% » ; Cypress à 14,4 %.
- **Marché de l'automatisation** : ~35,52 Md$ en 2024, projeté à ~169,33 Md$ en 2034 (CAGR ~16,9 %) — **source secondaire non primaire, à traiter avec prudence**.
- **France / francophone** : Indeed France affiche ~75-100+ offres mentionnant « Cypress » (relevés sept-nov 2025). Les intitulés dominants sont « QA automaticien », « Lead QA », « Testeur QA » — Cypress y apparaît comme UNE compétence parmi d'autres (Selenium, Playwright, Robot Framework, UFT), rarement comme cœur de poste. Exemple d'offre dédiée : « QA Engineer Sénior - Cypress » (Paris). Les offres senior demandent typiquement Cypress + JS/TS + CI/CD + connaissance d'au moins un autre framework.
- **Conclusion marché** : « Expert Cypress » n'est plus un titre de poste vendable seul en 2026. Le marché veut des polyglottes Cypress + Playwright. Cypress reste pertinent pour les équipes front JS/TS (React/Vue/Angular SPA), le DX, le time-travel debugging et le component testing, mais Playwright est le défaut pour les nouveaux projets.

## Parallélisation & écosystème (précisions expert)

- **Cypress Cloud** : parallélisation/orchestration payante officielle.
- **Alternatives** : Currents.dev (drop-in, payant, supporte aussi Playwright) et Sorry-Cypress (open-source, self-hosted, gratuit) via le package `cypress-cloud`. **Point critique de compatibilité** : depuis Cypress 12.6.0+ (février 2023), Cypress a restreint l'accès à son protocole interne d'orchestration ; Sorry-Cypress ne fonctionne qu'avec d'anciennes versions et Currents a dû réimplémenter son propre protocole (mode « offline »). Un expert doit connaître cette contrainte avant de conseiller une stack de parallélisation.

## Certifications & parcours d'apprentissage (2026)

- **AUCUNE certification Cypress officielle n'existe.** Cypress.io ne propose aucun examen ni credential. learn.cypress.io (« Real World Testing with Cypress », 4 cours) est gratuit et **ne délivre aucun certificat**.
- **AUCUNE certification vendeur-neutre spécifique à Cypress** (équivalent ISTQB) n'existe. ISTQB est tool-agnostic par design (« The exam does not test knowledge of a specific tool, language, or framework »).
- **Certifications tierces = certificats de complétion ou badges non proctorés, PAS des certifications professionnelles proctorées** :
  - **Test Automation University (Applitools)**, cours de Filip Hric (« Introduction to Cypress », « Advanced Cypress ») : gratuits, certificat de **complétion** uniquement.
  - **TestMu AI / LambdaTest « Cypress 101 »** : gratuit, badge LinkedIn, **explicitement non proctoré** (test 45 min + assignation de code sur 36 h) ; TestMu confirme lui-même que « Cypress.io does not currently offer an official first-party certification ».
  - **Bondar Academy** (Artem Bondar) : payant, certificat de **complétion**.
  - Divers (igmGuru, Edchart, badges Credly) : certificats de complétion / badges commerciaux à faible autorité, langage marketing (« globally recognized ») à relativiser.
- **ISTQB CTAL-TAE (Test Automation Engineering)** : certification proctorée, reconnue, **vendeur-neutre et non spécifique Cypress** — la référence pour valider les compétences d'ingénierie d'automatisation (architecture gTAA/TAF, CI/CD, métriques). Disponible en français. C'est le seul credential formel pertinent à recommander.
- **Curricula de référence pour le contenu « expert »** :
  - **Filip Hric** (ambassadeur Cypress, filiphric.com, cours TAU avancés) : logique interne, command chaining, gestion des cookies, API/intercept, custom commands avec autocomplétion, authoring de plugins pour seeding BD.
  - **Gleb Bahmutov** (ex-Cypress, glebbahmutov.com, cypress-examples) : retry-ability approfondie, patterns de sujet, recettes avancées.
  - **Cypress Real World App (RWA)** : app de référence officielle (clone Venmo) démontrant `cy.session` + `cy.origin` pour Auth0/Okta/Cognito/Google, code coverage, component + API testing.

## Recommandations pour le bootcamp AutomationDataCamp

1. **Étiqueter « Expert » uniquement les modules à forte valeur d'architecture** : diagnostic/prévention de la flakiness, `cy.origin` multi-domaine + `cy.session` à l'échelle, authoring de plugins Node + `cy.task`, typings TS des custom commands, parallélisation (Cloud vs Currents/Sorry-Cypress) et arbitrage stratégique E2E/composant/API. Ne PAS étiqueter « expert » la simple connaissance des commandes.
2. **Intégrer un tronc « génie logiciel » aussi lourd que le tronc Cypress** : JS (chaînes vs promesses), TS (declaration merging), Node, HTTP, Git, Docker, CI/CD YAML. C'est ce qui distingue un expert d'un utilisateur avancé, et c'est ce que le marché vérifie en entretien.
3. **Positionner honnêtement vs le marché** : vendre un parcours « QA automation polyglotte » avec Cypress comme socle ET un module Playwright (migration/coexistence), car c'est ce que demande le marché 2026 (Playwright ~10× le volume npm de Cypress, satisfaction 91 % vs 72 %).
4. **Traiter l'IA comme un module de gouvernance, pas de magie** : enseigner `cy.prompt`/Studio AI/self-healing ET leurs limites (dépendance Cloud, boîte noire, nécessité de revue humaine, statut expérimental).
5. **Sur la certification** : être transparent — aucun certificat Cypress n'a de valeur officielle. Positionner le certificat du bootcamp comme « certificat de complétion » et orienter les apprenants visant un credential reconnu vers l'**ISTQB CTAL-TAE** (complémentaire à votre profil de formateur CTAL-TM).
6. **Seuils qui changeraient la stratégie** : si Cypress lançait une certification officielle, ou si les téléchargements npm Cypress repassaient en croissance nette, ou si `cy.prompt` sortait du statut expérimental avec adoption large — réévaluer le poids relatif Cypress/Playwright dans le curriculum.

## Caveats
- Les chiffres npm/stars varient selon la date du snapshot ; fourchettes données volontairement (référence la plus fiable : npmtrends + TestMu AI août 2026).
- Le chiffre du marché de l'automatisation (35,52 → 169,33 Md$) provient de sources secondaires, non d'un rapport primaire vérifié.
- Les comptages d'offres d'emploi Indeed sont des instantanés (sept-nov 2025), non des séries statistiques longitudinales ; aucun chiffre officiel de part de marché « Cypress vs Playwright » sur le marché de l'emploi français n'a pu être vérifié depuis une source primaire.
- « cy.prompt » et « Cypress AI » sont **expérimentaux** en 2026 ; leur périmètre peut évoluer.
- Certaines dates de versions 15.x tardives (2026) proviennent d'agrégateurs de release notes ; à recouper avec le changelog officiel (docs.cypress.io/app/references/changelog) avant publication du curriculum.
- Les scores State of JS (91 %/72 %) sont rapportés de façon cohérente par plusieurs analyses secondaires du survey publié en janvier 2026 ; vérifier le chiffre exact sur 2025.stateofjs.com avant citation formelle.