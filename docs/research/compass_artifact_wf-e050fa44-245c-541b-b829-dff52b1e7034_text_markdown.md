# Normes, principes et règles du développement logiciel professionnel en 2026 — Guide « à faire / à ne pas faire » (focus TypeScript/Node/web + code de test, priorité conformité UE/France)

## TL;DR

- **Le consensus 2026 a basculé sur trois fronts** : (1) retour au _modular monolith_ (enquête CNCF, 689 répondants automne 2024 : 42 % des organisations ayant adopté les microservices reconsolident des services en unités plus grandes ; adoption service mesh tombée de 18 % au Q3 2023 à 8 % au Q3 2025), (2) l'IA de codage est un **amplificateur** (DORA 2025 : « AI doesn't fix a team; it amplifies what's already there »), pas un accélérateur automatique — elle introduit une faille OWASP Top 10 dans **45 %** du code généré (Veracode) — donc _revue humaine obligatoire_, et (3) la sécurité de la chaîne d'approvisionnement est le risque n°1 concret (ver Shai-Hulud npm ; OWASP A03:2025, nouvelle catégorie).
- **Stack de référence** : TypeScript 7 (port Go « Corsa », GA 8 juillet 2026, `strict` par défaut), Node.js 24 LTS (Node 20 EOL 30 avril 2026), pnpm + lockfile, ESLint flat config ou Biome/oxlint, publication npm via OIDC Trusted Publishing (jetons classiques révoqués le 9 décembre 2025), actions GitHub épinglées par SHA.
- **Conformité UE/France** : EAA applicable depuis le 28 juin 2025 (WCAG 2.1 AA/EN 301 549) ; CRA — reporting des vulnérabilités exploitées dès le 11 septembre 2026, application pleine 11 décembre 2027 ; AI Act haut-risque reporté à décembre 2027 (Digital Omnibus, en vigueur 27 juillet 2026) mais transparence Art. 50 maintenue au 2 août 2026 ; NIS2 pas encore transposée en France (loi Résilience attendue automne 2026).

Ce rapport donne d'abord les principes généraux, puis un zoom TypeScript/Node/web et sur le code de test. Chaque dimension : (a) un « état 2026 » sourcé, (b) un tableau DO / DON'T, (c) 1-3 points de désaccord communautaire. Sources et dates sont citées inline.

---

## 1. LANGAGE & STYLE (focus TypeScript/JavaScript)

**État 2026.** TypeScript 7.0 (« Project Corsa », réécriture native en Go du compilateur et du language service) a atteint la disponibilité générale le **8 juillet 2026** (typescriptpro.com, 8/7/2026 ; codingdunia.com) ; gains de build annoncés 8×–12× (type-check de VS Code passé de ~125,7 s à ~10,6 s), sémantique du système de types **inchangée** (Microsoft parle de _port_, pas de réécriture). TS 6.0 est une release « pont » entre 5.9 et 7.0 (InfoWorld, 2/12/2025). Points de vigilance : TS 7 GA **n'expose pas encore d'API programmatique publique** (attendue en 7.1, ~3 mois plus tard — estimation), donc **Vue, Svelte, Astro, Angular, MDX** ne peuvent pas encore tourner sous TS 7 ; typescript-eslint a fermé la demande de support TS7 « not planned » au lancement (digitalapplied.com ; typescriptpro.com). TS 7 passe `strict` et `noUncheckedSideEffectImports` à `true` par défaut et supprime des flags dépréciés (ntcompatible.com, 20/8/2026). **Node.js** : Node 20 a atteint l'EOL le **30 avril 2026** (herodevs.com, 7/2026) ; les lignes supportées sont Node 24 (Active LTS, EOL 30/4/2028), Node 22 (Maintenance LTS, EOL 30/4/2027) et Node 26 (Current, LTS en octobre 2026). Node 24 est le défaut recommandé ; les versions impaires (23, 25) ne passent jamais LTS ; à partir de Node 27, une release/an, toutes LTS (nodejs.org ; pkgpulse.com). **Lint/format** : ESLint flat config (`eslint.config.js`) est le défaut mûr grâce à son écosystème de plugins ; Biome (Rust, lint+format en un binaire, ~470 règles) et oxlint (VoidZero, ~700+ règles, type-aware via `tsgo`, défaut dans Vite 8) montent vite, 50–100× plus rapides que ESLint (pkgpulse.com ; techloghub, 7/8/2026 ; breakingcube, 6/4/2026). **npm** : jetons classiques révoqués le 9/12/2025 ; jetons granulaires plafonnés à 90 jours + 2FA (socket.dev ; GitHub community #179562).

### DO / DON'T

