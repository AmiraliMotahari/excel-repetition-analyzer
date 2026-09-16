# Master Prompt: Excel Repetition Analyzer

## 1. Role

Act as a **senior full-stack TypeScript engineer, software architect, UX engineer, and data-processing engineer**.

Build a production-quality web application that allows users to upload an Excel spreadsheet, map arbitrary column names to a required semantic field, configure repetition thresholds, analyze repeated values, and download the original spreadsheet enriched with a repetition-count column and row-level severity coloring.

Do not create a toy/demo implementation.

The implementation must be:

- strongly typed
- modular
- maintainable
- production-oriented
- accessible
- responsive
- performant for reasonably large Excel files
- resilient to malformed input
- safe against problematic spreadsheet data
- easy to extend later

Do not guess APIs or library behavior. Before implementing any library integration, consult the current official documentation for the installed/current version.

---

# 2. Required Technology Stack

Use:

- Next.js with App Router
- TypeScript
- shadcn/ui
- Tailwind CSS
- Zod
- React Hook Form
- `@hookform/resolvers`
- next-safe-action
- Zustand
- Lucide icons
- Excel processing library appropriate for XLS/XLSX parsing and XLSX generation
- TanStack Table for the interactive result table where appropriate

Use the current stable versions available at implementation time.

The application must support:

- light theme
- dark theme
- system theme preference

Use shadcn/ui's native theming approach.

Do not introduce another UI framework.

---

# 3. Product Concept

The application processes Excel files where the column names are unknown or inconsistent.

Example input files might contain:

```text
Customer Name | Phone Number | City | Date
```

or:

```text
نام مشتری | شماره تماس | شهر | تاریخ
```

or:

```text
Client | Mobile | Location | Created At
```

The application must NOT assume fixed Excel column names.

Instead, the user uploads a file and explicitly maps the relevant column by selecting one of the detected spreadsheet columns.

The core operation is:

> Count how many times each value appears in the user-selected key column, then append that count to every row.

Example:

Input:

```text
Customer | Phone
Ali       | 09120000000
Sara      | 09123333333
Reza      | 09120000000
Mina      | 09120000000
```

Result:

```text
Customer | Phone       | Repetition Count
Ali      | 09120000000 | 3
Sara     | 09123333333 | 1
Reza     | 09120000000 | 3
Mina     | 09120000000 | 3
```

The output must preserve the original rows and columns and add the calculated count.

---

# 4. Core Workflow

The application should follow a clear multi-step workflow.

## Step 1 — Upload

User sees a prominent upload area.

Support:

- drag and drop
- click to browse
- `.xlsx`
- `.xls` when supported by the selected processing library

Display:

- filename
- file size
- file type
- upload state
- remove/replace file action

Reject:

- unsupported formats
- empty files
- corrupt workbooks
- files with no usable worksheet
- files exceeding the configured maximum size

Do not upload files to permanent storage unless there is a strong architectural reason.

Prefer processing temporary/in-memory data when practical.

---

# 5. Spreadsheet Inspection

After upload:

1. Parse the workbook.
2. Detect available worksheets.
3. Allow the user to choose the worksheet if multiple worksheets exist.
4. Read the header row.
5. Extract column names.
6. Preview a small number of rows.

The UI should show something like:

```text
File
customers.xlsx

Worksheet
[ Customers                v ]

Detected columns

[ Customer Name ]
[ Phone Number  ]
[ City          ]
[ Date          ]
[ Amount        ]
```

Then ask:

```text
Which column should be used as the repetition key?

[ Phone Number ▼ ]
```

Do not require the user to rename their Excel columns.

---

# 6. Column Mapping

The application must treat Excel column names as external/untrusted input.

Create an internal normalized representation:

```ts
type SpreadsheetColumn = {
  index: number
  originalName: string
}
```

The application should maintain a mapping such as:

```ts
type ColumnMapping = {
  keyColumnIndex: number
}
```

Do not depend on the column's display name after mapping.

Use the stable column index internally.

This prevents problems when:

- column names are duplicated
- columns contain spaces
- columns contain Unicode
- columns contain punctuation
- columns have different names between files

