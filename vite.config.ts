import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/DocumentAssistantApp/' : '/',
  // Public builds must not load credentials from local environment files.
  envDir: command === 'build' ? false : undefined,
  define: command === 'build' ? {
    'import.meta.env.VITE_N8N_API_KEY': JSON.stringify(''),
  } : undefined,
}));
