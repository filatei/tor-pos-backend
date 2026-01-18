module.exports = {
  apps: [
    {
      name: "tor-pos-backend",
      cwd: "tor-pos-backend",
      script: "npm",
      args: "start",
      interpreter: "/home/user1/.nvm/versions/node/v20.19.0/bin/node", // ADD THIS LINE
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        SSL_DEV_KEY: "./ssl/localhost.key",
        SSL_DEV_CRT: "./ssl/localhost.crt",
        SSL_PDT_KEY: "/home/user1/letsencrypt/privkey4.pem",
        SSL_PDT_CRT: "/home/user1/letsencrypt/cert4.pem",
        SSL_PDT_CA: "/home/user1/letsencrypt/fullchain4.pem",
      },
      watch: ["server", "client"],
      watch_delay: 1000,
      ignore_watch: ["node_modules", "uploads"],
    },
  ],
};