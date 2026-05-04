import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const manifestPath = path.join(rootDir, "versioning", "releases.json");
const markdownPath = path.join(rootDir, "CHANGELOG.md");
const webContentDir = path.join(rootDir, "web", "src", "content");
const webGeneratedPath = path.join(webContentDir, "changelog.generated.ts");
const checkMode = process.argv.includes("--check");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function renderMarkdown(data) {
  const { currentVersions, releases } = data;
  const lines = [];

  lines.push("# Changelog");
  lines.push("");
  lines.push("Historial oficial de cambios de Solennix para Web, iOS, Android y Backend.");
  lines.push("");
  lines.push(`Ultima actualizacion: ${data.updatedAt}`);
  lines.push("");
  lines.push("## Versiones actuales");
  lines.push("");
  lines.push("| Plataforma | Version | Build | Source |\n| --- | --- | --- | --- |");
  lines.push(`| Web | ${currentVersions.web.version} | - | ${currentVersions.web.source} |`);
  lines.push(`| iOS | ${currentVersions.ios.version} | ${currentVersions.ios.build} | ${currentVersions.ios.source} |`);
  lines.push(`| Android | ${currentVersions.android.version} | ${currentVersions.android.build} | ${currentVersions.android.source} |`);
  lines.push(`| Backend | ${currentVersions.backend.version} | - | ${currentVersions.backend.source} |`);
  lines.push("");

  for (const release of releases) {
    lines.push(`## ${release.date} - ${release.title}`);
    lines.push("");
    lines.push(release.summary);
    lines.push("");

    for (const platform of ["web", "ios", "android", "backend"]) {
      lines.push(`### ${platform.toUpperCase()}`);
      for (const item of release.platforms[platform] ?? []) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderWebTs(data) {
  const banner = [
    "// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.",
    "// Source: versioning/releases.json",
    "",
  ].join("\n");

  return `${banner}export const changelogData = ${JSON.stringify(data, null, 2)} as const;\n`;
}

function assertOrWrite(filePath, content) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, "utf8") : "";

  if (checkMode) {
    if (current !== content) {
      console.error(`Outdated generated file: ${path.relative(rootDir, filePath)}`);
      process.exitCode = 1;
    }
    return;
  }

  fs.writeFileSync(filePath, content, "utf8");
}

const manifest = readJson(manifestPath);
const markdown = renderMarkdown(manifest);
const webTs = renderWebTs(manifest);

if (!checkMode) {
  fs.mkdirSync(webContentDir, { recursive: true });
}

assertOrWrite(markdownPath, markdown);
assertOrWrite(webGeneratedPath, webTs);

if (checkMode && process.exitCode === 1) {
  process.exit(1);
}
