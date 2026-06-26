# PriorIT Frontend — Full Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Libraries & Dependencies](#3-libraries--dependencies)
4. [React & JavaScript Concepts Dictionary](#4-react--javascript-concepts-dictionary)
5. [Entry Point & Root Files](#5-entry-point--root-files)
6. [Routing & Protected Routes](#6-routing--protected-routes)
7. [State Management — Zustand Store](#7-state-management--zustand-store)
8. [Services Layer — API Calls](#8-services-layer--api-calls)
9. [Internationalization — i18n](#9-internationalization--i18n)
10. [Layout Components](#10-layout-components)
11. [Pages](#11-pages)
12. [Modal Components](#12-modal-components)
13. [Styling System](#13-styling-system)
14. [API Calls Summary](#14-api-calls-summary)

---

## 1. Project Overview

**PriorIT Frontend** is the React user interface for the Attijari Bank Tunisia IT task prioritization platform. It communicates with the Spring Boot backend at `http://localhost:8080` and provides a complete web application for submitting tasks, viewing AI scores, overriding decisions, and managing users.

### What users can do
- Register an account and wait for admin approval
- Submit IT tasks (feature requests, bugs, compliance items) for AI scoring
- View the ranked backlog with full AI reasoning
- Override AI-scored fields with a written justification (IT Managers)
- Approve or reject pending user registrations (Admins)
- Switch the active AI provider at runtime (Admins)
- Export the backlog as Excel or PDF
- View DORA metrics and dashboard statistics
- Use the interface in English, French, or Arabic

---

## 2. Architecture

```
priorit-frontend/
├── index.html                    # HTML shell — single div#root
├── vite.config.js                # Vite build config
├── package.json                  # Dependencies
├── tailwind.config.js            # TailwindCSS theme
└── src/
    ├── main.jsx                  # Mounts React app into #root
    ├── App.jsx                   # Router + all route definitions
    ├── index.css                 # Global CSS + Tailwind imports
    ├── pages/                    # One file per full page/screen
    ├── components/               # Reusable UI pieces
    │   ├── layout/               # Sidebar + page wrapper
    │   ├── dashboard/            # DoraModal
    │   └── scoring/              # OverrideModal
    ├── services/                 # All axios API calls
    ├── store/                    # Zustand global state
    └── i18n/                     # Multi-language support
```

### Data Flow
```
User action (click, form submit)
  → Page component calls a service function
  → Service sends HTTP request via axios (with JWT in header)
  → Backend processes and responds
  → Component updates its local state
  → React re-renders the UI
```

### Authentication Flow
```
User enters credentials
  → authStore.login() → authService.login() → POST /api/auth/login
  → Token + user info stored in localStorage + Zustand store
  → All subsequent axios requests automatically include Authorization: Bearer <token>
  → On 401 response: token cleared, user redirected to /login
```

---

## 3. Libraries & Dependencies

### Core

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.4 | UI framework — builds the interface as a component tree |
| `react-dom` | 19.2.4 | Renders React components into the real browser DOM |
| `react-router-dom` | 7.14.2 | Client-side routing — handles navigation between pages without full page reloads |
| `axios` | 1.15.2 | HTTP client — sends requests to the Spring Boot backend |
| `zustand` | 5.0.12 | Lightweight global state management — holds authentication state |
| `recharts` | 3.8.1 | Chart library — pie chart (MoSCoW distribution), bar chart (top tasks) |
| `lucide-react` | 1.9.0 | Icon library — consistent SVG icons throughout the UI |

### Styling & Build

| Library | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 4.2.4 | Utility-first CSS framework — layout, spacing, colors via class names |
| `vite` | 8.0.4 | Build tool and dev server — extremely fast hot module replacement |
| `postcss` | — | Processes CSS (required by Tailwind) |
| `autoprefixer` | — | Automatically adds vendor prefixes to CSS for browser compatibility |
| `eslint` | 9.39.4 | Code linter — catches errors and enforces code style |

### What each library replaces
- **axios** replaces the native `fetch()` — adds automatic JSON parsing, interceptors, and better error handling
- **zustand** replaces React's `Context + useReducer` for global state — much simpler syntax
- **recharts** replaces building SVG charts from scratch — declarative chart components
- **lucide-react** replaces downloading icon files manually — imported as React components
- **vite** replaces Create React App — faster startup, faster hot reload

---

## 4. React & JavaScript Concepts Dictionary

This section explains every React pattern and JavaScript concept used in this project.

---

### React Hooks

**`useState(initialValue)`**
Creates a piece of state inside a component. Returns the current value and a setter function.
```javascript
const [tasks, setTasks] = useState([]);
// tasks = current value, setTasks = function to update it
```
Every time you call `setTasks(newValue)`, React re-renders the component with the new value. Without `useState`, variables would reset to their initial value on every render.

**`useEffect(callback, [dependencies])`**
Runs a side effect (API call, timer, subscription) after the component renders.
```javascript
useEffect(() => {
  fetchTasks(); // runs after the component appears on screen
}, []);         // empty array = run only once, on first render
```
- Empty array `[]` → runs once when component mounts
- With variables `[id]` → runs every time `id` changes
- No array → runs after every single render (usually a bug)

**`useContext(Context)`**
Reads a value from a React Context. Used here to access the current language without passing it down as a prop through every component.

**`useNavigate()`**
Returns a function that programmatically navigates to a different route. Used after login to redirect to `/dashboard`, or after logout to redirect to `/login`.

**`useParams()`**
Reads URL parameters. If the route is `/tasks/:id`, then `useParams()` gives you `{ id: "42" }`.

---

### Component Patterns

**Functional Components**
Every component in this project is a function that receives `props` and returns JSX. No class components.
```javascript
function TaskCard({ task, onDelete }) {
  return <div>{task.title}</div>;
}
```

**JSX**
HTML-like syntax inside JavaScript. It looks like HTML but it's actually JavaScript. `className` instead of `class`, `onClick` instead of `onclick`.

**Props**
Data passed from a parent component to a child. Read-only — a child never modifies props directly. If a child needs to communicate back to the parent, the parent passes a callback function as a prop (e.g., `onDelete`).

**Conditional Rendering**
```javascript
{isLoading && <Spinner />}               // show only if true
{error ? <ErrorMsg /> : <Content />}    // if/else
```

**List Rendering**
```javascript
{tasks.map(task => (
  <TaskCard key={task.id} task={task} />
))}
```
Every item in a list needs a unique `key` so React can efficiently update only the items that changed.

---

### State Patterns Used

**Local state** (`useState`) — used inside a single component for things like form inputs, expanded/collapsed state, loading flags.

**Global state** (Zustand `authStore`) — used for the logged-in user, because many different components need to know who is logged in without passing it down through every level.

**Derived state** — values computed from existing state, not stored separately. Example: `const mustTasks = tasks.filter(t => t.moscowLabel === 'MUST')` computed from the `tasks` state array.

---

### JavaScript Patterns

**`async / await`**
Makes asynchronous code (API calls) read like synchronous code. Used in every service function.
```javascript
async function fetchTasks() {
  const response = await api.get('/api/tasks');
  return response.data;
}
```

**`try / catch`**
Wraps async operations to handle errors gracefully. If the API call fails, the `catch` block runs instead of crashing the app.

**`Promise.all([...])`**
Runs multiple async operations in parallel and waits for all of them to finish. Used in Dashboard to fetch stats, tasks, and DORA data simultaneously instead of sequentially.
```javascript
const [stats, tasks, dora] = await Promise.all([
  fetchStats(), fetchTasks(), fetchDora()
]);
```

**Optional chaining `?.`**
Safely access nested properties without crashing if something is `null` or `undefined`.
```javascript
error.response?.data?.message  // won't crash if response is undefined
task.aiScore?.finalScore        // won't crash if aiScore is null
```

**Destructuring**
Extracts values from objects and arrays cleanly.
```javascript
const { name, email, role } = user;
const [first, ...rest] = tasks;
```

**Spread operator `...`**
Copies all properties of an object or all elements of an array.
```javascript
setUser({ ...user, name: 'NewName' });  // update one field, keep the rest
```

**Template literals**
String interpolation with backticks.
```javascript
`Hello ${user.name}, you have ${tasks.length} tasks`
```

---

### Routing Concepts

**Client-side routing**
React Router intercepts navigation (link clicks, `navigate()` calls) and swaps the page component without making a network request. The browser never reloads — only the components change.

**Protected Route**
A wrapper component that checks authentication before rendering a page. If the user is not logged in, it redirects to `/login` instead of showing the page.

**Outlet**
A placeholder in a layout component where child routes render. Used in `PageWrapper` so the sidebar and header stay fixed while only the page content changes.

---

## 5. Entry Point & Root Files

### `index.html`
**Role**: The single HTML file the browser loads. Contains one `<div id="root">` where the entire React app is injected. Also loads Google Fonts (Inter).

**Key concept**: This is a Single Page Application (SPA) — there is only one HTML file. React Router handles all navigation by swapping components, not by loading new HTML files from the server.

---

### `src/main.jsx`
**Role**: The JavaScript entry point. Mounts the React app into the `#root` div and wraps it in `StrictMode`.

**Key concept**: `ReactDOM.createRoot(document.getElementById('root')).render(<App />)` is the bridge between the static HTML and the dynamic React app. `StrictMode` is a development tool that intentionally renders components twice to catch side effects — it has no effect in production.

---

### `src/App.jsx`
**Role**: The root component. Defines the entire routing structure of the application — which URL maps to which page, which routes are protected, and which require admin role.
Think of it like the building's floor plan — it shows which room is behind each door.

**Key concepts**:
- `<BrowserRouter>` wraps the entire app to enable routing
- `<Routes>` and `<Route>` define the mapping from URL to component
- `<ProtectedRoute>` — redirects to `/login` if the user is not authenticated
- `<AdminRoute>` — redirects to `/dashboard` if the user is authenticated but not an ADMIN
- The `/` root path redirects to `/dashboard` automatically
- `<PageWrapper>` wraps all authenticated routes so they share the sidebar and header layout

**Route structure**:
```
/login              → Login.jsx          (public)
/register           → Register.jsx       (public)
/                   → redirect to /dashboard
/dashboard          → Dashboard.jsx      (protected)
/tasks              → Tasks.jsx          (protected)
/backlog            → Backlog.jsx        (protected)
/scoring            → Scoring.jsx        (protected)
/export             → Export.jsx         (protected)
/settings           → Settings.jsx       (protected)
/admin              → Admin.jsx          (admin only)
```

---

### `src/index.css`
**Role**: Global CSS file. Imports Tailwind CSS layers (`@tailwind base/components/utilities`) and defines CSS custom properties (variables) for the brand colors.

**Key concept**: Tailwind works through this file — without `@tailwind` imports, no utility classes (`flex`, `text-red-500`, etc.) would work.

**CSS variables defined**:
- `--primary-red: #CC2027` — Attijari brand red, used for active states, buttons, focus rings
- `--primary-navy: #1A1A2E` — Dark navy for sidebar background
- `--primary-orange: #F5A623` — Orange accent for highlights

---

### `vite.config.js`
**Role**: Vite build tool configuration. Sets up React JSX transformation via the `@vitejs/plugin-react` plugin.

**Key concept**: Vite is the dev server and bundler. In development, it serves files directly with hot module replacement (HMR) — changes appear in the browser instantly without a full page reload. In production, it bundles everything into optimized static files.

---

## 6. Routing & Protected Routes

### `ProtectedRoute` (defined in `App.jsx`)
**Role**: A wrapper that checks if the user is authenticated before rendering a page. If not, it redirects to `/login`.

```javascript
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
}
```

**Key concept**: `<Navigate to="/login" />` is a React Router component that immediately redirects. The user never sees the protected page — they land on login instead.

### `AdminRoute` (defined in `App.jsx`)
**Role**: Extends `ProtectedRoute` — also checks that the logged-in user's role is `'ADMIN'`. Non-admins are redirected to `/dashboard`.

---

## 7. State Management — Zustand Store

### `store/authStore.js`
**Role**: The single source of truth for authentication state. Any component in the app can read who is logged in, whether they're authenticated, and whether there's a loading/error state — without prop drilling.
Think of it like a security control room — any guard (component) in the building can check the central display (store) to see who has valid access.

**Key concept — Why Zustand over React Context?**
React Context re-renders every component that consumes it when the value changes. Zustand is smarter — components only re-render when the specific slice of state they subscribe to changes. For auth state that's read everywhere, this matters for performance.

**State shape**:
```javascript
{
  user: {
    name: string,
    email: string,
    role: string,           // 'ADMIN', 'IT_MANAGER', 'DEVELOPER', etc.
    emailVerified: boolean,
    photoPath: string
  } | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null
}
```

**Actions**:

`login(email, password)`:
1. Sets `isLoading = true`
2. Calls `authService.login(email, password)`
3. On success: saves token to `localStorage`, sets `user` and `isAuthenticated = true`
4. On failure: sets `error` message
5. Always sets `isLoading = false`

`logout()`:
1. Removes token from `localStorage`
2. Resets state to `{ user: null, isAuthenticated: false }`
3. The axios interceptor picks this up and the next 401 redirects to login

`clearError()`:
Clears the error message (called when the user dismisses an error toast or starts typing again).

**Reading state in a component**:
```javascript
const { user, isAuthenticated } = useAuthStore();
// Component re-renders only when user or isAuthenticated changes
```

---

## 8. Services Layer — API Calls

**Role of this layer**: All HTTP communication with the backend is centralized here. Pages never call `axios` directly — they call a service function. This keeps API logic out of components and makes it easy to change the backend URL in one place.

---

### `services/api.js`
**Role**: Creates and configures the shared axios instance used by all services. Handles JWT injection and automatic logout on token expiry.
Think of it like a configured phone line — all calls go through this line, and it automatically handles authentication and errors.

**Key concepts**:
- `axios.create({ baseURL: 'http://localhost:8080' })` — creates a pre-configured axios instance with the backend URL so every service only writes `/api/tasks` instead of the full URL
- **Request interceptor**: Before every request, reads the JWT from `localStorage` and adds `Authorization: Bearer <token>` to the headers. Without this, every service function would have to add the token manually.
- **Response interceptor**: If any response returns `401 Unauthorized`, it automatically clears the token from `localStorage` and redirects to `/login`. This handles expired tokens globally — no page needs to handle this individually.

```javascript
// What the interceptor does automatically on every request:
config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
```

---

### `services/authService.js`
**Role**: Handles login and registration API calls. Also provides a helper to check if the current user has a specific role.

**Functions**:

`login(email, password)`:
- `POST /api/auth/login` with credentials
- Returns `{ token, name, email, role, emailVerified, photoPath, passwordStrength }`
- The token is then stored in localStorage by `authStore`

`register(formData)`:
- `POST /api/auth/register` as `multipart/form-data`
- FormData contains a JSON blob (`data`) with user info + an optional photo file
- Returns `{ message, success }`

`hasRole(requiredRole)`:
- Reads the current user's role from localStorage/store and compares
- Used by `AdminRoute` to gate admin pages

---

### `services/taskService.js`
**Role**: All task-related API calls — fetching, submitting, and deleting tasks.

**Functions**:

`getAllTasks()` → `GET /api/tasks`
Returns every task in the system with their AI scores. Used by Backlog and Scoring pages.

`getMyTasks()` → `GET /api/tasks/my`
Returns only the current user's submitted tasks.

`getTaskTypes()` → `GET /api/tasks/types`
Returns the list of task categories (Feature, Bug Fix, Compliance, etc.) with their icons and colors. Used to populate the task type selector in the submit form.

`submitTask(taskData)` → `POST /api/tasks`
Sends `{ title, description, taskTypeId }` to the backend. The backend immediately triggers AI scoring and returns the task with its score.

`deleteTask(id)` → `DELETE /api/tasks/{id}`
Admin-only. Deletes a task and all related records.

---

### `services/doraService.js`
**Role**: Saves and retrieves DORA (DevOps Research and Assessment) metrics.

**Functions**:

`saveDoraIndicator(data)` → `POST /api/dora`
Saves lead time, deployment frequency, change failure risk, and recovery plan for a task.

`getAllDoraIndicators()` → `GET /api/dora`
Returns all DORA records with task context.

`getDoraByTaskId(taskId)` → `GET /api/dora/task/{taskId}`
Returns DORA metrics for one specific task.

`getDoraSummary()` → `GET /api/dora/summary`
Returns aggregated DORA statistics: average lead time, high-risk count, most common deployment frequency.

---

### `services/overrideService.js`
**Role**: Submits and retrieves score overrides made by IT managers.

**Functions**:

`createOverride(data)` → `POST /api/overrides`
Sends `{ taskId, fieldChanged, newValue, justification }` to create an override. The backend records the old value, applies the new one, recalculates the final score, and logs the change.

`getOverridesByTask(taskId)` → `GET /api/overrides/task/{taskId}`
Returns the full history of overrides for one task.

`getAllOverrides()` → `GET /api/overrides`
Returns every override in the system (used in admin views).

---

### `services/adminService.js`
**Role**: Admin-only operations — managing user registrations and switching the AI provider.

**Functions**:

`getPendingUsers()` → `GET /api/admin/users/pending`
Returns list of users with `accountStatus = PENDING`.

`approveUser(id)` → `PUT /api/admin/users/{id}/approve`
Approves a pending user — they can now log in.

`rejectUser(id)` → `PUT /api/admin/users/{id}/reject`
Rejects a pending user.

`getAiProvider()` → `GET /api/admin/ai-provider`
Returns the currently active AI provider name (`"groq"`, `"gemini"`, etc.).

`setAiProvider(provider)` → `PUT /api/admin/ai-provider`
Switches the active AI provider. The next task submission will use the new provider.

---

## 9. Internationalization — i18n

The app supports three languages: **English**, **Français**, and **العربية** (Arabic). Two types of content are translated:
1. **Static UI labels** (buttons, headings, field names) — pre-translated in a dictionary
2. **Dynamic AI text** (task descriptions, reasoning, industry context) — translated on-demand via API

---

### `i18n/LanguageContext.jsx`
**Role**: The language system's control center. Provides the current language and translation functions to the entire app via React Context.
Think of it like a language setting on your phone — one setting changes the language everywhere.

**Key concepts**:
- `createContext()` creates a shared "channel" that any component can subscribe to
- `LanguageProvider` wraps the whole app in `App.jsx` and makes `{ language, setLanguage, t, translateText }` available everywhere
- `t(key)` — looks up a static UI label by key in the current language dictionary. Returns the label in EN/FR/AR.
- `translateText(text, targetLang)` — calls the MyMemory API to translate dynamic content (AI-generated text) on-demand

**Arabic RTL support**:
When the user switches to Arabic, `document.documentElement.dir = 'rtl'` and `document.documentElement.lang = 'ar'` are set — the entire browser layout flips to right-to-left automatically.

**Static labels (`UI_LABELS` object)**:
Contains ~460 translation keys in this format:
```javascript
{
  'submit_task': { en: 'Submit Task', fr: 'Soumettre une tâche', ar: 'إرسال مهمة' },
  'dashboard': { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' },
  // ... 458 more keys
}
```

---

### `i18n/translateService.js`
**Role**: Translates arbitrary text (AI-generated content) to the selected language using the free MyMemory translation API. Includes a cache to avoid re-translating the same text.

**Key concepts**:
- **MyMemory API**: A free translation API — no API key required for anonymous use (limited to 1000 words/day)
- **Chunking**: Long text is split into 500-character chunks before translating, because the API has a character limit per request
- **Cache**: Already-translated text is stored in a `Map` so the same sentence is never translated twice in a session
- If translation fails, the original (English) text is returned as a fallback

---

### `i18n/AutoTranslate.jsx`
**Role**: A component that automatically translates its `text` prop to the current language when it renders.

```jsx
<AutoTranslate text={task.industryContext} />
// Shows the text in the current language automatically
```

**Key concept**: It uses `useEffect` to watch for language changes — when the user switches language, it re-translates all visible `AutoTranslate` components.

---

## 10. Layout Components

### `components/layout/PageWrapper.jsx`
**Role**: The master layout for all authenticated pages. Renders the sidebar on the left and the current page content on the right. Every protected route is wrapped in this so the navigation stays consistent.
Think of it like the shell of a desktop app — the sidebar is always there, and only the main content area changes when you navigate.

**Key concepts**:
- Uses React Router's `<Outlet />` — this is a placeholder where the current page component renders. The `PageWrapper` itself never changes; only the Outlet content swaps.
- Passes `user` from the auth store to the `Sidebar` so it can display the username and role.
- Handles the sidebar's collapsed/expanded state (on mobile).

---

### `components/layout/Sidebar.jsx`
**Role**: The main navigation component. Shows the app logo, navigation links, user profile info, language switcher, and logout button.
Think of it like the menu in a desktop application — always visible, always consistent.

**Key concepts**:
- Navigation links use React Router's `<NavLink>` — it automatically adds an active style to the link for the current page
- Each link has an icon (from Lucide React), a label (translated via `t()`), and a path
- **Language switcher**: Three flag buttons (EN / FR / AR) that call `setLanguage()` from `LanguageContext`
- **Logout**: Calls `authStore.logout()` which clears the token and state, then `navigate('/login')`
- Role-based visibility: the Admin link only appears if `user.role === 'ADMIN'`

**Navigation links**:
| Icon | Label | Path | Who sees it |
|------|-------|------|-------------|
| BarChart | Dashboard | /dashboard | Everyone |
| Plus | Submit Task | /tasks | Everyone |
| List | Backlog | /backlog | Everyone |
| Brain | AI Scoring | /scoring | Everyone |
| Download | Export | /export | Everyone |
| Settings | Settings | /settings | Everyone |
| Shield | Admin | /admin | ADMIN only |

---

## 11. Pages

### `pages/Login.jsx`
**Role**: The authentication entry point. A split-panel design — left panel shows the Attijari brand, right panel has the login form.
Think of it like the front door of a bank branch — professional, branded, and the first thing every user sees.

**Key concepts**:
- Reads `isAuthenticated` from `authStore` — if already logged in, redirects to `/dashboard` immediately (prevents logged-in users from seeing the login page)
- Uses `useNavigate()` to programmatically go to `/dashboard` after successful login
- Password field has a show/hide toggle via a `useState` boolean
- Displays error messages from `authStore.error` (e.g., "Account pending approval", "Invalid credentials")
- "Remember me" checkbox is UI-only (the JWT itself has a 24h expiry regardless)
- Link to `/register` for new users

**State**:
```javascript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
```

---

### `pages/Register.jsx`
**Role**: New user registration form. Collects name, email, password, role, and an optional profile photo. After submission, the user sees a success message telling them to wait for admin approval.

**Key concepts**:
- **Photo upload**: Uses an `<input type="file" accept="image/*">` hidden behind a styled button. The selected image is previewed using `URL.createObjectURL(file)` — this creates a temporary local URL so you can show the image before uploading.
- **FormData**: Because the request includes both JSON (user data) and a file (photo), it uses `multipart/form-data`. The JSON is appended as a `Blob` with `application/json` MIME type.
- **Password confirmation**: Validates that `password === confirmPassword` before submission
- **Password strength bar**: Calls a client-side function that checks length, uppercase, numbers, and special characters — same logic as the backend `PasswordStrengthUtil`
- **Role selector**: Dropdown with the four non-admin roles (DEVELOPER, ERP_TEAM, PRODUCT_TEAM, IT_MANAGER)

---

### `pages/Dashboard.jsx`
**Role**: The management overview page. Shows KPI cards, charts, DORA stats, a recent task table, and a MoSCoW distribution bar — all fetched from the backend on load.
Think of it like an executive summary — one page with all the important numbers at a glance.

**Key concepts**:
- Uses `Promise.all()` to fetch stats, tasks, and DORA data in parallel — faster than sequential requests
- **KPI cards**: Total tasks, AI scored, Must-priority tasks, average final score, pending tasks, overridden tasks — each a simple number derived from the API response
- **MoSCoW distribution bar**: A flex bar showing the proportion of Must/Should/Could/Won't tasks. Compares against a 60/20/20 target ratio and shows a color indicator (on-target = green, off-target = red).
- **Pie chart** (Recharts `PieChart`): MoSCoW label distribution with custom colors
- **Bar chart** (Recharts `BarChart`): Top 5 tasks by final score, colored by MoSCoW label
- **Recent tasks table**: Top 10 tasks sorted by score, showing rank, title, type, MoSCoW, and score
- **DORA panel**: Shows average lead time days, most common deployment frequency, high-risk count, and a "Add DORA Metrics" button that opens `DoraModal`

**State**:
```javascript
const [stats, setStats] = useState(null);
const [tasks, setTasks] = useState([]);
const [doraData, setDoraData] = useState([]);
const [showDoraModal, setShowDoraModal] = useState(false);
const [loading, setLoading] = useState(true);
```

---

### `pages/Tasks.jsx`
**Role**: The task submission form. Users fill in a title, description, and task type, then submit. The backend triggers AI scoring immediately and returns the score — so the user sees the result right after submitting.
Think of it like submitting a support ticket — you fill in the details, hit submit, and get an instant AI-generated analysis back.

**Key concepts**:
- **Task type pills**: Fetched from `/api/tasks/types` on load. Displayed as clickable colored pills, not a dropdown. Clicking one sets `selectedTypeId`.
- **Submission flow**: `submitTask()` → backend scores → `TaskResponse` returned → shown as a success card below the form
- **Score result display**: After submission, shows a card with the final score, Kano category, MoSCoW label, reach/impact/confidence/effort bars, and the AI's reasoning. This instant feedback loop is a key UX feature.
- **Form reset**: After submission, the form clears so the user can submit another task immediately
- **Validation**: Title and description must not be empty, a task type must be selected — checked client-side before calling the API

---

### `pages/Backlog.jsx`
**Role**: The full ranked task backlog. Shows every task as a card, sortable and filterable by MoSCoW label. Cards expand to show the full AI analysis.
Think of it like a Jira backlog view — all tickets in one place, with the most important ones at the top.

**Key concepts**:
- **Expandable cards**: Each task card has a collapsed summary row (title, type, MoSCoW badge, score) and an expanded detail view (description, RICE breakdown, AI reasoning, industry context, override history). Click to toggle.
- **`expandedId` state**: Only one card can be expanded at a time. Stores the ID of the expanded task.
- **Lazy translation**: When a card expands, if the language is not English, the description, reasoning, and industry context are translated via `translateText()`. The translation is cached so switching back to English and re-expanding is instant.
- **MoSCoW filter**: Buttons (ALL / MUST / SHOULD / COULD / WONT) that filter the displayed tasks. Applied client-side — no extra API call.
- **Sorting**: Tasks sorted by `finalScore` descending — highest priority at the top.
- **Admin delete**: A delete button appears on cards when the user is an ADMIN. Shows a confirmation dialog before calling `deleteTask(id)`.
- **RICE bars**: Horizontal progress bars showing reach, impact, confidence (green/orange/red based on value), effort (inverted scale).
- **Override button**: Opens `OverrideModal` for the selected task (visible to IT_MANAGER and ADMIN).

---

### `pages/Scoring.jsx`
**Role**: A focused view of AI-scored tasks only (status = `AI_SCORED`). Compared to Backlog, it uses a wider 3-column expanded layout to show more information simultaneously.

**Key concepts**:
- Filters tasks to only show those with an AI score — pending tasks are excluded
- Expanded view shows: column 1 (description + industry context), column 2 (RICE breakdown + score formula), column 3 (AI reasoning for Kano and MoSCoW)
- Same override and translation capabilities as Backlog

---

### `pages/Admin.jsx`
**Role**: The admin control panel. Allows admins to approve or reject pending user registrations and switch the active AI provider.
Think of it like an HR management portal — you see who's waiting for access and can grant or deny it.

**Key concepts**:
- **Pending users list**: Fetched on load. Each user card shows name, email, role, registration date, and email verification status. Two buttons: Approve ✓ and Reject ✗.
- **Optimistic UI update**: After approving or rejecting, the user is immediately removed from the list without waiting for a re-fetch. Makes the UI feel instant.
- **AI Provider selector**: Four buttons (Groq / Gemini / Mistral / Ollama). The current provider is highlighted. Clicking one calls `setAiProvider()` and shows a success toast.
- **Toast notifications**: Fixed top-right notifications with color coding (green = success, red = error) and 4-second auto-dismiss.
- **Access control**: The entire page is behind `<AdminRoute>` — non-admins never see it.

**State**:
```javascript
const [pendingUsers, setPendingUsers] = useState([]);
const [currentProvider, setCurrentProvider] = useState('');
const [notification, setNotification] = useState(null);
const [loading, setLoading] = useState(true);
```

---

### `pages/Export.jsx`
**Role**: Provides download buttons for Excel and PDF reports of the full backlog.
Think of it like a print/export menu — you pick the format and the file downloads.

**Key concepts**:
- **Binary download**: The backend returns raw bytes (`byte[]`). The frontend receives them as a `Blob`, creates a temporary object URL, programmatically clicks a hidden `<a>` tag to trigger the download, then revokes the URL.
```javascript
const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats...' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'priorit-backlog.xlsx';
a.click();
URL.revokeObjectURL(url);
```
- `axios` must be called with `responseType: 'arraybuffer'` — without this, the binary data gets corrupted by text encoding.
- Shows a loading spinner and disables the button during download to prevent double-clicks.

---

### `pages/Settings.jsx`
**Role**: User profile and preferences page. Organized into four tabs: Profile, Permissions, AI Scoring Config, and Notifications/Localization.
Think of it like the settings panel of any web app — personalization and account management in one place.

**Key concepts**:
- **Tab navigation**: `activeTab` state string (`'profile'`, `'permissions'`, `'ai'`, `'notifications'`). Only the active tab's content renders.
- **Profile tab**: Shows name (editable), email (read-only), role badge, profile photo, and a password change form. The photo displays from the `photoPath` returned by the backend.
- **Permissions tab**: A read-only table showing which features each role can access. Derived from the user's current role — no API call needed.
- **AI Config tab**: Displays the current AI provider, model name, endpoint, and the multiplier table (Kano and MoSCoW multipliers) — read-only, informational.
- **Notifications tab**: Toggle switches for notification types (task scored, overridden, etc.) and a language/timezone selector. Language change calls `setLanguage()` from `LanguageContext`.

---

## 12. Modal Components

### `components/dashboard/DoraModal.jsx`
**Role**: A form overlay for entering DORA (DevOps Research and Assessment) metrics for a specific task. Appears as a fixed-position overlay on top of the dashboard.
Think of it like a pop-up form — the background is still visible but darkened, and focus is on the form.

**Key concepts**:
- **Backdrop**: A `position: fixed, inset: 0` div with semi-transparent background (`rgba(0,0,0,0.5)`) — clicking it closes the modal
- **Task selector**: Dropdown to select which task the DORA metrics apply to
- **Fields**:
  - `estimatedLeadTimeDays` — number input
  - `deploymentFreq` — select: `MULTIPLE_PER_DAY`, `DAILY`, `WEEKLY`, `MONTHLY`, `LESS_THAN_MONTHLY`
  - `changeFailureRisk` — select: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
  - `recoveryPlan` — textarea
- Calls `doraService.saveDoraIndicator(data)` on submit, then calls `onSave()` prop to refresh the dashboard

---

### `components/scoring/OverrideModal.jsx`
**Role**: Allows IT managers to override specific AI-scored fields on a task. Requires a written justification and an explicit confirmation checkbox before submitting.
Think of it like a formal change request form — you can't just change a number; you have to explain why and confirm you understand this creates a permanent record.

**Key concepts**:
- **Field selector**: Dropdown to pick which field to override (`KANO_CATEGORY`, `MOSCOW_LABEL`, `REACH`, `IMPACT`, `CONFIDENCE`, `EFFORT`)
- **Dynamic input**: The value input changes based on the selected field:
  - For `KANO_CATEGORY` → dropdown with Kano options
  - For `MOSCOW_LABEL` → dropdown with MoSCoW options
  - For numeric fields (reach, impact, etc.) → number input with range validation
- **Justification**: Textarea with a 20-character minimum enforced before the submit button enables
- **Confirmation checkbox**: Must be checked before submitting — prevents accidental overrides
- **Audit trail note**: Displays a warning that the change will be permanently logged with the manager's name and timestamp
- Calls `overrideService.createOverride(data)` on submit, then refreshes the task's score display

---

## 13. Styling System

### Approach
The project uses **inline styles** (JavaScript objects) alongside **Tailwind CSS** utility classes. Most layout and spacing is done with Tailwind; component-specific styles (colors, borders, custom shadows) are inline.

### Brand Colors
```
Primary Red    #CC2027   → buttons, active links, focus rings, badges
Primary Navy   #1A1A2E   → sidebar background, dark panels
Orange Accent  #F5A623   → warnings, confidence highlights
Light BG       #F4F6F9   → page background
Success Green  #10B981   → approved badges, high scores, success toasts
Warning Orange #F59E0B   → medium risk, SHOULD labels
Error Red      #EF4444   → rejected badges, low scores, error toasts
Info Blue      #3B82F6   → COULD labels, info toasts
```

### Typography
- **Font**: Inter (loaded from Google Fonts) — weights 400, 500, 600, 700
- Headings: 600–700 weight
- Body: 400 weight, `#374151` (dark gray)
- Secondary text: `#6B7280` (medium gray)

### Layout Patterns
- **Sidebar**: Fixed left, 240px wide, full height, navy background
- **Main content**: Left margin 240px, fills remaining width
- **Page padding**: `24px` on all sides
- **Cards**: White background, `borderRadius: 12px`, `boxShadow: 0 1px 3px rgba(0,0,0,0.1)`
- **Responsive grid**: `display: grid, gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr))` for KPI cards

### MoSCoW Badge Colors
| Label | Background | Text |
|-------|-----------|------|
| MUST | `#FEE2E2` | `#DC2626` |
| SHOULD | `#FEF3C7` | `#D97706` |
| COULD | `#DBEAFE` | `#2563EB` |
| WONT | `#F3F4F6` | `#6B7280` |

### Kano Badge Colors
| Category | Background | Text |
|----------|-----------|------|
| BASIC | `#FEE2E2` | `#DC2626` |
| PERFORMANCE | `#DBEAFE` | `#2563EB` |
| DELIGHTER | `#D1FAE5` | `#059669` |
| INDIFFERENT | `#F3F4F6` | `#6B7280` |
| REVERSE | `#FEF3C7` | `#D97706` |

---

## 14. API Calls Summary

All calls go to `http://localhost:8080`. JWT token is automatically added to every request by the axios interceptor in `api.js`.

| Service File | Method | Endpoint | Used By |
|-------------|--------|----------|---------|
| authService | POST | `/api/auth/register` | Register.jsx |
| authService | POST | `/api/auth/login` | authStore.js |
| taskService | GET | `/api/tasks` | Backlog.jsx, Scoring.jsx |
| taskService | GET | `/api/tasks/my` | Tasks.jsx |
| taskService | GET | `/api/tasks/types` | Tasks.jsx |
| taskService | POST | `/api/tasks` | Tasks.jsx |
| taskService | DELETE | `/api/tasks/{id}` | Backlog.jsx |
| doraService | GET | `/api/dora` | Dashboard.jsx |
| doraService | GET | `/api/dora/summary` | Dashboard.jsx |
| doraService | POST | `/api/dora` | DoraModal.jsx |
| overrideService | GET | `/api/overrides` | Scoring.jsx |
| overrideService | GET | `/api/overrides/task/{id}` | Backlog.jsx |
| overrideService | POST | `/api/overrides` | OverrideModal.jsx |
| adminService | GET | `/api/admin/users/pending` | Admin.jsx |
| adminService | PUT | `/api/admin/users/{id}/approve` | Admin.jsx |
| adminService | PUT | `/api/admin/users/{id}/reject` | Admin.jsx |
| adminService | GET | `/api/admin/ai-provider` | Admin.jsx, Settings.jsx |
| adminService | PUT | `/api/admin/ai-provider` | Admin.jsx |
| api.js (direct) | GET | `/api/dashboard/stats` | Dashboard.jsx |
| api.js (direct) | GET | `/api/export/excel` | Export.jsx |
| api.js (direct) | GET | `/api/export/pdf` | Export.jsx |
