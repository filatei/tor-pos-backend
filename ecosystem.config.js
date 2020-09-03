module.exports = {
    apps: [
      {
        name: 'tor-pos-backend',
        cwd: 'tor-pos-backend',
        script: 'npm',
        args: 'start',
        env: {
          PORT: 3000,
          NODE_ENV: 'production',
          SSL_DEV_KEY: './ssl/localhost.key',
          SSL_DEV_CRT: './ssl/localhost.crt',
          SSL_PDT_KEY: '/home/user1/letsencrypt/privkey4.pem',
          SSL_PDT_CRT: '/home/user1/letsencrypt/cert4.pem',
          SSL_PDT_CA: '/home/user1/letsencrypt/fullchain4.pem',
        },
      },
    ],
  };