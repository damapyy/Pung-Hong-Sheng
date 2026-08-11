# Google Sheets & Google Drive Integration Guide

This guide explains how to connect your **Society Club Treasurer Web App** with your **Google Spreadsheet** in Google Drive.

---

## Step 1: Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) in your browser.
2. Name your spreadsheet: **`Society Club Treasury 2025/2026`**.

---

## Step 2: Open Google Apps Script
1. Inside your Google Spreadsheet, click on the top menu: **Extensions** > **Apps Script**.
2. A new tab will open with the script editor.
3. Delete any default code inside `Code.gs`.
4. Copy the entire content of [`Code.gs`](file:///Users/damapyy/.gemini/antigravity/scratch/treasurer-app/google-apps-script/Code.gs) and paste it into the editor.
5. Click the **Save** icon (diskette icon) or press `Ctrl + S` / `Cmd + S`.

---

## Step 3: Initialize All 9 Sheets
1. At the top of Apps Script, select the function dropdown: **`initAllTreasurySheets`**.
2. Click **Run**.
3. Google will ask for Authorization on first run:
   - Click **Review permissions**.
   - Choose your Google Account.
   - Click **Advanced** > **Go to Untitled project (unsafe)** (this is standard for your personal custom script).
   - Click **Allow**.
4. Switch back to your Google Spreadsheet tab — you will see all 9 tabs automatically created, formatted with colors, headers, and formulas!

---

## Step 4: Deploy as Web App Endpoint
1. In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `Society Treasury Web App Endpoint`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Note: This allows your web app to send and receive data smoothly)*
4. Click **Deploy**.
5. Copy the **Web App URL** (it looks like `https://script.google.com/macros/s/.../exec`).

---

## Step 5: Connect in the Treasurer Web Application
1. Open the Treasurer Web Application in your browser.
2. Click the **Google Sheets Sync** button or icon in the top navigation bar.
3. Paste your **Web App URL** into the field.
4. Click **Test & Sync Now**.
5. You're done! All transactions, ledgers, transfers, budgets, and receipt verifications will automatically synchronize with your Google Spreadsheet!
