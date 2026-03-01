# Walkthrough - Celestial Plasma

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
