import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const MAX_BYTES = 5 * 1024 * 1024;
const forbiddenExtensions = /\.(?:sqlite3?|db(?:-wal|-shm)?|psd|ai|tiff?)$/i;
const forbiddenDirectories = /(?:^|\/)(?:archive|archives|private|originals|raw|outputs?)(?:\/|$)/i;
const credentialPattern = /(?:BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{30,}|CLOUDFLARE_API_TOKEN\s*=\s*[^\s#]+)/;

const output = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const files = output.split("\0").filter(Boolean);
const failures = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  if (forbiddenDirectories.test(file) || forbiddenExtensions.test(file)) {
    failures.push(`${file}: private archive/output path or file type`);
    continue;
  }
  const size = statSync(file).size;
  if (size > MAX_BYTES) failures.push(`${file}: ${size} bytes exceeds 5 MiB public-repo limit`);
  if (size > 0 && size < 1024 * 1024 && !/\.(?:png|jpe?g|gif|webp|ico|woff2?)$/i.test(file)) {
    const body = readFileSync(file, "utf8");
    if (credentialPattern.test(body)) failures.push(`${file}: credential-like value detected`);
  }
}

for (const publicJson of files.filter((file) => file.startsWith("public/") && file.endsWith(".json"))) {
  const body = readFileSync(publicJson, "utf8");
  const forbiddenPublicKeys = [
    "sourceLocalPath",
    "imageSha256",
    "provenance",
    "permissionStatus",
    "accountBiz",
    "evidence",
  ];
  for (const key of forbiddenPublicKeys) {
    if (body.includes(`\"${key}\"`)) failures.push(`${publicJson}: forbidden public field ${key}`);
  }
}

if (failures.length) {
  console.error(`Public boundary check failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Public boundary check passed for ${files.length} repository files.`);
