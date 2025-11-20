import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// Plugin to fix Amplitude frustrationPlugin import issue
const fixAmplitudePlugin = () => {
  return {
    name: 'fix-amplitude-plugin',
    transform(code: string, id: string) {
      // Fix the frustrationPlugin import in browser-client.js
      if (id.includes('browser-client.js') && code.includes('frustrationPlugin')) {
        // Replace the problematic import - handle both ESM and compiled formats
        let fixedCode = code;
        
        // Pattern 1: import { autocapturePlugin, frustrationPlugin } from '@amplitude/plugin-autocapture-browser'
        fixedCode = fixedCode.replace(
          /import\s*{\s*([^}]*frustrationPlugin[^}]*)\s*}\s*from\s*['"]@amplitude\/plugin-autocapture-browser['"]/g,
          (match, imports) => {
            // Remove frustrationPlugin from imports
            const cleanedImports = imports
              .split(',')
              .map((imp: string) => imp.trim())
              .filter((imp: string) => !imp.includes('frustrationPlugin'))
              .join(', ');
            return `import { ${cleanedImports} } from '@amplitude/plugin-autocapture-browser'; const frustrationPlugin = () => ({ setup: () => Promise.resolve(), teardown: () => Promise.resolve() });`;
          }
        );
        
        // Pattern 2: Handle cases where frustrationPlugin is used but not imported
        if (fixedCode.includes('frustrationPlugin') && !fixedCode.includes("const frustrationPlugin")) {
          fixedCode = fixedCode.replace(
            /frustrationPlugin\(/g,
            '(() => ({ setup: () => Promise.resolve(), teardown: () => Promise.resolve() }))('
          );
        }
        
        return { code: fixedCode, map: null };
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [react(), fixAmplitudePlugin()],
  optimizeDeps: {
    exclude: [
      '@pkg/renderer',
      '@amplitude/analytics-browser',
      '@amplitude/analytics-core',
      '@amplitude/plugin-autocapture-browser',
      '@amplitude/plugin-network-capture-browser',
      '@amplitude/plugin-page-view-tracking-browser',
      '@amplitude/plugin-web-vitals-browser',
      '@amplitude/plugin-page-url-enrichment-browser'
    ],
    include: ['scheduler', 'react', 'react-dom', 'react/jsx-runtime']
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@pkg/renderer': path.resolve(__dirname, '../../packages/renderer/src')
    }
  },
  ssr: {
    noExternal: ['@pkg/renderer']
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:8080'
    },
    fs: { allow: ['..'] },
    hmr: {
      overlay: true
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})


