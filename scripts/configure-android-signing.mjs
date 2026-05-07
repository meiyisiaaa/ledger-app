import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const requiredEnv = [
  "ANDROID_KEYSTORE_PATH",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing Android signing environment variables: ${missing.join(", ")}`);
}

const buildGradlePath = join(process.cwd(), "mobile", "android", "app", "build.gradle");
let source = readFileSync(buildGradlePath, "utf8");

if (!source.includes("storeFile file(System.getenv(\"ANDROID_KEYSTORE_PATH\"))")) {
  source = source.replace(
    /signingConfigs\s*\{\s*debug\s*\{([\s\S]*?)\n\s*\}\s*\n\s*\}/,
    (match) => `${match.replace(/\n\s*\}\s*$/, "")}
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }`,
  );
}

source = source.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
  "$1signingConfig signingConfigs.release",
);

writeFileSync(buildGradlePath, source);
console.log("Android release signing configured");
