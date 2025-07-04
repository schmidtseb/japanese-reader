# Japanese Sentence Analyzer

A web application that uses the Google Gemini API for deep linguistic analysis of Japanese text, combined with a Spaced Repetition System (SRS) for effective learning and vocabulary retention.

This project is a feature-rich, client-side single-page application built with React and TypeScript.

## ✨ Features

-   **AI-Powered Analysis**: Deconstructs Japanese sentences to provide morphological analysis, including readings (furigana), pitch accent, parts of speech, and English equivalents.
-   **Interactive UI**: Click on any word or grammar pattern in an analysis to get detailed information, definitions, and usage examples.
-   **Grammar Explanations**: Automatically identifies and explains grammatical patterns and idiomatic expressions.
-   **Integrated SRS**: Add words and grammar points to a review deck. A built-in Spaced Repetition System helps you practice and retain what you've learned.
-   **Focused Reading Mode**: A distraction-free, sentence-by-sentence reading interface with swipe/tap navigation.
-   **Customizable Experience**: Includes light and dark themes, adjustable font sizes, and toggles for UI elements like furigana and pitch accent.
-   **Local Persistence**: All your saved texts, analysis history, and review progress are saved securely in your browser's local storage.
-   **Data Management**: Import and export your entire application data (history, settings, review deck) as a JSON file.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### API Key Setup

This application requires a Google Gemini API key to function. You have two options for providing it:

**Option 1: Environment Variable (Recommended)**

1.  Create a file named `.env` in the root of the project directory.
2.  Add your API key to this file:
    ```
    API_KEY="YOUR_GEMINI_API_KEY"
    ```
    This key will be used as the default for all API calls.

**Option 2: In-App Settings**

1.  Run the application.
2.  Open the settings menu (gear icon).
3.  Under "API Key Management", paste your Gemini API key into the input field and click "Save Key". This key will override the default key and will be stored locally in your browser.

### Running the Application

Once dependencies are installed and the API key is set up, run the development server:

```bash
npm run dev
```

Open your browser and navigate to the local URL provided (usually `http://localhost:5173`).

## 🛠️ Tech Stack

-   **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **AI**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
-   **Persistence**: Browser `localStorage`
