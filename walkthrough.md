# Walkthrough - Celestial Plasma

## v2.20.80: WMA Statistics Fix
- **Asynchronous Data Waiting**: The WMA Statistics report now intelligently waits for the large IAAF and WMA data files to finish loading. It displays a "Loading..." state before automatically populating once the data is ready.
- **Automatic Metric Synchronization**: Metrics now refresh in real-time alongside other reports, ensuring consistent data across the entire application.

## v2.20.79: Emergency Hotfix
- **Initialization Restoration**: Fixed a critical regression that prevented the application from loading. The "Synchronizing Data..." screen now correctly disappears as soon as data processing is complete.

## v2.20.78: IDR & Wind Width Optimization
- **Data-Driven Columns**: The IDR and Wind columns now perfectly frame their contents. This eliminates awkward gaps and ensures that even detailed wind readings are displayed clearly.
- **Global Table Polish**: All primary data columns now utilize our dynamic sizing engine, resulting in the most professional and readable report layout to date.

## v2.20.77: Age Group Width Optimization
- **Intelligent Category Sizing**: The Age Group column now dynamically adjusts its width to perfectly fit the labels in your current report. This removes unnecessary whitespace while ensuring no category is ever cut off.
- **Unified Presentation**: This update brings the Age Group column into visual alignment with the Athlete Name column, creating a more professional and balanced report structure.

## v2.20.76: Athlete Width Optimization
- **Dynamic Name Fitting**: The main report now automatically calculates the ideal width for the Athlete column based on the longest name in your current view. We've increased the character spacing to 9px with a 45px margin for a cleaner, professional look.
- **Layout Stability**: Implemented a 400px maximum width guard to ensure that even exceptionally long names don't break the report layout on ultra-wide screens.

## v2.20.75: Grouped Action Restoration
- **Tucked Action Access**: We've restored the missing Edit and Delete icons for historical sub-rows in the "Newest First" view. Expanding an event now gives you full administrative control over every version in the chain.

## v2.20.74: History Expansion Restoration
- **Chronological Detail**: We've restored the individual row expansion buttons for the "Oldest First" view. You can once again trace every single archival step in chronological order.
- **Smart Adaptive Mode**: The system now perfectly switches between flat chronological lists and grouped newest-first summaries based on your personal workflow preferences.

## v2.20.73: Interactive History Sorting
- **Clickable Columns**: Every column in the Record History tab is now interactive. Click a header to instantly sort your archives by that field.
- **Smart Default Sorting**: The system now remembers your lineage grouping and defaults to showing the most recent updates on top for a faster workflow.

## v2.20.72: Grouped History & Zero Duplication
- **Clean Overview**: We've optimized the "Newest First" view to group records by event. No more seeing the same result twice!
- **Deep Historical Access**: The expansion button now unlocks the complete lineage of an event, stacking every historical change in a neatly organized sub-list.

## v2.20.71: Unified History Lineage
- **Live Version Visibility**: The Record History tab now intelligently displays current live records when using the "Newest First" sort order.
- **Perfect Continuity**: Expanding the "LIVE RECORD" row instantly reveals the previous archive, ensuring you can trace any result from its current state all the way back to its origin.

## v2.20.70: UI Stability & Sync Optimization
- **Permission Persistence**: Fixed the core issue where theme changes were resetting user permissions in the browser. You now retain access to all tabs regardless of your visual settings.
- **Improved Performance**: Optimized the cloud sync logic to be faster and more reliable, ensuring your profile is always current without unnecessary network traffic.

## v2.20.69: Logical History Expansion
- **Context-Aware Links**: The expansion rows in Record History now intelligently toggle between showing "Successors" (newer records) and "Predecessors" (older records) based on your chosen sorting order.
- **Improved Traceability**: This makes it much easier to trace a record's history backwards when using the "New Records First" view.

## v2.20.68: Cloud Settings Synchronization
- **Sync Everywhere**: Your personal settings (themes, toggle preferences, etc.) are now automatically saved to your cloud profile.
- **Instant Setup**: Logging into a new device instantly applies your preferred color palette and workflow settings.
- **Intelligent Loading**: Settings are fetched and applied immediately upon authentication, ensuring a consistent experience globally.

## v2.20.67: History Sorting Preference
- **Customizable Archive View**: Introduced a new toggle in General Settings that lets users decide the sort order of the Record History list.
- **Improved Versatility**: Defaulting to "Old first" preserves the traditional view, while switching to "New first" places the most recent edits at the top for faster access.

## v2.20.66: Maximum Mobile Compression
- **Peak Data Density**: Shrunk card margins from `0.6rem` to `0.35rem` and internal padding from `0.75rem` to `0.45rem`.
- **Tighter Information Rows**: Reduced field padding and optimized font sizes to ensure as many records as possible are visible on a single screen.
- **Optimized Mobile Flow**: Multi-line fields like Athlete name now use tighter internal spacing for a cleaner compact look.

## v2.20.65: Sticky Management Headers
- **Fixed Table Headers**: Both the column labels and the search filter row now stay perfectly fixed at the top of the "Manage Athletes" table while you scroll through the list.
- **Improved Scroll Containment**: Refined the flexbox container logic to ensure internal scrolling works reliably across all settings tabs.

## v2.20.64: Pixel-Perfect Headers & Balanced Layout
- **Uniform Header Heights**: Synchronized padding and sizing across all sections (Main, Stats, Athletes, Events) to ensure a perfectly consistent top-of-table look.
- **Balanced Athlete Columns**: Implemented a `fixed` layout for the Manage Athletes table, distributing basic info evenly while keeping the "Actions" column at a stable width.
- **Universal Sort Arrows**: Fully integrated the violet CSS-based sorting indicators into every statistics view.
- **Full Mobile Parity**: Every report and statistics table now transforms into a beautiful, aligned card layout on mobile devices.

## v2.20.63: Unified Table Styles & Sorting
- **Standardized Headers**: Consistent dark background and violet sorting arrows applied globally.
- **Global Mobile Cards**: Expanded the card-based layout with full `data-label` support to Statistics, Athletes, and Events.
- **CSS Sorting**: Transitioned from legacy arrow characters to sleek CSS-based indicators.

## v2.20.62: Compact Mobile Layout
- **Density Optimization**: Reduced padding and margins in mobile cards to fit significantly more records on screen without sacrificing readability.

## v2.20.60: Mobile Card Layout Optimization
- **Table-to-Card Transition**: Implemented the core responsive engine that converts horizontal rows into vertical cards on phones.

## [Previous Milestones]
- **Actions Column Visibility (v2.20.59)**: Role-based restriction for editing tools.
- **Dynamic Column Sizing (v2.20.58)**: Auto-adjusting Athlete and Race Name widths.
- **Cloud-Only Transition (v2.15.076)**: Firebase as the single source of truth.
