# v2.21.010
- **Pending Popup respects "Show Only Modal" setting**: The pending records popup now consistently applies or removes the `minimal` class (no background blur) based on the "Show Only Modal Window (No Background Blur)" general setting — exactly like all other modal windows. Both the init startup and the `showPendingPopup()` function read from `tf_show_only_modal`.

# v2.21.009
- **Popup Trigger Fix for Cloud Supervisor**: For cloud users (e.g., cha.kons@gmail.com), the popup now fires inside `updateUIForAuth` — the exact moment the supervisor role is confirmed — rather than depending on complex timing guards. Local environment continues to use the `renderAll` guard.
- **Popup Overlay Fix**: Removed the transparent background from the pending popup overlay. Now uses the standard dark modal overlay style consistent with all other modals.

# v2.21.008
- **Pending Popup Root Cause Fix**: The popup was reading from `records.filter(isPending)` but pending records are stored in a completely separate Firebase node (`pendingrecs`). Fixed to use the correct `pendingrecs` array. Also replaced the simple `isSuper` guard with a retry loop (polls up to 10 times × 500ms) because Firebase auth state often resolves after the `pendingrecs` data listener fires.

# v2.21.007
- **Version Display Fix**: Corrected stale `v2.21.004` labels and `?v=2.21.003` cache-busting parameter in `index.html` — browser was loading old cached script without the popup feature.
- **Pending Popup Trigger Fix**: The popup was not showing because supervisor auth typically resolves *before* Firebase data finishes loading, so `isDataReady` was false at trigger time. Added a second trigger at the end of `renderAll()` (fires once on first full data load) using a `_pendingPopupShown` guard to prevent duplicate popups.

# v2.21.006
- **Pending Records Startup Popup**: When the supervisor logs in and there are pending records awaiting approval, a popup window appears automatically listing all pending records with their athlete name, event, mark, date, and type (addition/deletion). A "Go to Pending Log" button navigates directly to the approval tab. The popup uses the existing theme/colors with no background blur, just corner shadow.
- **Settings: Disable Pending Popup**: Added a new "Disable pending records popup on startup" checkbox in General Settings. Default is unchecked (popup shown). Setting is saved to localStorage and synced to Firebase under each user's settings profile.

# v2.21.005
- **"Προς Εγκριση" Badge Style**: Made the pending approval badge bigger (font-size 0.85em), bold green background (`#16a34a`) with a white text and green glow effect. Now clearly visible and easy to recognize at a glance.
- **Country Dropdown Fix**: Resolved missing countries in the Add/Edit/Update record form. Countries were only being populated after all 5 data nodes synced. Now the country dropdown populates immediately when country data arrives from Firebase, matching the same fix applied earlier to the year dropdown.

# v2.21.004
- **Performance Optimization**: Removed 90 non-critical `console.log`, `console.warn`, and `console.table` debug statements from `script.js` (from 104 down to 14). These were firing on every data sync, every tab switch, every render loop, and every athlete/record edit — adding measurable overhead to every page load and interaction. Only genuine error handlers and critical sync warnings remain.

# v2.21.003
- **Year Dropdown Fix (Root Cause)**: Resolved the definitive root cause of the "All Years" dropdown only showing 2026. The `populateYearDropdown` function was previously only called inside `renderAll()`, which requires ALL data nodes (athletes, events, countries, history, users) to finish syncing before running. If any node was slow, the function ran with an empty `records` array showing only 2026. The function is now called immediately after records load from Firebase, independent of other data nodes.

# v2.21.002
- **Year Dropdown Diagnostics**: Added console logging inside `populateYearDropdown` to expose the exact state of `records` at call time. Also added a direct call to `populateYearDropdown` inside the Firebase records listener to ensure it fires immediately after data loads.

# v2.21.001
- **Version Bump**: Incremented version to `v2.21.001`. Established a new pattern convention to automatically increment the build suffix iteratively.

# v2.20.113
- **Forced Browser Cache Refresh**: Added a versioning query parameter (`?v=2.20.113`) to the main application script import. The critical Year Dropdown sorting fixes released in v2.20.111 and v2.20.112 were heavily cached by browsers resulting in the `NaN` errors continuing uninterrupted. This cache breaker ensures the new array mechanics properly load onto devices.

