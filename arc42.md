# Architecture Documentation: Japanese Sentence Analyzer

**arc42 Template Version:** 9.0 (adapted for this project)
**Last Updated:** 2025-07-08

This document provides a comprehensive overview of the architecture for the Japanese Sentence Analyzer, a web-based tool for linguistic analysis and language learning.

## 1. Introduction and Goals

### 1.1. Requirements Overview

The application is a client-side tool designed for Japanese language learners. Its primary purpose is to provide deep linguistic analysis of Japanese text and facilitate learning through a Spaced Repetition System (SRS).

**Core Features:**
-   **Text Input:** Users can input or paste Japanese text for analysis, or import article content from a URL.
-   **AI-Powered Analysis:** Leverages the Google Gemini API to break down sentences into morphological segments, providing readings (furigana), pitch accent, parts of speech, and English equivalents.
-   **Grammar Identification:** The AI identifies and explains grammatical patterns and idiomatic expressions within the text.
-   **Interactive UI:** Users can click on words and grammar patterns to get detailed information.
-   **Spaced Repetition System (SRS):** Users can add words and grammar patterns to a review deck. The application uses an interactive SRS to schedule items for review, testing users with different quiz types (e.g., translation, reading) to enhance long-term memory retention. The "My Texts" list provides an at-a-glance view of which texts have items due for review.
-   **Reading Mode:** A focused, sentence-by-sentence reading interface to minimize distractions.
-   **Persistence & Offline Capability:** All user data is stored locally in the browser's IndexedDB. The application is a Progressive Web App (PWA), meaning its interface is available offline and can be "installed" on user devices.

### 1.2. Quality Goals

| Quality Goal      | Motivation                                                                                                   | How it's Achieved                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usability**     | The primary users are language learners. The interface must be intuitive, responsive, and helpful.           | Clean, component-based UI. Responsive design (e.g., BottomSheet on mobile, Tooltip on desktop). Hotkeys for power users. Clear visual hierarchy. At-a-glance status indicators (e.g., due review counts). Dark/Light themes. Adjustable font sizes.                |
| **Performance**   | API calls can be slow and costly. The app must feel fast and responsive during use.                          | **Caching:** All sentence analyses from the Gemini API are cached in IndexedDB. **Prefetching:** In Reading Mode, the next sentence's analysis is fetched in the background. Lightweight state management.      |
| **Maintainability** | The codebase must be easy to understand, modify, and extend over time.                                      | **TypeScript:** Enforces type safety. **Component-Based:** Code is modularized into React components. **Structured Code:** Code is organized by `features`, `services`, `contexts`, `hooks`, and `utils`. **Unit Tests** for core logic and UI components via Vitest. |
| **Offline Capability** | Users should be able to use the app interface and review their saved data without an internet connection. | All user data is stored in **IndexedDB**. A **Service Worker** caches all static assets (HTML, JS, CSS, icons), making the application shell fully available offline. New analyses still require an internet connection. |
| **Configurability**| Users should be able to tailor the experience to their needs, including providing their own API keys.      | A comprehensive settings menu allows toggling UI features, adjusting learning parameters (e.g., new words per day), and managing the API key.                                                   |

### 1.3. Stakeholders

| Role                  | Goals & Interests                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Language Learner**  | (Primary User) Needs an accurate, fast, and easy-to-use tool to understand Japanese and practice vocabulary. |
| **AI-Assisted Developer** | (Primary Developer) A human developer collaborating with a large language model to produce a clean, well-structured, and maintainable codebase. |
| **App "Host"/Provider**| If deployed for public use, needs to manage API costs, potentially by requiring users to provide their own key. |

### 1.4. Potential Future Features

The current architecture provides a solid foundation for future enhancements.

#### Enhanced, In-App Kanji Analysis
-   **Concept:** Instead of linking out to Jisho.org, provide detailed Kanji information directly within the app.
-   **Potential Implementations:**
    -   When a user clicks a Kanji, trigger a new Gemini API call specifically for that character.
    -   Display stroke order diagrams, On'yomi/Kun'yomi readings, and example compounds in the `BottomSheet` (mobile) or `Tooltip` (desktop).
-   **Architectural Impact:** Requires a new API call function in `gemini.ts` and updates to the `InteractiveKanji` component and the UI display components.

### 1.5. Development Process Note

A significant aspect of this project's development is the use of **AI-Assisted Development**. The entire application, from initial architecture to feature implementation and debugging, was created through a collaborative process between a human engineer and a large language model from Google. This approach influences the "Developer" stakeholder role and demonstrates a modern workflow for rapid application development.

