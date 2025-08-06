module.exports = {
  apps: [
    {
      name: "NQMAP-backend",
      cwd: "C:/Proyectos/PRODUCCION/NQMAP 2.0/NQMap/backend",
      script: "server.js",
      interpreter: "node"
    },
    {
      name: "NQMAP-frontend",
      cwd: "C:/Proyectos/PRODUCCION/NQMAP 2.0/NQMap/frontend",
      script: "cmd",
      args: "/c npm run dev"
    }
  ]
};
