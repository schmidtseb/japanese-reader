# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.0] - 2025-07-06

### Added
-   **Progressive Web App (PWA) Functionality**: The application is now a PWA.
    -   A **Service Worker** caches the application shell and assets, allowing for instant loads on subsequent visits and full offline access to the app's interface and already-saved data.
    -   A **Web App Manifest** allows users to "install" the application to their home screen on desktop and mobile devices for a more native-like experience.

## [3.5.1] - 2025-07-06

### Fixed
-   Resolved a persistent and complex bug where Japanese (hiragana) input would fail on subsequent review cards. The issue, caused by improper state cleanup of the `wanakana` input library between React component re-renders, was fixed by enforcing a full component re-mount for each new card using a unique `key` prop. This guarantees a clean state for every question.

## [3.5.0] - 2025-07-06

### Added
-   **URL Content Extraction**: Users can now paste a URL into the editor view to automatically fetch and extract the main Japanese article text and title from a webpage, powered by Gemini. This simplifies adding content from online sources.

## [3.4.0] - 2025-07-06

### Changed
-   **Dynamic SRS Intervals**: Enhanced the Spaced Repetition System algorithm to be more adaptive. The interval between reviews is now adjusted based on user performance ("Easy", "Hard", "Again" ratings), leading to a more personalized and effective learning schedule. This addresses a point of technical debt regarding SRS rigidity.

## [3.3.0] - 2025-07-06

### Added
-   **Flexible Review Sessions**: The review start screen now features separate "Learn" and "Review" buttons, allowing users to choose whether to tackle new items or due reviews first, providing more control over their study sessions.

### Changed
-   **Smarter SRS Penalties**: Refined the review logic for items marked "Again". An item is now only penalized once per session, and it will be shown again later in the same session. If an item is marked "Again" and then later answered correctly, its SRS stage will not be promoted, ensuring it has been re-learned without artificially inflating its mastery level.

## [3.2.0] - 2025-07-06

### Changed
-   Replaced the fixed, repeating 12-color palette for grammar pattern highlights with a dynamic color generation system. Every pattern now receives a unique, aesthetically-pleasing color based on the golden angle, improving readability for complex sentences. The colors are also theme-aware, adjusting for light and dark modes.

## [3.1.0] - 2025-07-06

### Added
-   **Unit Testing**: Introduced Vitest as the testing framework. Added comprehensive unit tests for critical business logic, including the SRS algorithm (`srs.ts`), the IndexedDB service (`db.ts`), and the primary application state reducer (`appDataContext`). This improves code reliability and reduces the risk of regressions.

## [3.0.0] - 2025-07-05

### Changed
-   **BREAKING CHANGE: Data Persistence Layer Overhaul**. The application's storage has been migrated from `localStorage` to `IndexedDB`.
    -   **Reason**: To support larger amounts of user data (saved texts, review items) and provide a more robust and scalable storage solution than the 5-10MB limit of `localStorage`.
    -   **Impact**: Data from previous versions of the app will **not** be automatically migrated. Users wishing to keep their data should use the "Export" feature in the old version before using the new version, and then use the "Import" feature.
-   A new centralized `db.ts` service now manages all IndexedDB interactions, improving maintainability and separation of concerns.
-   All application data, including settings and unsaved text in the editor, is now stored in IndexedDB.
-   The application now shows a loading indicator on startup while asynchronously fetching data from the database.

### Fixed
-   The API key management is now more robust, with the key stored in IndexedDB as part of the settings.
-   The settings menu now has a maximum height and scrolls internally, preventing the entire page from scrolling when the menu content is long. This also fixes an issue where the overlay backdrop would not cover the full screen.

## [2.0.0] - 2025-07-05

This release marks a complete rewrite of the application in React and TypeScript, introducing a significantly more powerful and robust user experience.

### Added

-   **Advanced Review System**: Overhauled the SRS feature into a full `ReviewController` with distinct "Learning" and "Review" phases.
-   **Learning Chunks**: New items are now introduced in manageable chunks (`CHUNK_SIZE = 5`) with dedicated study and quiz phases for better retention.
-   **In-App Deck Manager**: Users can now view and delete all items in their review deck from within the application.
-   **Focused Reading Mode**: A distraction-free, sentence-by-sentence reading interface to help users focus on the text. Features floating navigation buttons and swipe/tap gestures on mobile.
-   **Data Portability**: Added full data import and export functionality in the settings menu.
-   **User API Key**: Users can now provide their own Gemini API key in the settings menu, which is stored securely in `localStorage`.
-   **Responsive UI Components**: Introduced `BottomSheet` for a native-like experience on mobile and `Tooltip` for detailed information on desktop.
-   **Prefetching**: The app now pre-fetches the analysis for the next sentence in Reading Mode to improve perceived performance.
-   **Hotkeys**: Added extensive keyboard shortcuts for navigation and common actions (e.g., toggling UI, navigating patterns, grading review cards).

### Changed

-   **Technology Stack**: Migrated the entire codebase from its previous version to a modern React/TypeScript stack.
-   **State Management**: Refactored all state into three modular React Contexts (`AppData`, `UI`, `Settings`) for better separation of concerns and performance.
-   **SRS Algorithm**: Replaced the previous SRS logic with a more standard fixed-stage system. A migration path is included to automatically update review items from the old format.
-   **UI/UX**: Refined the entire user interface with an improved color palette, better typography, and consistent component design for both light and dark modes.
-   **API Integration**: Hardened the Gemini API integration by enforcing strict JSON output schemas, making the analysis parsing much more reliable.

### Fixed

-   Improved error handling for API calls, providing clearer feedback to the user.
-   Corrected numerous styling inconsistencies across different views.
-   Furigana generation logic is now more aware of okurigana, leading to more accurate readings.

## [1.0.0] - Initial Release

### Added

-   Core text analysis functionality using the Gemini API.
-   Display of sentence breakdown including readings (furigana), meanings, pitch accent, and parts of speech.
-   Identification and explanation of key grammar patterns.
-   Ability to add words and grammar points to a basic SRS review deck.
-   Local persistence of saved texts and the review deck using `localStorage`.
-   Basic UI toggles for showing/hiding furigana and part-of-speech color-coding.