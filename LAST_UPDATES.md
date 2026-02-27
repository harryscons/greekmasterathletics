# v2.20.09
- **Critical Fix**: Resolved application hang during "Synchronizing Data..." by adding robust library checks for Chart.js.
- **Improved Resilience**: Added automatic retry logic for statistics visualizations to ensure core app loading is never blocked.

# v2.20.08
- **Data Robustness**: Upgraded statistics engine with internal robust date parsing to ensure "Records by Year" always finds data.
- **UI Default Selection**: Set Bar Chart as the default view for year-based visualizations.
- **Read-Only Perfection**: Finalized grayscale removal and opacity normalization for non-editable windows.
- **Layout Fine-Tuning**: Perfected proportional field alignment for Race Name, Mark, and IDR fields.

# v2.20.07
- **UI Consistency**: Removed dimming/grayscale effect from read-only modals for better clarity.
- **Improved Graph Reliability**: Upgraded date parsing logic to ensure "Records by Year" chart renders correctly.
- **Form Refinement**: Optimized horizontal alignment and spacing for fields in the record entry window.

# v2.20.06
- **Version Alignment**: Synced versioning across application and logs to v2.20.06.
- **Auto-Increment System**: Initiated automatic version tracking for each deployment command.

# v2.20.05
- **UI Fix**: Enhanced legibility of record details by forcing white text for all fields in the read-only modal.
- **Graph Polishing**: Corrected data aggregation logic and aligned chart type selector for the "Records by Year" visualization.

# v2.20.04
- **New Statistics**: Introduced "Records by Year" tab with dynamic Chart.js visualizations (Bar/Line graphs).
- **Interactive Tools**: Added toggle controls for different graph formats to analyze historical trends.

# v2.20.03
- **UI Cleanup**: Removed "sample data" placeholders (e.g., "Diamond League", "Berlin") from all input fields to provide a cleaner and more professional record entry experience.

# v2.20.02
- **Optional Record History**: Added a new setting "Move also edited records to history" in General Settings. This allows supervisors to choose whether to archive old versions of a record when performing an update.
- **Improved Data Management**: Users can now update records in-place without cluttering the history log when preferred.

# v2.20.01
- Version increment and deployment.

# v2.20.00
- **Major Milestone Release**: Consolidated recent robust read-only lockdown, UI refinements, and badge alignment improvements into a stable milestone version.
- **Enhanced Data Integrity**: Finalized the surgical CSS-based lockdown for record viewing.
- **Optimized UI**: Refined information badge placement and athlete profile visibility.

# v2.15.100
- **Definitive Surgical Lockdown**: Transitioned from a physical shield to a precision CSS-based lockdown. This guarantees that all form fields are un-editable while ensuring the "Close Window" and "X" buttons remain perfectly interactive.
- **Persistent Visibility**: Ensured that the athlete's name, DOB badge, and Age Group badge are always correctly populated and visible in read-only mode.
- **Reliable Accessibility**: Upgraded the z-index and event handling of all closing controls to ensure they are never blocked.

# v2.15.099
- **Refined Badge Alignment**: Moved the DOB and Age Group badges to be positioned immediately next to the label text for better readability and a more compact layout.

# v2.15.098
- **Read-Only UI Refinements**: Restored athlete name and information badges (DOB/Age Group) in the view-only modal.
- **Improved Interaction Layering**: Balanced the interaction shield to allow smooth operation of the "Close Window" and "X" buttons while maintaining absolute protection for all form fields.
- **Badge Vibrancy**: Information badges remain fully vibrant and visible, bypassing the read-only gray-scale filter.

# v2.15.097
- **Absolute Interaction Lockdown**: Fixed a critical parameter synchronization bug that prevented the read-only flag from activating. 
- **Physical Barrier**: The "Interaction Shield" is now physically layered above all form elements to guarantee no clicks or keystrokes can modify the data.
- **Root Cause Resolution**: Unified the `openRecordModal` and `editRecord` flow to strictly enforce the read-only state when triggered via double-click.

# v2.15.096
- **Absolute Read-Only Lockdown**: Implemented a physical "Interaction Shield" (invisible overlay) that covers the entire form in view-only mode, making it impossible to click, type, or change any values.
- **Global Logic Guards**: Added internal security guards to all UI functions (like Relay management) to prevent any background state changes while the modal is locked.
- **Reinforced UI Security**: The "Close Window" button is now the only interactive element, elevated above the interaction shield for guaranteed accessibility.

