import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function read(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(read(filePath));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractFirst(regex, content, fieldName, sourcePath) {
  const match = content.match(regex);
  if (!match) {
    fail(`Could not parse ${fieldName} from ${sourcePath}`);
  }
  return match[1];
}

const manifest = readJson("versioning/releases.json");

const webPkg = readJson("web/package.json");
const webVersion = String(webPkg.version ?? "");

const iosProject = read("ios/project.yml");
const iosTargetBlock = iosProject.match(/\n  Solennix:\n[\s\S]*?\n    configFiles:/);
if (!iosTargetBlock) {
  fail("Could not find iOS app target Solennix block in ios/project.yml");
}
const iosVersion = extractFirst(/MARKETING_VERSION:\s*"([^"]+)"/, iosTargetBlock[0], "MARKETING_VERSION", "ios/project.yml");
const iosBuild = extractFirst(/CURRENT_PROJECT_VERSION:\s*"([^"]+)"/, iosTargetBlock[0], "CURRENT_PROJECT_VERSION", "ios/project.yml");

const androidGradle = read("android/app/build.gradle.kts");
const androidVersion = extractFirst(/versionName\s*=\s*"([^"]+)"/, androidGradle, "versionName", "android/app/build.gradle.kts");
const androidBuild = extractFirst(/versionCode\s*=\s*(\d+)/, androidGradle, "versionCode", "android/app/build.gradle.kts");

const backendVersion = read("backend/VERSION").trim();

const expected = manifest.currentVersions;
const checks = [
  ["web.version", expected.web.version, webVersion],
  ["ios.version", expected.ios.version, iosVersion],
  ["ios.build", expected.ios.build, iosBuild],
  ["android.version", expected.android.version, androidVersion],
  ["android.build", expected.android.build, androidBuild],
  ["backend.version", expected.backend.version, backendVersion],
];

const mismatches = checks.filter(([, exp, got]) => exp !== got);
if (mismatches.length > 0) {
  console.error("Version mismatch detected:");
  for (const [name, exp, got] of mismatches) {
    console.error(`- ${name}: expected ${exp}, got ${got}`);
  }
  process.exit(1);
}

console.log("All platform versions are in sync with versioning/releases.json");
