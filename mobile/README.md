# Trackeep Mobile (React Native)

Cross-platform mobile shell for Trackeep using React Native + Expo.

## Architecture

- **Same UI as web**: after login, the app renders your Trackeep web app (`/app`) inside a native WebView.
- **One backend, one data plane**: mobile uses your self-hosted Trackeep instance URL and the same API/auth as web.
- **Mobile-native extras**:
  - incoming phone share intent (links, YouTube URLs, text, files)
  - quick share panel to save bookmarks immediately
  - shared files upload directly to Trackeep Files

## Implemented Features

- Instance setup and validation (`/health`, `/api/version`)
- Native login/register (`/api/v1/auth/...`) with secure token storage
- Token bootstrap into WebView localStorage so web UI works immediately
- Native/Web bridge for auth + route state sync
- Android hardware back support for in-web navigation
- External links open in system browser while Trackeep pages stay in-app
- Mobile route shortcuts (Dashboard/Bookmarks/Tasks/Notes/Files/YouTube/Time)
- Incoming share flow:
  - Save shared links/YouTube as bookmarks (`POST /api/v1/bookmarks`)
  - Smart link metadata enrichment (`POST /api/v1/bookmarks/metadata`)
  - YouTube-aware action: `Save + Open YouTube`
  - Upload shared files (`POST /api/v1/files/upload`)
  - Broader Android share MIME support (`text/plain`, `text/uri-list`, `text/*`, `image/*`, `video/*`, `application/*`)
- Trackeep-branded mobile icon/splash copied from main project assets

## Prerequisites

- Node.js 18+
- npm 10+
- Reachable Trackeep backend

## Run

From repository root:

```bash
npm install
npm --workspace mobile run typecheck
npm --workspace mobile run start
```

## Important: Share Intent Requires Dev Client

Incoming share from other apps requires native code (`expo-share-intent`), so **Expo Go is not enough**.
Use a dev client or production build:

```bash
npm --workspace mobile run prebuild:clean
npm --workspace mobile run android:run
# or
npm --workspace mobile run ios:run

npm --workspace mobile run start:dev-client
```

`patch-package` is already configured at repository root to apply the required `xcode@3.0.1` patch during install.

## Share Examples

- Share a YouTube link from YouTube app → Trackeep Mobile appears in share sheet → Save to bookmarks.
- Share a webpage URL from browser → Save to bookmarks.
- Share an image/file from gallery/files app → Upload to Trackeep Files.

## Instance URL examples

- Production: `https://trackeep.example.com`
- Android emulator local backend: `http://10.0.2.2:8080`
- iOS simulator local backend: `http://localhost:8080`

## Notes

- Switching instance URL clears session intentionally (instance-isolated auth).
- If the share extension is not detected in Expo Go, this is expected; use dev client or release build.
