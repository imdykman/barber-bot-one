module.exports = {
  apps: [
    {
      name: 'barber-one',
      script: 'bot.js',
      env: {
        TZ: 'Asia/Yekaterinburg',
        NODE_EXTRA_CA_CERTS: './russian_trusted_root_ca.cer',
        NODE_ENV: 'production',
      },
    },
    {
      name: 'barber-one-web',
      script: 'server.js',
      env: {
        TZ: 'Asia/Yekaterinburg',
        PORT: 3001,
        NODE_ENV: 'production',
      },
    },
  ],
};
