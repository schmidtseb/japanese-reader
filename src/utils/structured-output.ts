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

export const KANJI_DETAILS_SCHEMA = {
  type: "OBJECT",
  properties: {
    kanji: {
      type: "STRING",
      description: "The Kanji character that was analyzed."
    },
    meaning: {
      type: "STRING",
      description: "The primary English meaning(s) of the Kanji."
    },
    onyomi: {
      type: "STRING",
      description: "The On'yomi (Sino-Japanese) reading(s) of the Kanji in Katakana, separated by commas if multiple exist."
    },
    kunyomi: {
      type: "STRING",
      description: "The Kun'yomi (native Japanese) reading(s) of the Kanji in Hiragana, separated by commas if multiple exist."
    },
    jlpt_level: {
      type: "STRING",
      description: "The JLPT proficiency level associated with this Kanji (e.g., 'N5', 'N1'). Should be 'N/A' if not applicable."
    },
    stroke_count: {
      type: "NUMBER",
      description: "The number of strokes required to write the Kanji."
    },
    example_words: {
      type: "ARRAY",
      description: "An array of 2-3 common words that use this Kanji.",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING", description: "The example word in Japanese (using Kanji)." },
          reading: { type: "STRING", description: "The reading of the example word in Hiragana." },
          meaning: { type: "STRING", description: "The English meaning of the example word." }
        },
        required: ["word", "reading", "meaning"]
      }
    }
  },
  required: ["kanji", "meaning", "onyomi", "kunyomi", "jlpt_level", "stroke_count", "example_words"]
};

export const WORD_DETAILS_SCHEMA = {
  type: "OBJECT",
  description: "A detailed analysis of a single Japanese word.",
  properties: {
    word: {
      type: "STRING",
      description: "The word that was analyzed."
    },
    reading: {
      type: "STRING",
      description: "The hiragana reading of the word."
    },
    part_of_speech: {
      type: "STRING",
      description: "The primary grammatical category of the word (e.g., 'Noun', 'Ichidan verb')."
    },
    definition: {
      type: "STRING",
      description: "A clear and concise English definition of the word."
    },
    example_sentences: {
      type: "ARRAY",
      description: "An array of 2-3 useful example sentences.",
      items: {
        type: "OBJECT",
        properties: {
          japanese: {
            type: "STRING",
            description: "The full example sentence in Japanese."
          },
          reading: {
            type: "STRING",
            description: "The complete hiragana reading of the example sentence."
          },
          english: {
            type: "STRING",
            description: "The English translation of the example sentence."
          }
        },
        required: ["japanese", "reading", "english"]
      }
    }
  },
  required: ["word", "reading", "part_of_speech", "definition", "example_sentences"]
};

export const COMPREHENSION_QUIZ_SCHEMA = {
  type: "OBJECT",
  description: "An AI-generated reading comprehension quiz based on a Japanese text.",
  properties: {
    estimated_jlpt_level: {
      type: "STRING",
      description: "The estimated JLPT level of the provided text (e.g., N5, N4, N3, N2, N1)."
    },
    questions: {
      type: "ARRAY",
      description: "An array of 3-5 multiple-choice questions in English about the text.",
      items: {
        type: "OBJECT",
        properties: {
          question: {
            type: "STRING",
            description: "The text of the comprehension question."
          },
          options: {
            type: "ARRAY",
            description: "An array of 4 string options for the multiple-choice question.",
            items: { "type": "STRING" }
          },
          correct_answer_index: {
            type: "NUMBER",
            description: "The 0-based index of the correct answer in the 'options' array."
          },
          explanation: {
            type: "STRING",
            description: "A brief explanation of why the correct answer is right, referencing the original text."
          }
        },
        required: ["question", "options", "correct_answer_index", "explanation"]
      }
    }
  },
  required: ["estimated_jlpt_level", "questions"]
};