---

# 7. Duplicate Column Names

Handle duplicate headers gracefully.

Example:

```text
Phone | Name | Phone | City
```

Display them unambiguously in the UI:

```text
Phone — Column A
Name — Column B
Phone — Column C
City — Column D
```

Internally identify columns by index, not header text.

Never assume headers are unique.

---

# 8. Header Handling

The MVP assumes the first non-empty spreadsheet row is the header row.

However, architect the parser so header-row detection can later become configurable.

Normalize headers only for internal comparison/display purposes.

Never overwrite the original header text in the exported spreadsheet.

---

# 9. Repetition Algorithm

The primary algorithm is:

```text
for each row:
    key = value from selected key column
    count[key] += 1

for each row:
    repetitionCount = count[key]
```

Use a `Map<string, number>` or equivalent efficient structure.

Target complexity:

```text
Time:  O(n)
Space: O(k)
```

where:

- `n` = number of spreadsheet rows
- `k` = number of unique key values

Do not use nested loops for duplicate detection.

---

# 10. Value Normalization

Define a deterministic normalization strategy.

At minimum:

- treat equivalent primitive representations consistently
- safely convert spreadsheet cell values to comparison strings
- handle numbers
- handle strings
- handle dates
- handle booleans
- handle empty cells
- handle null/undefined

For string values:

```text
trim leading/trailing whitespace
```

Make case sensitivity configurable in the architecture.

For MVP, expose:

```text
Matching mode

(•) Exact
( ) Case-insensitive
```

Do not silently modify the original cell value.

Normalization is only for comparison.

Example:

```text
" Ali "
"Ali"
```

may resolve to the same key under normalized matching, while the original Excel values remain untouched.

---

# 11. Empty Values

Define explicit behavior for empty key cells.

Default behavior:

> Empty/null key values are NOT counted as duplicates.

Every empty-key row should receive:

```text
Repetition Count = 0
```

Do not group every empty row into one duplicate group.

This behavior must be clearly communicated in the UI.

Architect the processing layer so this rule can later become configurable.

---

# 12. Threshold Configuration

Users must configure thresholds before processing.

Use React Hook Form + Zod.

Recommended configuration:

```ts
type ThresholdConfig = {
  yellowFrom: number
  redFrom: number
}
```

Classification:

```text
GREEN  = count < yellowFrom
YELLOW = yellowFrom <= count < redFrom
RED    = count >= redFrom
```

Example:

```text
Yellow from: 3
Red from: 5
```

Produces:

```text
1 → Green
2 → Green
3 → Yellow
4 → Yellow
5 → Red
6 → Red
```

Validation:

```text
yellowFrom >= 1
redFrom > yellowFrom
both must be integers
```

Prevent invalid threshold configurations before processing.

---

# 13. Optional Threshold Presets

Create the architecture so presets can later be added.

For example:

```text
Low sensitivity
Medium sensitivity
High sensitivity
Custom
```

Do not over-engineer the MVP.

---

# 14. Processing Step

The primary action should be:

```text
Analyze Spreadsheet
```

Before processing, validate:

- file exists
- worksheet exists
- selected key column exists
- spreadsheet contains data rows
- threshold configuration is valid

Display a processing state:

```text
Analyzing...

Reading rows
████████████████░░░░ 82%

Counting repetitions
██████████████████░░ 91%

Preparing results
████████████████████ 100%
```

For large files, avoid blocking the UI unnecessarily.

Architect the processor so it can later be moved into a Web Worker or server-side job.

---

# 15. Result Classification

Every processed row gets:

```ts
type Severity = "green" | "yellow" | "red"
```

Example:

```ts
type ProcessedRow = {
  originalRowIndex: number
  values: unknown[]
  repetitionCount: number
  severity: Severity
}
```

Do not mutate the original imported dataset destructively.

Keep the original data model separate from the processed result.

---

# 16. Result Preview

After processing, display a result dashboard.

Top-level statistics:

```text
Total Rows        12,540
Unique Values      8,201
Green              9,880
Yellow             1,930
Red                  730
```

Then display the processed spreadsheet in a data table.

