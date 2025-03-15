/**
 * AI Service - Handles communication with AI providers
 * Supports text completions, content suggestions, and other AI features
 */
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Load environment variables
dotenv.config();

// Cache for storing recent responses to avoid duplicate requests
const responseCache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// Rate limiting configuration
const userRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

// Default AI configuration
const DEFAULT_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai',
  model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  apiKey: process.env.OPENAI_API_KEY || '',
  temperature: 0.7,
  maxTokens: 150,
};

// Validate configuration on startup
function validateConfig() {
  const missingEnvVars = [];
  
  if (!process.env.OPENAI_API_KEY) {
    missingEnvVars.push('OPENAI_API_KEY');
  }
  
  if (missingEnvVars.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', `⚠️ Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('\x1b[33m%s\x1b[0m', '  AI features will be limited or unavailable.');
    console.warn('\x1b[33m%s\x1b[0m', '  Create a .env file in the project root with the required variables.');
    return false;
  }
  return true;
}

// Check rate limits for a user
function checkRateLimit(userId) {
  const now = Date.now();
  
  // Initialize or clean up old entries
  if (!userRequestCounts.has(userId)) {
    userRequestCounts.set(userId, { count: 0, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    const userRateLimit = userRequestCounts.get(userId);
    if (userRateLimit.resetAt < now) {
      userRateLimit.count = 0;
      userRateLimit.resetAt = now + RATE_LIMIT_WINDOW;
    }
  }
  
  const userRateLimit = userRequestCounts.get(userId);
  if (userRateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      resetIn: Math.ceil((userRateLimit.resetAt - now) / 1000)
    };
  }
  
  userRateLimit.count++;
  return {
    allowed: true,
    remainingRequests: RATE_LIMIT_MAX_REQUESTS - userRateLimit.count
  };
}

/**
 * Get text completion from AI service
 * @param {string} prompt - The input prompt
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} The completion text
 */
async function getTextCompletion(prompt, options = {}) {
  // Generate cache key based on prompt and options
  const cacheKey = JSON.stringify({ prompt, options });
  
  // Check cache first
  if (responseCache.has(cacheKey)) {
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse.expiry > Date.now()) {
      console.log('Using cached response for prompt');
      return cachedResponse.data;
    }
    responseCache.delete(cacheKey); // Remove expired cache entry
  }
  
  try {
    const config = { ...DEFAULT_CONFIG, ...options };
    let response;
    
    // Handle different AI providers
    switch (config.provider.toLowerCase()) {
      case 'openai':
        response = await callOpenAI(prompt, config);
        break;
      // Add cases for other providers here
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
    
    // Cache the response
    responseCache.set(cacheKey, {
      data: response,
      expiry: Date.now() + CACHE_TTL
    });
    
    return response;
  } catch (error) {
    console.error('AI completion error:', error.message);
    throw new Error(`Failed to get AI completion: ${error.message}`);
  }
}

/**
 * Call OpenAI API for text completion
 * @param {string} prompt - User input prompt
 * @param {Object} config - Configuration options
 * @returns {Promise<string>} Completion text
 */
async function callOpenAI(prompt, config) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant for text editing and writing.' },
          { role: 'user', content: prompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API error:', error.response.data);
      throw new Error(`OpenAI API error: ${error.response.data.error?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Improve content using AI
 * @param {string} content - The content to improve
 * @param {string} instruction - Specific improvement instructions
 * @returns {Promise<Object>} Improved content and suggestions
 */
async function improveContent(content, instruction, options = {}) {
  try {
    const prompt = `
Please improve the following text ${instruction ? 'according to these instructions: ' + instruction : ''}:

${content}

Provide the improved version and brief explanation of changes.
    `;
    
    const result = await getTextCompletion(prompt, options);
    
    return {
      improved: extractImprovedContent(result),
      explanation: extractExplanation(result),
      original: content
    };
  } catch (error) {
    console.error('Error improving content:', error);
    throw new Error(`Failed to improve content: ${error.message}`);
  }
}

/**
 * Generate text suggestions based on context
 * @param {string} context - The current context (text before cursor)
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} List of suggestions
 */
async function generateSuggestions(context, options = {}) {
  try {
    // Prepare a prompt that will generate multiple suggestions
    const prompt = `
Based on the following text, provide 3 brief suggestions for how to continue the writing:

${context}

Format your response as:
1. [First suggestion]
2. [Second suggestion]
3. [Third suggestion]
    `;
    
    const result = await getTextCompletion(prompt, {
      ...options,
      temperature: 0.8, // Higher temperature for more creative suggestions
    });
    
    // Parse the response to extract suggestions
    const suggestions = result.split('\n')
      .filter(line => /^\d+\./.test(line)) // Lines that start with a number and dot
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove the numbering
      .filter(suggestion => suggestion.length > 0);
    
    return suggestions;
  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw new Error(`Failed to generate suggestions: ${error.message}`);
  }
}

// Helper functions to parse AI responses
function extractImprovedContent(aiResponse) {
  // This is a simple implementation - might need adjustment based on actual AI output patterns
  const improvedMatch = aiResponse.match(/(?:Improved version:|Improved text:|Here's the improved version:)([\s\S]+?)(?:Explanation:|Changes:|$)/i);
  if (improvedMatch && improvedMatch[1]) {
    return improvedMatch[1].trim();
  }
  // If no specific pattern found, return everything except obvious explanations
  return aiResponse.replace(/(?:Explanation:|Changes:|Here are the changes:)[\s\S]+$/i, '').trim();
}

function extractExplanation(aiResponse) {
  const explanationMatch = aiResponse.match(/(?:Explanation:|Changes:|Here are the changes:)([\s\S]+)$/i);
  if (explanationMatch && explanationMatch[1]) {
    return explanationMatch[1].trim();
  }
  return '';
}

// Run validation at startup
const isConfigValid = validateConfig();

module.exports = {
  getTextCompletion,
  improveContent,
  generateSuggestions,
  checkRateLimit,
  isConfigValid,
};