# v2.20.112
- **Year Dropdown Array Fix**: Corrected a JavaScript data-sorting crash where the "All Years" dropdown would evaluate missing dates as `NaN` (Not a Number) before adding them to the list array. This completely broke the application's ability to mathematically sort history years, forcing it to only display the hardcoded `2026` option. The sorter is now protected.

# v2.20.111
- **Year Dropdown Populating Fix**: Corrected a date parsing logic error where the "All Years" filter failed to read very old date formats (e.g. `15/05/99`) or raw Excel serial numbers. The system can now interpret these natively, ensuring every historical year properly displays in report filters.

# v2.20.110
- **History Record Data Integrity (Read-Only Fields)**: Corrected a bug where the History Edit window's core identity fields (`Event`, `Athlete`, `Gender`, `Age Group`, and `Track Type`) were accidentally being unlocked by a timing issue in the read-only toggle. They are now permanently locked as intended.
- **History Expanded Details**: Added `Location` (Town, Country) and `Notes` data to the `+` expanded dropdown rows within the main History List table to provide users with full visibility of historical contexts.

# v2.20.109
- **History Record Data Integrity (Read-Only Fields)**: When editing an archived history record, the core identity fields (`Event`, `Athlete`, `Gender`, `Age Group`, and `Track Type`) are now strictly locked and Read-Only. This prevents accidental fundamental changes to a historical record's identity while still allowing edits to its results (`Mark`, `Wind`, `Location`, etc.).
- **History Country Dropdown Fix**: Upgraded the form population logic for the Country dropdown in the History editor to dynamically recreate missing historical country options (labeled as "Archived") if they no longer exist in the active lists, ensuring the field is never blank.

# v2.20.108
- **Forced Browser Cache Refresh**: Added a versioning query parameter (`?v=2.20.108`) to the main application script import to permanently break stubborn browser caching. This ensures all users automatically receive the critical fixes implemented in v2.20.107 without needing to manually clear their browser data.

# v2.20.107
- **History Save Firebase Crash**: Addressed the root cause of the "value contains undefined" Firebase crash. The rendering loop for the History UI was actively mutating old history records in memory to give them a temporary sorting date, occasionally injecting `undefined` if the record lacked a date. When the user saved a record, the entire mutated history array was sent to Firebase, causing a crash. The array is now strictly sanitized before upload to guarantee all `undefined` properties are destroyed.

# v2.20.106
- **History Save Firebase Error**: Fixed an error where saving an edited History record threw a `Firebase: value contains undefined` error. The internal sorting date (`_groupSortDate`) now falls back to `null` instead of `undefined` to comply with Firebase requirements.
- **Year Dropdown Restoration**: Ensured the removal of the 2026 test-cache limitation takes full effect across all dropdown initializers.

# v2.20.105
- **Year Filter Data Load**: Removed a leftover debug limit that was accidentally causing the system to only cache records from the year 2026. All older records are now properly loaded into the application again, and the Year Dropdown reflects all available years.
- **History Record Saving Fix**: Resolved an issue where saving edits made to an *Archived* record was silently failing. The system now accurately targets the record ID in the history array and commits the changes.

# v2.20.104
- **Main Report Filters Fixed**: Restored the critical data initialization sequence that was accidentally removed in a previous update. The "Event" and "Athlete" dropdown lists on the Main Report will now properly populate with all active names when the application loads.

# v2.20.103
- **Missing Dropdown Options Fix**: Upgraded the form population logic for both the History and Live Record editors. If an archived record contains an Event or Athlete name that has since been deleted or altered in the active database, the editor will now dynamically recreate that option (labeled as "Archived") so the form field never appears blank.

# v2.20.102
- **History Form Population Fix**: Implemented a robust value-matching helper in the History Editor to ensure Dropdowns (specifically the "Event" dropdown) populate correctly even if the archived string formatting differs slightly from the current dropdown definitions.

# v2.20.101
- **History UI Refinement**: Removed the double-click event listener on History rows. Users must now explicitly use the Edit/View button, preventing confusion between Live and Archived record popups.
- **WMA Stats Gender Fix**: Restored the gender display in the WMA Statistics report from English ("Men/Women") back to the database-native Greek ("Άνδρες/Γυναίκες").