---

## 2. Architecture Constraints

### Technical Constraints

-   **Client-Side Only:** The application is a Single-Page Application (SPA) that runs entirely in the user's web browser. There is no custom backend server.
-   **Browser Environment:** Must be compatible with modern web browsers that support the Fetch API, **IndexedDB**, and the Web Speech API (for Text-to-Speech).
-   **Gemini API Dependency:** The core analysis functionality is critically dependent on the Google Gemini API. An internet connection and a valid API key are required for any new analysis.
-   **IndexedDB Persistence:** The application relies on IndexedDB for all data storage. This provides a robust, high-capacity, asynchronous storage solution suitable for structured data. Data is not synchronized across devices.
-   **Technology Stack:** The architecture is built on and constrained by the chosen technologies: React, TypeScript, and Tailwind CSS.

### Organizational Constraints

-   **API Key Management:** The system is designed to work with a default key provided via environment variables (`process.env.API_KEY`) or a user-provided key. This design suggests a need to offload API costs to the user in a self-hosted or "power-user" scenario.

---

## 3. Context and Scope

### Business Context

The system is a standalone web application. It interacts with one primary external service for its core logic.



| System/User          | Responsibilities                                                                        |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Language Learner** | Interacts with the UI to input text, review analyses, and manage their learning deck.   |
| **Japanese Analyzer SPA** | Renders the UI, manages state, orchestrates API calls, and handles local persistence. |
| **Google Gemini API**  | (External) Provides the core linguistic analysis based on prompts from the SPA.        |
| **Browser APIs**     | (External) Provide **IndexedDB**, `SpeechSynthesis`, and **Service Workers**.        |

### Technical Context

-   **UI:** The user interacts with a React-based UI rendered in their browser.
-   **Data Flow for Analysis:** `UI -> Gemini Service -> Google Gemini API -> Gemini Service -> Data Cache (in IndexedDB) -> UI`
-   **Data Flow for Persistence:** `UI -> AppData Context -> DB Service -> IndexedDB`

---

## 4. Solution Strategy

### Technology Choices

-   **React:** Chosen for its component-based architecture, which allows for building a modular and maintainable UI.
-   **TypeScript:** Used to add static typing, improving code quality, developer experience, and long-term maintainability.
-   **Tailwind CSS:** A utility-first CSS framework used for rapid and consistent styling. The configuration uses CSS variables for easy theming (light/dark modes).
-   **Vite:** A modern frontend build tool that provides a fast development experience and optimized production builds.
-   **Vitest:** A modern unit testing framework chosen for its speed and seamless integration with Vite.
-   **Google Gemini API (`@google/genai`):** The cornerstone of the application. Chosen for its advanced natural language understanding and its ability to return structured JSON, which is critical for parsing the analysis reliably.
-   **IndexedDB:** Chosen as the primary persistence solution for its high storage capacity (much larger than `localStorage`), asynchronous API, and strong support for storing and querying structured data. This avoids the complexity and cost of a backend database, making the app easy to deploy as a static site.
-   **PWA Technologies (Service Workers, Web App Manifest):** Chosen to provide offline access to the application shell and allow users to "install" the app on their devices for a more native-like experience.

### Key Architectural Decisions

-   **Centralized State Management via React Context:** Instead of a more complex library like Redux, the application uses React's built-in Context API. The state is strategically divided into three contexts (`AppData`, `Settings`, `UI`) to prevent unnecessary re-renders and keep concerns separated. This is a good balance of power and simplicity for an app of this scale.
-   **Service-Oriented Structure:** Logic for external interactions is isolated in the `src/services` directory. This includes `gemini.ts` for API calls, `srs.ts` for the learning algorithm, `tts.ts` for the text-to-speech browser API wrapper, and **`db.ts` to manage all IndexedDB interactions.** This separation makes the core components more focused and easier to test.
-   **Hook-based Logic Abstraction:** Complex or reusable logic is encapsulated in custom hooks. `useSentenceAnalysis` abstracts the entire flow of fetching/caching analysis. `useHotkeys` centralizes keyboard shortcut management.
-   **Feature-Driven Code Organization:** The `src/features` directory groups components and views by major application functionality (Editor, Reader, Review). This makes it easy to locate and work on a specific part of the application.
-   **Schema-Defined API Payloads:** The application defines explicit JSON schemas (`src/utils/structured-output.ts`) that are sent to the Gemini API. This forces the model to return data in a predictable format, making the application robust against variations in the model's text generation.
-   **Explicit Component Resets via `key` Prop:** For complex components that interact with stateful third-party libraries (like the `wanakana` IME helper) or have intricate internal state, a unique `key` prop is passed. This prop is changed whenever a new instance of the data is displayed (e.g., for each new review card). This leverages a core React pattern to force the component to unmount and remount completely, ensuring a clean state and preventing bugs related to improper lifecycle management or state leakage between renders.
-   **Progressive Web App (PWA) Implementation:** The app is a PWA. A service worker (`sw.js`) is used to cache static application assets, enabling offline use of the app's shell. A `manifest.json` file provides metadata for installability ("Add to Home Screen"). This enhances reliability and user engagement.