# v2.15.095
- **Reinforced Read-Only Lockdown**: Added redundant security layers to the view-only modal. Interaction is now blocked via CSS classes, direct inline-style overrides, and multi-stage script verification.
- **Enhanced Modal UX**: Non-interactive buttons are now completely removed from the DOM flow, and the "Cancel" button dynamically changes to "Close Window" for better clarity.

# v2.15.094
- **Definitive Read-Only Lockdown**: Implemented a "Triple-Lock" security layer for the view-only modal. This includes a global JS interaction flag, physical CSS pointer-blocking (`pointer-events: none`), and aggressive multi-stage element disabling to ensure no modifications can be made when viewing records via double-click.
- **Improved UI Reliability**: Fixed an issue where background calculation scripts could accidentally re-enable fields after the modal opened.

# v2.15.093
- **Robust Read-Only Mode**: Improved the record modal's view-only logic to provide a total lockdown of all interactive elements (inputs, dropdowns, and buttons) when double-clicking a record.
- **Button Protection**: The "Update & Archive" buttons are now hidden more reliably in read-only mode, with a final verification step to prevent background scripts from re-enabling fields.

# v2.15.092
- **Optimized Badge Placement**: The "Current Age Group" badge has been moved to the right of the Age Group label for better organization.
- **Enhanced Readability**: Font sizes for both the DOB and Age Group badges have been increased for better visibility.
- **Structural Improvements**: Updated label layouts to ensure consistent alignment of all information badges.

# v2.15.091
- **Read-Only Modal Mode**: Users can now double-click any record in the reports, history, or statistics tables to view full details in a protected, read-only modal.
- **Enhanced Data Visibility**: The read-only mode is available to all users, bypassing edit-permission restrictions while ensuring data integrity.

