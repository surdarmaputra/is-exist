/// <reference types="node" />

import { defineConfig, loadEnv } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const netlifyDeployment =
    (process.env.NETLIFY_DEPLOYMENT ?? env.NETLIFY_DEPLOYMENT) === '1'

  const siteUrl = (
    env.VITE_SITE_URL ||
    env.SITE_URL ||
    process.env.SITE_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    'http://pisanggoreng:3200'
  ).replace(/\/+$/, '')

  return {
    resolve: { tsconfigPaths: true },
    define: { __SITE_URL__: JSON.stringify(siteUrl) },
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
      tanstackStart(),
      viteReact(),
      // Netlify needs its adapter only for Netlify builds. The homelab keeps
      // building the plain Node/Vite output.
      ...(netlifyDeployment ? [netlify()] : []),
    ],
  }
})