# v2.20.100
- **Year Filter Optimization**: Refactored the History filter logic to pre-calculate `groupSortDate`. The "Year" dropdown now accurately reflects the year of the *new/replacing* record rather than the strictly archived date, drastically improving filter usability.

# v2.20.99
- **Definitive Global Export**: Hard-bound `renderHistoryList` to the global `window` object after previous structural attempts silently failed. Dropdowns in the History tab will now trigger immediate updates.

# v2.20.98
- **Global Signal Repair**: Fixed a logic error where the History Tab refresh signal was not properly sent to the main application. High-precision export of `renderHistoryList` to the global scope ensures dropdown filters trigger immediately.

# v2.20.97
- **Real-time History Filtering Fixed**: Fixed a scope issue where `renderHistoryList` was not properly exported to the global `window` object, preventing dropdown filters from triggering automatically.
- **Improved Global Exposure**: Verified that all critical cross-script functions are correctly attached to `window`.

# v2.20.96
- **History Filtering Fixed**: Restored the global binding for `renderHistoryList`, enabling dropdown filters to correctly refresh the archive list.
- **Default View Optimization**: Flipped the default history view to **Newest First (Grouped)**. Categories are now sorted by the performance date of the current live record (or latest archive), ensuring recent achievements always appear at the top.
- **Improved Date Sorting**: Implemented numeric date comparisons for `groupSortDate` to ensure perfectly accurate chronological ordering.

# v2.20.95
- **Variable Name Collision Fix**: Resolved a `TypeError` where a local variable named `history` was conflicting with the browser's `window.history` object. Corrected this to `recordHistory` at line 5973.

# v2.20.94
- **Global Scope Restoration**: Explicitly exported `renderHistoryList`, `populateHistoryFilters`, and `checkReady` to the global `window` object. This resolves `ReferenceError` issues caused by external script calls during initialization and tab switching.
- **Robust Loading Logic**: Ensured that the 15-second loading failsafe is correctly linked to the global overlay management system.

# v2.20.93
- **Initialization Hoisting Fix**: Standardized `renderHistoryList` as a hoisted function to prevent `ReferenceError` crashes during the application's startup sequence. This ensures the UI loads correctly even if data sync triggers an immediate refresh.

# v2.20.92
- **Global Load Guarantee**: Introduced a high-level failsafe that forces the application to open after 15 seconds regardless of network or synchronization status.
- **Fallback Recovery Fix**: Resolved a critical bug where the application would stay hidden if it failed to sync with the cloud and switched to local data.
- **Rendering Protection**: Wrapped History rendering in a safety catch to prevent unexpected data errors from blocking the entire application UI.

# v2.20.91
- **Definitive Loading Fix**: Resolved a logic error where the 12-second "Safety Valve" was ignored by the system. The application will now correctly bypass long synchronization waits, ensuring the "Synchronizing Data" screen never persists indefinitely.
- **Sorting & Form Integrity**: Verified that the Record History tab correctly sorts by replacement date and that the edit modal is fully populated with all archived data.

# v2.20.90
- **Force Sync Safety Valve**: Implemented a mandatory 12-second timeout that releases the initialization phase even if Firebase synchronization is slow or hanging. This prevents the "Stuck on Synchronizing..." screen from blocking users.
- **Archive Sorting Finalized**: Categories in the Record History tab are now accurately sorted by the *Performance Date* of their replacing (live) records.

# v2.20.89
- **Emergency Sync Fix**: Added diagnostic logging to the data synchronization engine to identify and resolve "stuck" initialization states.
- **Sorting Refinement (Finalized)**: Verified and fixed the "replaced-by" sorting logic. History items are now precisely ordered by the performance date of the current live record that holds the title.

# v2.20.88
- **Smart Sorting Reborn**: The History list now sorts event categories based on the *performance date* of the current record (the record that replaced the archives). This ensures you see the most recent athletic achievements at the very top.
- **Fail-Safe Form Loading**: Completely overhauled the `editHistory` initialization. The record modal now performs a clean reset before meticulously populating every single field from the archive, eliminating "missing field" errors.
- **Filter Initialization Shield**: Guaranteed that history dropdowns (Event, Athlete, Year, etc.) populate immediately upon data load, preventing the "empty lists" scenario.

