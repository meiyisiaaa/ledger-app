import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tag = process.env.RELEASE_TAG ?? "";
const version = tag.replace(/^v/i, "");
const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? process.env.GITHUB_RUN_NUMBER);

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`RELEASE_TAG must look like v1.2.3, received "${tag}"`);
}

if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error("ANDROID_VERSION_CODE or GITHUB_RUN_NUMBER must be a positive integer");
}

const appJsonPath = join(root, "mobile", "app.json");
const packageJsonPath = join(root, "mobile", "package.json");

const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));
appJson.expo.version = version;
appJson.expo.android = appJson.expo.android ?? {};
appJson.expo.android.versionCode = versionCode;
writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
packageJson.version = version;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`Mobile version set to ${version} (${versionCode})`);