The table should:

- show original columns
- append `Repetition Count`
- show row severity
- support sorting
- support filtering
- support pagination
- support horizontal scrolling
- preserve large datasets without rendering thousands of DOM nodes simultaneously where practical

Use TanStack Table for table behavior and shadcn/ui components for presentation. shadcn's current data-table documentation explicitly uses TanStack Table for advanced table functionality.

---

# 17. Row Coloring

Rows should visually communicate severity.

Use subtle background colors rather than extremely saturated colors.

Semantic meaning:

```text
Green  = normal
Yellow = attention
Red    = high repetition
```

Important:

Do not rely on color alone.

Also provide:

- a severity badge
- repetition count
- accessible text/ARIA labeling

In dark mode, use appropriate semantic variants with sufficient contrast.

Avoid hard-coded colors that look acceptable only in light mode.

---

# 18. Result Table Controls

Provide:

```text
Search
Filter severity
Sort by repetition count
Sort by original columns
Rows per page
```

Severity filter:

```text
All
Green
Yellow
Red
```

Search should search across visible text values or at minimum the selected key column.

---

# 19. Export

The primary result action:

```text
Download Excel
```

Output:

> The original spreadsheet plus one additional column named `Repetition Count`.

Example:

```text
Customer | Phone | City | Repetition Count
Ali      | ...   | ...  | 3
Sara     | ...   | ...  | 1
```

Preserve:

- original column order
- original row order
- original header names
- original worksheet name where practical

Do not replace or rename existing columns.

Filename example:

```text
customers-analyzed.xlsx
```

---

# 20. Excel Row Styling

The exported XLSX must color rows according to severity:

```text
Green
Yellow
Red
```

The implementation must use an Excel-generation approach that actually supports cell/row styling.

Do NOT assume a library supports spreadsheet styling merely because it can read/write XLSX.

Verify this against the current official documentation before implementation.

If the initially selected Excel library cannot produce the required styling in its current community/open-source edition, introduce a dedicated XLSX writer for export while keeping parsing and processing separate.

Do not silently remove row coloring from the exported Excel file.

The final Excel should contain both:

1. `Repetition Count`
2. visual severity styling

---

# 21. Preserve Original Workbook As Much As Practical

The exported workbook should preserve:

- worksheet name
- row order
- column order
- values

Do not promise preservation of advanced Excel features such as:

- macros
- pivot tables
- external links
- complex formulas
- charts
- conditional formatting

unless the chosen library actually preserves them.

Document the supported preservation behavior in code comments and, if necessary, in the UI.

For MVP, prioritize reliable data preservation over preserving advanced workbook metadata.

---

# 22. State Management

Use Zustand only for client-side application workflow state.

Example:

```ts
type ProcessingState = {
  file: File | null
  workbookMetadata: WorkbookMetadata | null
  selectedSheet: string | null
  columnMapping: ColumnMapping | null
  thresholdConfig: ThresholdConfig
  processingStatus: ProcessingStatus
  result: ProcessingResult | null
}
```

Do NOT put everything into Zustand.

Avoid storing large raw spreadsheet datasets in persistent localStorage.

Use Zustand for:

- workflow state
- selected sheet
- mapping
- configuration
- UI state
- processing status

Do not persist huge spreadsheet contents.

If Zustand persistence is used, persist only small configuration values. Zustand's current persistence middleware supports browser storage such as localStorage/sessionStorage, but large spreadsheet datasets should not be persisted there.

---

# 23. Forms

Use:

- React Hook Form
- Zod
- `zodResolver`

All user-entered configuration must be validated through Zod.

Examples:

```ts
const thresholdSchema = z.object({
  yellowFrom: z.number().int().min(1),
  redFrom: z.number().int().min(2),
}).refine(
  data => data.redFrom > data.yellowFrom,
  {
    message: "Red threshold must be greater than yellow threshold",
    path: ["redFrom"],
  }
)
```

Use shadcn's current form patterns rather than inventing a custom form abstraction unnecessarily.

---

# 24. Server Actions

Use `next-safe-action` for validated server actions where server actions are actually appropriate.

