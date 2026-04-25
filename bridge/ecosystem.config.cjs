/**
 * PM2 ecosystem — usado pra rodar a bridge na VPS com auto-restart.
 *
 * Deploy:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup           # gera comando pra iniciar pm2 no boot
 */
module.exports = {
  apps: [
    {
      name: "l2impure-bridge",
      script: "dist/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
      // Logs
      out_file: "./logs/out.log",
      error_file: "./logs/err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
