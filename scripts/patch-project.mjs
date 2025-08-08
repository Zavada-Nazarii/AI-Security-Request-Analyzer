// Запустіть у корені вашої теки (де package.json): node scripts/patch-project.mjs
// Патчить локальний package.json так само, як автопатч у Dockerfile.
import fs from "node:fs";

const path = "./package.json";
if (!fs.existsSync(path)) {
  console.error("package.json not found");
  process.exit(1);
}
const p = JSON.parse(fs.readFileSync(path, "utf8"));
p.name = "sec-analyzer-app";
p.private = true;
p.scripts = {
  dev: "next dev -p 3000",
  build: "next build",
  start: "next start -p 3000",
  lint: "next lint",
};
p.dependencies = p.dependencies || {};
delete p.dependencies["node:fs"];
delete p.dependencies["node:path"];
// Force compatible versions
p.dependencies["react"] = "18.3.1";
p.dependencies["react-dom"] = "18.3.1";
p.dependencies["next"] = "15.2.4";
p.dependencies["@ai-sdk/xai"] = "^2.0.3";
p.dependencies["zod"] = "^3.25.76";
// Fill helpful defaults if missing
p.dependencies["ai"] = p.dependencies["ai"] || "^3.4.0";
p.dependencies["bcryptjs"] = p.dependencies["bcryptjs"] || "^2.4.3";
p.dependencies["better-sqlite3"] = p.dependencies["better-sqlite3"] || "^11.5.0";
p.dependencies["jose"] = p.dependencies["jose"] || "^5.6.3";
p.dependencies["lucide-react"] = p.dependencies["lucide-react"] || "^0.454.0";
p.dependencies["recharts"] = p.dependencies["recharts"] || "^2.12.7";
p.dependencies["tailwind-merge"] = p.dependencies["tailwind-merge"] || "^2.5.5";
p.dependencies["tailwindcss-animate"] = p.dependencies["tailwindcss-animate"] || "^1.0.7";
p.dependencies["geist"] = p.dependencies["geist"] || "^1.3.1";

fs.writeFileSync(path, JSON.stringify(p, null, 2));
console.log("Patched package.json");
console.log("Now run:");
console.log("  rm -f package-lock.json pnpm-lock.yaml yarn.lock");
console.log("  docker compose build --no-cache --progress=plain");
console.log("  docker compose up");