Create a reusable safe-action client.

Conceptually:

```text
src/lib/safe-action.ts
```

Actions should have:

- Zod input validation
- typed inputs
- typed outputs
- predictable error handling
- no `any`

`next-safe-action` currently supports Next.js App Router and schema-based validation, including Zod.

Do not force server actions into purely client-side operations where they provide no benefit.

---

# 25. Processing Architecture

Separate responsibilities.

Recommended architecture:

```text
src/
  app/
    page.tsx

  components/
    upload/
    mapping/
    thresholds/
    processing/
    results/
    layout/
    theme/

  lib/
    excel/
      parser.ts
      exporter.ts
      normalizer.ts
      types.ts

    processing/
      repetition-analyzer.ts
      severity.ts
      types.ts

    validation/
      schemas.ts

    safe-action.ts

  stores/
    spreadsheet-store.ts

  types/
    spreadsheet.ts
```

Keep the business logic independent from React.

The repetition algorithm must be usable without a UI.

For example:

```ts
analyzeRows(rows, keyColumnIndex, config)
```

should not know anything about:

- React
- Zustand
- shadcn
- browser APIs

---

# 26. Domain Model

Define explicit domain types.

Example:

```ts
type CellValue =
  | string
  | number
  | boolean
  | Date
  | null

type SpreadsheetColumn = {
  index: number
  name: string
}

type SpreadsheetRow = {
  index: number
  values: CellValue[]
}

type Severity =
  | "green"
  | "yellow"
  | "red"

type ProcessedRow = {
  index: number
  values: CellValue[]
  repetitionCount: number
  severity: Severity
}

type ProcessingResult = {
  columns: SpreadsheetColumn[]
  rows: ProcessedRow[]
  statistics: ProcessingStatistics
}
```

Avoid `any`.

Use `unknown` at external boundaries and validate/normalize it.

---

# 27. UI / UX Design

The UI should feel like a modern professional utility application.

Visual direction:

- clean
- minimal
- desktop-first but fully responsive
- compact information density
- excellent typography
- subtle borders
- restrained shadows
- clear hierarchy
- professional rather than playful

Use shadcn/ui components throughout.

Recommended components:

- Card
- Button
- Input
- Select
- Badge
- Progress
- Table
- Tabs where appropriate
- Alert
- Tooltip
- Dropdown Menu
- Separator
- Dialog
- Sheet for mobile controls
- Skeleton
- Sonner/toast notifications if needed

Do not visually overload the interface.

---

# 28. Application Layout

Use a simple layout.

Header:

```text
Excel Analyzer                    [Theme Toggle]
```

Main:

```text
Upload Spreadsheet

        ↓

Select Worksheet

        ↓

Map Key Column

        ↓

Configure Thresholds

        ↓

Analyze

        ↓

Results
```

The interface should make the workflow obvious without requiring documentation.

---

# 29. Stepper / Progress Indicator

Use a clear step indicator:

```text
1 Upload
2 Map
3 Configure
4 Analyze
5 Results
```

The active step should be visually prominent.

Completed steps should be clickable where safe.

Do not let users enter a later step without satisfying its prerequisites.

---

# 30. Upload UX

Create a large drag-and-drop area:

```text
Drop your Excel file here

or

[ Choose Excel File ]

Supported: .xlsx, .xls
```

After selection:

```text
✓ customers.xlsx
12.4 MB
2,840 rows
6 columns
```

Allow:

```text
[ Replace file ]
```

---

# 31. Mapping UX

Show a sample preview.

Example:

```text
Detected columns

┌──────────────────────────────┐
│ Column A  Customer Name      │
│ Column B  Phone Number       │
│ Column C  City               │
│ Column D  Purchase Date      │
└──────────────────────────────┘

Repetition Key

[ Phone Number ▼ ]
```

Make the selected column visually obvious.

---

# 32. Threshold UX

Show an explanatory visual.

Example:

```text
Repetition thresholds

Green
1–2 occurrences

Yellow
3–4 occurrences

Red
5+ occurrences
```

Update this preview dynamically as the user changes thresholds.