# v2.15.090
- **Branded Athlete Badges**: The "Date of Birth" badge is now a vibrant green (#10b981) for better visibility.
- **Current Age Group Badge**: Added a new indigo (#6366f1) badge that dynamically displays the athlete's current age group next to their name.
- **Improved Badge Layout**: Badges are now grouped side-by-side in a responsive flex container.

# v2.15.089
- **Self-Healing DOB Badge**: Implemented an automated recovery system for the Athlete DOB badge. The system now detects if the badge element is missing (e.g., due to accidental DOM clearing) and re-creates it on-the-fly.
- **Improved DOM Logic**: Upgraded the record form's label management to use a non-destructive text update method, ensuring that dynamic components like badges are preserved during form state transitions.

# v2.15.088
- **Athlete DOB Badge Stability**: Refactored the internal structure of the record form labels to prevent the DOB badge from being inadvertently removed during form state changes (e.g., switching between Athlete and Team modes).
- **Persistent Badge State**: The badge now remains securely in the DOM and updates correctly regardless of label text changes.

# v2.15.087
- **Athlete DOB Badge Fix**: Improved date parsing for the DOB badge using the robust system-wide helper.
- **Diagnostic Logging**: Added console logging to track athlete data and badge visibility for troubleshooting purposes.

# v2.15.086
- **Record Access Restriction**: The "Add New Record" button (`+`) is now restricted to Supervisors and Admins.
- **Security Guard**: Added unauthorized access protection to the Record Modal to ensure only permitted roles can create or modify records.

- **Athlete DOB Badge**: When editing a record or selecting an athlete in the modal, their Date of Birth is now displayed as a distinct badge next to their name for quick verification.

# v2.15.084
- **Modal Display Preference**: Added a "Show Only Modal Window" setting in General Settings.
- **Minimalist Mode**: Enabling this removes background blur and glassmorphism, displaying the modal as a focused window with distinct shadows for better clarity on busy reports.

# v2.15.083
- **Final Tab Visibility Fix**: Corrected a second missing closing `</div>` tag in the modal structure that was still causing "Record History", "Settings", and "Statistics" to be hidden.
- **Structural Integrity**: Verified all HTML containers are properly closed to ensure reliable tab switching.

# v2.15.082
- **Tab Visibility Fix**: Resolved a critical layout issue where "Record History", "Settings", and "Statistics" tabs appeared empty due to an unclosed HTML tag in the new modal structure.
- **Improved HTML Structure**: Hardened the modal container to prevent interference with main navigation.

# v2.15.081
- **Record Form Modal**: Converted the "Log New Record" tab into a premium modal window.
- **Improved Workflow**: Clicking "+", "Edit", or "Update" now opens the form in a centered overlay, preserving your place in the main report.
- **Enhanced UI**: Added glassmorphism effects and smooth slide-up animations for the new modal window.

# v2.15.080
- **Maintenance Disabled**: Completely removed all automated post-load maintenance (seeding, migrations, and metadata repairs) as requested.
- **Auto-Cleanup Removed**: Deleted the duplicate athlete cleanup logic to prevent any automatic modification of the athlete database.

# v2.15.079
- **Age Display Fix**: Resolved "Age: undefined" in National Holder Statistics and green age badges by ensuring current age is correctly cached and robustly null-checked during rendering.

# v2.15.078
- **Archive Filter Fix**: Removed the redundant archive protection that erroneously hid edited records from the WMA Statistics report.
- **Track Type Consistency**: Standardized track type filtering to be case-insensitive and more robust, ensuring "Indoor" records appear correctly.

# v2.15.077
- **Robust Date Parsing**: Implemented a centralized parsing system to handle multiple date formats (ISO, European DD/MM/YYYY, etc.).
- **WMA Statistics Fix**: Ensured 2026 records are correctly identified and included in statistics reports regardless of the input date format.
- **Improved Age Calculation**: Switched to standardized age helpers across all reporting logic for better data consistency.

# v2.15.076
- **Cloud-Only Transition**: Migrated to a pure cloud data model. Removed `localStorage` "Fast Pass" and "Smart Merge", ensuring Firebase is the absolute source of truth.
- **Cloud Tombstones**: Record deletions (tombstones) are now synchronized globally across all devices via Firebase.
- **Improved Stability**: Removed legacy local-to-cloud migration logic to prevent accidental data overwrites and ensure a consistent system state.

# v2.15.074
- **2026 Records Fix**: Standardized ID handling to ensure current year records (e.g. 2026) are correctly processed and visible in WMA Statistics reports.
- **80m Hurdles Points**: Linked "80μ Εμπόδια" to official IAAF/WMA scoring tables to ensure points are calculated automatically.
- **Improved Filtering**: Fixed a potential ID type mismatch (String/Number) in archiving and filtering logic across the whole application.
- **Diagnostic Logging**: Added browser console logs to the WMA Statistics view to assist with debugging of record visibility.

# v2.15.073
- Deployment of initial 80mH points fix.

# v2.15.059
- UI Refinements: Set Age Group, IDR, and Wind columns to shrink exactly to their content size with a small amount of padding. Tightened action buttons to be exactly 1px apart.

# v2.15.057
- UI Refinements: Reduced widths for Age Group, IDR, and Wind columns in the main report.
- Icon Update: Replaced "Update" button SVG with a matching 🔄 emoji and tightened action button spacing.
- Cascaded Name Updates: Renaming an athlete now automatically propagates the change across all Records, History, and Pending submissions.

# Celestial Plasma - Savepoint 104 Updates

## Recent Accomplishments (v2.15.004 - v2.15.014)

### 🏆 Rankings Tab
- Added a new "Rankings" sub-tab to the Statistics section.
- Implemented WMA performance aggregation per athlete (Best/Avg Pts, Record Count).
- Added medal icons (🥇🥈🥉) and sortable headers with live sort direction arrows.
- Implemented polling retry logic to ensure WMA scoring data is ready before rendering.

### 📊 WMA Calculation & UI Refinement
- **Track & Road Decimal Fix**: Updated `calculateRateConv` so marks like `14.9` are correctly interpreted as `14.90` (tenths/hundredths) for both **Track** and **Road** events.
- **Age Mark Formatting**: The "Age Mark" in WMA Statistics reports is now formatted as a **time string** (e.g., `3:49.68`) for all Track and Road events.
- **Improved Sorting**: Enhanced the `getNumeric` helper to correctly parse formatted time strings, ensuring "Age Mark" sorting remains accurate.
- **Default Sorting**: Changed the WMA Statistics report default sort order to **Pts** (Points) descending.
- **Label Rename**: Renamed **"Medal Statistics"** to **"National Holder Statistics"**.

### 🛠️ Stability & Performance
- Integrated `getExactAge()` for consistent DOB parsing across all Statistics views.
- Switched to `athleteLookupMap` for faster performance.

---
*Created on 2026-02-21*
