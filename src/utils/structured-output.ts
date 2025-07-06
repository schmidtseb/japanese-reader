// structured_output.ts

export const JAPANESE_ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    original_japanese_sentence: {
      type: "STRING",
      description: "The original Japanese sentence provided by the user."
    },
    analysis: {
      type: "ARRAY",
      description: "An array of objects, each representing a segmented component of the Japanese sentence.",
      items: {
        type: "OBJECT",
        properties: {
          japanese_segment: {
            type: "STRING",
            description: "The individual Japanese segment (word, particle, etc.)."
          },
          reading: {
            type: "STRING",
            description: "The reading of the Japanese segment in Hiragana or Katakana."
          },
          category: {
            type: "STRING",
            description: "A highly specific grammatical category label for the segment (e.g., 'NOUN_COMMON', 'VERB_ICHIDAN-TE-PAST-AFFIRMATIVE')."
          },
          english_equivalent: {
            type: "STRING",
            description: "A direct, concise English equivalent of the segment."
          },
          pitch_accent: {
            type: "STRING",
            description: "CRITICAL: A string representing the pitch accent pattern using 'H' for high and 'L' for low. This string's length MUST exactly match the character length of the 'reading' field. For heiban words, use 'L' followed by all 'H's (e.g., reading 'ともだち' -> pitch 'LHHH'). For non-applicable segments like punctuation, this MUST be an empty string \"\". Do not omit this field."
          }
        },
        required: [
          "japanese_segment",
          "reading",
          "category",
          "english_equivalent",
          "pitch_accent"
        ]
      }
    },
    grammar_patterns: {
      type: "ARRAY",
      description: "A comprehensive array of identified grammatical patterns, idiomatic phrases, or nuanced vocabulary in the sentence.",
      items: {
        type: "OBJECT",
        properties: {
          pattern_name: {
            type: "STRING",
            description: "The name of the grammatical pattern or the phrase being explained (e.g., '〜なければならない', 'よろしくお願いします')."
          },
          explanation: {
            type: "STRING",
            description: "A detailed explanation of the pattern's meaning, usage, and nuance for a language learner."
          },
          constituent_indices: {
            type: "ARRAY",
            description: "An array of zero-based indices from the 'analysis' array that form this pattern.",
            items: {
              type: "NUMBER"
            }
          }
        },
        required: ["pattern_name", "explanation", "constituent_indices"]
      }
    },
    english_translation: {
      type: "STRING",
      description: "The complete, natural-sounding English translation of the entire Japanese sentence."
    }
  },
  required: [
    "original_japanese_sentence",
    "analysis",
    "grammar_patterns",
    "english_translation"
  ]
};

export const EXAMPLE_SENTENCES_SCHEMA = {
  type: "ARRAY",
  description: "An array of 2-3 simple example sentences for the given grammar pattern.",
  items: {
      type: "OBJECT",
      properties: {
          japanese: {
              type: "STRING",
              description: "The full example sentence in Japanese, including Kanji."
          },
          reading: {
              type: "STRING",
              description: "The complete reading of the Japanese sentence in Hiragana."
          },
          english: {
              type: "STRING",
              description: "The natural English translation of the sentence."
          },
          highlight_indices: {
              type: "ARRAY",
              description: "A two-element array [startIndex, endIndex] indicating the character position of the grammar pattern within the 'japanese' string. startIndex is inclusive, endIndex is exclusive.",
              items: { type: "NUMBER" },
              minItems: 2,
              maxItems: 2,
          }
      },
      required: ["japanese", "reading", "english", "highlight_indices"]
  }
};

export const ARTICLE_EXTRACTION_SCHEMA = {
    type: "OBJECT",
    properties: {
        title: {
            type: "STRING",
            description: "The extracted main title of the article. Should be an empty string if no title is found."
        },
        japanese_text: {
            type: "STRING",
            description: "The extracted and cleaned main Japanese text of the article, formatted with paragraphs separated by newlines. Should be an empty string if no Japanese article is found."
        }
    },
    required: ["title", "japanese_text"]
};