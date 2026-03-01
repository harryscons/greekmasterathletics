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
