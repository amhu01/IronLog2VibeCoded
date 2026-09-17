# Iron Log — React Native Rewrite

## Project

Rewrite of an existing single-file HTML/localStorage gym-tracker app ("Iron Log")
into a real native-feeling mobile app using Expo (React Native) + TypeScript.
Same core purpose and data model as the old version — not a WebView wrapper,
UI/UX can be modernized rather than copied 1:1.

## Status

Core app complete and verified (2026-09-11): storage, all five screens, and the
end-to-end Log → History → Progress → Stats flow are implemented and exercised
(see Verification log). An installable release APK has been built locally
(no EAS/Expo account) via `scripts/build-apk.sh` — see Final build.
v3 (2026-09-17) added, at the user's request after on-device use: a real app
icon, optional session names, a muscle group per exercise, an optional
machine/brand per exercise (the user trains on machines whose resistance
scales differ, so weights are only comparable on the same machine — this
drives per-machine auto-fill, Progress filtering and PBs), plus QoL: rest
timer, session volume, "NEW PR" in the save toast, and "Repeat this session".
This file is the source of truth
for plan, progress, decisions, and blockers — update it continuously as work
happens. If a session ends (out of context/tokens) or a different model picks
this up, read this file first before doing anything else.

Stack: Expo SDK 57 (React Native 0.86, React 19.2), TypeScript, React
Navigation 7 (bottom tabs + native stack for History), expo-sqlite,
expo-file-system (new `File`/`Paths` API) + expo-sharing + expo-document-picker,
react-native-svg (hand-rolled line chart, no chart lib),
@react-native-community/datetimepicker, @expo/vector-icons (Ionicons).
Entry: `index.ts` → `App.tsx` (opens DB,
then mounts `src/navigation/RootNavigator.tsx`). Code lives under `src/`
(`db/`, `screens/`, `components/`, `navigation/`, `utils/`, `types/`).

UI conventions (added 2026-09-11): dark theme with an orange accent, defined
entirely in [src/theme.ts](src/theme.ts) (`colors`/`spacing`/`radius`/`fontSize`)
— don't hardcode colours or font sizes in screens. Shared building blocks:
[ScreenHeader](src/components/ScreenHeader.tsx) (eyebrow + big title + subtitle,
used by every tab), [Card](src/components/Card.tsx) + `CardTitle` (bordered
surface panel with an uppercase micro-label), [EmptyState](src/components/EmptyState.tsx),
[Button](src/components/Button.tsx) (variants primary/secondary/danger/ghost/
ghostDanger, optional Ionicon). Exercise names are stored and displayed
UPPERCASE (see Storage).

Run: `npx expo start` then open in Expo Go. Typecheck: `npx tsc --noEmit`.

## Core data model

- Session: { date: string (YYYY-MM-DD), exercises: Exercise[] }
- Exercise: { name: string, hasBaseResistance?: boolean, baseResistance?: number, sets: Set[] }
  - hasBaseResistance/baseResistance exist for banded or assisted exercises, where the
    "effective weight" of a set = baseResistance + set.weight (e.g. a banded pull-up:
    base resistance -20kg assist + 0kg added = -20kg effective).
- Set: { weight: number | string, reps: number | string, rir?: boolean }
  - rir = true means "reps in reserve 1-2" (i.e. not to failure) — just a small tag
    shown in history.

## Screens / features to implement

