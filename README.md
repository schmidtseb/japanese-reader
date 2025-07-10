# Japanese Sentence Analyzer

A web application that uses the Google Gemini API for deep linguistic analysis of Japanese text, combined with a Spaced Repetition System (SRS) for effective learning and vocabulary retention.

This project is a feature-rich, client-side single-page application built with React and TypeScript.

## ✨ Features

-   **AI-Powered Analysis**: Deconstructs Japanese sentences to provide morphological analysis, including readings (furigana), pitch accent, parts of speech, and English equivalents.
-   **Interactive UI**: Click on any word or grammar pattern in an analysis to get detailed information. Drill down further with in-app **Kanji analysis** (meanings, readings, stroke counts) and **deep word analysis** (definitions, example sentences), all powered by the Gemini API.
-   **Grammar Explanations**: Automatically identifies and explains grammatical patterns and idiomatic expressions.
-   **AI Comprehension Quizzes**: After reading a section of text, test your understanding with an AI-generated, JLPT-style multiple-choice quiz about the content.
-   **Integrated SRS**: Add words and grammar points to a review deck. A built-in Spaced Repetition System helps you practice and retain what you've learned.
-   **Focused Reading Mode**: A distraction-free, sentence-by-sentence reading interface with swipe/tap navigation.
-   **Cloud Sync & Auth**: Create an account to sync your texts, review progress, and even your personal Gemini API key across devices using Supabase.
-   **Customizable Experience**: Includes light and dark themes, adjustable font sizes, and toggles for UI elements like furigana and pitch accent.
-   **Local Persistence**: All your saved texts, analysis history, and review progress are saved securely in your browser's IndexedDB.
-   **Data Management**: Import and export your entire application data (history, settings, review deck) as a JSON file.
-   **PWA & Offline Ready**: Install the app on your device and access your saved data even without an internet connection.

## 🤖 AI-Assisted Development
This application was developed with the assistance of a large language model from Google. The entire application, from architecture to implementation and debugging, was created through this collaborative process.

## 📄 License
This project is open source and available under the [MIT License](LICENSE).

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18 or later recommended)
-   [Yarn](https://yarnpkg.com/)
-   [Supabase CLI](https://supabase.com/docs/guides/cli)
-   A [Google Gemini API Key](https://ai.google.dev/pricing).
-   A [Supabase](https://supabase.com/) project.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  Install the dependencies:
    ```bash
    yarn
    ```

### Configuration Setup

This application uses environment variables for configuration.

1.  Create a `.env` file in the root of your project directory.
2.  Add the following contents to the `.env` file:

    ```env
    # A default Gemini API key for users who don't provide their own.
    API_KEY="YOUR_GEMINI_API_KEY"

    # Required for cloud sync and user-specific API keys.
    SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_PUBLIC_KEY"
    ```

3.  Link your local project to your remote Supabase project:
    ```bash
    supabase login
    supabase link --project-ref <your-project-ref>
    ```
    
4.  Set up secrets for your Supabase Edge Functions. In your Supabase dashboard under Project Settings > Edge Functions, add the following secrets:
    -   `ENCRYPTION_KEY`: A 32-character string for encrypting API keys (e.g., generate one with `openssl rand -base64 32`).
    -   `JWT_SECRET`: Your project's JWT Secret from Project Settings > API.

5.  **Configure OAuth Redirect URLs:** For Google Sign-In to work correctly, you must tell Supabase which URLs are allowed for redirection after a user authenticates.
    -   Go to your Supabase project dashboard.
    -   Navigate to **Authentication** -> **URL Configuration**.
    -   **Site URL**: Set this to the primary URL of your deployed application (e.g., `https://your-username.github.io/your-repo/`).
    -   **Additional Redirect URLs**: Add the URLs for both your local development environment and your deployed site. Supabase needs these to know where it's safe to send users back to after they log in.
        ```
        http://localhost:5173
        https://your-username.github.io/your-repo/
        ```
    *Note: If you are running on a different port locally, use that port instead. Using wildcards like `http://localhost:*` is also supported.*

### Supabase Database & Functions Setup

1.  **Database Schema**: Run the SQL script from `supabase_schema.sql` in your project's **SQL Editor** on the Supabase dashboard. This will create the necessary tables and policies.
2.  **Edge Functions**: Deploy the provided Edge Functions, which are required for secure API key handling.
    ```bash
    supabase functions deploy
    ```

### Running the Application

```bash
yarn dev
```

The application is now running.

-   **Cloud Sync**: The "Account" section will appear in the Settings menu, allowing you to sign in with Google to back up and sync your data.
-   **User API Keys**: When logged in, you can save a personal Gemini API key to your account. This key will be securely stored and used automatically on any device you're logged into, overriding local or default keys.
-   **Offline Mode**: If `SUPABASE_URL` and `SUPABASE_ANON_KEY` are not provided, the app will work offline-only, storing all data in your browser.

## 🛠️ Tech Stack

-   **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **AI**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
-   **Backend & Sync**: [Supabase](https://supabase.com/)
-   **Persistence**: Browser **IndexedDB**