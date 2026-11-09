/// <reference types="node" />

import { defineConfig, loadEnv } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const netlifyDeployment =
    (process.env.NETLIFY_DEPLOYMENT ?? env.NETLIFY_DEPLOYMENT) === '1'

  return {
    resolve: { tsconfigPaths: true },
    server: {
      host: true,
      port: 3200,
      strictPort: true,
      cors: false,
      allowedHosts: ['pisanggoreng'],
    },
    preview: {
      host: true,
      port: 3200,
      strictPort: true,
      cors: false,
      allowedHosts: ['pisanggoreng'],
    },
    plugins: [
      // Netlify needs its adapter only for Netlify builds. The homelab keeps
      // building the plain Node/Vite output.
      ...(netlifyDeployment ? [netlify()] : []),
      tanstackStart(),
      viteReact(),
    ],
  }
})
