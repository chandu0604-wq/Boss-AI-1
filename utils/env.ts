
export const getApiKey = (): string | undefined => {
  // 1. Try safe global access (handles window.API_KEY injections)
  if (typeof window !== 'undefined') {
    const w = window as any;
    // Check all common naming conventions for API Keys
    const potentialKey = 
      w.API_KEY || 
      w.REACT_APP_API_KEY || 
      w.GOOGLE_API_KEY || 
      w.GEMINI_API_KEY || 
      w.NEXT_PUBLIC_API_KEY || 
      w.VITE_API_KEY;
      
    if (potentialKey) return potentialKey;

    // Check robust polyfilled process
    if (w.process?.env?.API_KEY) {
      return w.process.env.API_KEY;
    }
  }

  // 2. Try standard process.env access (for build-time replacement)
  // We wrap in try-catch because accessing process in some strict browser envs might fail if not polyfilled
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore reference errors
  }

  return undefined;
};
