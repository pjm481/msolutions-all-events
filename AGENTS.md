# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a React 18 single-page application built with Vite. It runs as a Zoho CRM embedded app and provides an "All Events" style activity browser and editor over the Zoho `Events` module.

The app:
- Initializes the Zoho embedded app (`ZOHO.embeddedApp.init`) and reads the current user.
- Fetches and paginates CRM Events from Zoho via a named connection.
- Applies date, user, type, priority, and status filters.
- Lets users create, edit, and clear activities, including recurring events and reminders.

## Key commands

Use any Node-compatible package manager; commands below assume `npm`:

- Install dependencies:
  - `npm install`
- Run dev server (Vite):
  - `npm run dev`
- Build production bundle:
  - `npm run build`
- Lint the codebase (ESLint 9):
  - `npm run lint`
- Preview production build locally:
  - `npm run preview`

### Tests

As of now there is no `test` script in `package.json` and no obvious test runner configuration. Before writing or running tests:
- Add a test runner (e.g. Vitest or Jest) and scripts in `package.json`, then document the exact commands here.

## High-level architecture

### Entry point and application shell

- `src/main.jsx`
  - Standard Vite/React entry: creates the React root and renders `<App />` inside `<StrictMode>`.
- `src/App.jsx`
  - Defines `ZohoContext` (React Context) and acts as the main application controller.
  - Owns global state: `events`, `users`, `filterDate`, `customDateRange`, `recentColors`, `loggedInUser`, a per-filter cache, and loading flags.
  - Initializes Zoho Embedded App once on mount, then calls `ZOHO.CRM.CONFIG.getCurrentUser()` to populate `loggedInUser`.
  - Contains the main data-fetching `useEffect` that reacts to `zohoLoaded`, `filterDate`, `customDateRange`, and `cache`.
  - Renders a full-screen MUI `CircularProgress` while loading, otherwise renders `ActivityTable` and a `DateRangeModal`.

### Zoho data access and date handling (App layer)

- Data fetching in `App.jsx`:
  - Computes a `[beginDate1, closeDate1]` pair based on `filterDate`:
    - "Default" → from the start of the previous month through 1 year into the future.
    - Named windows like "Last 7 Days", "Last 30 Days", "Last 90 Days", "Last Month", "Current Week", "Current Month", "Next Week".
    - "Custom Range" → explicit `[startDate, endDate]` chosen via date pickers.
    - "All" → hard-coded from `2023-01-01` to now.
  - Converts these boundaries into UTC ISO strings and then into hard-coded `+11:00` offset strings for the CRM query.
  - Paginates API calls using `ZOHO.CRM.CONNECTION.invoke("zoho_crm_conn", req_data_meetings)` until `more_records` is false or a page limit is reached.
  - Deduplicates events by `id`, sorts by `Start_DateTime`, and caches results per `filterDate` key.

- Additional App-level responsibilities:
  - Fetches an org variable `recent_colors` via `ZOHO.CRM.API.getOrgVariable("recent_colors")` and exposes it via context.
  - Fetches the list of CRM `users` via `ZOHO.CRM.API.getAllRecords({ Entity: "users" ... })`.
  - Emits verbose diagnostic logs to `http://127.0.0.1:7243/ingest/...` for date and pagination debugging (safe to remove or gate behind flags in future changes).

### Presentation and filtering layer

- `src/components/ActivityTable.jsx`
  - Main grid/table view for activities, built on MUI `Table` + `TableSortLabel`.
  - Transforms raw CRM `Events` into flat row objects via `createData(event, type)`:
    - Normalizes `Start_DateTime`/`End_DateTime` into display `date` (`DD/MM/YYYY`), `time` (`HH:mm`), and calculated `duration`.
    - Resolves `scheduledFor` (owner), `associateWith` (account/related record), participants array, and `Event_Status`.
  - Exposes a rich filter bar above the table:
    - Date range selector bound to `filterDate` and `customDateRange`.
    - Multi-select `Type` and `Priority` filters.
    - Multi-select `User` filter with "Select All" / "Deselect All" pseudo-options.
    - "Show Cleared" toggle tied to `Event_Status` (e.g., excludes `Closed` by default).
    - "Create New Activity" button to open `CreateActivityModal`.
  - Converts `events` → `rows` using `createData`, then derives `filteredRows` via `useMemo` by applying type/priority/user/date/status filters.
  - Delegates coarse date range logic to `isDateInRange` from `helperFunc.js`, while handling custom ranges itself using Day.js.
  - Manages selection and row highlighting; single-click selects, double-click loads full record details from Zoho and opens the edit modal.
  - Renders linkified participants that deep-link to Zoho CRM contact records.

- Helper utilities:
  - `src/components/helperFunc.js`
    - `safeParseDateString` and `isDateInRange(rangeType)` implement the shared date-range semantics using Day.js in UTC.
    - Defines `typeOptions`, `activityResultMapping`, and helper functions to map between high-level activity types, result strings, and "Regarding" options.
    - Centralizes reminder mappings (`reminderMapping`) used when constructing reminder payloads.

### Modals and CRUD operations

All modals live under `src/components` and are wired from `ActivityTable` and `App`:

- `CreateActivityModal.jsx`
  - Multi-step (tabbed) MUI-based modal used to create new `Events` records.
  - Uses `FirstComponent`, `SecondComponent`, and `ThirdComponent` to split form fields into logical sections (general info, description/details, recurrence & reminders).
  - Maintains a `formData` object that contains both raw UI state (e.g. `start`, `end`, `scheduledWith`) and CRM-specific fields.
  - Core transformation logic is in `transformFormSubmission(data, individualParticipant?)`:
    - Converts local start/end values into Zoho `Start_DateTime` / `End_DateTime` strings with explicit timezone offsets.
    - Builds `Participants` from `scheduledWith` or an individual participant when `Create_Separate_Event_For_Each_Contact` is enabled.
    - Assembles `Recurring_Activity.RRULE` strings based on `occurrence` and inferred end dates.
    - Calculates `Remind_At` / `User_Reminder` fields from `Reminder_Text` using `calculateRemindAt`.
    - Cleans out transient form-only fields (e.g. `scheduledWith`, `start`, `end`, `duration`) and strips null/undefined values.
  - `handleSubmit` path:
    - Either loops over participants to create separate records or creates a single event.
    - Uses `ZOHO.CRM.API.insertRecord({ Entity: "Events", APIData: transformedData, Trigger: ["workflow"] })`.
    - On success, prepends the created event into the `events` state and updates `selectedRowIndex` / `highlightedRow` so the new event is visible in the table.
    - Logs detailed payload/result information into a custom `Log_Module` via `logResponse`, including metadata like `Trigger`, `Meeting_Type`, and `Widget_Source`.

- `EditActivityModal.jsx`
  - Similar structure and transformations to `CreateActivityModal`, but initialized from an existing `Events` record.
  - Fetches the latest record details via `ZOHO.CRM.API.getRecord({ Entity: "Events", RecordID: id, approved: "both" })` when an event is double-clicked.
  - On successful save, updates the in-memory `events` array via the `updateEvent` callback, preserving client-side sort/filter behavior.

- `ClearActivityModal.jsx`
  - Triggered from the checkbox in the first column of the table.
  - Fetches record details via `ZOHO.CRM.API.getRecord` (when an `id` is present) and allows marking an event as "cleared"/"closed".
  - On success, updates `events` to reflect new status and keeps selection/highlighting in sync.

### Atom components and reusable inputs

Atom components under `src/components/atom` encapsulate Zoho-aware input widgets and small UI building blocks. Key ones include:

- `AccountField.jsx`
  - Autocomplete field for associating an event with an `Accounts` record.
  - Uses debounced `ZOHO.CRM.API.searchRecord({ Entity: "Accounts", Type: "word", Query })` calls to fetch candidates.
  - Normalizes selected results into the `formData.What_Id` shape expected by upstream helpers.

- `ContactField.jsx`
  - Similar pattern for contact selection, used when building `scheduledWith` / participants for events.

- `CustomColorPicker.jsx`
  - Wraps a color picker (via `react-color`) and integrates with the `recent_colors` org variable to allow reuse of frequently used colors.

- `CustomTextField.jsx`, `EnhancedTableHead.jsx`, and others
  - Provide small, reusable MUI-based components with consistent font sizes, spacing, and behavior tailored to this app.

- `DateRangeModal.jsx`
  - Standalone dialog component for picking a custom date range using MUI Date Pickers.
  - Returns `startDate`/`endDate` as `YYYY-MM-DD` strings for use by `App.jsx` when `filterDate === "Custom Range"`.

### Zoho integration considerations for future changes

- The app assumes it is running inside a Zoho Embedded App context where `window.ZOHO` is available.
  - Any local development outside Zoho will need a mock/stub `ZOHO` object or guards around CRM calls.
- CRM interaction is split between:
  - Connection-based calls (`ZOHO.CRM.CONNECTION.invoke("zoho_crm_conn", ...)`) for the paginated Events search.
  - Direct API calls (`ZOHO.CRM.API.*`) for `getOrgVariable`, `getAllRecords`, `getRecord`, and `insertRecord`.
- Changes to date handling must keep the following in sync:
  - `App.jsx` date boundary computation and formatting (including the hard-coded `+11:00` offset in the query string).
  - `helperFunc.isDateInRange` logic, which is used by `ActivityTable` for client-side filtering.
  - UI-level date parsing/formatting in `ActivityTable` and `DateRangeModal`.

## How to extend or modify behavior safely

When implementing new features or modifying existing ones:
- Respect the single source of truth for Events: all stateful updates to `events` should flow through `setEvents` in `App.jsx` and the helper callbacks (`updateEvent`, insert paths, clear paths) rather than mutating arrays in-place.
- Keep Zoho payload transformations centralized:
  - Prefer updating `transformFormSubmission` (and its edit-mode counterpart) instead of constructing CRM payloads ad hoc in multiple components.
- Treat `helperFunc.js` as the canonical place for:
  - Date range semantics.
  - Activity type/result mappings.
  - Shared option lists (e.g., reminders, "Regarding" values).
- If you adjust the Events search criteria (URL, entity, additional filters), ensure ActivityTable’s column model and the `createData` function still align with the shape of CRM responses.