---

## 5. Building Block View

### Level 1: Key Logical Components

This diagram shows the main logical blocks of the application and their interactions.

```mermaid
graph TD
    subgraph Browser
        UI(User Interface)
        State(State Management)
        Services(Service Layer)
        Persistence(Persistence Layer via db.ts)
    end

    subgraph External
        GeminiAPI[Google Gemini API]
        BrowserAPIs[Browser APIs - IndexedDB, Service Worker]
    end

    UI --> State
    UI --> Services
    State --> UI
    State --> Persistence
    Services --> GeminiAPI
    Services --> Persistence
    Persistence --> BrowserAPIs

    style UI fill:#bbf,stroke:#333,stroke-width:2px
    style State fill:#bfb,stroke:#333,stroke-width:2px
    style Services fill:#fbb,stroke:#333,stroke-width:2px
    style Persistence fill:#ffb,stroke:#333,stroke-width:2px
```

### Level 2: High-Level Code Dependencies

This diagram shows how the main code directories and logical layers depend on each other. It provides a map from the abstract layers in Level 1 to the concrete source code structure.

```mermaid
graph TD
    subgraph "UI Layer (Views & Components)"
        Features[src/features]
        Components[src/components]
    end

    subgraph "State & Logic Layer"
        Contexts[src/contexts]
        Hooks[src/hooks]
    end

    subgraph "Service & Data Layer"
        Services[src/services]
    end
    
    subgraph "External Dependencies"
        GeminiAPI[Google Gemini API]
        BrowserAPIs[Browser APIs: IndexedDB, Web Speech, Service Worker]
    end

    Features --> Components
    Features --> Contexts
    Features --> Hooks
    
    Hooks --> Contexts
    Hooks --> Services

    Components --> Contexts

    Contexts --> Services

    Services --> GeminiAPI
    Services --> BrowserAPIs

    style Features fill:#bbf,stroke:#333,stroke-width:2px
    style Components fill:#bbf,stroke:#333,stroke-width:2px
    style Contexts fill:#bfb,stroke:#333,stroke-width:2px
    style Hooks fill:#bfb,stroke:#333,stroke-width:2px
    style Services fill:#fbb,stroke:#333,stroke-width:2px
```

---

## 6. Runtime View

### Scenario 1: Analyzing a New Sentence

1.  **User**: Enters Japanese text into `EditorView` and clicks "Analyze Text".
2.  **`EditorView`**: Dispatches an `ADD_OR_UPDATE_TEXT_ENTRY` action.
3.  **`appDataContext` Reducer**: Receives the action, updates its in-memory state, and **asynchronously calls `db.addOrUpdateTextEntry()` to persist the new text to IndexedDB.** It then dispatches `SET_VIEW` to switch to the `Reader` view.
4.  **`ReaderView`**: Renders the text, with each sentence being a clickable element.
5.  **User**: Clicks on a sentence.
6.  **`ReaderView`**: Dispatches `SET_SELECTED_SENTENCE` to `appDataContext`.
7.  **`useSentenceAnalysis` hook**: Is triggered by the change in `selectedSentence`.
8.  **`useSentenceAnalysis` hook**: Checks `appDataContext` for a cached analysis of this sentence at the current analysis depth.
9.  **Cache Miss**: No analysis is found. The hook sets its state to `isLoading`. `AnalysisPlaceholder` is rendered.
10. **`gemini.ts`**: The hook calls the `analyzeSentence` function. This function now **first asynchronously calls `db.getAllSettings()` to retrieve the API key**, then constructs the request and sends it to the Google Gemini API.
11. **Gemini API**: Processes the request and returns a JSON response.
12. **`gemini.ts`**: The response is parsed. The hook's state is updated with the fetched data.
13. **`useSentenceAnalysis` hook**: Dispatches `CACHE_ANALYSIS` to `appDataContext`.
14. **`appDataContext` Reducer**: The reducer updates the relevant text entry in its state and **asynchronously calls `db.addOrUpdateTextEntry()` to save the updated entry with the new analysis to IndexedDB.**
15. **`AnalysisView`**: Re-renders with the new analysis data, displaying the detailed breakdown and grammar notes.

