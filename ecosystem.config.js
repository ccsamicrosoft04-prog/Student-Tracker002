module.exports = {
  apps: [
    {
      name: "Student-Tracker",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "start-app-bat", // Name of your bat process
      script: "../start-app.bat", // Path to your .bat file (since it's in www folder)
      interpreter: "cmd.exe", // Important for Windows batch files
      autorestart: true // Auto restart if it stops
    }
  ]
};