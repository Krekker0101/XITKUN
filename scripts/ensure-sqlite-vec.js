/**
 * Ensures the sqlite-vec package for the current OS is available locally.
 * This keeps postinstall quiet on Windows and avoids hard-coded /tmp paths.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SQLITE_VEC_VERSION = "0.1.7-alpha.2";
const platformPackages = {
  darwin: ["sqlite-vec-darwin-arm64", "sqlite-vec-darwin-x64"],
  linux: ["sqlite-vec-linux-arm64", "sqlite-vec-linux-x64"],
  win32: ["sqlite-vec-windows-x64"],
};

const packages = platformPackages[process.platform] ?? [];
const workspaceRoot = path.join(__dirname, "..");
const packDestination = path.join(os.tmpdir(), "abdulloh-ashurov-assistant-sqlite-vec");

if (packages.length === 0) {
  console.log(`[ensure-sqlite-vec] No sqlite-vec side packages configured for ${process.platform}.`);
  process.exit(0);
}

fs.mkdirSync(packDestination, { recursive: true });

for (const pkg of packages) {
  const pkgDir = path.join(workspaceRoot, "node_modules", pkg);

  if (fs.existsSync(pkgDir)) {
    console.log(`[ensure-sqlite-vec] ${pkg} already present, skipping.`);
    continue;
  }

  console.log(`[ensure-sqlite-vec] ${pkg} missing, fetching...`);

  try {
    const tarball = execSync(
      `npm pack ${pkg}@${SQLITE_VEC_VERSION} --pack-destination "${packDestination}"`,
      {
        cwd: workspaceRoot,
        encoding: "utf8",
      }
    ).trim();

    const tarPath = path.join(packDestination, tarball);
    fs.mkdirSync(pkgDir, { recursive: true });
    execSync(`tar xzf "${tarPath}" --strip-components=1 -C "${pkgDir}"`, { stdio: "inherit" });
    fs.unlinkSync(tarPath);

    console.log(`[ensure-sqlite-vec] ${pkg} installed successfully.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[ensure-sqlite-vec] Warning: could not install ${pkg}: ${message}`);
  }
}
