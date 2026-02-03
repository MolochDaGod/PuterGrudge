# Design Guidelines: Network AI Monitoring Dashboard

## Design Approach
**Reference + System Hybrid**: Drawing from modern monitoring platforms (Grafana, Datadog, Linear) with Material Design principles for data-heavy interfaces. Focus on information density, real-time updates, and AI-assisted analysis.

## Layout System

**Spacing Units**: Tailwind primitives of 2, 3, 4, 6, 8, 12 (p-2, m-4, gap-6, etc.)

**Dashboard Structure**:
- Fixed sidebar (w-64) for navigation and quick stats
- Main content area with flexible grid layout
- AI assistant panel (collapsible, w-96) on right side
- Top status bar (h-16) showing connection status and critical alerts

## Typography Hierarchy

**Font Family**: 
- Primary: Inter (Google Fonts) for UI and data
- Monospace: JetBrains Mono for logs, commands, and technical output

**Hierarchy**:
- Page titles: text-2xl font-semibold
- Section headers: text-lg font-medium  
- Card titles: text-base font-medium
- Body text: text-sm
- Technical data/logs: text-xs font-mono
- Labels: text-xs uppercase tracking-wide

## Component Library

**Sidebar Navigation**:
- Dashboard overview, Network Monitor, Docker Containers, Process Monitor, Storage Analysis, AI Assistant sections
- Icon + label layout with active state indicator (left border accent)
- Compact spacing (py-2, px-4)

**Dashboard Cards**:
- Elevated cards with rounded corners (rounded-lg)
- Header with icon, title, and action button
- Content area with appropriate data visualization
- Footer with timestamp/metadata (text-xs)
- Padding: p-4 to p-6

**Real-time Activity Feed**:
- Scrollable log viewer with monospace font
- Alternating row treatment for readability
- Color-coded entries (info/warning/error states)
- Timestamp prefix on each entry
- Auto-scroll toggle control

**Network Visualization**:
- Connection map showing active network interfaces
- Live traffic indicators with pulse animations (minimal, subtle)
- Grid layout for multiple network adapters (grid-cols-2 lg:grid-cols-3)

**Docker Container Grid**:
- Card-based layout showing each container
- Status badge (running/stopped/error)
- Resource usage bars (CPU, memory)
- Quick action buttons (inspect, logs, stop/start)
- Grid: grid-cols-1 md:grid-cols-2 xl:grid-cols-3

**Storage Breakdown**:
- Tree map or horizontal bar chart showing drive usage
- Drill-down capability to explore directories
- Size indicators and percentage labels
- Largest file/folder highlights

**AI Assistant Interface**:
- Chat-style interface at bottom of panel
- Insights cards above chat showing AI-generated findings
- Input field with send button and voice input option
- Message bubbles: user (right-aligned) vs AI (left-aligned)
- Suggested prompts as clickable chips

**Status Indicators**:
- Connection status: dot indicator + text label
- Resource meters: horizontal progress bars with labels
- Alert badges: pill-shaped with count
- System health: large radial gauge on dashboard overview

**Data Tables**:
- Sortable headers with arrow indicators
- Row hover states for interactivity
- Alternating row backgrounds for scannability
- Fixed header when scrolling
- Action menu (three-dot) in last column

## Visual Treatments

**Elevation & Depth**:
- Cards: shadow-sm with hover:shadow-md transition
- Modals: shadow-2xl
- Dropdowns: shadow-lg

**Borders & Dividers**:
- Card borders: border with subtle treatment
- Section dividers: border-t or border-b
- Input fields: border with focus ring

**Interactive States**:
- Buttons: transform scale-95 on active
- Links: underline decoration on hover
- Cards: slight elevation change on hover (monitoring cards only)

**Animations**: 
- Pulse effect for live data indicators (animate-pulse, very subtle)
- Fade-in for new log entries
- Smooth transitions (transition-all duration-200)

## Dashboard-Specific Patterns

**Overview Dashboard**:
- 4-column metric cards at top (grid-cols-4)
- 2-column layout below: left (network activity), right (AI insights)
- Bottom row: Recent alerts and quick actions

**Detail Views**:
- Breadcrumb navigation
- Split view: list/tree on left (w-1/3), details on right (w-2/3)
- Sticky headers for long scrolling content

**Empty States**:
- Centered icon + message
- Helpful suggestions or setup instructions
- Primary action button to get started

## Accessibility
- Focus visible rings on all interactive elements
- ARIA labels for icon-only buttons
- Screen reader announcements for real-time updates
- Keyboard shortcuts for common actions (displayed in tooltip)
- High contrast mode support

This technical monitoring interface prioritizes data density, real-time visibility, and AI-powered insights while maintaining clarity and usability.