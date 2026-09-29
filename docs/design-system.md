# Mora design system

Mora keeps the project's blue accent, Satoshi body text, and Sentient editorial headings. The app opens in conversation; Today and Progress provide the supporting journal and longer view.

## Tokens

`globals.css` is the palette source for light and dark modes. Run `bun run theme:generate` after changing it; `bun run theme:check` detects drift in `src/theme/colors.ts`. Do not hand-edit the generated file.

Use `useTheme()` for native styles and semantic utility classes for Uniwind. Use `background`, `card`, `muted`, `foreground`, `mutedForeground`, `border`, `primary`, `onPrimary`, `danger`, and `success` according to their purpose. Primary buttons always pair `primary` with `onPrimary`, including in dark mode. Settings supports explicit Light/Dark and System appearance.

`src/theme/index.ts` defines spacing (4, 8, 12, 16, 24, 32, 48), radii (8, 12, 20, 28, pill), typography, and motion durations. Use 24-point screen gutters, 16-point card padding, 48-point buttons, and at least 44-point icon targets.

| Role            | Typeface | Size / line height |
| --------------- | -------- | ------------------ |
| Hero            | Sentient | 38 / 48            |
| Screen title    | Sentient | 28 / 36            |
| Section heading | Satoshi  | 20 / 28            |
| Body            | Satoshi  | 16 / 24            |
| Chat            | Sentient | 16 / 26            |
| Label           | Satoshi  | 14 / 20            |
| Caption         | Satoshi  | 12 / 18            |

## Components and behavior

Use `Text`, `Button`, `Field`, and `Screen` from `components/ui`. Screens provide safe-area spacing and native keyboard insets. Fields have persistent visible labels. Destructive changes use a confirmation where the action removes journal data. Icon-only controls need a descriptive accessibility label; selected tabs and disabled/busy controls expose their state.

Use open spacing for daily totals and section dividers for lists. Reserve cards for chat drafts, confirmations, input, and grouped controls. Food corrections stay editable: serving count, serving description, name, meal, calories, macros, fiber, sugar, and sodium. Distinguish estimates from database values.

Chat keeps the composer anchored above the keyboard. Streaming has a stop action; failures retain the conversation and offer retry. Food confirmations appear above the composer. Tracking confirmations appear beside their conversation turn and remain visibly saved or dismissed. Starting a new chat preserves the journal and favorites.

Do not frame food as good/bad or add an invented health score. Use neutral progress language. Do not imply an AI estimate is a measured result or that a draft was saved before confirmation.