This makes the classification rule immediately understandable.

---

# 33. Result Summary

Create statistic cards:

```text
Total Rows
Unique Keys
Green
Yellow
Red
```

Use semantic icons sparingly.

Example:

```text
🟢 Normal
🟡 Review
🔴 High repetition
```

Do not depend solely on emoji; use proper badges/icons.

---

# 34. Results Table

Example:

```text
Search: [________________]

Filter: [All ▼]

┌──────────────┬────────────┬───────┬───────┐
│ Customer     │ Phone      │ City  │ Count │
├──────────────┼────────────┼───────┼───────┤
│ Ali          │ 0912...    │ Baku  │ 3 🟡  │
│ Sara         │ 0935...    │ Ganja │ 1 🟢  │
│ Reza         │ 0912...    │ Baku  │ 3 🟡  │
│ Mina         │ 0912...    │ Baku  │ 3 🟡  │
└──────────────┴────────────┴───────┴───────┘
```

All original columns must remain visible.

The count column should be appended, not substituted for an original column.

---

# 35. Responsive Design

Desktop:

- wide table
- side-by-side controls where appropriate

Tablet:

- stacked configuration sections
- horizontally scrollable table

Mobile:

- single-column layout
- upload area optimized for touch
- configuration controls stacked
- filtering controls collapsed where appropriate
- result table horizontally scrollable
- export action easily accessible

Do not attempt to turn a large spreadsheet into a tiny mobile card interface.

The tabular data should remain tabular.

---

# 36. Dark Mode

Implement proper dark mode.

Requirements:

- no unreadable gray-on-gray combinations
- no hardcoded white backgrounds
- no hardcoded dark text
- severity colors remain distinguishable
- focus rings remain visible
- borders remain subtle but visible

Use theme tokens/classes rather than duplicate styles.

---

# 37. Accessibility

Meet good WCAG practices.

Include:

- keyboard navigation
- visible focus states
- semantic labels
- form validation messages
- accessible file input
- accessible buttons
- `aria-live` processing/status messages
- sufficient contrast
- non-color severity indicators

Do not make the workflow dependent on drag-and-drop; file browsing must always work.

---

# 38. Error Handling

Handle common failures gracefully.

Examples:

```text
Unsupported file type
Invalid Excel workbook
No worksheets found
Worksheet is empty
No header row found
No data rows found
Selected column invalid
Invalid thresholds
File too large
Excel export failed
Unexpected processing error
```

Never expose raw stack traces to users.

Use user-friendly errors with useful recovery actions.

Example:

```text
We couldn't read this spreadsheet.

The workbook appears to be corrupted.

[Choose another file]
```

---

# 39. Security

Treat every uploaded spreadsheet as untrusted input.

Implement:

- file type validation
- file size limits
- server-side validation where processing crosses the server boundary
- no trusting client-provided MIME types
- safe parsing
- no arbitrary code execution
- no unsafe formula evaluation
- no rendering spreadsheet HTML directly
- protection against CSV/formula injection if CSV export is ever added
- avoid logging spreadsheet contents
- avoid leaking uploaded data into error logs

Never log entire rows or spreadsheet contents.

---

# 40. Performance

Design for files significantly larger than a tiny demo spreadsheet.

At minimum:

- efficient O(n) repetition counting
- avoid unnecessary React re-renders
- paginate large result tables
- avoid rendering all rows simultaneously
- memoize expensive derived values where useful
- avoid copying the full dataset repeatedly
- avoid storing large datasets redundantly in multiple Zustand states

For very large files, architect the processing layer so it can be moved to:

```text
Web Worker
```

or:

```text
server-side job
```

without rewriting the business algorithm.

---

# 41. File Processing Boundary

Keep Excel-specific logic isolated.

For example:

```ts
parseWorkbook(file)
```

returns an application-level representation.

The repetition analyzer should operate only on the normalized application-level representation.

This separation allows future support for:

- CSV
- JSON
- other spreadsheet formats

without rewriting the analysis engine.

---

# 42. Testing

Implement unit tests for the core processing engine.

Test:

### Basic duplication

```text
A
B
A
A
```