1. **Log** (today's workout): pick a date, add exercises (autocomplete/picker from
   previously-used exercise names, or type a new one), add sets under each exercise
   (weight, reps). When you pick a known exercise, auto-fill the first set with the
   weight/reps used last time you did that exercise (case-insensitive name match).
   Save the session.
   - Status: done — [src/screens/LogScreen.tsx](src/screens/LogScreen.tsx) using the
     shared [SessionEditor](src/components/SessionEditor.tsx) (date field, exercise
     autocomplete, per-exercise banded/base-resistance toggle, set rows with RIR
     tag; "Add set" copies the previous set's values; auto-fill takes the first
     set of the most recent session by date for that name). The name field forces
     uppercase as you type and there's a list button next to it that opens the
     searchable [ExerciseSearchModal](src/components/ExerciseSearchModal.tsx)
     (same one Progress uses) with an "Add ＜query＞" row for new names.
     v3: optional session name field at the top (recent names offered as
     tap-to-reuse chips via `getRecentSessionNames`); each
     [ExerciseCard](src/components/ExerciseCard.tsx) has a MUSCLE GROUP chip row
     (fixed list `MUSCLE_GROUPS` in [types](src/types/index.ts)) and a
     MACHINE / BRAND text field with suggestions (machines previously used for
     that exercise first, then all machines). Adding a known exercise pre-fills
     muscle group + machine + last set from its most recent use; changing the
     machine re-fills the first set from the last session *on that machine*
     (only while the exercise still has a single set, so it never clobbers
     typed data) — `getLastUseForExercise(name, machine)` is strict when a
     machine is passed. [RestTimer](src/components/RestTimer.tsx) sits under the
     date (60/90/120 s presets, +30 s, stop, progress bar, vibrates when done —
     `VIBRATE` permission is in the manifest by default). Save runs
     `findNewPRs` *before* inserting and the toast says e.g. "NEW PR: LAT
     PULLDOWN (HAMMER STRENGTH) 70" (compared against the best on the same
     machine; a first-ever use of a machine is not a PR). The tab accepts a
     `template` route param (from History → "Repeat this session") that
     pre-fills name + exercises and is cleared with `setParams` once consumed.

2. **History**: list of past sessions (most recent first), tap to see full detail
   (exercises + sets for that day), with edit and delete.
   - Status: done — [HistoryScreen.tsx](src/screens/HistoryScreen.tsx) (list, newest
     first) → [SessionDetailScreen.tsx](src/screens/SessionDetailScreen.tsx) (read
     view showing effective weight for banded sets; Edit reuses SessionEditor;
     Delete confirms via Alert). Pressing the History tab while in a detail pops
     back to the list. v3: list rows show the session name as the title (falling
     back to the exercise list), the muscle groups hit, set count and volume
     (`getSessionsList` aggregates in three queries, not N+1); detail shows
     name/date, "N exercises · N sets · Nk volume", muscle-group/machine/base
     tags per exercise, and a "Repeat this session" button that navigates to
     the Log tab with the session as a template.

