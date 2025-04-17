import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import { fileURLToPath } from 'url';
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    // Optimize dev server
    hmr: {
      overlay: false // Disable the HMR overlay to reduce CPU usage
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize build performance
    target: 'es2015',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          tanstack: ['@tanstack/react-query'],
          ui: [
            '@/components/ui/button',
            '@/components/ui/card',
            '@/components/ui/data-table',
            '@/components/ui/input',
            '@/components/ui/checkbox',
            '@/components/ui/tabs',
            '@/components/ui/badge',
            '@/components/ui/label',
            '@/components/ui/select',
            '@/components/ui/table',
            '@/components/ui/alert-dialog',
            '@/components/ui/form',
            '@/components/ui/dialog',
            '@/components/ui/textarea'
          ]
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      '@tanstack/react-query'
    ],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  // Improve CSS processing performance
  css: {
    devSourcemap: false
  }
});
