---
description: Create a zipped savepoint of the current workspace in the savepoints folder
---
To create a savepoint, follow these steps:

1. **Backup Data**: Use the application's **"Export Database"** feature to download the latest JSON data.
2. **Include Backup**: Rename the exported file to `database_backup.json` and place it in the project root.
3. **Verify Directory**: Ensure the `savepoints` directory exists.
4. **Compress Workspace**: Use `Compress-Archive` in PowerShell to zip the current directory contents (excluding the `.git` folder and the `savepoints` folder itself to avoid recursion).
5. **Name Archive**: Name the zip file based on the savepoint identifier provided by the user (e.g., `savepoint105.zip`).
6. **Move & Clean**: Move the resulting zip file to the `savepoints/` directory.

// turbo
Example command:
`powershell -Command "Compress-Archive -Path (Get-ChildItem -Path . -Exclude 'savepoints') -DestinationPath './savepoints/savepoint[ID].zip' -Force"`
