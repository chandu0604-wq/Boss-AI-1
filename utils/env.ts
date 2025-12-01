
export const getApiKey = (): string | undefined => {
  // 1. Static Access for Vite (Critical for Vercel/Netlify deployments)
  // Bundlers look for this exact string to perform replacement.
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
      // @ts-ignore
      if (import.meta.env.REACT_APP_API_KEY) return import.meta.env.REACT_APP_API_KEY;
    }
  } catch (e) {
    // Ignore if import.meta is not supported
  }

  // 2. Static Access for Webpack / Create React App / Next.js
  // We must access process.env.VAR_NAME directly for the bundler to see it.
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
      // Some bundlers allow plain API_KEY if configured
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }

  // 3. Runtime/Global Injection (Fallback for custom HTML injections)
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.API_KEY) return w.API_KEY;
    if (w.VITE_API_KEY) return w.VITE_API_KEY;
    if (w.REACT_APP_API_KEY) return w.REACT_APP_API_KEY;
    
    // Check polyfilled process from index.html
    if (w.process?.env?.API_KEY) return w.process.env.API_KEY;
  }

  return undefined;
};
