import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_BYTES = 5 * 1024 * 1024;
const forbiddenExtensions = /\.(?:sqlite3?|db(?:-wal|-shm)?|psd|ai|tiff?)$/i;
const forbiddenDirectories = /(?:^|\/)(?:archive|archives|private|originals|raw|outputs?)(?:\/|$)/i;
const productionExport = /(?:^|\/)(?=[^/]*(?:prod|production))(?=[^/]*(?:dump|export|backup))[^/]*\.(?:csv|json|sql|zip)$/i;
const credentialPattern = /(?:BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[0-9A-Za-z]{30,}|CLOUDFLARE_API_TOKEN\s*=\s*[^\s#]+)/;
const localPathPattern = /(?:\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|\/var\/folders\/|[A-Za-z]:\\Users\\[^\\\s]+\\)/;
const oauthCodePattern = /(?:(?:[?&]code=)|(?:oauth|authorization)[_ -]?code\s*[:=]\s*)[0-9A-Za-z._~-]{12,}/i;
const personalDataPattern = /(?:手机号|身份证|passport|personal[_ -]?phone)\s*[:=：]\s*[^\s,;]{6,}/i;
const emailPattern = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const allowedEmailDomains = ["cmi.community", "cmiswap.com", "example.com", "users.noreply.github.com"];

function isAllowedEmail(domain) {
  const normalized = domain.toLowerCase();
  return allowedEmailDomains.some((allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`));
}

export function scanPublicBoundary(files, { root = process.cwd() } = {}) {
  const failures = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) continue;
    if (forbiddenDirectories.test(file) || forbiddenExtensions.test(file)) {
      failures.push(`${file}: private archive/output path or file type`);
      continue;
    }
    if (productionExport.test(file)) {
      failures.push(`${file}: production export/backup must not enter the public repository`);
      continue;
    }
    const size = statSync(absolute).size;
    if (size > MAX_BYTES) failures.push(`${file}: ${size} bytes exceeds 5 MiB public-repo limit`);
    if (size === 0 || size >= 1024 * 1024 || /\.(?:png|jpe?g|gif|webp|ico|woff2?)$/i.test(file)) continue;

    const body = readFileSync(absolute, "utf8");
    if (credentialPattern.test(body)) failures.push(`${file}: credential-like value detected`);
    if (localPathPattern.test(body)) failures.push(`${file}: local user or temporary path detected`);
    if (oauthCodePattern.test(body)) failures.push(`${file}: OAuth authorization code-like value detected`);
    if (personalDataPattern.test(body)) failures.push(`${file}: personal-data-like value detected`);
    for (const match of body.matchAll(emailPattern)) {
      if (!isAllowedEmail(match[1])) failures.push(`${file}: non-public email address detected`);
    }
  }

  for (const publicJson of files.filter((file) => file.startsWith("public/") && file.endsWith(".json"))) {
    const body = readFileSync(path.join(root, publicJson), "utf8");
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
  return [...new Set(failures)];
}

function repositoryFiles(root) {
  const output = execFileSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean);
}

function run() {
  const root = process.cwd();
  const files = repositoryFiles(root);
  const failures = scanPublicBoundary(files, { root });
  if (failures.length) {
    console.error(`Public boundary check failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Public boundary check passed for ${files.length} repository files.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
