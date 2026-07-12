module.exports = {
  apps: [
    {
      name: 'barber-bot',
      script: 'bot.js',
      env: {
        NODE_EXTRA_CA_CERTS: '/var/www/Projects/max-dialog-barber-bot/russian_trusted_root_ca.cer',
        NODE_ENV: 'production',
      },
    },
    {
      name: 'barber-web',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
