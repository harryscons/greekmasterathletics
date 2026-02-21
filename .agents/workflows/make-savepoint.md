---
description: Create a zipped savepoint of the current workspace in the savepoints folder
---
To create a savepoint, follow these steps:

1. Ensure the `savepoints` directory exists.
2. Use `Compress-Archive` in PowerShell to zip the current directory contents (excluding the `.git` folder and the `savepoints` folder itself to avoid recursion).
3. Name the zip file based on the savepoint identifier provided by the user (e.g., `savepoint98.zip`).
4. Move the resulting zip file to the `savepoints/` directory.

// turbo
Example command:
`powershell -Command "Compress-Archive -Path ./* -ExitedPath ./.git, ./savepoints -DestinationPath ./savepoints/savepoint[ID].zip"`
