/* global console, process */
import fs from "fs";
import path from "path";

function copyEnv(envPath, samplePath) {
  if (fs.existsSync(envPath)) {
    console.log(`✅ ${envPath} already exists, skipping`);
  } else if (!fs.existsSync(samplePath)) {
    console.error(`❌ Example file not found: ${samplePath}`);
    process.exit(1);
  } else {
    fs.copyFileSync(samplePath, envPath);
    console.log(`✅ Created ${envPath} from ${samplePath}`);
  }
}

const root = path.join(import.meta.dirname, "..");
copyEnv(
  path.join(root, "apps/api/.env"),
  path.join(root, "apps/api/.env.example"),
);
