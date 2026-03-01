# Walkthrough - Celestial Plasma

## v2.20.86: Complete History Control
- **Full-Field History Editing**: Your historical records now show every detail (Wind, Location, Notes, etc.) when you click Edit or View. No more missing data in the edit window!
- **Date-First Sorting**: The archive now intelligently defaults to showing the most recent performances at the top, helping you find your latest updates faster.
- **Enhanced Filter Tracking**: Added behind-the-scenes logging to ensure your archives are always easy to search.

## v2.20.85: Reliable Records Research
- **Variable Conflict Resolution**: Fixed a deep-seated bug where the "Record History" filters remained empty due to a conflict with browser-reserved names. Filters now populate instantly with all available archive data.
- **Tighter Header Design**: Reduced excessive vertical space in the archive tab, ensuring your filters and data are the focus.

## v2.20.84: Ultimate History Refinement
- **Standardized Archive Interface**: The Records History tab now looks and feels like the rest of the app, using the same spacing and design components as the main report.
- **Fail-Safe Filters**: Re-engineered the archive filters to be far more robust. They now handle your historical data with 100% reliability and feature crystal-clear labeling.

## v2.20.83: History Filter Refinement
- **Data-Driven Filters**: Corrected the technical logic for the history archive filters. Dropdowns now correctly list all available athletes, events, and years from your records.
- **Tighter Layout**: Refined the spacing of the archive section to ensure more data is visible without unnecessary vertical scrolling.

## v2.20.82: Advanced History Filtering
- **6-Way Archive Research**: Added a new filter bar to the Records History tab. You can now drill down through the entire archive by Event, Athlete, Gender, Age Group, Record Year, and Archive Date.
- **Dynamic Filter Synchronization**: The filters update intelligently based on your current selection, ensuring you only see valid available options in the archive.

## v2.20.81: WMA Statistics Restoration
- **Variable Correction**: Fixed a technical error in the statistics engine where the WMA report was looking for the wrong internal identifiers. This correction immediately restores the visibility of all WMA points and calculations.

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

## [Previous Milestones]
- **Actions Column Visibility (v2.20.59)**: Role-based restriction for editing tools.
- **Dynamic Column Sizing (v2.20.58)**: Auto-adjusting Athlete and Race Name widths.
- **Cloud-Only Transition (v2.15.076)**: Firebase as the single source of truth.
