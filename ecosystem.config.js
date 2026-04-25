module.exports = {
  apps: [
    {
      name: 'travel-backend',
      cwd: '/root/projects/travel-footprint/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'travel-frontend',
      cwd: '/root/projects/travel-footprint/frontend/dist',
      script: '/home/openclaw/.nvm/versions/node/v22.22.1/bin/serve',
      args: '-s -l 3000',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};