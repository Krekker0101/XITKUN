import { app, BrowserWindow } from "electron";
import fs from "fs";
import os from "os";
import path from "path";

const BOOTSTRAP_LOG_PATH = path.join(os.tmpdir(), "abdulloh-ashurov-assistant_bootstrap.log");

const appendBootstrapLog = (message: string): void => {
  try {
    fs.mkdirSync(path.dirname(BOOTSTRAP_LOG_PATH), { recursive: true });
    fs.appendFileSync(
      BOOTSTRAP_LOG_PATH,
      `${new Date().toISOString()} ${message}\n`,
      "utf8"
    );
  } catch {
    // Best-effort only. Bootstrap logging must never crash startup.
  }
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack ?? ""}`.trim();
  }

  return String(error);
};

const showFatalBootstrapWindow = (error: unknown): void => {
  const formattedError = formatError(error);
  appendBootstrapLog(`[BOOTSTRAP] Fatal startup error\n${formattedError}`);

  void app.whenReady().then(() => {
    const window = new BrowserWindow({
      width: 1040,
      height: 760,
      minWidth: 860,
      minHeight: 600,
      autoHideMenuBar: true,
      backgroundColor: "#0f172a",
      title: "XITKUN - Startup Recovery",
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
      },
    });

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Startup Recovery</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f172a;
        --panel: rgba(15, 23, 42, 0.92);
        --panel-border: rgba(148, 163, 184, 0.22);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #38bdf8;
        --danger: #f87171;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 40px;
        font-family: "Segoe UI", "SF Pro Text", system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 34%),
          radial-gradient(circle at bottom right, rgba(248, 113, 113, 0.12), transparent 32%),
          var(--bg);
        color: var(--text);
      }

      .shell {
        max-width: 920px;
        margin: 0 auto;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 24px;
        padding: 28px;
        backdrop-filter: blur(18px);
        box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 14px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 30px;
        line-height: 1.1;
      }

      p {
        margin: 0 0 14px;
        color: var(--muted);
        line-height: 1.6;
      }

      .meta {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.62);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }

      .meta strong {
        color: var(--text);
      }

      pre {
        margin: 22px 0 0;
        padding: 18px;
        border-radius: 18px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        background: rgba(2, 6, 23, 0.86);
        border: 1px solid rgba(248, 113, 113, 0.22);
        color: #fecaca;
        font-size: 13px;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="badge">Startup Recovery Mode</div>
      <h1>XITKUN could not finish startup.</h1>
      <p>
        The packaged application hit a fatal boot error before the main workflow became available.
        This recovery window is shown so the build does not fail silently.
      </p>
      <p>
        Review the bootstrap log path below and the captured startup error details to continue debugging.
      </p>
      <section class="meta">
        <p><strong>Bootstrap log:</strong> ${escapeHtml(BOOTSTRAP_LOG_PATH)}</p>
      </section>
      <pre>${escapeHtml(formattedError)}</pre>
    </main>
  </body>
</html>`;

    void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
};

process.stdout?.on?.("error", () => {});
process.stderr?.on?.("error", () => {});

process.on("uncaughtException", (error) => {
  appendBootstrapLog(`[BOOTSTRAP] Uncaught exception\n${formatError(error)}`);
});

process.on("unhandledRejection", (reason) => {
  appendBootstrapLog(`[BOOTSTRAP] Unhandled rejection\n${formatError(reason)}`);
});

appendBootstrapLog("[BOOTSTRAP] Loading main process entry");

try {
  require("./main");
  appendBootstrapLog("[BOOTSTRAP] Main process entry loaded successfully");
} catch (error) {
  showFatalBootstrapWindow(error);
}
