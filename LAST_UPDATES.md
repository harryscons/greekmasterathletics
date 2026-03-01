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