```mermaid
sequenceDiagram
    participant User
    participant EditorView as "EditorView.tsx"
    participant AppData as "appDataContext"
    participant DB as "db.ts"
    participant ReaderView as "ReaderView.tsx"
    participant AnalysisHook as "useSentenceAnalysis"
    participant Gemini as "gemini.ts"
    participant GeminiAPI as "Gemini API"

    User->>EditorView: Enters text, clicks Analyze
    EditorView->>AppData: dispatch(ADD_OR_UPDATE_TEXT_ENTRY)
    AppData->>DB: addOrUpdateTextEntry()
    EditorView->>AppData: dispatch(SET_VIEW: Reader)

    activate ReaderView
    User->>ReaderView: Clicks a sentence
    ReaderView->>AppData: dispatch(SET_SELECTED_SENTENCE)
    
    activate AnalysisHook
    AnalysisHook->>AppData: Access cache (miss)
    AnalysisHook->>Gemini: execute(analyzeSentence)
    deactivate AnalysisHook

    activate Gemini
    Gemini->>DB: getAllSettings() (for API Key)
    DB-->>Gemini: settings
    Gemini->>GeminiAPI: generateContent() request
    GeminiAPI-->>Gemini: JSON response
    Gemini-->>AnalysisHook: return analysis
    deactivate Gemini

    activate AnalysisHook
    AnalysisHook->>AppData: dispatch(CACHE_ANALYSIS)
    AppData->>DB: addOrUpdateTextEntry() (with new analysis)
    AnalysisHook->>ReaderView: return analysis data
    deactivate AnalysisHook
    
    ReaderView->>User: Display analysis
    deactivate ReaderView
```

### Scenario 2: Application Cold Start

1.  **User**: Opens the application.
2.  **Browser**: Makes a request for the main page.
3.  **Service Worker**: (If installed on subsequent visits) Intercepts the request and serves the cached `index.html` and other static assets, allowing the app to load instantly even if offline.
4.  **`App.tsx`**: Renders a loading indicator because the initial state of both `appDataContext` and `settingsContext` is `isLoading: true`.
5.  **`SettingsProvider` `useEffect`**: Calls `db.initDB()`, then `db.getAllSettings()`. On success, it dispatches `INITIALIZE_SETTINGS_SUCCESS` with the retrieved settings. The settings state is updated, and `isLoading` becomes `false`.
6.  **`AppDataProvider` `useEffect`**: Calls `db.initDB()`, then `db.getAllTextEntries()` and `db.getAllReviewItems()`. On success, it dispatches `INITIALIZE_DATA_SUCCESS` with the user's persisted data. The app data state is updated, and `isLoading` becomes `false`.
7.  **`App.tsx`**: Both `isLoading` flags are now false. The main application UI is rendered with the user's persisted data.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant ServiceWorker as "sw.js"
    participant App as "App.tsx"
    participant Providers as "Context Providers"
    participant DB as "db.ts"
    participant IndexedDB

    User->>Browser: Opens application
    Browser->>ServiceWorker: Request for assets
    ServiceWorker->>Browser: Respond with cached assets
    Browser->>App: Render application
    App->>App: Render Loading UI
    
    activate Providers
    Providers->>DB: initDB()
    DB->>IndexedDB: open()
    IndexedDB-->>DB: db instance
    
    Providers->>DB: getAllSettings()
    DB->>IndexedDB: get from 'settings' store
    IndexedDB-->>DB: settings data
    DB-->>Providers: return settings
    Providers->>Providers: dispatch(INITIALIZE_SETTINGS_SUCCESS)
    
    Providers->>DB: getAllTextEntries(), getAllReviewItems()
    DB->>IndexedDB: get from 'text_entries', 'review_deck' stores
    IndexedDB-->>DB: user data
    DB-->>Providers: return user data
    Providers->>Providers: dispatch(INITIALIZE_DATA_SUCCESS)
    deactivate Providers
    
    App->>App: Both loading flags false, re-render
    App->>User: Display main UI with user data
