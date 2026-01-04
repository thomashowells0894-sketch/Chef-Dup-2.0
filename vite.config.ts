import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // Server configuration
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react'],
            'ai-vendor': ['@google/genai'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
          // Optimize chunk names for caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
      // Target modern browsers for smaller bundle
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      // CSS optimization
      cssCodeSplit: true,
      cssMinify: true,
      // Asset inlining threshold (4kb)
      assetsInlineLimit: 4096,
    },

    // Preview configuration
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },

    // Plugins
    plugins: [
      react({
        // Fast Refresh for development
        fastRefresh: true,
        // Include JSX runtime
        jsxRuntime: 'automatic',
      }),
    ],

    // Environment variables
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__APP_VERSION__': JSON.stringify('1.0.0'),
    },

    // Path aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, 'components'),
        '@services': path.resolve(__dirname, 'services'),
        '@hooks': path.resolve(__dirname, 'hooks'),
        '@types': path.resolve(__dirname, 'types'),
      },
    },

    // Optimization
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
      exclude: ['@capacitor/core'],
    },

    // CSS configuration
    css: {
      devSourcemap: true,
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },

    // JSON configuration
    json: {
      stringify: true,
    },

    // Enable esbuild for faster builds
    esbuild: {
      jsxInject: undefined,
      target: 'es2020',
      legalComments: 'none',
    },
  };
});
