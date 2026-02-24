// Utility functions to check if credentials are configured in environment variables

// Check if database credentials are configured
export const hasDatabaseCredentials = (): boolean => {
  return !!(import.meta.env.VITE_DB_HOST && 
           import.meta.env.VITE_DB_USER && 
           import.meta.env.VITE_DB_PASSWORD && 
           import.meta.env.VITE_DB_NAME) ||
         !!(import.meta.env.DB_HOST && 
           import.meta.env.DB_USER && 
           import.meta.env.DB_PASSWORD && 
           import.meta.env.DB_NAME);
};

// Check if search API credentials are configured
export const hasSearchCredentials = (): boolean => {
  return !!(import.meta.env.VITE_BRAVE_API_KEY || 
           import.meta.env.VITE_SERPER_API_KEY ||
           import.meta.env.VITE_SEARCH_API_PROVIDER) ||
         !!(import.meta.env.BRAVE_API_KEY || 
           import.meta.env.SERPER_API_KEY ||
           import.meta.env.SEARCH_API_PROVIDER);
};

// Check if AI service credentials are configured
export const hasAICredentials = (): boolean => {
  return !!(import.meta.env.VITE_LONGCAT_API_KEY ||
           import.meta.env.VITE_MISTRAL_API_KEY ||
           import.meta.env.VITE_GROK_API_KEY ||
           import.meta.env.VITE_DEEPSEEK_API_KEY ||
           import.meta.env.VITE_OPENROUTER_API_KEY ||
           import.meta.env.VITE_OLLAMA_BASE_URL) ||
         !!(import.meta.env.LONGCAT_API_KEY ||
           import.meta.env.MISTRAL_API_KEY ||
           import.meta.env.GROK_API_KEY ||
           import.meta.env.DEEPSEEK_API_KEY ||
           import.meta.env.OPENROUTER_API_KEY ||
           import.meta.env.OLLAMA_BASE_URL);
};

// Check if any credentials are configured
export const hasAnyCredentials = (): boolean => {
  return hasDatabaseCredentials() || 
         hasSearchCredentials() || 
         hasAICredentials();
};

// Check if backend should be available (based on database credentials)
export const isBackendAvailable = (): boolean => {
  return hasDatabaseCredentials();
};

// Check if search APIs should be available
export const isSearchAvailable = (): boolean => {
  return hasSearchCredentials();
};

// Check if AI services should be available
export const isAIAvailable = (): boolean => {
  return hasAICredentials();
};

// Get configured search provider
export const getSearchProvider = (): string => {
  return import.meta.env.VITE_SEARCH_API_PROVIDER || 
         (import.meta.env.VITE_BRAVE_API_KEY ? 'brave' : 
          import.meta.env.VITE_SERPER_API_KEY ? 'serper' : 'demo');
};

// Get API base URL
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};
