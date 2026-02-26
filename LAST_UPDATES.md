# v2.15.085
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
