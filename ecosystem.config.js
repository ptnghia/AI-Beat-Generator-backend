module.exports = {
  apps: [
    {
      name: 'ai-beat-generator-api',
      cwd: '/home/lifetechadmin/opt/AI-Beat-Generator-backend',
      script: 'npm',
      args: 'run start:api',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'ai-beat-generator-scheduler',
      cwd: '/home/lifetechadmin/opt/AI-Beat-Generator-backend',
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 0 * * *'
    }
  ]
};
