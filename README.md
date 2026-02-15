# Track & Field Logger - Sharing Guide

This application runs entirely in your web browser. It does not use a central cloud server, so your data (Athletes, Records, Events) is saved directly to the device you are using.

## Option 1: Share the App (Internet)
To let others use the app on their own devices:
1.  **Host it for free**: You can upload this folder to **GitHub Pages**, **Netlify Drop**, or **Vercel**.
    *   *For Netlify Drop*: Just drag and drop the `celestial-plasma` folder onto their website. They will give you a link (e.g., `yourapp.netlify.app`) to share.
2.  **Send the files**: You can zip this folder and email/send it to someone. They just unzip it and open `index.html`.

## Option 2: Share Data (Syncing)
Because the database lives on **your device**, opening the app on a new tablet means starting with an empty database.

**To move your data to another device:**
1.  **On your PC (Source):**
    *   Go to the **Data** tab.
    *   Click **Backup Database (JSON)**.
    *   Save the file (e.g., `backup.json`) and send it to the other device (email, USB, Google Drive).

2.  **On the Tablet (Target):**
    *   Open the app.
    *   Go to the **Data** tab.
    *   Click **Restore Database (JSON)**.
    *   Select the `backup.json` file.
    *   The app will reload with all your records, athletes, and settings!

## Features
*   **Offline Capable**: Once loaded, it works without internet.
*   **Privacy**: Your data never leaves your device unless you export it.
