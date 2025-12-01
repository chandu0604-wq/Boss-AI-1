
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

  // 2. Try Vite standard (import.meta.env)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       const vEnv = import.meta.env;
       // Vite requires VITE_ prefix to expose vars to client, but we check others just in case
       if (vEnv.VITE_API_KEY) return vEnv.VITE_API_KEY;
       if (vEnv.API_KEY) return vEnv.API_KEY;
       if (vEnv.REACT_APP_API_KEY) return vEnv.REACT_APP_API_KEY;
       if (vEnv.NEXT_PUBLIC_API_KEY) return vEnv.NEXT_PUBLIC_API_KEY;
    }
  } catch (e) {
    // Ignore errors in environments that don't support import.meta
  }

  // 3. Try standard process.env access (Webpack/CRA/Next.js)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
      if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
      // Fallback to plain API_KEY (often filtered out by bundlers but worth a check)
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore reference errors
  }

  return undefined;
};