```

---

## 7. Deployment View

This is a static single-page application.

### Build Process

-   The command `yarn build` (invoking `vite build`) transpiles the TypeScript/React code, bundles all JavaScript modules, and outputs static HTML, CSS, and JS files into the `/dist` directory.
-   The build process can inject environment variables (like `process.env.API_KEY`) into the code.
-   The `public` directory, containing `sw.js`, `manifest.json`, and `icon.svg`, is copied to the root of the `/dist` directory.

### Deployment Infrastructure

-   The contents of the `/dist` directory can be deployed to any static web hosting service.
    -   Examples: Vercel, Netlify, AWS S3 with CloudFront, GitHub Pages.
-   No server-side computation is needed. The infrastructure is minimal.

---

## 8. Crosscutting Concepts

| Concept                 | Implementation Strategy                                                                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **State Management**    | Implemented via React Context API. `AppDataProvider`, `SettingsProvider`, and `UIProvider` are wrapped around the root `App` component in `index.tsx`, making state globally accessible. To manage local component state, particularly in complex components like review cards, the application uses the `key` prop strategy to ensure components are fully reset between different data items.                                                                                                                         |
| **API Communication**   | Centralized in `src/services/gemini.ts`. A reusable `useApiCall` hook abstracts the boilerplate of handling loading, error, and data states for any API call.                                                                                                                                                      |
| **Persistence**         | Handled by a dedicated service at **`src/services/db.ts`**. This service wraps all IndexedDB operations. Context reducers call functions from this service to asynchronously persist state changes.                                                                                                                |
| **PWA / Offline**         | The app is installable via a `manifest.json` file. A service worker in `public/sw.js` implements a robust caching strategy to ensure both offline capability and seamless updates. It uses a **network-first, falling back to cache** strategy for the main application shell (navigation requests) to ensure users always get the latest version when online. All other assets use a **cache-first** strategy for optimal performance. This hybrid approach resolves the common PWA issue of users being stuck on a stale version. `index.tsx` contains the logic to register the service worker. |
| **Error Handling**      | API errors are caught in the `useApiCall` hook and exposed to the UI. The `ErrorComponent` is a reusable component to display these errors to the user with a retry option. DB errors are logged to the console.                                                                                                  |
| **Styling & Theming**   | A global stylesheet (`index.html`'s `<style>` block) defines CSS variables for the main color palette. The `dark` class on the `<html>` element toggles between light and dark themes. Tailwind CSS is used for component-level styling. Some dynamic styles, like grammar pattern highlights, are generated in JavaScript to ensure uniqueness and are applied inline. |
| **Hotkeys**             | A `useHotkeys` custom hook contains a `useEffect` that attaches a global `keydown` event listener. It dispatches actions to the appropriate context based on the current `view`.                                                                                                                                   |
| **Responsiveness**      | Achieved via Tailwind's responsive prefixes (e.g., `md:`, `sm:`) and conditional rendering of components based on screen size (e.g., using `BottomSheet` on mobile vs. `Tooltip` on desktop).                                                                                                                     |
| **Testing**             | Unit tests are implemented using **Vitest**. Coverage includes critical business logic (the SRS algorithm in `srs.ts`, the IndexedDB service in `db.ts`), state management reducers (`appDataContext`), and major UI component views like `EditorView`, `ReadingModeView`, and `ReviewController`. `fake-indexeddb` is used to mock the database for testing persistence logic.                                                            |

---

## 9. Architecture Decisions

### ADR 1: State Management with React Context

-   **Decision:** Use React's built-in Context API for state management instead of external libraries like Redux or Zustand.
-   **Rationale:** The application's state complexity is manageable. Context API is sufficient, avoids adding another dependency, and is familiar to all React developers. The state is split into logical domains (App Data, UI, Settings) to optimize performance.
-   **Consequences:** Less boilerplate than Redux. Performance could become an issue if state becomes highly complex and interconnected, but this is not currently the case. This approach is supplemented by using the component `key` prop to enforce resets of local component state, a necessary pattern when dealing with complex, stateful components.

### ADR 2: Client-Side Persistence with `IndexedDB`

-   **Decision:** Use the browser's `IndexedDB` for all data persistence.
-   **Rationale:** This provides a high-capacity, robust, and asynchronous storage solution necessary for handling a growing collection of user texts, analyses, and review items. It is superior to `localStorage` for storing large amounts of structured data. It also keeps the application entirely serverless.
-   **Consequences:** Data is not synced across devices or browsers. IndexedDB's API is more complex than `localStorage`, necessitating a wrapper service (`db.ts`) to manage it cleanly.

### ADR 3: Gemini for Linguistic Analysis with Strict Schemas

-   **Decision:** Use the Google Gemini API as the analysis engine and enforce a strict JSON output schema.
-   **Rationale:** Gemini provides the necessary high-quality linguistic analysis. Forcing a JSON schema makes the application robust and reliable by ensuring the API response is always in a parsable format, preventing errors from free-form text responses.
-   **Consequences:** The application is tightly coupled to the Gemini API. If the API changes or has downtime, the core functionality is impacted. The quality of analysis is entirely dependent on the quality of the AI model and the prompt.

### ADR 4: Implementation as a Progressive Web App (PWA)

-   **Decision:** Implement PWA features, including a service worker for asset caching and a web app manifest for installability.
-   **Rationale:** This significantly improves the user experience by providing offline access to the application shell and allowing users to add the app to their home screen. It enhances the feeling of a native application without the overhead of building one. The cache-first strategy for static assets makes subsequent loads much faster.
-   **Consequences:** Adds a layer of complexity related to service worker lifecycle and cache management. Developers need to be mindful of cache-busting strategies when deploying new versions to ensure users get updates.

---

## 10. Quality Requirements

See Section 1.2 for a table-based view. In summary:

-   **Usability:** High priority. Achieved through a clean UI, responsiveness, hotkeys, and configurability.
-   **Performance:** High priority. Achieved primarily through aggressive caching of API results and prefetching in key areas.
-   **Maintainability:** High priority. Achieved through TypeScript, a clean project structure, and separation of concerns.

---

## 11. Risks and Technical Debt

### Identified Risks

-   **API Key Exposure/Management:** A default API key embedded at build time could be extracted from the static JS files. The reliance on users providing their own key is a significant hurdle for non-technical users.
-   **Gemini API Changes/Costs:** The application is tightly coupled to the Gemini API. Breaking changes in the API or its pricing model could render the app unusable or expensive.
-   **CORS Proxy Reliability:** The "Import from URL" feature relies on third-party CORS proxies (`allorigins.win`, `corsproxy.io`). These free services can be unreliable, slow, or be discontinued, impacting the feature's functionality.
-   **IndexedDB Complexity:** While abstracted by `db.ts`, IndexedDB has complexities (e.g., versioning, transaction management) that can be a source of bugs if not handled carefully.

### Technical Debt

-   **UI Interaction Testing**: While unit tests now cover critical business logic and major UI components including `EditorView`, `ReadingModeView`, and `ReviewController`, coverage for complex user interaction flows (e.g., fine-grained gesture interactions, complex focus management in hotkeys) could still be enhanced. Most regressions in component logic and data flow should now be caught automatically.

---

## 12. Glossary

| Term                    | Definition                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Analysis**            | The structured JSON object returned by the Gemini API, detailing a sentence's linguistic properties.              |
| **Context**               | Refers to the React Context API used for state management. The app has `AppData`, `Settings`, and `UI` contexts.    |
| **CORS**                | Cross-Origin Resource Sharing. A browser security feature that restricts web pages from making requests to a different domain than the one that served the page. |
| **Furigana**              | Hiragana readings placed above kanji characters.                                                                  |
| **IndexedDB**             | A low-level browser API for client-side storage of significant amounts of structured data, including files/blobs. |
| **Pitch Accent**          | The rise and fall of pitch in Japanese words, represented in the app by 'H' and 'L' strings.                       |
| **PWA**                   | Progressive Web App. A web application that uses modern web capabilities to deliver an app-like experience to users. Features include offline work, installability, and push notifications. |
| **Review Item**           | A single word or grammar point stored in the review deck for SRS.                                                   |
| **Segment**               | A single morphological unit (word, particle) of a sentence as determined by the analysis.                         |
| **Service Worker**        | A script that the browser runs in the background, separate from a web page, enabling features that don't need a web page or user interaction, like offline caching and push notifications. |
| **SPA**                   | Single-Page Application. A web application that runs entirely on a single HTML page.                              |
| **SRS**                   | Spaced Repetition System. An evidence-based learning technique that schedules reviews at increasing intervals.    |
| **TextEntry**             | A data structure representing a user-saved text, including its title, content, and cached sentence analyses.      |
| **View**                  | A top-level UI screen in the application, such as `EditorView`, `ReaderView`, or `ReviewController`.              |