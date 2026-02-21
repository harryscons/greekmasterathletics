# Celestial Plasma - Savepoint 104 Updates

## Recent Accomplishments (v2.15.004 - v2.15.012)

### 🏆 Rankings Tab
- Added a new "Rankings" sub-tab to the Statistics section.
- Implemented WMA performance aggregation per athlete:
    - **Best WMA Pts**: Highest score across all records.
    - **Avg WMA Pts**: Average score.
    - **Records**: Count of scored records.
- Addedmedal icons (🥇🥈🥉) for the top 3 athletes.
- Fixed Age Group display to show the group from the record where the athlete scored their **Best Pts**.
- Implemented sortable table headers with live ARROWS (▼/▲) and active column highlighting.

### 📊 WMA Calculation & UI Refinement
- **Track Event Decimal Fix**: Updated `calculateRateConv` so track marks like `14.9` are correctly interpreted as `14.90` (tenths/hundredths), ensuring accurate WMA points.
- **Default Sorting**: Changed the WMA Statistics report default sort order to **Pts** (Points) descending.
- **Label Rename**: Renamed **"Medal Statistics"** to **"National Holder Statistics"**.

### 🛠️ Stability & Performance
- Added retry logic (polling) to ensure WMA and IAAF scoring tables are fully loaded before rendering the Rankings tab.
- Integrated `getExactAge()` for consistent DOB parsing across all Statistics views.
- Switched to `athleteLookupMap` for faster and more reliable athlete data retrieval.

---
*Created on 2026-02-21*
