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