| ✅ DO                                                                                            | ❌ DON'T                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Activer `strict` (et `noUncheckedIndexedAccess`) ; traiter tout warning `tsc` comme erreur en CI | Ne PAS migrer vers TS 7 un projet Vue/Svelte/Astro/Angular avant la 7.1 (API stable)      |
| Utiliser `unknown` + narrowing/Zod aux frontières ; bannir `any` implicite                       | Ne PAS parsemer le code d'`any` ni de `@ts-ignore` (préférer `@ts-expect-error` commenté) |
| Cibler Node 24 LTS ; figer la version dans `engines` (package.json) et `.nvmrc`                  | Ne PAS rester sur Node 20 (EOL) en prod — c'est un finding de scan de conformité          |
| pnpm + lockfile commité ; Corepack pour épingler le gestionnaire                                 | Ne PAS committer sans lockfile ni mélanger npm/yarn/pnpm dans un même repo                |
| Adopter ESM, `using`/`await using` (disposal), décorateurs stage-3 quand pertinent               | Ne PAS livrer du CommonJS nouveau sans raison ; éviter les décorateurs « legacy »         |
| Choisir UN formateur (Prettier ou Biome) et l'imposer en pre-commit + CI                         | Ne PAS débattre du style en revue : déléguer 100 % au formateur                           |

### Points de désaccord

1. **Biome/oxlint vs ESLint** : remplacer complètement ESLint (Biome) ou l'utiliser en couche rapide (oxlint + ESLint) — pas de consensus ; ESLint reste le défaut « sûr » pour projets à plugins/framework.
2. **Migration TS 7 immédiate** : early adopters vantent les 10× ; prudents attendent 7.1 pour l'écosystème.
3. **Prettier vs Biome formatter** : les opinions de formatage de Biome diffèrent légèrement de Prettier, ce qui bloque certaines équipes.

---

## 2. PRATIQUES DE CODAGE

**État 2026.** Le débat s'est déplacé des « principes » (règles binaires) vers les « propriétés » (qualités à viser). Dan North (créateur du BDD) propose **CUPID** (Composable, Unix philosophy, Predictable, Idiomatic, Domain-based) en réponse à SOLID : « When I started formulating a response to the five SOLID principles… I soon realized that the idea of principles itself was problematic… Instead, I started thinking about properties » (dannorth.net, 10/2/2022) ; sa critique « Why Every Element of SOLID is Wrong » (PubConf 2016). Kevlin Henney tient une position voisine (« SOLID Deconstruction »). Mais c'est **contesté** : rebuttals (De Dauw 2017 ; Daniel Orner via InfoQ : « SOLID principles are still the foundation for modern software architecture »). Sur les branches, le consensus est net : **trunk-based development (TBD)** est le défaut moderne, GitFlow devient legacy — la recherche DORA/Accelerate identifie TBD comme prédicteur des « elite performers » (branches < 24 h) ; même Vincent Driessen (créateur de GitFlow, 2010) recommande contre GitFlow pour les équipes en CI/CD continu. Conventional Commits + PR courtes restent la norme.

### DO / DON'T

| ✅ DO                                                                                                | ❌ DON'T                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Appliquer KISS/YAGNI d'abord ; extraire l'abstraction quand la duplication est _avérée_ (règle de 3) | Ne PAS sur-abstraire par anticipation ni suivre SOLID dogmatiquement (viser CUPID : lisible, prévisible, composable) |
| Rendre l'état immuable par défaut ; noyau fonctionnel / coquille impérative                          | Ne PAS mélanger effets de bord et logique métier dans la même fonction                                               |
| Gérer les erreurs explicitement (types `Result`/discriminated unions aux frontières critiques)       | Ne PAS avaler les exceptions ni « fail open » (OWASP A10:2025 Mishandling of Exceptional Conditions)                 |
| Code auto-documenté ; commentaires = le _pourquoi_, pas le _quoi_                                    | Ne PAS commenter du code mort — le supprimer (Git est la mémoire)                                                    |
| Trunk-based, branches < 24 h, feature flags, PR petites et fréquentes                                | Ne PAS maintenir des branches longues type GitFlow en contexte CI/CD                                                 |
| Conventional Commits + revue humaine obligatoire (même pour le code IA)                              | Ne PAS fusionner sans revue ni CI verte                                                                              |

### Points de désaccord

1. **SOLID vs CUPID** : école North/Henney (propriétés) vs défenseurs SOLID (socle architectural) — non tranché.
2. **Result types vs exceptions en TS** : la communauté FP pousse `Result`/`neverthrow` ; d'autres jugent que les exceptions natives + `unknown` suffisent.
3. **DRY vs WET** : rejet croissant du DRY prématuré (« a little copying is better than a little dependency ») ; la duplication contrôlée est réhabilitée.

---

## 3. ARCHITECTURE

