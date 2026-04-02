#!/usr/bin/env node
const { execSync } = require("child_process");
const packageJson = require("./package.json");

const version = packageJson.version;
const command = process.argv[2];

const cmds = {
  build: `docker build --platform linux/amd64 -t gaming-music-bot:${version} -t gaming-music-bot:latest .`,
  save: `docker save gaming-music-bot:${version} -o music-discord-bot-${version}.tar`,
};

if (!cmds[command]) {
  console.error(`Unknown command: ${command}. Use 'build' or 'save'.`);
  process.exit(1);
}

console.log(`Running: ${cmds[command]}`);
execSync(cmds[command], { stdio: "inherit" });
