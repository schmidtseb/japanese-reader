# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
