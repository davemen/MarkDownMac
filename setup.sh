#!/bin/bash

# Exit on error
set -e

echo "=================================================="
echo "Markdown Word Add-in macOS Setup"
echo "=================================================="

# 1. Check if Node is in path, or use our NVM path
NODE_PATH="/Users/davemendlen/.nvm/versions/node/v24.16.0/bin"
export PATH="$NODE_PATH:$PATH"

if ! command -v npm &> /dev/null; then
    echo "⚠️ Warning: npm is not in your PATH. Using explicit NVM paths."
fi

# 2. Run npm install
echo "Installing server dependencies..."
npm install

# 3. Enable Office Web Addin Developer Extras for Word on Mac
# This enables Web Inspector debugging when right-clicking the task pane
echo "Enabling Word Developer Extras..."
defaults write com.microsoft.Word OfficeWebAddinDeveloperExtras -bool true || echo "⚠️ Could not write Developer Extras preference. This is only needed for Safari Web Inspector debugging, sideloading will still work."

# 4. Open the Word Container in Finder for Sideloading
WEF_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"
DOCS_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents"

echo "=================================================="
echo "⚠️ macOS Security Sandbox Workaround"
echo "=================================================="
echo "macOS prevents terminal applications from writing directly to Word's container."
echo "We have opened the Word Documents folder in Finder."
echo ""
echo "Please complete these 2 quick steps:"
echo "1. In the Finder window that just opened, check if there is a folder named 'wef'."
echo "   If not, create a new folder named 'wef' inside it."
echo "2. Copy 'manifest.xml' from this project directory into that 'wef' folder."
echo "=================================================="

# Try to create it anyway (just in case they have Full Disk Access enabled)
mkdir -p "$WEF_DIR" 2>/dev/null || true

# Open the Documents folder in Finder so the user can easily drag and drop
open "$DOCS_DIR" || open "$HOME/Library/Containers/com.microsoft.Word/Data"

echo "🎉 Setup scripts prepared! Once you copy the manifest.xml file, you are ready to go."
echo "=================================================="
echo "To run the Add-in:"
echo "1. Run: npm start (starts the local HTTPS server)"
echo "2. Open Microsoft Word for Mac."
echo "3. Go to: Insert > My Add-ins (click the arrow next to it)."
echo "4. Under 'Developer Add-ins', choose 'Markdown Word'."
echo "=================================================="
