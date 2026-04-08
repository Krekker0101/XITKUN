const fs = require("fs");
const path = require("path");
const { flipFuses, FuseVersion, FuseV1Options } = require("@electron/fuses");

const macAfterPack = require("./ad-hoc-sign.js");

function resolvePackagedBinaryPath(context) {
  const productName = context?.packager?.appInfo?.productFilename;

  if (!productName || !context?.appOutDir) {
    return null;
  }

  switch (context.electronPlatformName) {
    case "win32":
      return path.join(context.appOutDir, `${productName}.exe`);
    case "darwin":
      return path.join(context.appOutDir, `${productName}.app`, "Contents", "MacOS", productName);
    case "linux":
      return path.join(context.appOutDir, productName);
    default:
      return null;
  }
}

async function hardenElectronBinary(context) {
  const binaryPath = resolvePackagedBinaryPath(context);

  if (!binaryPath || !fs.existsSync(binaryPath)) {
    console.warn(`[after-pack] Packaged Electron binary not found, skipping fuse hardening: ${binaryPath ?? "unknown"}`);
    return;
  }

  console.log(`[after-pack] Flipping Electron fuses for ${binaryPath}`);

  await flipFuses(binaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
  });

  console.log("[after-pack] Electron fuse hardening completed successfully.");
}

exports.default = async function afterPack(context) {
  await hardenElectronBinary(context);

  if (context?.electronPlatformName === "darwin" && typeof macAfterPack.default === "function") {
    await macAfterPack.default(context);
  }
};