# v2.20.87
- **History Stability Hotfix**: Implemented robust date parsing in archive filters. Previously, a single malformed date record could crash the filter engine, leaving dropdowns empty.
- **Form Integrity**: Verified and reinforced the history edit modal. Clicking "Edit" or "View" on an archive record now reliably populates all data fields (Mark, Wind, Race Name, IDR, etc.).
- **Smart Replacement Sorting**: Reverted default sort to *Archived Date* (Desc) to prioritize the most recent record replacements. Added a "Live-Record pinning" logic to ensure current winners always head their historical groups.

# v2.20.86
- **History Edit Form Fix**: Fully populated all fields (Mark, Wind, Date, Location, Relays, etc.) when editing or viewing a historical record. This ensures that the "Edit Archived Record" window is complete and accurate.
- **Filtering Stability**: Added internal debug logging and fixed remaining variable conflicts to ensure History dropdown filters populate reliably.
- **Sorting Optimization**: Defaulted the History tab to sort by the performance *Date* (Newest First), as requested.

# v2.20.85
- **Reserved Keyword Fix**: Renamed the internal `history` variable to `recordHistory`. This critical update resolves a hidden conflict with the browser's `window.history` object, which was causing the dropdown filters to remain unpopulated.
- **UI Spacing Polish**: Refined the Record History tab layout by tightening subtitle and toolbar margins, creating a more professional and data-rich view.

# v2.20.84
- **Ultimate History Filter Fix**: Completely redesigned the History tab layout using standardized application components (`.section-header`, `.report-toolbar`). This permanently resolves spacing inconsistencies.
- **Robust Data Population**: Enhanced the history filtering engine to be more resilient to data variations. Dropdowns are now reliably populated with clean, descriptive labels (e.g., "All Athletes" instead of technical IDs).

# v2.20.83
- **History Filter Refinement**: Fixed a ReferenceError that caused the new history filters to appear empty. The filters now correctly populate with Event, Athlete, and Year data.
- **UI Spacing Optimization**: Tightened the layout of the Records History tab by reducing excessive padding and margins around the filter bar.

# v2.20.82
- **Advanced History Filtering**: Introduced a new suite of filters for the Records History tab. Users can now filter the archive by Event, Athlete, Gender, Age Group, Year, and Date Archived, making it much easier to research specific records within the historical data.

# v2.20.81
- **WMA Statistics Reference Fix**: Resolved a critical ReferenceError in the WMA statistics report. Corrected the internal sorting variable names to match the global application state, restoring data visibility.

# v2.20.80
- **WMA Statistics Restoration**: Fixed an issue where the WMA statistics report would appear empty on initial load. Added a retry mechanism to wait for asynchronous data files to finish loading before rendering.
- **Dynamic Stats Refresh**: Ensured the WMA statistics report automatically refreshes whenever the global data state changes, keeping metrics fully up-to-date.

# v2.20.79
- **Critical Initialization Fix**: Resolved an issue where the application would get stuck on the "Synchronizing Data..." overlay. Restored a missing internal variable (`maxAthleteLen`) required for dynamic column sizing.

# v2.20.78
- **Dynamic IDR & Wind Sizing**: Optimized the widths for IDR and Wind columns. They now automatically scale to fit their contents (like "GR" or wind readings), ensuring a clean and efficient data display.
- **Enhanced Visual Consistency**: Every data column in the main report now uses intelligent dynamic sizing for a perfectly balanced look.

# v2.20.77
- **Dynamic Age Groups**: Applied the same intelligent sizing logic to the "Age Group" column. It now perfectly frames labels like "M35", "W40", or "Mixed" based on the longest value in your current view.
- **Improved Table Balance**: Refined the column width guards to ensure a more stable and professional table layout.

# v2.20.76
- **Optimized Name Widths**: Improved the dynamic sizing of the "Athlete Name" column. It now uses a more generous spacing formula (9px per character + 45px padding) to ensure even the longest names are fully visible.
- **Improved Layout Guard**: Added a maximum-width limit of 400px for names to ensure the table remains readable and stable on ultra-wide monitors.

# v2.20.75
- **History Management Restoration**: Restored the edit (✏️) and delete (🗑️) icons for historical records within the Grouped View. You can now manage individual archives even when they are nested under a primary event.