**État 2026.** **Reflux des microservices** confirmé : l'enquête CNCF (689 répondants, automne 2024) indique que **42 %** des organisations ayant adopté les microservices reconsolident au moins certains services en unités déployables plus grandes ; l'adoption du service mesh est tombée de 18 % (Q3 2023) à 8 % (Q3 2025). Le cas primaire le plus documenté : **Amazon Prime Video** (Video Quality Analysis) a migré de microservices vers un monolithe pour une **réduction de ~90 % des coûts d'infrastructure**. Drivers = complexité de debug, surcoût opérationnel, latence réseau, coûts (javacodegeeks, 12/2025 ; byteiota ; ancient.global). Le **modular monolith** (un déployable, frontières de modules strictes par domaine, extractibles si besoin) est le défaut recommandé, souvent en hybride (cœur monolithique + 2-5 services extraits sur les hot paths réels). Outils : ArchUnit / fitness functions, DDD, event-first. Observabilité par conception via **OpenTelemetry**. ADRs, C4 model et platform engineering restent des pratiques établies (dev.to, 2026).

### DO / DON'T

| ✅ DO                                                                                             | ❌ DON'T                                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Démarrer en modular monolith ; extraire un service seulement sur besoin métier avéré              | Ne PAS démarrer en microservices « parce que c'est moderne » (default = monolithe modulaire) |
| Imposer les frontières via fitness functions (ArchUnit-like) + analyse statique                   | Ne PAS laisser les modules fuiter (imports croisés, DB partagée sans schéma isolé)           |
| Instrumenter dès le départ (OpenTelemetry : traces/metrics/logs)                                  | Ne PAS traiter l'observabilité en après-coup                                                 |
| Documenter les décisions en ADRs ; diagrammes C4                                                  | Ne PAS laisser l'architecture implicite/orale                                                |
| REST/OpenAPI par défaut ; gRPC pour l'interne perf ; tRPC pour TS full-stack typé de bout en bout | Ne PAS imposer GraphQL/gRPC sans besoin (complexité, N+1, tooling)                           |
| Choix « boring tech » assumé (SQLite, monolithe) quand l'échelle ne l'exige pas                   | Ne PAS adopter Kubernetes/service mesh sans problème d'échelle réel                          |

### Points de désaccord

1. **Ampleur du reflux microservices** : le « 42 % » vient de l'enquête CNCF ; certaines reprises secondaires ajoutent des multiplicateurs de coût (« 3,75×–6× ») moins solides.
2. **REST vs GraphQL vs tRPC** : pour l'écosystème TS full-stack, tRPC séduit ; les défenseurs des contrats agnostiques préfèrent OpenAPI/GraphQL pour l'interopérabilité.
3. **12-factor à l'ère serverless/edge** : certains le jugent daté face aux plateformes modernes.

---

## 4. SÉCURITÉ

**État 2026.** **OWASP Top 10:2025** annoncé au Global AppSec (Washington, novembre 2025), version finale janvier 2026 : deux nouvelles catégories — **A03 Software Supply Chain Failures** (élargit « Vulnerable & Outdated Components ») et **A10 Mishandling of Exceptional Conditions** ; A02 Security Misconfiguration monte au n°2 ; SSRF absorbé dans A01 Broken Access Control (n°1) ; analyse de 589 CWE / 175 000+ CVE (owasp.org/Top10/2025 ; parasoft ; patrowl). **OWASP Top 10 for LLM Applications** : édition 2025 (LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector/Embedding Weaknesses, LLM10 Unbounded Consumption) ; une édition **2026 publiée le 4 août 2026** existe (owasp.org/genai — contenu détaillé non vérifié ici). **OWASP ASVS 5.0** (2025) est la référence de vérification. **Chaîne d'approvisionnement npm** : ver auto-répliquant **Shai-Hulud** (15/9/2025, ~200+ paquets dont @ctrl/tinycolor et des paquets CrowdStrike), en aval de la compromission **s1ngularity/Nx** (fin août 2025) ; **Shai-Hulud 2.0** le 24/11/2025 (exécution en _pre-install_, surface CI/CD élargie) ; alertes CISA (23/9/2025) ; exfiltration de secrets via TruffleHog + tokens npm/GitHub/cloud (Wiz ; Unit 42 ; Datadog). **CISA/NSA** poussent les langages _memory-safe_. Veracode : le code IA introduit une faille dans ~45 % des cas (voir §6).

### DO / DON'T