Expected:

```text
A → 3
B → 1
A → 3
A → 3
```

### No duplicates

```text
A
B
C
```

Expected:

```text
1
1
1
```

### Empty keys

```text
A
(empty)
(empty)
A
```

Expected:

```text
A → 2
empty → 0
empty → 0
A → 2
```

### Thresholds

For:

```text
yellowFrom = 3
redFrom = 5
```

verify:

```text
1 → green
2 → green
3 → yellow
4 → yellow
5 → red
6 → red
```

### Whitespace normalization

```text
"Ali"
" Ali "
```

### Case-insensitive mode

```text
"ALI"
"Ali"
"ali"
```

### Duplicate headers

Ensure mapping uses indexes rather than header names.

### Empty spreadsheet

Must produce a useful validation error.

### Large dataset

Benchmark a realistic large number of rows.

---

# 43. Component Design

Build reusable components such as:

```text
ExcelUploader
WorkbookSelector
ColumnMapper
ThresholdForm
ProcessingProgress
StatisticsCards
ResultToolbar
ResultTable
SeverityBadge
ExportButton
WorkflowStepper
ThemeToggle
```

Keep components focused.

Do not create one enormous page component.

---

# 44. Separation of Client and Server Components

Follow Next.js App Router best practices.

Use Server Components by default.

Use Client Components only where necessary:

- file interactions
- React Hook Form
- Zustand
- interactive tables
- drag/drop
- theme controls

Do not mark the entire application `"use client"`.

---

# 45. Validation Strategy

Create schemas in a dedicated validation module.

Examples:

```text
threshold-schema.ts
mapping-schema.ts
processing-schema.ts
```

Validate external input at boundaries.

Do not use TypeScript types as a replacement for runtime validation.

Use Zod for runtime validation. Zod is currently TypeScript-first and supports static type inference; its current docs also recommend TypeScript strict mode.

---

# 46. TypeScript Rules

Use strict TypeScript.

Never use:

```ts
any
```

unless there is an extremely strong technical justification and the usage is isolated.

Prefer:

```ts
unknown
```

at external boundaries.

Use discriminated unions for state machines where useful.

Example:

```ts
type ProcessingStatus =
  | { status: "idle" }
  | { status: "reading"; progress: number }
  | { status: "processing"; progress: number }
  | { status: "exporting"; progress: number }
  | { status: "completed" }
  | { status: "error"; message: string }
```

---

# 47. State Machine Thinking

Treat the workflow as a state machine:

```text
idle
 ↓
file-selected
 ↓
workbook-inspected
 ↓
column-mapped
 ↓
configuration-valid
 ↓
processing
 ↓
completed
```

Error states should be recoverable.

Prevent impossible UI states such as:

- exporting before processing
- analyzing without a selected column
- selecting a sheet before a workbook exists

---

# 48. Export Naming

Generate a predictable filename:

```text
{original-name}-analyzed.xlsx
```

Examples:

```text
customers-analyzed.xlsx
sales-report-analyzed.xlsx
data-analyzed.xlsx
```

Sanitize the filename.

---

# 49. Optional Processing Metadata

Architect the result so additional metadata can later be added.

For example:

```text
Processing Information

File
Worksheet
Rows
Unique Keys
Processing Mode
Thresholds
Processed At
```

Do not modify the spreadsheet with this metadata unless explicitly requested.

---

# 50. Future Extensibility

Design so the following can be added later without rewriting the core system:

- multiple key columns
- compound keys
- multiple threshold profiles
- saved configurations
- CSV import/export
- XLSX/CSV batch processing
- anomaly detection
- duplicate-group view
- export only duplicates
- export only red rows
- charts
- historical runs
- user accounts
- server-side processing
- background jobs

Do not implement these unless they are required for MVP.

---

# 51. Suggested Project Structure