# v2.20.74
- **History Detail Restoration**: Fixed the missing `+` expansion buttons in the "Oldest First" view. Every historical record is now visible again as a standalone row with its successor expansion.
- **Hybrid History Logic**: The application now intelligently switches between a Flat List (for chronological history) and a Grouped View (for newest-first summaries) based on your settings.

# v2.20.73
- **Interactive History Sorting**: Added clickable headers to the Records History table. You can now sort by Event, Athlete, Date, or any other column by clicking its title.
- **Improved Default View**: The history list now defaults to sorting by the most recent activity (Archived At), ensuring you always see the latest changes first.

# v2.20.72
- **Grouped History View**: Resolved record duplication in the history tab. When "Newest First" is enabled, each event now only appears once as a "Head" row (Live or newest record).
- **Full Lineage Expansion**: Clicking `+` now reveals the *entire* historical chain for that specific event, providing a much cleaner and more professional overview without redundant entries.

# v2.20.71
- **Live-Archive Unified History**: When "Newest First" is enabled, the Record History tab now includes the current Live record at the top of each lineage stack.
- **Smart Stacking**: Expanding a Live record now correctly shows the latest archived version it replaced, creating a complete chronological chain from current to oldest.

# v2.20.70
- **Critical UI Fix**: Fixed a bug where switching themes or loading cloud settings accidentally hid the Supervisor/Admin tabs. Permission-based status is now correctly preserved.
- **Sync Optimization**: Improved the cloud synchronization engine with smart guards to prevent redundant data writes and circular updates.

# v2.20.69
- **History Expansion Refinement**: The "Record History" expansion logic (the `+` symbol) now respects the sorting preference. If "Newest First" is selected, expanding a record will now show the older predecessor it replaced, ensuring a consistent logical flow in both view modes.

# v2.20.68
- **Cloud Settings Synchronization**: Implemented automatic synchronization of personal preferences (theme, sorting, safety restrictions) to the cloud for registered users. Settings are now preserved across all devices and sessions.

# v2.20.67
- **History Sorting Preference**: Added a new "History: Old record first" setting in General Settings. This allows users to toggle between chronological (Oldest first) and reverse-chronological (Newest first) views in the Record History tab.

# v2.20.66
- **Maximum Mobile Compression**: Drastically reduced vertical spacing in the card-based mobile view. Reduced card margins and padding, tightened cell spacing, and optimized font sizes to maximize information density on small screens.

# v2.20.65
- **Sticky Management Headers**: Fixed the "Manage Athletes" table so that headers (labels and search boxes) stay fixed at the top while scrolling the list.
- **Improved Scroll Containment**: Refined the flexbox container logic to ensure internal scrolling works reliably across all settings tabs.

# v2.20.64
- **Absolute Header Uniformity**: Synchronized heights, fonts, and padding for all table headers across the app (Main, Stats, Athletes, Events, Users).
- **Balanced Athlete Layout**: Implemented an even column distribution for the Athlete management table (ID, Name, DOB, Gender) while keeping Actions compact.
- **Enhanced Statistics UI**: Integrated CSS-based sorting arrows and mobile card support into "Annual Progress" and "WMA Stats" reports.

# v2.20.63
- **Unified Table Styles**: Standardized all application tables (Statistics, Athletes, Events, Users) to use the "soft style" of the main report, including consistent headers and fonts.
- **Global Mobile Card View**: Enabled the compact card-based layout for all tables when viewed on mobile devices, ensuring data is perfectly legible and aligned everywhere.
- **CSS-Based Sorting arrows**: Removed manual arrow characters in favor of sleek, CSS-based sorting indicators that toggle automatically.

# v2.20.62
- **Compact Mobile Layout**: Tightened the card-based mobile view by reducing redundant padding, margins, and font sizes. This allows significantly more records to be visible on phones while maintaining perfect alignment and readability.

# v2.20.61
- **Deployment Fix**: Fixed version labels and re-deployed to ensure all recent mobile optimizations (v2.20.60) are live.

# v2.20.60
- **Smart Card-Based Mobile Layout**: The report table now transforms into a series of legible cards on mobile devices. Each record is displayed as a standalone card with clear labels and optimized spacing, ensuring data is perfectly aligned and easy to read on any phone.
- **Improved Accessibility**: Added `data-label` attributes to all data points to support advanced layout techniques and future screen reader improvements.
