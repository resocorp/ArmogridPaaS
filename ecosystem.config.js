/**
 * PM2 Ecosystem Config for DigitalOcean VPS
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup
 *
 * Copy .env.local to .env before running, or set env vars in the env block below.
 */
module.exports = {
  apps: [
    {
      name: 'armogrid-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'armogrid-cron',
      script: 'scripts/cron-worker.mjs',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        APP_URL: 'http://localhost:3000',
        // CRON_SECRET: 'your-secret-here',   // set in .env or here
      },
    },
  ],
};
