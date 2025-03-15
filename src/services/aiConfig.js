/**
 * AI Model Configuration
 * Contains prompt templates and model-specific settings
 */

// Default system instructions for different use cases
const systemInstructions = {
  completion: "You are a helpful writing assistant. Complete the text naturally, maintaining the style and tone of the original writing.",
  
  improvement: "You are an expert editor. Improve the text by correcting grammar, enhancing clarity, and making it more engaging while preserving the original meaning.",
  
  suggestion: "You are a creative writing assistant. Provide helpful and contextually relevant suggestions to continue the text.",
  
  rewrite: "You are a skilled editor. Rewrite the provided text to make it clearer and more effective while preserving its original meaning.",
  
  summarize: "You are a concise summarizer. Create a brief summary of the provided text, capturing its key points."
};

// Configuration for different AI models
const modelConfigurations = {
  'gpt-3.5-turbo': {
    provider: 'openai',
    maxInputLength: 4000,
    temperatureRange: {
      creative: 0.9,
      balanced: 0.7,
      precise: 0.2
    },
    defaultMaxTokens: 150
  },
  'gpt-4': {
    provider: 'openai',
    maxInputLength: 8000,
    temperatureRange: {
      creative: 0.9,
      balanced: 0.7,
      precise: 0.1
    },
    defaultMaxTokens: 250
  }
};

// Helper functions to construct prompts
function createCompletionPrompt(text, style = 'balanced') {
  return {
    systemInstruction: systemInstructions.completion,
    userPrompt: `Please complete the following text in a ${style} style:\n\n${text}`
  };
}

function createImprovementPrompt(text, instruction = '') {
  return {
    systemInstruction: systemInstructions.improvement,
    userPrompt: `Please improve this text${instruction ? ' according to these instructions: ' + instruction : ''}:\n\n${text}\n\nProvide the improved version.`
  };
}

function createSuggestionPrompt(context) {
  return {
    systemInstruction: systemInstructions.suggestion,
    userPrompt: `Based on the following context, provide 3 brief suggestions for how to continue writing:\n\n${context}`
  };
}

module.exports = {
  systemInstructions,
  modelConfigurations,
  createCompletionPrompt,
  createImprovementPrompt,
  createSuggestionPrompt
};
