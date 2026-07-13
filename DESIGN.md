# Design Specification - Dens Cakra

## Design Rationale & Visual Identity
Dens Cakra is a tactical executive command center dashboard. It utilizes a high-contrast dark theme with sharp, technical, and geometric aesthetics to evoke precision, trust, and operational efficiency.

## Visual Language (Tokens)
We map all UI elements to the project's CSS variables, ensuring visual consistency.

### 🎨 Color Palette
- **Primary / Accent**: `--dc-primary` (Sky Blue: `#0ea5e9` in light, `#00b7ff` in dark)
- **Success**: `--dc-success` (Green: `#16a34a` in light, `#22c55e` in dark)
- **Warning**: `--dc-warning` (Amber: `#d97706` in light, `#f59e0b` in dark)
- **Danger**: `--dc-danger` (Red: `#dc2626` in light, `#ef4444` in dark)
- **Surface/Card Backgrounds**: `--dc-card` and `--dc-surface`
- **Borders**: `--dc-border-subtle` and `--dc-border`

### 📐 Geometry & Radius
- **Border Radius**:
  - Small elements (Badges, small buttons): `var(--dc-radius-sm)` (4px)
  - Cards, default buttons: `var(--dc-radius-md)` (6px)
  - Large panels/grids: `var(--dc-radius-lg)` (8px)
- **KPI Cards Geometry**:
  - KPIs should be styled as neat, square boxes (`aspect-square`) with centered content to maintain a tight grid look, avoiding stretched rectangles.

### 📝 Typography
- **Heading Font**: Inter / Sans-serif (`var(--font-sans)`)
- **Mono / Metadata Font**: IBM Plex Mono (`var(--dc-font-metadata)`)
