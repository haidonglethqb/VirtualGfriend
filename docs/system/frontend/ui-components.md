# Frontend UI Components

Radix UI primitives, TailwindCSS theming, Framer Motion animations, and data visualization.

**Reference:** `client/src/components/`

## Component Stack

| Library | Purpose |
|---|---|
| **Radix UI** | 13 accessible headless primitives |
| **TailwindCSS** | Utility-first CSS with custom theme |
| **Framer Motion** | Animations & transitions |
| **class-variance-authority** | Variant management |
| **clsx + tailwind-merge** | Conditional class merging |
| **Lucide React** | Icon library (50+ icons) |
| **Chart.js + react-chartjs-2** | Data visualization |

## Radix UI Components (13)

| Component | Usage |
|---|---|
| `Avatar` | User/character profile images with fallback |
| `Dialog` | Modal dialogs (settings, confirmations) |
| `DropdownMenu` | Context menus, user menu |
| `Toast` | Notification toasts |
| `Tabs` | Settings pages, tabbed interfaces |
| `Select` | Dropdown selections (occupation, gender) |
| `Switch` | Toggle settings |
| `Slider` | Affection level, ranges |
| `Progress` | XP bar, quest progress |
| `Tooltip` | Info tooltips |
| `Accordion` | FAQ, expandable sections |
| `AlertDialog` | Destructive action confirmations |
| `Separator` | Visual dividers |

## Utility Functions

```typescript
// lib/utils.ts — clsx + tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Framer Motion Patterns

### Page Transitions
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
```

### Typing Indicator
```typescript
<motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
  <span>•</span><span>•</span><span>•</span>
</motion.div>
```

### Level Up Modal
```typescript
<motion.div
  initial={{ scale: 0, rotate: -10 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 200 }}
>
```

## Class Variance Authority (CVA)

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: { default: 'bg-primary', destructive: 'bg-destructive', outline: 'border' },
      size: { default: 'h-10 px-4', sm: 'h-9 px-3', lg: 'h-11 px-8' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);
```

## Component Organization

```
components/
├── ui/              → Radix-based primitives (13)
├── chat/            → Chat-specific components
├── character/       → Character display & customization
├── layout/          → Header, sidebar, navigation
├── quest/           → Quest cards & progress
├── shop/            → Shop items & inventory
└── error/           → Error boundary & fallbacks
```

## Chart.js Integration

Used in analytics dashboard and leaderboard:
```typescript
import { Line, Bar } from 'react-chartjs-2';
<Line data={{ labels, datasets }} options={{ responsive: true }} />
```

## Related

- [State Management](./state-management.md)
- [Routing Structure](./routing-structure.md)
