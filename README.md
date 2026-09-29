# Mora

A chat-first nutrition journal built with Expo SDK **58.0.0-preview.8**, React Native **0.88.0-rc.2**, and React **19.3.0**. This is the Expo `next` preview verified on September 29, 2026; it is not the stable SDK release.

Mora keeps food, water, activity, weight, goals, and saved meals on the device. Goals can be entered manually or estimated locally from adult measurements and activity, then reviewed before saving. AI prepares editable food drafts and tracking proposals; the user confirms before they enter the journal. iOS can import steps, active energy, and weight from Apple Health on request.

## Development

Use Node 22+, Bun, and Xcode 27 for the iOS preview. Copy `.env.example` to `.env.local` and supply the relevant credentials. Enable anonymous sign-in in your Supabase project.

```sh
bun install --frozen-lockfile
bun start
bun run ios --device <simulator-udid> --no-bundler
bun run android
bun run web
```

This app needs a development build for MMKV, audio, speech recognition, and HealthKit. Rebuild the native app after dependency or config-plugin changes. Native folders are generated and ignored by Git.

```sh
bun run check
bun run theme:check
bunx expo-doctor
bunx expo export --platform all
```

API routes run in Metro during development. Release clients need `EXPO_PUBLIC_API_BASE_URL` pointing to an Expo Router server deployment with the private environment variables configured. `eas.json` retains the existing `https://mora.expo.app` setting; this change has **not** deployed or validated that hosted backend.

## Source layout

- `src/app`: route files, layouts, and small authenticated API handlers.
- `src/screens`: full screen composition.
- `src/components/ui`: shared text, buttons, fields, and keyboard-aware screen layout.
- `src/components/chat`: composer, markdown rows, draft cards, and voice presentation.
- `src/features/chat`: bounded conversation context, persisted drafts, transcript reconciliation, and chat orchestration.
- `src/features/voice`: live audio and speech-recognition/TTS transports.
- `src/features/goals`: optional local starting-target calculator and validated equation.
- `src/features/tracking`: shared validated tracking actions.
- `src/features/health`: platform-specific, user-initiated Apple Health import.
- `src/server/ai`: prompts, request schemas, and tool definitions/execution. Never import these modules into client components.
- `src/server/nutrition`: USDA, barcode, serving conversion, and optional nutrition cache.
- `src/stores`: local journal, goals, profile, activity, and favorites.
- `src/lib`: storage, auth, network, export, and platform adapters.
- `src/theme`: generated palette plus spacing, typography, radius, and motion tokens.

See [design system](docs/design-system.md) and [verification and feature coverage](docs/verification.md).

## AI and data boundaries

Every API route validates the Supabase bearer token. Provider keys and the optional Supabase service key remain on the server. Live voice receives a single-use ephemeral token. Food history sent to chat is limited to 14 days; each model request retains at most 60 messages and an 8 MB image budget. The stored conversation retains 200 messages. Imported Health data is not automatically included in AI context; anything the user explicitly types in chat is sent to the AI service.

Food tools prepare a draft. Confirmation claims that draft once, writes a local meal, and adds an acknowledgement. Water, steps, weight, and exercise actions are validated and persisted with their confirmation IDs in one write, preventing replay after reload. Steps and weight replace the selected date's value; water and exercise add to it.

USDA values are scaled from 100 g to the actual requested portion without rounding per-gram values early. Display values and journal totals round after the eaten quantity is applied. Unsupported portions fall back to a labeled estimate instead of silently substituting another serving. Serving-qualified cache keys use exact matching and a new version namespace. The optional `food_nutrition_cache` / `food_cache_aliases` tables are the existing project's cache; missing cache tables do not prevent direct lookups. No remote schema migration was applied.

## Performance choices

Chat uses LegendList virtualization, memoized native markdown rows, 50 ms stream updates, a native keyboard-sticky composer, and bounded request/history payloads. Scrolling follows the end only when the reader is near it. Photo uploads are resized and compressed. The voice animation mounts only during voice mode, and audio stops when leaving chat or backgrounding the app. Unused Skia, FlashList, menu, pager, and legacy patches were removed.

The HealthKit 16 plugin in `plugins/with-healthkit-swift.js` supplies the private Clang module search path required by its Swift target with this Xcode/SDK combination. It changes only that pod target; retain it until the upstream package resolves the build issue.

References: [Expo SDK 58 beta](https://expo.dev/changelog/sdk-58-beta), [Margelo chat demo](https://github.com/margelo/ai-chat-demo), [Margelo chat architecture](https://margelo.com/blog/building-native-llm-chat-app-with-rag), [USDA API](https://fdc.nal.usda.gov/api-guide/).