3. **Progress**: pick an exercise, see a simple line/trend chart of its effective
   weight (or best set) over time.
   - Status: done — [ProgressScreen.tsx](src/screens/ProgressScreen.tsx): a tappable
     selector row opens the searchable full-screen
     [ExerciseSearchModal](src/components/ExerciseSearchModal.tsx) (replaced the old
     horizontal chip strip, which didn't scale past a handful of exercises), then
     Best/Latest/Sessions mini-stats, a gradient-filled SVG line chart
     ([LineChart.tsx](src/components/LineChart.tsx)) of best effective weight per
     session with a session-over-session delta pill, and the per-session list
     underneath showing each session's change. v3: when an exercise has been
     done on more than one machine, a MACHINE chip row (ALL / each machine /
     NO MACHINE) filters everything below it — the filter is client-side over
     `getProgressForExercise`, which now returns `machine` and `sessionName`
     per point. The search modal shows each exercise's muscle group and has
     group filter chips.

4. **Stats**: total sessions logged, distinct exercises tracked, sessions in the
   last 7 days, weeks since first session, most-trained exercise (by session count),
   and an all-time personal best per exercise (with the date it was hit).
   - Status: done — [StatsScreen.tsx](src/screens/StatsScreen.tsx); all numbers come
     from `getStats()` in the repository (PB = highest effective weight, ties keep
     the earliest date; "last 7 days" = today and the 6 days before it, local dates).
     v3: PBs are per (exercise, machine) — the same lift on two machines is two
     rows, the machine shown under the name — and a "Sets by muscle group" card
     with a 7 DAYS / ALL toggle draws bars from `setsByMuscleGroup*` (untagged
     sets counted separately).

5. **Backup**: export all data to a JSON file using the device's real share/save
   sheet (expo-file-system + expo-sharing — NOT a browser-style forced download,
   this needs to actually produce a file the user can save to Drive/Files/etc.),
   and import/restore from a picked JSON file (expo-document-picker), merging or
   replacing existing data (ask the user which).
   - Status: done — [BackupScreen.tsx](src/screens/BackupScreen.tsx). Export writes
     `iron-log-backup-YYYY-MM-DD.json` (a plain `Session[]` array without ids)
     to the cache dir via the new expo-file-system `File` API and hands it to
     `Sharing.shareAsync` (real OS share/save sheet). Import uses
     expo-document-picker, validates the shape (also accepts `{ sessions: [...] }`
     for old-app exports), then asks Merge / Replace all via Alert. v3: the file
     also carries `name` per session and `muscleGroup` / `machine` per exercise
     (all optional on import, uppercased like the DB).

## Storage

Local-first, no backend/account/sync — intentionally a personal, offline app.
Use expo-sqlite or AsyncStorage for persistence (pick whichever fits this data
shape better) — must survive app updates reliably. This was the #1 pain point
in the old HTML version, so this is the highest-priority thing to get right and
verify thoroughly before building screens on top of it.

- Decision: expo-sqlite. Reasoning: the data model is relational (sessions →
  exercises → sets) and Progress/Stats need real queries (per-exercise history
  sorted by date, case-insensitive name matching, best-set/PB calculation,
  distinct-exercise counts) that would mean loading and scanning the entire
  dataset into memory on every screen with AsyncStorage. SQLite gives indexed
  queries for these directly and is the more robust choice for surviving app
  updates reliably (the stated #1 pain point). Schema: `sessions(id, date,
  name)`, `session_exercises(id, session_id, name, muscle_group, machine,
  has_base_resistance, base_resistance, position)`, `sets(id,
  session_exercise_id, weight, reps, rir, position)`. `name` / `muscle_group` /
  `machine` were added in v3 as `TEXT NOT NULL DEFAULT ''` via
  `addColumnIfMissing` (checks `PRAGMA table_info` then `ALTER TABLE ADD
  COLUMN`) so databases from earlier builds upgrade in place — keep every
  future schema change additive like this; never drop/recreate tables. Blank
  string means "not set". weight/reps stored as TEXT to preserve the `number | string`
  data model, converted to number on read when the string is numeric. See
  [src/db/database.ts](src/db/database.ts) and [src/db/repository.ts](src/db/repository.ts).
- Exercise names are normalised to UPPERCASE on write (`draftsToExercises` in
  [sessionDraft.ts](src/utils/sessionDraft.ts), and on import in BackupScreen), and
  `openAndMigrate` runs `UPDATE session_exercises SET name = UPPER(name) WHERE name
  <> UPPER(name)` on every open to fold rows written before that rule. The
  migration is idempotent and touches only the name column. All the lookup queries
  were already `COLLATE NOCASE`, so this is cosmetic consistency rather than a
  correctness fix — it stops the same lift appearing under two spellings in the
  exercise list.
- Status: done

## Possible additions (nice to have, don't block core functionality)

- ~~Rest timer between sets (60/90/120s presets)~~ done in v3
- Bodyweight tracking with its own trend chart
- Workout templates (save an exercise list as a reusable routine) — partly
  covered by "Repeat this session" from History (v3); a named, editable
  routine library is still open
- ~~Total volume (sets × reps × weight) per session~~ done in v3 (per week
  still open)
- ~~A small "New PR" toast when a logged set beats the stored all-time best~~
  done in v3 (per machine)

## Constraints

- TypeScript, Expo managed workflow (runs via Expo Go for testing, buildable to
  a real APK/IPA later via EAS).
- No backend, no auth, no cloud sync. Local single-user tool — don't
  over-engineer state management or add speculative config options.
- Core flow that must work end to end before considering this done:
  Log → History → Progress → Stats.

## Verification log

(Append an entry here every time something is verified working — what was
tested and how, not just "looks fine". e.g.:
"Storage verified: wrote 3 sessions via expo-sqlite, restarted dev server,
confirmed all 3 persisted correctly with exact same values.")

- Storage verified (2026-09-11): compiled src/db/database.ts + src/db/repository.ts
  with esbuild and ran them against a real SQLite engine (better-sqlite3) behind
  a shim matching expo-sqlite's async API (execAsync/runAsync/getAllAsync/
  getFirstAsync/withTransactionAsync), in an isolated scratch dir outside the
  project. Verified: createSession/updateSession/deleteSession round-trip exact
  values; case-insensitive exercise name matching (getLastUseForExercise,
  getAllExerciseNames, getProgressForExercise all matched "Bench Press" /
  "bench press" / "BENCH PRESS" as one exercise); effective-weight calc for
  banded exercise (baseResistance -20 + set.weight 0 = -20) correct in
  getProgressForExercise and getStats personal-bests; getStats totals
  (sessionsLast7Days, mostTrainedExercise by distinct session count,
  weeksSinceFirstSession) matched hand-computed expected values; exportAllSessions
  round-trips to valid Session[] JSON; mergeData and replaceAllData both produced
  the correct resulting session counts. Then ran a second, separate Node process
  reopening the same on-disk SQLite file (no shared memory/cache with the first
  process) to simulate an app restart — all 2 remaining sessions and their exact
  set values (weight/reps) were intact. This exercises the real schema and SQL
  logic exactly as written in the app; the only untested layer is expo-sqlite's
  own native binding, which isn't reachable without a device/emulator in this
  environment (see Blockers).
- Typecheck verified (2026-09-11): `npx tsc --noEmit` clean (strict mode) after
  every batch of changes, including the final SafeAreaView swap.
- Bundle verified (2026-09-11): `npx expo export --platform android` produced a
  Hermes bundle from all 1042 modules with no errors (every import resolves,
  all native-module JS entry points present). `npx expo-doctor`: 21/21 checks
  passed (all deps compatible with SDK 57).
- Dev server verified (2026-09-11): `CI=1 npx expo start`, then requested
  `index.bundle?platform=android&dev=true` → HTTP 200, 5.8 MB, 1201 modules,
  no Metro error payload. The only log ERROR is React Native DevTools' optional
  debugger binary failing to launch because this headless container lacks
  `libatk-1.0.so.0` (a GTK desktop lib) — unrelated to the app.
- Pure logic verified (2026-09-11): compiled `src/utils/sessionDraft.ts` and
  `src/utils/date.ts` with esbuild and asserted: name trimming, blank set/blank
  exercise dropping, numeric strings → numbers while `"BW"` stays a string,
  banded toggle → `hasBaseResistance: true, baseResistance: -20`,
  exercise → draft round-trip, empty sets → one blank draft row, unique keys.
- Screens verified end to end (2026-09-11): built a throwaway jest-expo +
  @testing-library/react-native harness in the session scratchpad (NOT in the
  repo) that mounts the real `App` (real DB layer through the expo-sqlite shim
  above, real navigators, real screens) and only mocks the native pieces (date
  picker, SVG primitives, file/share/document-picker). One scripted run drove:
  Log — add "Bench Press", enter 60×8, "Add set" copies 60/8, change to 65×6 +
  RIR, add "Banded Pull-up", toggle banded, base −20, 0×10, Save → banner
  "Saved session for <today>", form resets; typing "bench" lists the "Bench
  Press" suggestion, picking it auto-fills 60/8; date picker → 2026-09-01 saved
  with Bench 55×8; 2026-09-05 saved with 57.5×8 (inserted last but dated
  earlier); adding Bench again auto-fills 60/8 (most recent by DATE, not by
  insertion). History — rows in order today, 09-05, 09-01 with
  "Bench Press, Banded Pull-up" subtitle; detail shows "60 × 8", "65 × 6 · RIR",
  "Banded Pull-up (base -20)", "0 × 10 (effective -20)"; Edit pre-fills all
  values, changing set 1 to 61 and saving shows "61 × 8" with the other sets
  intact; deleting the 09-05 session (Alert → Delete) removes only that row.
  Progress — first chip "Banded Pull-up" selected showing −20×10; "Bench Press"
  chip shows 65×6 (today, best of 61/65) and 55×8, no 57.5 (deleted); chart
  polyline has 2 points with the 65 plotted higher than the 55, 2 dots. Stats —
  Total sessions 2, Exercises tracked 2, Last 7 days 1, Weeks training 1,
  "Bench Press — 2 sessions", PBs Banded Pull-up −20×10 and Bench Press 65×6
  both dated today. Backup — Export wrote `file:///cache/iron-log-backup-
  <today>.json`, called `shareAsync` once with mimeType application/json; the
  file parsed to 2 sessions (ascending by date, no `id`, exact set values,
  banded flags preserved). Import of a 1-session file with "Merge" → History
  shows 3 rows incl. "Squat"; import again with "Replace all" → History shows
  only that 1 row; importing `{"nope":1}` → "Import failed … JSON array" alert
  and data untouched. All assertions passed (re-run after the SafeAreaView
  change; see Blockers for how to recreate the harness).
- Native project generation verified (2026-09-11): `CI=1 npx expo prebuild
  --platform android --no-install` exited 0, produced `android/` with
  `namespace`/`applicationId com.amirhusni.ironlog` in `app/build.gradle` and a
  39-line autolinked `settings.gradle`; only warning was the (now fixed)
  missing `expo-system-ui` for `userInterfaceStyle`. Folder deleted afterwards.
- Final checks after the last dependency change (expo-system-ui added, jest
  dev deps removed): `npx tsc --noEmit` clean, `npx expo-doctor` 21/21, and
  `npx expo export --platform android` bundled without errors.
- Local release APK verified (2026-09-11): `./gradlew assembleRelease` (run in
  three stages, see Final build) exited 0 → `app-release.apk`, 31.6 MiB.
  `apksigner verify` passes (signed with the generated debug keystore, so it
  installs as an update over itself and keeps data); `aapt dump badging` shows
  package `com.amirhusni.ironlog` 1.0.0, label "Iron Log", minSdk 24,
  targetSdk 36, native-code arm64-v8a only. Not yet run on a phone.

- UI overhaul + uppercase names verified (2026-09-11): `npx tsc --noEmit` clean and
  `npx expo export --platform android` bundled to a 2.8 MB Hermes bundle with exit 0
  (confirms the new `@expo/vector-icons` import resolves). Logic verified against a
  real SQLite engine via the better-sqlite3 shim, seeding a database the way the
  *old* build wrote it (rows literally named "Bench Press", "bench press",
  "Banded Pull-up") and then opening it through `getDb()`: all names came back
  ["BANDED PULL-UP","BENCH PRESS"], every set value survived untouched
  (60×8, 65×6 RIR, banded base −20 with 0×10), `getLastUseForExercise('bench press')`
  still resolved to 62.5×8, `getProgressForExercise('BeNcH pReSs')` still merged both
  original spellings into one 2-point series, a newly written session stored
  "INCLINE DUMBBELL PRESS" uppercase and folded into the same BANDED PULL-UP series
  as the old row, stats/PBs all reported uppercase names, and a second pass found 0
  rows still needing folding (migration is idempotent). One assertion failed on the
  first run and was my test's fault, not the app's: BENCH PRESS and BANDED PULL-UP
  were tied at 2 sessions and the documented `name ASC` tie-break correctly picked
  BANDED PULL-UP.

- APK rebuild verified (2026-09-11, second build): `scripts/build-apk.sh` exit 0 in
  ~9 min wall clock (stages 3m16s / 58s / 4m31s — slower than a pure-JS rebuild
  because `@expo/vector-icons` pulls in `expo-font`, a native module that had to be
  autolinked and compiled). `iron-log.apk` 34 MiB (was 32), `apksigner verify`
  passes, badging still `com.amirhusni.ironlog` 1.0.0 arm64-v8a "Iron Log". Checked
  the icon font actually ships: the APK contains 19 `.ttf` files under `res/` with
  minified names (AAPT resource optimisation renames them, so grepping for
  "Ionicons.ttf" finds nothing and is NOT evidence of a problem) — reading the
  internal font names shows `res/CU.ttf => Ionicons`, and the JS bundle references
  Ionicons. Delivered to the user zipped (19 MiB) because 34 MiB exceeds the 30 MiB
  chat upload cap.
- v3 features verified (2026-09-17): `npx tsc --noEmit` clean. Same
  better-sqlite3 shim harness (rebuilt in the scratchpad; an earlier attempt
  accidentally wrote `verify3.js` + `compiled/` into the project root because
  the scratch dir had been cleaned — moved out, nothing committed). 23 checks
  against a database seeded with the *v2 installed build's* schema (no name/
  muscle_group/machine columns): opening it added the three columns, old
  sessions read back with blank name/tags and identical sets (60×10, 65×8 RIR,
  banded −20 with 0×10); `draftsToExercises` uppercases muscle group + machine
  and omits blank ones; `createSession(date, exercises, '  Pull Day ')` stores
  the trimmed name and tags; `getExerciseCatalog` returns the newest muscle
  group and the machine list per exercise; `getLastUseForExercise('lat
  pulldown')` picks the newest use (HAMMER STRENGTH 70×10), with `''` picks the
  no-machine 62.5×10, with an unknown machine returns null; progress points
  carry machine + session name; `findNewPRs` flagged 66 on no-machine (beats
  65) and banded −10 (beats −20) but NOT 69 on HAMMER STRENGTH (below 70) nor a
  first-ever use on TECHNOGYM; PBs came out split per machine; muscle split
  counted 4 untagged + 2 BACK; the History aggregate matched hand-computed set
  counts and volumes (e.g. 70×10 + 55×12 = 1360); export → replaceAllData →
  export was byte-identical; updateSession with a name round-trips; a second
  open (fresh require) is a no-op.
- App icon generated (2026-09-17): SVG barbell rasterised with `sharp` in the
  scratchpad into all six `assets/*.png` (icon 1024², adaptive
  foreground/background/monochrome, splash, favicon). Visually checked
  `icon.png`. `expo prebuild` re-run so the new launcher webp files landed in
  `android/app/src/main/res/mipmap-*` (md5 of `ic_launcher_foreground.webp`
  changed; `colors.xml` now carries `#0b0d12`).

## Blockers / known issues

(Document anything infeasible, any fallback taken instead of the original
plan, or anything left unfinished, with reasoning.)

- No device/emulator/simulator is available in this environment, so
  expo-sqlite's native binding itself (as opposed to the SQL/schema logic)
  cannot be exercised directly here. Fallback: verified the schema and all
  repository query/mutation logic against a real SQLite engine via a shim
  (see Verification log), and separately confirmed the Metro bundle builds and
  the dev server serves it with no import/runtime errors. The user should do
  one real on-device
  smoke test (log a set, restart Expo Go, confirm it's still there) after
  pulling this to be fully sure of the native layer, though this is very
  unlikely to differ from the verified SQL logic since expo-sqlite is a thin
  wrapper over the standard SQLite C library.
- The UI verification harness is intentionally not committed (the brief said no
  formal test suite) and its dev deps were removed again after use to keep
  `package.json` lean for EAS. To recreate it: `npx expo install jest-expo jest
  @testing-library/react-native -- --save-dev`, use `preset: 'jest-expo'`, mock
  `expo-sqlite` with a better-sqlite3-backed object exposing
  `openDatabaseAsync/execAsync/runAsync/getAllAsync/getFirstAsync/
  withTransactionAsync`, mock `react-native-safe-area-context` with
  `require('react-native-safe-area-context/jest/mock').default`, and stub
  `@react-native-community/datetimepicker`, `react-native-svg`,
  `expo-file-system`, `expo-sharing`, `expo-document-picker`. Note RNTL 14:
  `render()` and every `fireEvent.*` return Promises and must be awaited;
  `UNSAFE_getAllByType` is gone (use `getAllByRole('switch')`).
- React Native 0.86 deprecates its built-in `SafeAreaView`; screens use
  `react-native-safe-area-context`'s (`edges={['top']}` under the tab bar,
  plain `View` inside the History stack whose header owns the top inset).
- Progress chart is a minimal hand-rolled SVG line chart (no charting library)
  to avoid third-party compatibility risk on the very new RN 0.86 / React 19.
- The Android package id / iOS bundle id are set to `com.amirhusni.ironlog` in
  app.json (required by EAS). Change before publishing if you want a different id.
- `CI=1 npx expo prebuild --platform android --no-install` over an EXISTING
  `android/` dir does NOT merge — it printed "Clearing android" and recreated
  the folder from scratch (learned 2026-09-17 while refreshing the icon), which
  throws away the CMake/Gradle build outputs and forces the full ~20-min native
  build. That's the only way to get new icons/splash/app.json config into the
  native project, so budget for it when assets or `app.json` change; for
  JS/TS-only changes never re-run prebuild. `scripts/build-apk.sh` re-applies
  the `gradle.properties` memory tweaks with `sed` on every run, so a fresh
  `android/` is fine for it.
- `expo-splash-screen` is not installed (not pulled in by `expo` in this SDK
  setup), so the splash is just the dark `backgroundColor`; `assets/splash-icon.png`
  exists for whenever the plugin is added
  (`npx expo install expo-splash-screen`, then a `["expo-splash-screen", {...}]`
  entry in app.json plugins, then prebuild).

## Final build

- Local APK: **built 2026-09-11** — `iron-log.apk` at the project root
  (gitignored via `*.apk`), 31.6 MiB, arm64-v8a, signed with the debug
  keystore (fine for sideloading; generate a real keystore only if you ever
  publish to the Play Store). Built with `scripts/build-apk.sh`, which needs
  no Expo account. Rebuild after code changes with the same script: with the
  native project and Gradle caches warm it's ~3-5 min (only the JS bundle and
  packaging rerun); a cold Codespace is ~25-30 min plus a ~2.5 GB SDK download.
- What the script does (so it can be redone by hand): installs Android
  cmdline-tools + platform 36 / build-tools 36.0.0 / NDK 27.1.12297006 /
  CMake 3.22.1 into `~/android-sdk` if missing; adds an 8 GB swapfile at
  `/tmp/swapfile` (needs passwordless sudo, which Codespaces has); runs
  `expo prebuild --platform android` if `android/` is missing (restoring
  package.json afterwards because prebuild rewrites the `android`/`ios`
  scripts); writes `android/local.properties`; patches
  `android/gradle.properties` to `reactNativeArchitectures=arm64-v8a`,
  `-Xmx1536m`, `org.gradle.parallel=false`, `org.gradle.workers.max=1`,
  `kotlin.compiler.execution.strategy=in-process`; then runs
  `:expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]`,
  `:app:buildCMakeRelWithDebInfo[arm64-v8a]` and `assembleRelease` as three
  separate `--no-daemon` Gradle runs. JDK: sdkman's 21 (Gradle 9.3.1 + AGP
  8.12 are fine with it; JDK 25 is also present but untested).
- Why the staging/memory tweaks: the first plain `assembleRelease` on this
  2-core / 8 GB Codespace died with "Gradle build daemon disappeared
  unexpectedly" during the C++ compile (OOM-killed, no swap). Swap + the caps
  + one JVM per heavy stage fixed it; stage times were 2 min / 4.5 min / 12 min.
- Installing on the phone: get `iron-log.apk` onto the phone (the file is over
  the 30 MiB chat-upload cap, so send it zipped — it compresses to ~16 MiB
  because the .so files are stored uncompressed — or download it from the
  Codespace file explorer), open it, allow installs from that source.
  Re-installing a newer build over it keeps the SQLite data.
- EAS (cloud) build: still an option and everything is configured for it
  (`eas.json` `preview`/`production` profiles both produce an APK;
  `app.json` has `android.package com.amirhusni.ironlog` and the config
  plugins), but it requires an Expo login, so it was not run. Steps if wanted:
  `npx eas-cli login` → `npx eas-cli init` → `npx eas-cli build --platform
  android --profile preview`; say yes if it offers to generate a keystore.
