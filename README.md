# Markdown Word for Mac Add-in

A Microsoft Word for Mac Add-in that allows you to natively read, write, edit, and format Markdown (`.md`) documents. Powered by Office JS, `marked.js`, and `Turndown`, it brings a modern Markdown editor and compiler directly into your Microsoft Word workflow.

---

## Features

- **📥 Import Markdown**: Drag & drop or browse `.md` / `.txt` files, edit the raw markdown source in a clean editor, preview the HTML rendering, and insert it directly into your document (either replacing the entire document or inserting at the cursor).
- **📤 Export to Markdown**: Extract the content of your active Word document and automatically translate it into clean, standardized Markdown. Download the file as `.md` or copy it to the clipboard.
- **💡 Auto-Detect & Format**: Automatically scans documents on open. If raw markdown content is detected (e.g. headers, bold markers, bullet points), a banner prompts you to instantly format it into native Word styles.
- **🎨 Modern Dark Theme**: Features a responsive, glassmorphic layout tailored for macOS, complete with dark/light indicators and micro-animations.

---

## How It Works & Architecture

An Office Add-in is essentially a web application running inside Microsoft Word's embedded web view (WebKit on macOS). 

1. **Manifest File (`manifest.xml`)**: Describes the add-in metadata, requested permissions (`ReadWriteDocument`), ribbon command button placements, and URLs pointing to the task pane web application.
2. **Local HTTPS Server (`server.js`)**: Office Add-ins require secure URLs (`https://`). The local Express server auto-generates self-signed SSL certificates (`openssl`) and attempts to register them with the macOS Keychain trust store on startup so Word can load the app locally.
3. **Office Web Extension Folder (WEF)**: On macOS, Word is sandboxed. Word loads developer add-ins by reading XML manifests from a specific directory inside its sandbox container.

---

## Prerequisites

- **macOS**
- **Node.js** (v18+) & **npm**
- **OpenSSL** (installed by default on macOS; used to generate self-signed certificates)
- **Microsoft Word for Mac**

---

## Getting Started

Follow these steps to set up and run the add-in locally on your Mac:

### Step 1: Install & Set Up Certificates
Run the setup script to install Express dependencies, enable Office Developer Extras, and set up your certificate trust:
```bash
chmod +x setup.sh
./setup.sh
```
*Note: During this process, macOS may prompt you for your administrator password to add the self-signed SSL certificate to your Keychain.*

### Step 2: Sideload the Manifest
Because Word runs in a secure sandbox, you must copy the add-in manifest to Word's developer directory:
1. The `setup.sh` script automatically opens Word's documents container in Finder.
2. Check if a folder named `wef` exists. If not, create a new folder named `wef` inside it.
3. Copy `manifest.xml` from this project directory into that `wef` folder.

*(Alternatively, you can run `npm run sideload` if you have a custom script configured, or manually navigate to `~/Library/Containers/com.microsoft.Word/Data/Documents/wef/` and place `manifest.xml` there.)*

### Step 3: Start the Server
Start the local Express HTTPS development server:
```bash
npm start
```
The server will start running at `https://localhost:3000`.

### Step 4: Open in Microsoft Word
1. Open **Microsoft Word for Mac**.
2. Create a new document or open an existing one.
3. Go to the ribbon and select **Insert** > **My Add-ins** (click the drop-down arrow next to it).
4. Under **Developer Add-ins**, select **Markdown Word**.
5. The **Markdown Panel** button will appear in the **Home** tab under a **Markdown Tools** group. Click it to open the task pane!

---

## File Structure

- `manifest.xml` — Defines the add-in integration layout and URLs.
- `server.js` — Secure Express server that serves files and manages SSL certificates.
- `setup.sh` — Automated dependencies, developer flags, and folder configurations script.
- `sideload.js` — Utility script to copy the manifest into Word's sandbox directory.
- `taskpane.html` — The task pane user interface structure.
- `taskpane.css` — High fidelity styling for the task pane (includes animations, scrollbars, and buttons).
- `taskpane.js` — Core application logic: marked/turndown bindings, file imports, and Office APIs integration.
- `commands.html` — Setup placeholder file required by Word for background commands execution.
- `generate_assets.js` — Fast utility to generate default icons in the `assets/` folder.

---

## Troubleshooting & Tips

### Certificate Warnings / Add-in Not Loading
If the task pane displays a blank screen or a certificate warning, Word is blocking the local server.
1. Open your browser and go to [https://localhost:3000](https://localhost:3000).
2. Accept the certificate warning and proceed to trust the certificate manually in your browser.
3. Restart Word and try loading the add-in again.

### Enabling Developer Tools (Inspector)
Right-click anywhere inside the task pane and select **Inspect Element**. This opens the Safari Web Inspector, allowing you to view console logs, debug JavaScript, and inspect HTML/CSS.
*(This option is enabled automatically by `setup.sh` via the `OfficeWebAddinDeveloperExtras` preference).*

### Clearing the Office Cache
If you update `manifest.xml` and the changes do not appear in Word:
1. Close Microsoft Word completely.
2. Clear the cache folder by running:
   ```bash
   rm -rf ~/Library/Templates/LiveContent/Managed/Word/16.0/
   ```
3. Restart Word.