| ✅ DO                                                                                | ❌ DON'T                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Traiter la supply chain comme risque n°1 (A03:2025) : SBOM, pinning, provenance      | Ne PAS `npm install` sans lockfile figé ni exécuter des paquets non audités |
| Désactiver/auditer les scripts `postinstall`/`preinstall` ; `--ignore-scripts` en CI | Ne PAS faire confiance aveuglément aux mainteneurs (phishing → Shai-Hulud)  |
| SAST + DAST + SCA + scan de secrets dans le pipeline ; ASVS 5.0 comme checklist      | Ne PAS s'appuyer sur les seuls tests fonctionnels                           |
| Access control « deny by default » ; vérifier BOLA/BFLA sur chaque endpoint API      | Ne PAS coder les autorisations côté client / faire confiance à l'input      |
| Gérer erreurs/exceptions explicitement (A10) ; ne jamais « fail open »               | Ne PAS logguer de secrets ; ne PAS exposer de stack traces en prod          |
| Rotation/gestion des secrets (coffre), MFA, moindre privilège                        | Ne PAS stocker de secrets longue durée dans le CI (préférer OIDC)           |

### Points de désaccord

1. **Langages memory-safe** : CISA/NSA poussent Rust ; scepticisme sur le coût de réécriture de bases existantes.
2. **WAF/outils vendeurs** : utilité réelle vs « security theater » et faux positifs.
3. **Fréquence de patch des dépendances** : mise à jour agressive (réduit la dette) vs pinning strict (réduit le risque d'un paquet compromis).

---

## 5. CONFORMITÉ / RÉGLEMENTAIRE (priorité UE/France)

**État 2026 (dates critiques — susceptibles d'évoluer, voir Caveats).**

- **RGPD** : privacy by design/by default, minimisation, DPIA pour traitements à risque, **Art. 27** (représentant UE pour responsables/sous-traitants hors UE ciblant l'UE) — directement pertinent pour un prestataire au Maroc servant des clients FR/UE.
- **EU AI Act** : entré en vigueur 1/8/2024. **Digital Omnibus on AI** (Règlement (UE) 2026/1744) publié au JO le 24/7/2026, en vigueur le **27/7/2026** : obligations haut-risque Annexe III **reportées au 2 décembre 2027** (Annexe I au 2/8/2028). **Mais** les obligations de **transparence Art. 50 restent au 2 août 2026** (Art. 50(2) systèmes legacy → 2/12/2026) ; nouvelles interdictions (nudifiers/CSAM) ajoutées (Gibson Dunn ; DLA Piper ; CSA ; compliancehub).
- **NIS2** : **pas encore transposée en France** au 6/8/2026 ; projet de loi Résilience (transpose NIS2 + REC + DORA) adopté au Sénat le 12/3/2025, commission spéciale AN le 10/9/2025, séance publique attendue **septembre 2026**, promulgation dans la foulée ; l'ANSSI a publié le **Référentiel Cyber France (ReCyF)** le 17/3/2026 (20 objectifs entités essentielles / 15 importantes), pas encore opposable ; sanctions jusqu'à 10 M€ ou 2 % du CA (legiscope ; eversheds ; deefense ; nis-2-directive.com).
- **Cyber Resilience Act (CRA)** : en vigueur 10/12/2024 ; **reporting des vulnérabilités activement exploitées et incidents graves dès le 11 septembre 2026** (early warning 24 h, notification 72 h, rapport final 14 jours), via la plateforme unique ENISA (SRP) ; application pleine **11 décembre 2027** ; amendes jusqu'à 15 M€ ou 2,5 % du CA (ec.europa.eu ; Hogan Lovells ; Crowell & Moring).
- **European Accessibility Act (EAA)** : applicable/exécutoire depuis le **28 juin 2025** ; standard présumé **EN 301 549 (v3.2.1 → WCAG 2.1 AA)** ; **EN 301 549 v4.1.1 (WCAG 2.2)** attendu en 2026 ; s'applique aux entreprises **hors UE** servant des consommateurs UE ; micro-entreprises (<10 salariés ET <2 M€) exemptées ; amendes jusqu'à 100 000 € par violation (Allemagne). En France, RGAA aligné sur EN 301 549 (levelaccess ; userway ; accessibility.build).
- **DORA** (finance) : applicable depuis janvier 2025 (gestion risque TIC, tests TLPT, encadrement des prestataires TIC critiques).
- **Normes** : ISO/IEC 27001:2022 (SMSI), **ISO/IEC 42001** (management de l'IA), ISO/IEC 5055 (qualité de code mesurable), SOC 2 (attestation de contrôles).

### DO / DON'T

| ✅ DO                                                                                       | ❌ DON'T                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Cibler **WCAG 2.2 AA** dès maintenant (EAA + anticipe EN 301 549 v4.1.1)                    | Ne PAS supposer que l'EAA ne concerne pas une société hors UE : le critère est le consommateur UE |
| Bâtir dès 2026 un process de détection/reporting de vulnérabilités (CRA Art. 14, 11/9/2026) | Ne PAS traiter le CRA comme un problème « 2027 » : le reporting bite au 11/9/2026                 |
| Maintenir un SBOM à jour + veille CVE (base pour CRA & supply chain)                        | Ne PAS livrer sans inventaire des composants                                                      |
| Documenter DPIA, minimisation, base légale ; désigner un Art. 27 si hors UE                 | Ne PAS collecter « au cas où » ; ne PAS ignorer l'Art. 27 pour un client UE                       |
| Suivre le ReCyF ANSSI comme préfiguration NIS2 ; conserver les preuves de conformité        | Ne PAS attendre la promulgation pour lancer le diagnostic                                         |
| Étiqueter les contenus générés par IA (transparence Art. 50 au 2/8/2026)                    | Ne PAS se fier au seul report « haut-risque 2027 » : la transparence n'a pas bougé                |

### Points de désaccord

1. **Dates AI Act** : le report est acté, mais la mécanique (registration/backstop) fait débat ; certains lisent « 2027 » comme une pause, d'autres comme une fenêtre de documentation.
2. **WCAG 2.1 vs 2.2 comme baseline** : juridiquement 2.1 AA (harmonisé) ; les experts recommandent 2.2 par prudence.
3. **Périmètre NIS2 France** : incertitude sur les seuils/entités jusqu'aux décrets.

---

## 6. DÉVELOPPEMENT ASSISTÉ PAR IA

**État 2026.** L'IA de codage est quasi universelle : le **2025 DORA Report « State of AI-assisted Software Development »** (Google Cloud, ~5 000 professionnels) rapporte une adoption montée à **90 % (+14 pts vs 2024)**, une médiane de ~2 h/jour d'usage, plus de **80 %** de devs se déclarant plus productifs, mais **30 %** disant avoir « peu ou pas confiance » dans le code généré. Message clé : « AI doesn't fix a team; it amplifies what's already there. Strong teams use AI to become even better… Struggling teams will find that AI only highlights and intensifies their existing problems » — l'IA augmente le débit mais expose l'**instabilité** ; la valeur vient du système (plateformes, workflows), pas de l'outil. **Sécurité** : Veracode 2025 GenAI Code Security Report (100+ LLM, 80 tâches, Java/Python/C#/JS) — « in 45% of the cases these models introduce a detectable OWASP Top 10 security vulnerability into the code » ; XSS/CWE-80 échoué à **86 %**, log injection/CWE-117 à **88 %**, Java le pire (**72 %** d'échec) ; l'update **printemps 2026** confirme ~45 % même sur GPT-5.x/Gemini 3/Claude 4.5-4.6 — problème **structurel**, pas de scaling. Apiiro : +322 % de chemins d'escalade de privilèges, +153 % de défauts de design sur le code IA. **Productivité** : l'essai contrôlé **METR** (arXiv 2507.09089, 10/7/2025 ; 16 devs expérimentés, 246 tâches, Cursor Pro + Claude 3.5/3.7 Sonnet) — « developers forecast that allowing AI will reduce completion time by 24%… developers estimate that allowing AI reduced completion time by 20%… we find that allowing AI actually increases completion time by 19% ». METR a révisé/nuancé ce résultat le **24/2/2026** (ralentissement estimé −18 % sur le sous-ensemble d'origine, IC −38 % à +9 %, et −4 % pour les nouveaux ; essai suspendu car nombre de devs refusent désormais de travailler sans IA — biais) : à traiter comme un **snapshot début 2025**, non généralisable. **GitClear** (211 M lignes, 2020-2024) : refactoring (« moved ») tombé de ~25 % (2021) à <10 % (2024), copier-coller monté de 8,3 % à 12,3 %, duplication de blocs ×8 en 2024 ; édition 2026 : duplication de blocs +81 % vs 2023 (éditeur commercial — biais possible). **Gouvernance** : standard **AGENTS.md** (OpenAI, août 2025 → Linux Foundation/AAIF déc. 2025 ; 60 000+ repos, 28+ outils) ; Claude Code lit `CLAUDE.md` (pont via `@AGENTS.md` ou symlink).

### DO / DON'T

| ✅ DO                                                                                                         | ❌ DON'T                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Revue humaine **obligatoire** de tout code IA + SAST/SCA systématique                                         | Ne PAS fusionner du code IA non relu (« vibe coding » en prod = dette de sécurité) |
| Spécifier explicitement les exigences de sécurité dans les prompts                                            | Ne PAS supposer que « plus gros modèle = code plus sûr » (faux, cf. Veracode)      |
| Versionner un `AGENTS.md` (+ `CLAUDE.md` pont) : commandes, conventions, garde-fous                           | Ne PAS disséminer des règles IA dupliquées/divergentes par outil                   |
| Traiter l'IA comme un junior : idéal sur greenfield/boilerplate, prudence sur legacy complexe                 | Ne PAS confier à l'IA seule du code en contexte régulé (finance/santé/AI Act)      |
| Mesurer l'impact réel (débit + stabilité), pas la perception                                                  | Ne PAS se fier au ressenti de gain (METR : +20 % perçu vs −19 % réel)              |
| Politique d'attribution/licence du code IA ; vérifier les dépendances suggérées (hallucination/slopsquatting) | Ne PAS installer un paquet suggéré sans vérifier son existence/réputation          |

### Points de désaccord

1. **Gain net de l'IA** : METR (−19 % sur experts/legacy, révisé 2026) vs DORA (débit en hausse) — dépend fortement du contexte.
2. **Vibe coding** : acceptable pour prototypes jetables vs inacceptable pour tout code destiné à la prod.
3. **AGENTS.md vs CLAUDE.md** : convergence vers AGENTS.md, mais Claude Code reste à part (surcharge de maintenance ; sondage JetBrains 2025 : 61 % des équipes multi-outils subissent une duplication de config).

---

## 7. TESTS & QUALITÉ

**État 2026.** Pas de « forme » unique : **pyramide** pour backends à logique métier dense ; **trophée** (Kent C. Dodds : statique → unit → gros bloc intégration → peu d'E2E) pour frontends/services d'intégration ; **honeycomb** (Spotify) pour microservices ; certains poussent l'**E2E-first** car Playwright a fait chuter le coût des E2E (auto-waiting, interception réseau, sélecteurs fiables). Le principe unificateur (codersera, medium/@tonainagarg, 2026) : « viser là où naissent réellement les bugs », c.-à-d. les interactions. **DORA 2025** : l'IA augmente le débit mais l'instabilité reste le point faible — d'où l'importance des tests et de la capacité à revenir à un état sain. **ISTQB** : CTFL v4.0.1 (socle), **CT-GenAI v1.1** (ajoutée le 7/8/2025, tester _avec_ l'IA générative), CT-AI v2.0 (tester les systèmes IA ; remplace v1.0, retrait EN au 21/4/2027), **CTAL-TAE v2.0** (automatisation modernisée : CI/CD, DevSecOps, contract testing, self-healing, ML en analyse de logs) ; le CTAL-TM (détenu par l'utilisateur) reste la référence management. Discipline anti-flakiness, contract/property-based/mutation testing montent ; couverture = signal, jamais objectif.

### DO / DON'T

| ✅ DO                                                                                | ❌ DON'T                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Choisir la forme selon l'archi (pyramide backend / trophée frontend) délibérément    | Ne PAS appliquer la pyramide comme dogme partout                             |
| Statique en base (TypeScript strict + ESLint + Zod runtime)                          | Ne PAS négliger l'analyse statique comme « niveau de test »                  |
| Traiter le code de test comme du code de prod (revue, refactor, DRY raisonné)        | Ne PAS tolérer des tests flaky (quarantaine + correction, pas retry aveugle) |
| Tester le comportement/les interfaces (React Testing Library : usage réel)           | Ne PAS tester les détails d'implémentation (tests fragiles)                  |
| Contract testing entre services ; mutation testing pour juger la _qualité_ des tests | Ne PAS confondre couverture élevée et qualité                                |
| Shift-left (tôt) **et** shift-right (observabilité/prod)                             | Ne PAS viser un % de couverture comme KPI managérial                         |

### Points de désaccord

1. **Trophée vs pyramide vs E2E-first** : la baisse du coût des E2E (Playwright) rouvre le débat sur la « base » du test.
2. **Couverture** : seuil minimal utile vs métrique nuisible détournée.
3. **Part de l'IA dans la génération de tests** : accélère vs produit des tests superficiels/faux positifs.

---

## 8. CI/CD & CHAÎNE D'APPROVISIONNEMENT

**État 2026.** La compromission **tj-actions/changed-files** (CVE-2025-30066, 14-15/3/2025, 23 000+ repos, secrets CI exposés dans les logs ; liée à reviewdog/action-setup CVE-2025-30154 ; cause racine = PAT de bot compromis, tags réécrits pour pointer un commit malveillant) a fait des actions épinglées par **SHA de commit complet** la norme, avec alerte CISA (18/3/2025). **npm Trusted Publishing (OIDC)** en GA depuis le 31/7/2025 (npm CLI ≥ 11.5.1) génère la **provenance** par défaut ; jetons classiques révoqués le 9/12/2025 (ne PAS définir `NODE_AUTH_TOKEN` en OIDC ; champ `repository` requis dans package.json). Docker : distroless/non-root/multi-stage/digests épinglés. SBOM (CycloneDX/SPDX), signature d'artefacts (Sigstore/cosign), SLSA.

### DO / DON'T

| ✅ DO                                                                            | ❌ DON'T                                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Épingler les actions GitHub par **SHA** de commit complet                        | Ne PAS référencer une action par tag mutable (`@v4`) — tags réécrivables (tj-actions) |
| OIDC (Trusted Publishing, cloud) au lieu de secrets longue durée                 | Ne PAS stocker de jetons de publication longue durée dans les secrets CI              |
| `permissions:` minimales sur `GITHUB_TOKEN` (least privilege, read par défaut)   | Ne PAS laisser `write-all` par défaut au workflow                                     |
| Docker : multi-stage, image distroless, `USER` non-root, digests `@sha256:`      | Ne PAS tourner en root ni utiliser `latest` non épinglé                               |
| Générer un SBOM + signer les artefacts (cosign/Sigstore) ; builds reproductibles | Ne PAS livrer sans provenance ni attestation                                          |
| Feature flags pour découpler déploiement et release ; canary/blue-green          | Ne PAS coupler « merge = release » sans garde-fous ni rollback                        |

### Points de désaccord

1. **SHA-pin vs Dependabot/renovate** : sécurité (immutabilité) vs friction de mise à jour (automatisée avec revue).
2. **OIDC Trusted Publishing** : OpenJS a signalé (14/11/2025) des lacunes de conception/implémentation pour les paquets critiques — pas une solution parfaite.
3. **Distroless vs Alpine** : surface minimale/debug difficile vs praticité.

---

## 9. DOCUMENTATION & ÉQUIPE

**État 2026.** **Diátaxis** (tutoriels / how-to / reference / explanation) structure la doc ; **docs-as-code** (Markdown versionné, revu en PR) est la norme. README + ADRs + runbooks ; `CODEOWNERS` pour la propriété du code ; Definition of Done explicite ; post-mortems **blameless** ; échelles d'ingénierie (engineering ladders) pour la progression. Les fichiers `AGENTS.md`/`CLAUDE.md` deviennent une couche de doc « pour machines » complémentaire du README « pour humains ».

### DO / DON'T

| ✅ DO                                                            | ❌ DON'T                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Structurer la doc selon Diátaxis ; docs-as-code (revue en PR)    | Ne PAS laisser la doc hors du repo/hors revue (elle dérive)       |
| ADRs pour chaque décision structurante (contexte + conséquences) | Ne PAS documenter les décisions seulement à l'oral                |
| Runbooks d'incident + post-mortems blameless                     | Ne PAS chercher un coupable (la culture de blâme tue la remontée) |
| `CODEOWNERS` + Definition of Done explicite et vérifiable        | Ne PAS laisser la propriété/le « done » implicites                |
| README court + `AGENTS.md` pour le contexte agent                | Ne PAS dupliquer/laisser diverger les fichiers de contexte IA     |

### Points de désaccord

1. **Volume de doc** : « self-documenting code » minimaliste vs doc riche (Diátaxis).
2. **ADRs légers vs lourds** : format 1 page vs template exhaustif.
3. **AGENTS.md comme doc** : source de vérité utile vs bruit à maintenir.

---

## (a) Top 15 règles transverses 2026

1. **Revue humaine obligatoire** de tout code, IA incluse — l'IA introduit une faille OWASP Top 10 dans **45 %** du code (Veracode 2025/2026).
2. **Supply chain = risque n°1** (OWASP A03:2025) : lockfile figé, SBOM, `--ignore-scripts` en CI, veille CVE.
3. **Épingler les actions CI par SHA** et privilégier **OIDC** aux secrets longue durée (tj-actions ; jetons npm classiques révoqués 9/12/2025).
4. **Node 24 LTS + TypeScript strict** ; quitter Node 20 (EOL 30/4/2026).
5. **Modular monolith par défaut** ; microservices seulement sur besoin avéré (CNCF : 42 % reconsolident ; Prime Video −90 % de coûts en revenant au monolithe).
6. **Trunk-based development**, branches < 24 h, feature flags (DORA/Accelerate).
7. **Viser CUPID/KISS/YAGNI**, pas SOLID dogmatique ; duplication contrôlée > mauvaise abstraction.
8. **WCAG 2.2 AA** dès maintenant (EAA applicable depuis 28/6/2025, s'applique hors UE).
9. **Reporting vulnérabilités CRA au 11/9/2026** : process de détection + SBOM prêts _avant_.
10. **Transparence AI Act Art. 50 au 2/8/2026** (haut-risque reporté à 12/2027, mais pas la transparence).
11. **Observabilité par conception** (OpenTelemetry), car l'IA augmente le débit mais l'instabilité (DORA 2025).
12. **Le code de test est du code de prod** : zéro tolérance flaky, tester le comportement pas l'implémentation.
13. **Couverture = signal, jamais objectif** ; ajouter mutation/contract/property-based testing.
14. **Secure defaults** : deny-by-default, valider les entrées, ne jamais « fail open » (OWASP A10:2025), ne jamais logguer de secrets.
15. **Docs-as-code + ADRs + `AGENTS.md`** ; post-mortems blameless.

## (b) Checklist « Ingénieur QA/automation TypeScript » (profil de l'utilisateur)

- **Runtime/tooling** : Node 24 LTS, TS `strict`, pnpm + lockfile, ESLint flat config (ou Biome), Prettier/Biome imposé en pre-commit.
- **Playwright/Cypress** : traiter le repo de test comme un produit — Page Object/fixtures typés, pas de sélecteurs fragiles, `data-testid`, auto-waiting (pas de `wait` fixes).
- **Forme de test** : trophée pour l'app React (RTL au niveau intégration), E2E ciblés sur les parcours critiques (checkout/auth), pyramide pour la logique métier backend.
- **Anti-flakiness** : quarantaine + correction (jamais retry aveugle masquant) ; isoler état/réseau (MSW/mock réseau) ; exécutions déterministes.
- **CI** : actions épinglées par SHA, `permissions` minimales, exécution parallèle, artefacts (traces Playwright) publiés ; pas de secrets longue durée (OIDC).
- **IA de test** : générer des tests avec l'IA mais **relire** (risque de tests superficiels/faux positifs) ; documenter les règles dans `AGENTS.md`.
- **Certifications** : le CTAL-TM (détenu) couvre le management ; viser **CTAL-TAE v2.0** (automatisation modernisée) et **CT-GenAI v1.1** pour la crédibilité formation.
- **Conformité clients FR/UE** : intégrer des tests d'accessibilité (axe-core/Playwright, WCAG 2.2 AA) dans la suite ; documenter la couverture accessibilité comme livrable ; l'EAA s'applique même depuis le Maroc dès que le client sert des consommateurs UE.
- **Curriculum AutomationDataCamp** : enseigner supply-chain (Shai-Hulud, tj-actions), OIDC, SHA-pin, testing trophy, revue de code IA — ce sont les sujets « chauds » 2026.

## (c) Caveats — éléments non vérifiés ou en évolution

- **Dates réglementaires mouvantes** : le report AI Act haut-risque (Digital Omnibus, Règlement (UE) 2026/1744) est présenté comme en vigueur au 27/7/2026 par des cabinets (Gibson Dunn, DLA Piper, CSA) ; la mécanique « backstop/registration » peut encore évoluer — vérifier le Journal officiel. La **transposition NIS2 en France** n'était **pas** finalisée au 6/8/2026 (promulgation loi Résilience attendue automne 2026, puis décrets) — dates à reconfirmer.
- **TypeScript 7** : plusieurs sources concordent sur une **GA au 8 juillet 2026** (typescriptpro.com, codingdunia, ntcompatible), mais certaines pages de juin 2026 ne parlaient encore que de RC ; l'absence d'API publique jusqu'à 7.1 est confirmée, son calendrier (~3 mois) est une estimation.
- **Chiffres microservices** : le « 42 % » vient de l'enquête CNCF (automne 2024, 689 répondants) ; les multiplicateurs de coût « 3,75×–6× » sont des reprises secondaires moins fiables. Le cas Prime Video (−90 %) est un exemple ponctuel, pas une règle générale.
- **METR (−19 %)** : RCT robuste mais **explicitement révisé/nuancé par METR le 24/2/2026** ; ne vaut que comme snapshot début 2025 sur des experts et des bases matures — ne pas généraliser « l'IA ralentit tout le monde ».
- **DORA 2025** : « ~65 % de devs fortement dépendants » n'a **pas** pu être confirmé dans les sources primaires (le blog Google Cloud cite 90 % d'adoption, ~80 % de gain de productivité perçu, 30 % de faible confiance) — à reconfirmer.
- **GitClear** : source primaire transparente mais éditeur commercial (intérêt dans le narratif « l'IA nuit à la maintenabilité »).
- **OWASP LLM 2026** : une édition datée du 4/8/2026 est référencée sur owasp.org/genai mais son contenu détaillé n'a pas été vérifié ici ; l'édition 2025 reste la base documentée.
- **SOLID « overrated »** : position réelle et défendue (Dan North/CUPID, Kevlin Henney) mais **contestée** — pas un consensus.
- **Playwright vs Cypress (part de marché 2026)** : la recherche dédiée n'a pas pu être complétée (budget de recherche épuisé) ; le consensus qualitatif est une adoption Playwright en forte hausse et un coût d'E2E en baisse, mais les chiffres de part de marché n'ont pas été vérifiés — à confirmer.
