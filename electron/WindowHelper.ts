
import { BrowserWindow, screen, app, Menu } from "electron"
import { AppState } from "./main"
import { KeybindManager } from "./services/KeybindManager"
import { PersistedWindowBounds, SettingsManager } from "./services/SettingsManager"
import path from "node:path"
import { pathToFileURL } from "node:url"

const isEnvDev = process.env.NODE_ENV === "development"
const isPackaged = app.isPackaged;
const inAppBundle = process.execPath.includes('.app/') || process.execPath.includes('.app\\');

console.log(`[WindowHelper] isEnvDev: ${isEnvDev}, isPackaged: ${isPackaged}, inAppBundle: ${inAppBundle}`);

// Force production mode if running as packaged app or inside app bundle
const isDev = isEnvDev && !isPackaged;

const startUrl = isDev
  ? "http://localhost:5180"
  : pathToFileURL(path.join(__dirname, "../../dist/index.html")).toString()

const getDefaultWindowIconPath = (): string => {
  if (process.platform === "darwin") {
    return app.isPackaged
      ? path.join(process.resourcesPath, "icon.icns")
      : path.resolve(__dirname, "../../assets/icons/mac/icon.icns");
  }

  if (process.platform === "win32") {
    return app.isPackaged
      ? path.join(process.resourcesPath, "assets/icons/win/icon1.ico")
      : path.resolve(__dirname, "../../assets/icons/win/icon1.ico");
  }

  return app.isPackaged
    ? path.join(process.resourcesPath, "assets/icons/png/icon_512x512.png")
    : path.resolve(__dirname, "../../assets/icons/png/icon_512x512.png");
};

export class WindowHelper {
  private launcherWindow: BrowserWindow | null = null
  private overlayWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  // Position/Size tracking for Launcher
  private launcherPosition: { x: number; y: number } | null = null
  private launcherSize: { width: number; height: number } | null = null
  // Track current window mode (persists even when overlay is hidden via Cmd+B)
  private currentWindowMode: 'launcher' | 'overlay' = 'launcher'

  private appState: AppState
  private contentProtection: boolean = false
  private opacityTimeout: NodeJS.Timeout | null = null

  // Initialize with explicit number type and 0 value
  private screenWidth: number = 0
  private screenHeight: number = 0

  // Movement variables (apply to active window)
  private step: number = 20
  private currentX: number = 0
  private currentY: number = 0

  constructor(appState: AppState) {
    this.appState = appState
  }

  private getOverlayDefaultBounds(): PersistedWindowBounds {
    const preferredDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const workArea = preferredDisplay.workArea
    const width = Math.min(600, Math.floor(workArea.width * 0.9))
    const height = Math.min(216, Math.floor(workArea.height * 0.9))
    return {
      x: Math.round(workArea.x + (workArea.width - width) / 2),
      y: Math.round(workArea.y + Math.max(48, (workArea.height - height) / 3)),
      width,
      height,
      displayId: preferredDisplay.id,
    }
  }

  private clampBoundsToDisplay(bounds: PersistedWindowBounds, targetDisplay: Electron.Display): PersistedWindowBounds {
    const workArea = targetDisplay.workArea
    const width = Math.min(Math.max(Math.round(bounds.width), 300), Math.floor(workArea.width * 0.9))
    const height = Math.min(Math.max(Math.round(bounds.height), 1), Math.floor(workArea.height * 0.9))
    const maxX = workArea.x + workArea.width - width
    const maxY = workArea.y + workArea.height - height

    return {
      x: Math.min(Math.max(Math.round(bounds.x), workArea.x), Math.max(workArea.x, maxX)),
      y: Math.min(Math.max(Math.round(bounds.y), workArea.y), Math.max(workArea.y, maxY)),
      width,
      height,
      displayId: targetDisplay.id,
    }
  }

  private getStoredOverlayBounds(): PersistedWindowBounds | null {
    const storedBounds = SettingsManager.getInstance().get('overlayBounds')
    if (!storedBounds) return null

    const targetDisplay =
      (storedBounds.displayId != null
        ? screen.getAllDisplays().find(display => display.id === storedBounds.displayId) ?? null
        : null) ??
      screen.getDisplayMatching({
        x: storedBounds.x,
        y: storedBounds.y,
        width: storedBounds.width,
        height: storedBounds.height,
      })

    return this.clampBoundsToDisplay(storedBounds, targetDisplay)
  }

