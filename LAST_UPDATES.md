# v2.15.066
- Restore Icons from Savepoint 109: Reverted to the precise emoji and visual style of savepoint 109 for all header icons, export buttons, and table actions.
- Maintained functional improvements while reverting the visual style.

# v2.15.063
- Restored Original Icons: Reverted all global icon standardized SVGs back to the original emoji and text-based style (✏️, 🗑️, 🥇, 🏟️, 🏠, ✅, ❌, etc.).

# v2.15.060
- Global Icon Standardization: Replaced all emojis and colored icons with monochromatic outlined SVGs.
- Standardized action buttons in all tables (Records, Athletes, Users, Events).
- Updated Stats, Rankings, and Data Management UI for total consistency.

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
