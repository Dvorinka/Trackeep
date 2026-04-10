# Trackeep Desktop (Tauri v2)

Trackeep Desktop is a native shell for Linux, Windows, and macOS.

It opens your own self-hosted Trackeep instance URL in a native Tauri WebView, so all application behavior stays identical to your web deployment:

- authentication/session management
- file upload/download
- realtime connections and API calls
- server-side update logic from your Trackeep backend

Because the desktop main window loads your hosted instance directly, the UI and behavior are the same as the web app.

## Run in development

```bash
cd desktop
npm install
npm run tauri:dev
```

## Build desktop bundles

```bash
cd desktop
npm install
npm run tauri:build
```

Generated bundles appear under `desktop/src-tauri/target/release/bundle/`.

## Instance configuration flow

On first launch, the app shows a setup screen where the user enters the Trackeep instance URL, for example:

- `https://trackeep.example.com`
- `http://192.168.1.50:80`

The URL is stored in Tauri's app config directory as `instance.json` (platform-specific location).

Users can change instance from the desktop app menu:

- `Trackeep -> Desktop Integrations...`

## Native desktop features

Desktop Integrations includes optional native capabilities:

- API key/token for desktop uploads
- token permission validation (`files:read`, `files:write`, `files:share`)
- local sync folder selection
- direct native file picker upload (`Upload Files...`)
- quick share flow (`Quick Share Files...`) that uploads, creates share links, and copies links to clipboard
- folder-to-instance sync (`Sync Folder Now`)
- open sync folder in OS file manager

For cloud storage workflows, point the sync folder to a cloud-synced directory (OneDrive, Dropbox, Google Drive desktop client, iCloud Drive).

Create an API key in Trackeep Settings -> Browser Extension with:

- `files:read`
- `files:write`
- `files:share` (recommended for quick-share links)

## Cross-platform prerequisites

Tauri requires native toolchains per platform. Follow official setup docs:

- https://v2.tauri.app/start/prerequisites/