  private persistOverlayBounds(bounds?: Electron.Rectangle): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return
    const currentBounds = bounds ?? this.overlayWindow.getBounds()
    const display = screen.getDisplayMatching(currentBounds)
    SettingsManager.getInstance().set('overlayBounds', {
      x: currentBounds.x,
      y: currentBounds.y,
      width: currentBounds.width,
      height: currentBounds.height,
      displayId: display.id,
    })
  }

  private getOverlayBoundsForShow(): PersistedWindowBounds {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      const currentBounds = this.overlayWindow.getBounds()
      if (currentBounds.width >= 300 && currentBounds.height >= 1) {
        return this.clampBoundsToDisplay(
          {
            x: currentBounds.x,
            y: currentBounds.y,
            width: currentBounds.width,
            height: currentBounds.height,
          },
          screen.getDisplayMatching(currentBounds)
        )
      }
    }

    return this.getStoredOverlayBounds() ?? this.getOverlayDefaultBounds()
  }

  public setContentProtection(enable: boolean): void {
    this.contentProtection = enable
    this.applyContentProtection(enable)
  }

  private applyContentProtection(enable: boolean): void {
    const windows = [this.launcherWindow, this.overlayWindow]
    windows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.setContentProtection(enable);
      }
    });
  }

  public setWindowDimensions(width: number, height: number): void {
    const activeWindow = this.getMainWindow(); // Gets currently focused/relevant window
    if (!activeWindow || activeWindow.isDestroyed()) return

    const [currentX, currentY] = activeWindow.getPosition()
    const activeDisplay = screen.getDisplayMatching(activeWindow.getBounds())
    const workArea = activeDisplay.workArea
    const maxAllowedWidth = Math.floor(workArea.width * 0.9)
    const newWidth = Math.min(width, maxAllowedWidth)
    const maxAllowedHeight = Math.floor(workArea.height * 0.95)
    const newHeight = Math.min(Math.ceil(height), maxAllowedHeight)
    const maxX = workArea.x + workArea.width - newWidth
    const maxY = workArea.y + workArea.height - newHeight
    const newX = Math.min(Math.max(currentX, workArea.x), maxX)
    const newY = Math.min(Math.max(currentY, workArea.y), maxY)

    activeWindow.setBounds({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    })

    // Update internal tracking if it's launcher
    if (activeWindow === this.launcherWindow) {
      this.launcherSize = { width: newWidth, height: newHeight }
      this.launcherPosition = { x: newX, y: newY }
    }
  }

  // Dedicated method for overlay window resizing - decoupled from launcher
  public setOverlayDimensions(width: number, height: number): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return
    console.log('[WindowHelper] setOverlayDimensions:', width, height);

    const [currentX, currentY] = this.overlayWindow.getPosition()
    const currentBounds = this.overlayWindow.getBounds()
    const activeDisplay = screen.getDisplayMatching(currentBounds)
    const workArea = activeDisplay.workAreaSize
    const workAreaOrigin = activeDisplay.workArea
    const maxAllowedWidth = Math.floor(workArea.width * 0.9)
    const maxAllowedHeight = Math.floor(workArea.height * 0.9)
    const newWidth = Math.min(Math.max(width, 300), maxAllowedWidth) // min 300, max 90%
    const newHeight = Math.min(Math.max(height, 1), maxAllowedHeight) // min 1, max 90%
    const maxX = workAreaOrigin.x + workArea.width - newWidth
    const maxY = workAreaOrigin.y + workArea.height - newHeight
    const newX = Math.min(Math.max(currentX, workAreaOrigin.x), maxX)
    const newY = Math.min(Math.max(currentY, workAreaOrigin.y), maxY)

    this.overlayWindow.setContentSize(newWidth, newHeight)
    this.overlayWindow.setPosition(newX, newY)
    this.persistOverlayBounds({ x: newX, y: newY, width: newWidth, height: newHeight })
  }

  public createWindow(): void {
    if (this.launcherWindow !== null) return // Already created

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workArea
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height

    // Fixed dimensions per user request
    const width = 1200;
    const height = 800;

    // Calculate centered X, and top-centered Y (5% from top)
    const x = Math.round(workArea.x + (workArea.width - width) / 2);
    // Ensure y is at least workArea.y (don't go offscreen top)
    const topMargin = Math.round(workArea.height * 0.05);
    const y = Math.round(workArea.y + topMargin);
    const storedOverlayBounds = this.getStoredOverlayBounds() ?? this.getOverlayDefaultBounds()

    // --- 1. Create Launcher Window ---
    const isMac = process.platform === "darwin";

    const launcherSettings: Electron.BrowserWindowConstructorOptions = {
      width: width,
      height: height,
      x: x,
      y: y,
      minWidth: 600,
      minHeight: 400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        scrollBounce: true,
        webSecurity: !isDev, // DEBUG: Disable web security only in dev
      },
      show: false, // DEBUG: Force show -> Fixed white screen, now relies on ready-to-show
      // Platform-specific frame settings
      ...(isMac
        ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 14, y: 14 } }
        : { frame: false, titleBarOverlay: false, autoHideMenuBar: true }),
      ...(isMac ? { vibrancy: 'under-window' as const, visualEffectState: 'followWindow' as const } : {}),
      transparent: isMac,
      hasShadow: true,
      backgroundColor: isMac ? "#00000000" : "#000000",
      focusable: true,
      resizable: true,
      movable: true,
      center: true,
      icon: (() => {
        const isMac = process.platform === "darwin";
        const isWin = process.platform === "win32";
        const mode = this.appState.getDisguise();

        if (mode === 'none') {
          return getDefaultWindowIconPath();
        }

        // Disguise mode icons
        let iconName = "terminal.png";
        if (mode === 'settings') iconName = "settings.png";
        if (mode === 'activity') iconName = "activity.png";

        const platformDir = isWin ? "win" : "mac";
        return app.isPackaged
          ? path.join(process.resourcesPath, `assets/fakeicon/${platformDir}/${iconName}`)
          : path.resolve(__dirname, `../../assets/fakeicon/${platformDir}/${iconName}`);
      })()
    }

    console.log(`[WindowHelper] Icon Path: ${launcherSettings.icon}`);
    console.log(`[WindowHelper] Start URL: ${startUrl}`);

    try {
      this.launcherWindow = new BrowserWindow(launcherSettings)
      console.log('[WindowHelper] BrowserWindow created successfully');
    } catch (err) {
      console.error('[WindowHelper] Failed to create BrowserWindow:', err);
      return;
    }

    this.launcherWindow.setContentProtection(this.contentProtection)

    this.launcherWindow.loadURL(`${startUrl}?window=launcher`)
      .then(() => console.log('[WindowHelper] loadURL success'))
      .catch((e) => { console.error("[WindowHelper] Failed to load URL:", e) })

    this.launcherWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`[WindowHelper] did-fail-load: ${errorCode} ${errorDescription}`);
    });

    // if (isDev) {
    //   this.launcherWindow.webContents.openDevTools({ mode: 'detach' }); // DEBUG: Open DevTools
    // }

    // --- 2. Create Overlay Window (Hidden initially) ---
    const overlaySettings: Electron.BrowserWindowConstructorOptions = {
      width: storedOverlayBounds.width,
      height: storedOverlayBounds.height,
      x: storedOverlayBounds.x,
      y: storedOverlayBounds.y,
      minWidth: 300,
      minHeight: 1,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        scrollBounce: true,
      },
      show: false,
      frame: false, // Frameless
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      focusable: true,
      resizable: false, // Enforce automatic resizing only
      movable: true,
      skipTaskbar: true, // Don't show separately in dock/taskbar
      hasShadow: false, // Prevent shadow from adding perceived size/artifacts
    }

    this.overlayWindow = new BrowserWindow(overlaySettings)
    this.overlayWindow.setContentProtection(this.contentProtection)

    if (process.platform === "darwin") {
      this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      this.overlayWindow.setHiddenInMissionControl(true)
      this.overlayWindow.setAlwaysOnTop(true, "floating")
    }

    this.overlayWindow.loadURL(`${startUrl}?window=overlay`).catch(e => {
        console.error('[WindowHelper] Failed to load Overlay URL:', e);
    })

    // --- 3. Startup Sequence ---
    this.launcherWindow.once('ready-to-show', () => {
      this.switchToLauncher()
      this.isWindowVisible = true
    })

    this.setupWindowListeners()
  }

  private setupWindowListeners(): void {
    if (!this.launcherWindow) return

    // Suppress Windows system context menu on right-click (title bar)
    this.launcherWindow.on('system-context-menu', (e, point) => {
      e.preventDefault();
      if (!this.appState.getUndetectable()) {
        this.showContextMenu(this.launcherWindow!, point);
      }
    });

    this.launcherWindow.on("move", () => {
      if (this.launcherWindow) {
        const bounds = this.launcherWindow.getBounds()
        this.launcherPosition = { x: bounds.x, y: bounds.y }
        this.appState.settingsWindowHelper.reposition(bounds)
      }
    })

    this.launcherWindow.on("resize", () => {
      if (this.launcherWindow) {
        const bounds = this.launcherWindow.getBounds()
        this.launcherSize = { width: bounds.width, height: bounds.height }
        this.appState.settingsWindowHelper.reposition(bounds)
      }
    })

    // On Windows/Linux: intercept close and hide to tray instead of quitting,
    // unless the app is actually quitting (e.g. from tray "Quit" menu).
    if (process.platform !== 'darwin') {
      this.launcherWindow.on('close', (e) => {
        if (!this.appState.isQuitting()) {
          e.preventDefault();
          this.launcherWindow?.hide();
          this.isWindowVisible = false;
        }
      });

      // Sync maximize state to renderer so WindowControls stays in sync (Windows/Linux only)
      this.launcherWindow.on('maximize', () => {
        this.launcherWindow?.webContents.send('window-maximized-changed', true);
      });
      this.launcherWindow.on('unmaximize', () => {
        this.launcherWindow?.webContents.send('window-maximized-changed', false);
      });
    }

    this.launcherWindow.on("closed", () => {
      this.launcherWindow = null
      // If launcher closes, we should probably quit app or close overlay
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.close()
      }
      this.overlayWindow = null
      this.isWindowVisible = false
    })

    // Listen for overlay close (e.g. Cmd+W). Never truly destroy it — either
    // hide it (during a meeting) or switch back to launcher (between meetings).
    if (this.overlayWindow) {
      this.overlayWindow.on('system-context-menu', (e, point) => {
        e.preventDefault();
        if (!this.appState.getUndetectable()) {
          this.showContextMenu(this.overlayWindow!, point);
        }
      });

      this.overlayWindow.on('move', () => {
        this.persistOverlayBounds();
      });

      this.overlayWindow.on('close', (e) => {
        if (this.overlayWindow?.isVisible()) {
          e.preventDefault();
          if (this.appState.getIsMeetingActive()) {
            // Meeting running — just hide the overlay; user can resume from the
            // launcher's "Meeting ongoing" button which calls setWindowMode('overlay').
            this.hideOverlay();
          } else {
            this.switchToLauncher();
          }
        }
      })
    }
  }

  // Helper to get whichever window should be treated as "Main" for IPC
  public getMainWindow(): BrowserWindow | null {
    if (this.currentWindowMode === 'overlay' && this.overlayWindow) {
      return this.overlayWindow;
    }
    return this.launcherWindow;
  }

  // Specific getters if needed
  public getLauncherWindow(): BrowserWindow | null { return this.launcherWindow }
  public getOverlayWindow(): BrowserWindow | null { return this.overlayWindow }
  public getCurrentWindowMode(): 'launcher' | 'overlay' { return this.currentWindowMode }

  public getLastOverlayBounds(): Electron.Rectangle | null {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return null;
    return this.overlayWindow.getBounds();
  }

  public getLastOverlayDisplayId(): number | null {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return null;
    const bounds = this.overlayWindow.getBounds();
    return screen.getDisplayMatching(bounds).id;
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public isMainWindowMaximized(): boolean {
    const win = this.launcherWindow;
    return !!win && !win.isDestroyed() && win.isMaximized();
  }

  public hideMainWindow(): void {
    this.launcherWindow?.hide()
    this.overlayWindow?.hide()
    this.isWindowVisible = false
  }

  // Apply or remove click-through (mouse passthrough) on the overlay window.
  // Called whenever the passthrough state changes in AppState.
  public syncOverlayInteractionPolicy(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return;

    const passthrough = this.appState.getOverlayMousePassthrough();
    if (passthrough) {
      // forward: true — pointer events are still delivered to the OS layer beneath
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      // Focusable must stay false while in passthrough so keyboard focus can't land here
      this.overlayWindow.setFocusable(false);
      console.log('[WindowHelper] Overlay mouse passthrough ON');
    } else {
      this.overlayWindow.setIgnoreMouseEvents(false);
      this.overlayWindow.setFocusable(true);
      console.log('[WindowHelper] Overlay mouse passthrough OFF');
    }
  }

  // Show overlay directly without going through full switchToOverlay flow.
  // Used by IPC handlers to show the overlay independently.
  public showOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      const nextBounds = this.getOverlayBoundsForShow()
      this.overlayWindow.setBounds(nextBounds)
      this.persistOverlayBounds(nextBounds)
      this.syncOverlayInteractionPolicy()
      this.overlayWindow.showInactive();
      this.overlayWindow.moveTop();
    }
  }

  // Hide overlay directly without switching to launcher.
  // Used by IPC handlers to hide the overlay independently.
  public hideOverlay(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
  }

  public showMainWindow(inactive?: boolean): void {
    // Show the window corresponding to the current mode
    if (this.currentWindowMode === 'overlay') {
      this.switchToOverlay(inactive);
    } else {
      this.switchToLauncher(inactive);
    }
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      // Always show without stealing focus — Natively is a ghost overlay.
      // The user is in another app; show the window on top but leave OS focus alone.
      // They can click the window to focus it if they need to type.
      this.showMainWindow(true)
    }
  }

  public toggleOverlayWindow(): void {
    this.toggleMainWindow();
  }

  public centerAndShowWindow(): void {
    // If a meeting is active (overlay mode), bring the overlay up instead of the
    // launcher — switching to the launcher during a meeting would expose it in the
    // taskbar/dock and break stealth.
    if (this.currentWindowMode === 'overlay') {
      this.switchToOverlay(); // explicit user action, so we want to grant focus
    } else {
      this.switchToLauncher();
      this.launcherWindow?.center();
    }
  }

  // --- Swapping Logic ---

  public switchToOverlay(inactive?: boolean): void {
    console.log(`[WindowHelper] Switching to OVERLAY (inactive: ${!!inactive})`);
    this.currentWindowMode = 'overlay';
    KeybindManager.getInstance().setMode('overlay'); // Adapted from public PR #123 — verify premium interaction

    // Tell the overlay renderer to expand to full size (e.g. after being minimised)
    this.overlayWindow?.webContents.send('ensure-expanded');

    // Show Overlay FIRST
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      const nextBounds = this.getOverlayBoundsForShow()
      this.overlayWindow.setBounds(nextBounds)
      this.persistOverlayBounds(nextBounds)
      this.syncOverlayInteractionPolicy()

      if (process.platform === 'win32' && this.contentProtection) {
        // Opacity Shield: Show at 0 opacity first to prevent frame leak
        this.overlayWindow.setOpacity(0);
        if (inactive) this.overlayWindow.showInactive(); else this.overlayWindow.show();
        this.overlayWindow.setContentProtection(true);
        // Small delay to ensure Windows DWM processes the flag before making it opaque

        if (this.opacityTimeout) clearTimeout(this.opacityTimeout);
        this.opacityTimeout = setTimeout(() => {
          if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
            this.overlayWindow.setOpacity(1);
            this.overlayWindow.moveTop();
            if (!inactive) this.overlayWindow.focus();
            // Note: do NOT call setAlwaysOnTop here — it triggers NSApp activation on macOS
          }
        }, 60);
      } else {
        this.overlayWindow.setContentProtection(this.contentProtection);
        if (inactive) this.overlayWindow.showInactive(); else this.overlayWindow.show();
        this.overlayWindow.moveTop();
        // Only grab focus for explicit user-initiated shows (not shortcut/ghost shows)
        if (!inactive) this.overlayWindow.focus();
        // Do NOT re-assert setAlwaysOnTop on every show — it was set at creation time and
        // persists across hide/show cycles. Calling it again triggers [NSApp activate] on
        // macOS, stealing focus from Zoom/browser even when showInactive() was used.
      }
      this.isWindowVisible = true;
    }

    // Hide Launcher SECOND
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      this.launcherWindow.hide();
    }
  }

  public switchToLauncher(inactive?: boolean): void {
    console.log(`[WindowHelper] Switching to LAUNCHER (inactive: ${!!inactive})`);
    this.currentWindowMode = 'launcher';
    KeybindManager.getInstance().setMode('launcher'); // Adapted from public PR #123 — verify premium interaction

    // Show Launcher FIRST
    if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
      if (process.platform === 'win32' && this.contentProtection) {
        // Opacity Shield: Show at 0 opacity first
        this.launcherWindow.setOpacity(0);
        if (inactive) this.launcherWindow.showInactive(); else this.launcherWindow.show();
        this.launcherWindow.setContentProtection(true);

        if (this.opacityTimeout) clearTimeout(this.opacityTimeout);
        this.opacityTimeout = setTimeout(() => {
          if (this.launcherWindow && !this.launcherWindow.isDestroyed()) {
            this.launcherWindow.setOpacity(1);
            if (!inactive) this.launcherWindow.focus();
          }
        }, 60);
      } else {
        this.launcherWindow.setContentProtection(this.contentProtection);
        if (inactive) this.launcherWindow.showInactive(); else this.launcherWindow.show();
        if (!inactive) this.launcherWindow.focus();
      }
      this.isWindowVisible = true;
    }

    // Hide Overlay SECOND
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.hide();
    }
  }

  // Simplified setWindowMode that just calls switchers
  public setWindowMode(mode: 'launcher' | 'overlay', inactive?: boolean): void {
    if (mode === 'launcher') {
      this.switchToLauncher(inactive);
    } else {
      this.switchToOverlay(inactive);
    }
  }

  // --- Window Movement (Applies to Overlay mostly, but generalized to active) ---
  private moveActiveWindow(dx: number, dy: number): void {
    const win = this.getMainWindow();
    if (!win) return;

    const [x, y] = win.getPosition();
    win.setPosition(x + dx, y + dy);

    this.currentX = x + dx;
    this.currentY = y + dy;

    if (win === this.overlayWindow) {
      this.persistOverlayBounds();
    }
  }

  public moveWindowRight(): void { this.moveActiveWindow(this.step, 0) }
  public moveWindowLeft(): void { this.moveActiveWindow(-this.step, 0) }
  public moveWindowDown(): void { this.moveActiveWindow(0, this.step) }
  public moveWindowUp(): void { this.moveActiveWindow(0, -this.step) }

  private showContextMenu(win: BrowserWindow, point: { x: number; y: number }): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Developer Console',
        click: () => { win.webContents.toggleDevTools(); }
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: win, x: point.x, y: point.y });
  }

  public minimizeWindow(): void {
    const win = this.launcherWindow;
    if (!win || win.isDestroyed()) return;
    if (this.opacityTimeout) clearTimeout(this.opacityTimeout);
    win.minimize();
  }

  public maximizeWindow(): void {
    const win = this.launcherWindow;
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }

  public closeWindow(): void {
    const win = this.launcherWindow;
    if (!win || win.isDestroyed()) return;
    if (this.opacityTimeout) clearTimeout(this.opacityTimeout);
    // On Windows/Linux the 'close' event listener intercepts this
    // and hides to tray unless the app is actually quitting.
    win.close();
  }
}
