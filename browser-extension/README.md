# Trackeep Saver Browser Extension

This folder contains a WebExtension (Manifest v3) that lets you:

- **Save the current page or video** as a **Trackeep bookmark**.
- **Upload a local file** directly to Trackeep.
- **Right‑click** any page, link, selection, image, or video and choose **“Save to Trackeep”** from the context menu.

It is designed to work in **Chrome**, **Microsoft Edge**, and **Firefox** (Manifest v3 where available).

---

## Folder structure

- `manifest.json` – WebExtension manifest (v3) with background service worker and context menu.
- `popup.html` / `popup.js` – Popup UI and logic to save bookmarks and upload files.
- `options.html` / `options.js` – Options page to configure API URL and auth token.
- `background.js` – Service worker that creates and handles the context menu.
- `icons/` – Placeholder icon files (copied from the repo favicon).
- `README.md` – This documentation.

> Note: For store publishing you will likely want custom icon PNG files. See the publishing section.

---

## What the extension does

### Popup (toolbar icon)

- Reads the **active tab’s title and URL** and lets you save it as a Trackeep bookmark.
- Lets you add an optional **description**, **tags** (comma-separated), and mark a bookmark as **public**.
- Lets you pick a local **file** and upload it to Trackeep with an optional description.

### Right‑click context menu

- Right‑click any page, link, selection, image, or video and choose **“Save to Trackeep”**.
- The popup opens with:
  - URL pre‑filled (link URL, image/video source, or current page URL).
  - Title pre‑filled (tab title).
  - Description pre‑filled with the selected text (if any).
- Works even if you right‑click a link on another site; the popup will open with that link’s details.

### Auto‑detect Trackeep domain

- When you open the popup or options page on a Trackeep domain (e.g. `https://app.trackeep.example`), the extension automatically:
  - Pre‑fills the **API base URL** to `https://app.trackeep.example/api/v1`.
  - Falls back to `http://localhost:8080/api/v1` if nothing is set and you’re not on a Trackeep domain.
- This reduces manual setup for most users.

---

## Configuration (Options page)

1. **Open the extension options**
   - After loading the extension (see below), right-click its icon → **Options**.
   - Or click **Open Options** in the popup.

2. **Set the API base URL**
   - Usually auto‑detected if you’re on a Trackeep domain.
   - Example for local dev:
     - `http://localhost:8080/api/v1`
   - Example for production:
     - `https://your-trackeep-domain.example.com/api/v1`

3. **Get your Trackeep auth token**
   - Log into Trackeep in your browser.
   - Open **DevTools → Application → Local Storage**.
   - Select your Trackeep origin (e.g. `http://localhost:5173` or your production domain).
   - Find the key `trackeep_token` and copy its **value**.
   - Paste this value into the **Auth token** field in the options page.

4. **Save settings**
   - Click **Save settings**.
   - The popup will now use these values to call the API.

> Keep your auth token private. Treat it like a password.

---

## Loading the extension during development

### Chrome (and Brave, Vivaldi, etc.)

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `browser-extension` folder from this repository.
5. The extension should appear with the name **Trackeep Saver**.

### Microsoft Edge

1. Open `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `browser-extension` folder.

### Firefox (Manifest v3)

Firefox support for Manifest v3 is still evolving, but this extension uses only basic APIs:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file inside the `browser-extension` folder.
4. The extension will be installed temporarily (until you restart Firefox).

If you hit MV3-specific issues in Firefox, you can either:

- Switch to a Firefox version with MV3 enabled, or
- Port this to a MV2 manifest (same JS/HTML, different `manifest.json`).

---

## Using the extension

### Popup (toolbar icon)

1. Make sure you configured **API base URL** and **auth token** in the options.
2. Navigate to any page or video (e.g. a YouTube video, article, docs page).
3. Click the **Trackeep Saver** icon in the toolbar.
4. In the popup:
   - Adjust **Title**, **URL**, **Description**, and **Tags** as needed.
   - Optionally tick **Public**.
   - Click **Save bookmark** to create a Trackeep bookmark.
5. To upload a file:
   - Use the **Upload file to Trackeep** section.
   - Pick a file, optionally add a description, then click **Upload file**.

### Context menu (right‑click)

1. Right‑click any page, link, selection, image, or video.
2. Choose **“Save to Trackeep”**.
3. The popup opens with the relevant data pre‑filled.
4. Edit as desired and click **Save bookmark**.

If anything fails, an error message from the Trackeep API is shown in the popup.

---

## CORS and backend configuration

The backend uses a CORS middleware that primarily targets browser frontends.
Because this is a browser extension, requests are made from an extension context and usually do **not** require the same CORS headers as a regular web page.

If you run into network errors:

- Make sure your Trackeep backend is reachable at the URL you configured.
- Check the browser extension console (in `chrome://extensions` → **Inspect views** → **Service worker / popup**).
- If needed, relax or adjust the `CORS_ALLOWED_ORIGINS` env variable on the backend to include your frontend origin for normal web use. The extension itself generally should not require changes.

---

## Publishing to browser stores

The high-level process is similar across Chrome, Edge, and Firefox:

### 1. Prepare assets

- Make sure `manifest.json`, `popup.*`, `options.*`, and `background.js` are all present and working.
- Add icon PNG files (required for store publishing):
  - The `icons/` folder contains placeholder files copied from the repo favicon.
  - For production, replace them with custom icons at sizes 16, 32, 48, and 128 pixels.
  - Update `manifest.json` with an `icons` section (already present).

### 2. Chrome Web Store (Chrome and most Chromium browsers)

1. Go to the **Chrome Web Store Developer Dashboard**.
2. Create a new item.
3. Zip the **contents of `browser-extension/`** (do not zip the parent folder twice).
4. Upload the ZIP.
5. Fill out listing details (name, description, screenshots, categories, privacy policy).
6. Submit for review.

Once published, Chrome, Brave, and other Chromium-based browsers can install it from the store.

### 3. Microsoft Edge Add-ons

1. Go to the **Microsoft Edge Add-ons** developer dashboard.
2. You can often upload the same ZIP you used for Chrome.
3. Fill in the listing information and submit.

Edge is also Chromium-based, so Manifest v3 and the `chrome.*` APIs are supported.

### 4. Firefox Add-ons (AMO)

1. Go to **https://addons.mozilla.org/developers/**.
2. Create a new add-on and upload the ZIP built from `browser-extension/`.
3. If Firefox flags MV3-specific issues, follow its guidance – usually this involves:
   - Ensuring the manifest is valid for the current Firefox MV3 implementation.
   - Optionally adding `browser_specific_settings` in `manifest.json` with a Firefox-specific `gecko` ID.

Example snippet you may add for Firefox (Chrome will ignore this block):

```json
"browser_specific_settings": {
  "gecko": {
    "id": "trackeep-saver@example.com",
    "strict_min_version": "120.0"
  }
}
```

Use your own ID and version constraints as recommended by Mozilla.

---

## How to publish to extension stores

### Quick checklist before you publish

- [ ] Test the extension locally in Chrome/Edge/Firefox.
- [ ] Ensure the API URL and auth token work with your Trackeep backend.
- [ ] Replace placeholder icons with production assets (optional; `trackeepfavi_bg.png` is already used).
- [ ] Write a short description and prepare screenshots for the store listings.
- [ ] Decide on a publisher name and privacy policy URL (required by most stores).

### Step‑by‑step publishing

#### Chrome Web Store (and Chromium browsers)

1. **Prepare a ZIP**
   - Zip the **contents of `browser-extension/`** (not the folder itself).
   - Ensure `manifest.json`, `popup.*`, `options.*`, `background.js`, and `icons/` are included.

2. **Developer Dashboard**
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
   - Click **Add new item**.
   - Upload the ZIP.

3. **Listing details**
   - **Name**: Trackeep Saver
   - **Description**: Save pages, videos, and files to your Trackeep account.
   - **Category**: Productivity
   - **Screenshots**: 1280x800 or 640x400 PNGs.
   - **Icon**: 128x128 PNG (already in `icons/icon128.png`).
   - **Privacy policy**: Required; you can host a simple page on GitHub Pages or your site.

4. **Permissions review**
   - The manifest requests `storage`, `tabs`, `activeTab`, `contextMenus`, and `<all_urls>` host permissions.
   - Be prepared to explain why each is needed (bookmarking, uploading files, right‑click menu).

5. **Submit**
   - Review and submit. Google will review for compliance and security.

#### Microsoft Edge Add-ons

1. Go to the [Microsoft Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge).
2. Upload the same ZIP you used for Chrome.
3. Fill out the listing (similar to Chrome).
4. Submit. Edge’s review is usually fast.

#### Firefox Add-ons (AMO)

1. Go to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Click **Submit a New Add‑on** and upload the ZIP.
3. Firefox may ask for a `browser_specific_settings.gecko.id` in `manifest.json`. If you want a fixed ID, add:
   ```json
   "browser_specific_settings": {
     "gecko": {
       "id": "trackeep-saver@example.com",
       "strict_min_version": "120.0"
     }
   }
   ```
   Replace `example.com` with your own domain.
4. Provide listing details and privacy policy.
5. Submit. Mozilla’s review focuses on privacy and security.

---

## What you can do next

- **Test thoroughly**:
  - Save bookmarks from different sites (articles, YouTube videos, GitHub repos).
  - Upload various file types (PDFs, images, docs).
  - Try the right‑click context menu on links, images, and selected text.
- **Improve UX**:
  - Auto‑tag YouTube videos as `video`.
  - Add a keyboard shortcut to quick‑save the current page.
  - Sync the auth token automatically from the Trackeep web app.
- **Prepare for stores**:
  - Write a concise privacy policy and host it publicly.
  - Take clean screenshots of the popup and options page.
  - Consider a custom icon set if you want a distinct brand look.
- **Maintain**:
  - Keep the extension compatible with Trackeep API changes.
  - Update the manifest version when you release updates.

For now, the extension is fully functional for bookmarking pages/videos and uploading files to Trackeep, with a convenient right‑click menu and smart domain auto‑detection.