Use a clean structure such as:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── excel/
│   │   ├── excel-uploader.tsx
│   │   ├── workbook-selector.tsx
│   │   ├── column-mapper.tsx
│   │   ├── threshold-form.tsx
│   │   ├── processing-progress.tsx
│   │   ├── result-summary.tsx
│   │   ├── result-toolbar.tsx
│   │   └── result-table.tsx
│   │
│   ├── layout/
│   │   ├── app-header.tsx
│   │   └── workflow-stepper.tsx
│   │
│   └── ui/
│
├── lib/
│   ├── excel/
│   │   ├── parser.ts
│   │   ├── exporter.ts
│   │   ├── normalizer.ts
│   │   └── types.ts
│   │
│   ├── processing/
│   │   ├── analyze.ts
│   │   ├── classify.ts
│   │   └── statistics.ts
│   │
│   ├── validation/
│   │   ├── mapping.ts
│   │   └── thresholds.ts
│   │
│   └── safe-action.ts
│
├── stores/
│   └── spreadsheet-store.ts
│
├── types/
│   └── spreadsheet.ts
│
└── actions/
    └── spreadsheet-actions.ts
```

Adjust this structure when implementation details justify doing so, but preserve separation of concerns.

---

# 52. Implementation Rules

Do not:

- create fake spreadsheet data as the primary implementation
- hardcode example column names
- assume headers are unique
- rely on column names as identifiers
- use `any`
- put business logic in React components
- put huge spreadsheet datasets into persistent Zustand storage
- mutate imported data destructively
- silently discard export styling requirements
- trust MIME type alone
- expose raw processing errors
- create unnecessary abstractions
- install libraries that duplicate existing functionality without justification

Do:

- validate everything important
- keep domain logic framework-independent
- use current official documentation
- keep components small
- keep types explicit
- preserve original spreadsheet values
- make assumptions explicit
- write tests for the analyzer
- test export behavior

---

# 53. Definition of Done

The application is complete when a user can:

1. Open the application.
2. Upload an Excel file.
3. See the workbook and worksheets.
4. Select the worksheet.
5. See detected columns.
6. Choose any column as the repetition key.
7. Configure green/yellow/red thresholds.
8. Run the analysis.
9. See repetition counts for every row.
10. See row severity visually.
11. Filter/search/sort the processed result.
12. See summary statistics.
13. Download an XLSX containing:
   - all original columns
   - original rows
   - an additional `Repetition Count` column
   - severity-based row coloring
14. Switch between light/dark/system themes.
15. Recover gracefully from invalid files or configuration.

---

# 54. Important Engineering Decision

Before implementing Excel import/export, inspect the current official documentation for the selected spreadsheet libraries.

Verify:

- `.xlsx` parsing
- `.xls` support
- browser support
- Node.js support
- workbook inspection
- cell value handling
- date handling
- XLSX writing
- cell/row styling
- large-file behavior

Do not make assumptions based on old tutorials.

For example, SheetJS documentation currently shows `XLSX.read` for parsing and `XLSX.writeXLSX` / `writeFileXLSX` for XLSX generation.

However, because this application requires **styled output rows**, explicitly verify that the chosen writer supports the required styling features before committing to it. The current SheetJS Community Edition ecosystem has limitations around writing advanced styling features, so a separate export library may be appropriate.

---

# 55. Deliverables

Produce the complete application, not just a mockup.

Include:

- complete Next.js project
- shadcn/ui components
- responsive UI
- light/dark/system theme
- Excel parser
- Excel analyzer
- XLSX exporter
- Zod schemas
- React Hook Form forms
- Zustand store
- next-safe-action integration where appropriate
- tests for processing logic
- error handling
- loading/progress states
- accessible UI
- clean TypeScript architecture

The final implementation should be immediately runnable with:

```bash
pnpm install
pnpm dev
```

Also provide:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

and ensure all pass before considering the implementation complete.

---

# 56. Development Philosophy

Prioritize:

```text
Correctness
>
Data integrity
>
Type safety
>
Maintainability
>
Performance
>
UX polish
```

The most important property of this application is that the generated report is **correct**.

Never prioritize visual polish over data correctness.

When processing or exporting an Excel file, the system must be deterministic:

same input + same mapping + same normalization mode + same thresholds

must produce the same result.

Build the system as a reusable **spreadsheet analysis engine with a web UI**, not as a one-off page for one particular Excel format.