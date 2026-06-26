# PriorIT Frontend — Annotation & Documentation

---

## What is this project?

**PriorIT** is a web application built for **Attijari Bank Tunisia**.

The problem it solves: teams have dozens of tasks and bugs, and nobody agrees on which one to fix first. PriorIT fixes this by letting team members submit a task, and then an **AI automatically scores it** using real frameworks used by product teams around the world.

The result is a **ranked list** — the most important task is always at the top, and the score is explained so anyone can understand why.

Think of it like a **smart to-do list** where the AI acts as a neutral referee that decides priority based on logic, not opinion.

---

## The scoring system

PriorIT uses two frameworks layered on top of each other:

**RICE Score** — a formula: `(Reach × Impact × Confidence) ÷ Effort`
- Reach = how many users are affected
- Impact = how much it improves their experience
- Confidence = how sure the AI is about the score
- Effort = how hard it is to build

**Kano × MoSCoW Multiplier** — applied on top of the RICE score to push critical tasks higher:
- Kano asks: "How would users react if this feature was missing?"
- MoSCoW asks: "Is this a Must, Should, Could, or Won't?"

**Final Score = RICE Score × Kano Multiplier × MoSCoW Multiplier**

---

## Libraries used

**React** — the main framework. Every screen (login, dashboard, backlog...) is a React component. Think of components like LEGO bricks — you build small pieces and combine them into a full page.

**React Router DOM** — handles navigation between pages without reloading the browser. When you click "Backlog" in the sidebar, React Router swaps the content without a full page refresh.

**Axios** — the tool used to talk to the backend server. Every time the app needs data (tasks, users, scores), it sends a request through Axios. Think of it like a waiter — it takes your order to the kitchen (backend) and brings back the food (data).

**Zustand** — stores the logged-in user's information (name, role, token) and makes it accessible from any component. Think of it like a shared clipboard — any part of the app can read or write to it.

**Recharts** — the library that draws the charts on the Dashboard page. The pie chart (MoSCoW distribution) and bar chart (top 5 tasks) are both built with this.

**Lucide React** — a library of icons. Every small icon in the interface (the trash bin, the brain, the chevron arrows, the shield) comes from here.

**Vite** — the tool that runs the project locally during development and builds it for production. It replaced the older Create React App and is much faster.

**Tailwind CSS** — a styling library. Mostly available in this project but styles are written as inline JavaScript objects throughout the components instead.

**MyMemory API** — a free external translation service. When a user switches the language to French or Arabic, the AI-generated text (scoring explanations) gets sent to this API and comes back translated.

---
---

# Files — One by One

---

## `index.html`

**Role:** The one HTML file that the browser loads. It contains a single `<div id="root">` — an empty container. React fills that container with the entire application.

Without this file, the browser has nothing to open.

**Key concept:**

**Single Page Application (SPA)** — instead of loading a new HTML file every time you navigate, React swaps content inside that one `<div>`. The page never actually reloads. This makes the app feel fast like a desktop application.

---

## `src/main.jsx`

**Role:** The starting gun. This file tells React "take the App component and put it inside the `<div id="root">` from index.html." It runs once when the app first loads.

Think of it like turning the key in a car — it starts the engine but you don't interact with it after that.

**Key concepts:**

**`createRoot`** — the React function that connects React to the HTML page.

**`StrictMode`** — a React development tool that runs every component twice to help catch bugs early. It has no effect in production.

---

## `src/App.jsx`

**Role:** The traffic controller. Decides which page to show based on the URL. Also defines the two security rules that protect pages from unauthorized access.

Think of it like a building reception desk — it checks your badge before letting you through each door.

**Key concepts:**

**`ProtectedRoute`** — a wrapper that checks if the user is logged in before showing a page. If not logged in, it sends them to `/login` instead.

**`AdminRoute`** — a stricter wrapper. It checks both that the user is logged in AND that their role is `ADMIN`. Anyone else gets redirected to `/dashboard`.

**Routes defined:**

| URL | Page shown | Who can access |
|---|---|---|
| `/login` | Login page | Everyone |
| `/register` | Register page | Everyone |
| `/dashboard` | Dashboard | Logged-in users |
| `/tasks` | Submit a task | Logged-in users |
| `/backlog` | Full task list | Logged-in users |
| `/scoring` | AI scoring details | Logged-in users |
| `/reports` | Export page | Logged-in users |
| `/settings` | Settings | Logged-in users |
| `/admin` | Admin panel | ADMIN role only |

---
---

# Store

---

## `src/store/authStore.js`

**Role:** Holds the currently logged-in user's information (name, email, role) and makes it available to every component in the app without passing it manually from parent to child.

Think of it like a **whiteboard in the office** — anyone can look at it and see who is currently logged in.

**Key concepts:**

**Zustand** — the library used to create this store. It is much simpler than Redux (the traditional alternative). You define the data and the actions that change it, and any component can subscribe to it.

**`user`** — the object stored. Contains: `name`, `email`, `role`, `emailVerified`, `photoPath`.

**`isAuthenticated`** — a boolean (true/false). The route guards read this to decide whether to show a page or redirect to login.

**`login(email, password)`** — calls the backend, gets the user data back, and saves it to the store.

**`logout()`** — clears the store and wipes localStorage so the session ends.

**Persistence** — on app start, the store reads from `localStorage` so the user stays logged in even after refreshing the page.

---
---

# Services

Services are JavaScript files whose only job is to talk to the backend API. They are not components — they have no visual output. They just send requests and return data.

---

## `src/services/api.js`

**Role:** Creates a pre-configured HTTP client that every other service uses. It handles two things automatically so you never have to think about them:

1. **Attaches the JWT token** to every request — so you never forget to send your "ID card" with each call.
2. **Handles expired sessions** — if the server replies with 401 (token expired), it automatically sends the user back to the login page.

Think of it like a **company messenger**: every time you send a letter to the backend, the messenger automatically stamps it with your security badge. If the building rejects the badge, the messenger escorts you back to reception.

**Key concepts:**

**`axios.create`** — creates an Axios instance pointed at `http://localhost:8080` (the backend address).

**Request interceptor** — a function that runs before every API call. It reads the token from localStorage and adds it to the request headers.

**Response interceptor** — a function that runs after every API response. It catches 401 errors and redirects to `/login`.

**`Authorization: Bearer <token>`** — the standard format for sending a JWT token in an HTTP header.

---

## `src/services/authService.js`

**Role:** Handles everything related to logging in, registering, and logging out. Also reads the current user from localStorage.

**Key concepts:**

**`register(userData, photo)`** — sends a `multipart/form-data` request to the backend. This format is required because we are sending both JSON data and a photo file in the same request. It is the same format a file upload form uses.

**`login(email, password)`** — sends credentials to the backend. On success, stores the JWT `token` and `user` object in `localStorage` so they survive a page refresh.

**`logout()`** — removes the token and user from `localStorage` and redirects to `/login`. After this, no request will have a valid token.

**`getCurrentUser()`** — reads the user object from `localStorage` and returns it as a JavaScript object.

**`isAuthenticated()`** — returns `true` if a token exists in localStorage. This is used by the route guards in `App.jsx`.

**`isAdmin()`** — returns `true` if the stored user's role is `"ADMIN"`.

---

## `src/services/taskService.js`

**Role:** All API calls related to tasks. Creating, reading, and deleting tasks all go through this file.

| Method | What it calls | What it does |
|---|---|---|
| `getTaskTypes()` | `GET /api/tasks/types` | Loads the list of task categories (Bug, Feature, etc.) |
| `submitTask(data)` | `POST /api/tasks` | Sends a new task to the backend for AI scoring |
| `getAllTasks()` | `GET /api/tasks` | Fetches every task — used by Backlog, Scoring, and Dashboard |
| `getMyTasks()` | `GET /api/tasks/my` | Fetches only the current user's tasks |
| `deleteTask(id)` | `DELETE /api/tasks/:id` | Deletes a task — only admins can do this |

---

## `src/services/adminService.js`

**Role:** All API calls that only an admin can make. Two categories: managing user registrations, and controlling which AI provider scores tasks.

| Method | What it calls | What it does |
|---|---|---|
| `getPendingUsers()` | `GET /api/admin/users/pending` | Lists users waiting for approval |
| `approveUser(id)` | `PUT /api/admin/users/:id/approve` | Grants a user access to the app |
| `rejectUser(id)` | `PUT /api/admin/users/:id/reject` | Rejects a registration request |
| `getAiProvider()` | `GET /api/admin/ai-provider` | Returns which AI is currently active |
| `setAiProvider(provider)` | `PUT /api/admin/ai-provider` | Switches the AI provider at runtime |

**Key concept:**

**Runtime AI switch** — the admin can change which AI model scores tasks (Groq, Gemini, Mistral, Ollama) without restarting the backend server. The frontend sends the new provider name, and the backend updates an in-memory value immediately.

---

## `src/services/overrideService.js`

**Role:** When a team member disagrees with the AI's score for a task, they can override specific fields (like changing the Kano category or MoSCoW label). This service sends and retrieves those overrides.

**Key concept:**

**Audit trail** — every override is saved with a written justification and a confirmation checkbox. This means nobody can silently change a score — there is always a record of who changed what and why.

| Method | What it calls |
|---|---|
| `createOverride(data)` | `POST /api/overrides` |
| `getTaskOverrides(taskId)` | `GET /api/overrides/task/:id` |
| `getAllOverrides()` | `GET /api/overrides` |

---

## `src/services/doraService.js`

**Role:** Handles DORA metrics. DORA stands for DevOps Research and Assessment — it is a set of 4 measurements that show how healthy a team's delivery process is.

**Key concepts:**

**Lead time** — how long it takes from "task started" to "task in production".

**Deployment frequency** — how often the team releases new versions.

**Change failure rate** — what percentage of deployments cause a problem.

**MTTR (Mean Time to Recovery)** — how long it takes to fix an incident after it happens.

These metrics are attached to specific tasks so the team can see the real delivery cost of each feature.

| Method | What it calls |
|---|---|
| `saveDora(data)` | `POST /api/dora` |
| `getAllDora()` | `GET /api/dora` |
| `getDoraSummary()` | `GET /api/dora/summary` |

---
---

# Pages

---

## `src/pages/Login.jsx`

**Role:** The first screen users see. Split into two columns: the left side shows the PriorIT branding and a feature list, the right side has the login form.

**Key concepts:**

**Eye toggle** — a button on the password field that shows/hides the password by switching the input type between `"password"` and `"text"`.

**`authStore.login()`** — when the form is submitted, it calls the Zustand store's login action, which calls the backend, stores the token, and updates the global state.

After a successful login, the user is redirected to `/dashboard`.

---

## `src/pages/Register.jsx`

**Role:** The registration form for new users. Collects name, email, password, role, and an optional profile photo. After submitting, the account is in "pending" status — an admin must approve it before the user can log in.

**Key concepts:**

**Photo upload** — uses a hidden `<input type="file">` triggered by a styled button. The selected image is shown as a preview using `URL.createObjectURL()` before the form is submitted.

**Password strength meter** — a visual bar that grows and changes color as the password gets stronger (short/weak → medium → strong).

**`multipart/form-data`** — the encoding format used when submitting because the form contains both text fields and a file. Regular JSON cannot carry files.

---

## `src/pages/Dashboard.jsx`

**Role:** The home page after login. Gives a quick overview of everything: how many tasks exist, what the average score is, how confident the AI is, and a breakdown of priorities.

**Key concepts:**

**KPI cards** — four stat boxes at the top (total tasks, average score, average confidence, high-confidence count). KPI stands for Key Performance Indicator.

**`PieChart`** — from Recharts. Shows the MoSCoW distribution (what percentage of tasks are MUST vs SHOULD vs COULD vs WONT).

**`BarChart`** — from Recharts. Shows the top 5 highest-scored tasks as horizontal bars so you can see at a glance what the team should focus on.

**DORA panel** — a summary of the team's delivery health metrics (lead time, deployment frequency, etc.).

---

## `src/pages/Tasks.jsx`

**Role:** The task submission form. Simple and focused — a user picks a task type, writes a title, writes a description, and submits. The AI takes it from there.

**Key concepts:**

**Task type pills** — instead of a dropdown, task types are shown as styled buttons. Each button has a color from the backend (`colorCode` field), so clicking one highlights it in its own color. This is friendlier than a dropdown for a small list of options.

**`taskTypeId`** — the ID sent to the backend to associate the task with a category. The names and colors are fetched from `GET /api/tasks/types` when the page loads.

**AI scoring note** — an informational banner at the bottom explaining that after submission, the AI will handle everything. Sets the right expectations for users.

---

## `src/pages/Backlog.jsx`

**Role:** The main working view of the application. Shows all tasks ranked by their final score — highest priority at the top. Each task is a card you can expand to see more details.

**Key concepts:**

**`BacklogTaskCard`** — the card component. Collapsed by default, shows title, status, Kano/MoSCoW badges, and a score bar. When expanded, shows description, RICE breakdown, AI reasoning, and multiplier formula.

**MoSCoW ratio bar** — a colored horizontal bar at the top of the page showing the proportion of MUST / SHOULD / COULD / WONT tasks. If too many tasks are MUST, the team knows something is wrong with their prioritization.

**Multiplier fallback** — the backend returns a field called `multiplierApplied`. If that field is missing from the response, the frontend computes it locally:
`multiplier = KANO_MULTIPLIERS[kanoCategory] × MOSCOW_MULTIPLIERS[moscowLabel]`

**Delete button (admin only)** — only visible when the logged-in user has the `ADMIN` role. Asks for confirmation, then removes the task from the list immediately without waiting for a page reload.

**Override button** — opens `OverrideModal`. Only shown on scored tasks.

**DORA button** — opens `DoraModal`. Only shown on scored tasks.

---

## `src/pages/Scoring.jsx`

**Role:** A read-only deep-dive into the AI scoring. Shows the same tasks as the Backlog but with full transparency — the AI's reasoning for every decision is visible.

**Key concepts:**

**Three-column expanded layout** — when a card is expanded:
- Column 1: task description + industry context
- Column 2: RICE variables as bars (Reach, Impact, Confidence, Effort)
- Column 3: AI reasoning for the Kano and MoSCoW decisions

**`modelUsed` badge** — a small blue pill (e.g. `🤖 gemini-2.0-flash`) shown on every card so users know which AI provider scored that task. This appears even when the card is collapsed.

**`useTranslatedTask`** — a hook that auto-translates all AI-generated text when the card is expanded. Only runs when needed (lazy translation).

**Filter pills** — two rows of buttons to filter by Kano category and MoSCoW label.

---

## `src/pages/Admin.jsx`

**Role:** The admin control panel. Only reachable by users with the `ADMIN` role. Has two sections: approving or rejecting user registrations, and choosing which AI provider the backend uses for scoring.

**Key concepts:**

**Pending users** — when someone registers, their account is not active until an admin approves it. This page shows the waiting list with Approve (green) and Reject (red) buttons.

**AI provider selector** — four buttons (Groq, Gemini, Mistral, Ollama), each showing the model name below the label. Clicking one highlights it, and pressing "Save Provider" sends the new selection to the backend. The switch takes effect immediately — no server restart needed.

**Notification toast** — a small pop-up in the top-right corner that appears for 4 seconds after an action (approve, reject, or save provider) to confirm what happened.

---

## `src/pages/Export.jsx`

**Role:** Lets users download the task backlog as a file. Supports Excel (.xlsx) for data analysis and PDF for sharing with stakeholders.

**Key concept:**

**Export formats** — Excel is useful for filtering and sorting data in spreadsheet tools. PDF is useful for presenting in meetings or sending by email without formatting getting broken.

---

## `src/pages/Settings.jsx`

**Role:** The user preferences page. Split into five sections using an inner sidebar: Profile, Permissions, AI Config, Notifications, and Language.

**Key concepts:**

**Profile editing (admin only)** — fields like name and role are read-only for regular users. Only admins can change them. This prevents people from promoting themselves.

**Permissions table** — a matrix showing which features each role (Developer, ERP Team, Product Team, IT Manager, Admin) can access. Read-only — it is for information, not configuration.

**Notification toggles** — on/off switches for email and in-app notifications. Standard toggle UI pattern.

**Language selector** — switches the UI between English, French, and Arabic. Arabic also flips the layout direction to right-to-left (RTL).

---
---

# Layout Components

These are not pages — they are reusable building blocks that every page uses.

---

## `src/components/layout/Sidebar.jsx`

**Role:** The fixed left navigation bar that is visible on every page after login. Contains the nav links, the language switcher, the logged-in user's name and role, and the logout button.

**Key concepts:**

**Active route highlighting** — the current page's link is highlighted using `useLocation()` from React Router, which tells the component what the current URL is.

**Admin section** — the "Admin" link only appears in the sidebar when `user.role === 'ADMIN'`. Other users never see it.

**Language switcher** — three buttons (EN / FR / AR) that call `setLanguage()` from the i18n context. Changing language updates all static UI labels instantly.

**RTL** — when Arabic is selected, the sidebar mirrors to the right side of the screen and text alignment flips.

---

## `src/components/layout/PageWrapper.jsx`

**Role:** The shell that every page is wrapped in. It places the `<Sidebar>` on the left, a header with the page title and subtitle at the top, and the page content below. Every page uses it so the layout stays consistent without repeating code.

Think of it like a picture frame — every page is the picture, and `PageWrapper` is the frame.

**Key concept:**

**`dir="rtl"`** — when Arabic is the selected language, this attribute on the wrapper div flips the entire layout to right-to-left, including text direction, padding, and flex alignment.

---
---

# Modal Components

Modals are pop-up dialogs that appear on top of the page. They are separate components because they are reused across multiple pages.

---

## `src/components/scoring/OverrideModal.jsx`

**Role:** Lets an authorized user manually correct one of the AI's decisions. For example: the AI assigned "Indifferent" as the Kano category, but the team knows it should be "Basic Need". They open this modal, select the field, enter the correct value, write why they are changing it, check a confirmation box, and submit.

**Key concepts:**

**Field selector** — a dropdown to choose which field to override: `KANO_CATEGORY`, `MOSCOW_LABEL`, `REACH`, `IMPACT`, `CONFIDENCE`, or `EFFORT`.

**Current value display** — shows the AI's current value next to the input for the new value, so the user can compare before changing.

**Justification** — a required text area. The team must explain the reason for the override. This is saved permanently as part of the audit trail.

**Confirmation checkbox** — a "I confirm this override is correct" checkbox. The submit button is disabled until it is checked. Prevents accidental submissions.

---

## `src/components/dashboard/DoraModal.jsx`

**Role:** A form attached to a specific task for recording delivery performance data. Helps the team see how efficiently they actually ship work, beyond just scoring importance.

**Key concepts:**

**Lead time** — a number input for how many days it took from starting the task to deploying it.

**Deployment frequency** — pill buttons (Daily / Weekly / Monthly / On demand) for how often this type of work gets deployed.

**Change failure risk** — a grid selector for the estimated risk that this deployment could cause a production issue.

**Recovery plan** — a text field for what the team would do if something goes wrong after deployment.

---
---

# Internationalization (i18n)

i18n is short for "internationalization" — making the app work in multiple languages.

---

## `src/i18n/LanguageContext.jsx`

**Role:** The multilingual engine of the app. Provides English, French, and Arabic translations for every UI label. Makes the `t()` function available to every component so they can display the correct text for the selected language.

Think of it like a **phrase book** — instead of hardcoding "Submit" in English everywhere, components call `t('submit')` and the phrase book returns "Submit", "Soumettre", or "إرسال" depending on the language setting.

**Key concepts:**

**`LanguageContext`** — a React Context. Contexts are a way to share data with all components in the app without passing it as a prop through every level.

**`useLanguage()` hook** — what any component calls to get the `t(key)` translation function and to read or change the current language.

**`useTranslatedTask(task, isExpanded)` hook** — a special hook used in the Backlog and Scoring cards. When a card is expanded, it sends the AI-generated text (kanoReasoning, moscowReasoning, industryContext, description) to the translation API and returns the translated version. Results are cached so the same text is never translated twice in the same session.

**Static labels** — things like button text, page titles, and column headers. These are stored in a JavaScript dictionary in this file and switch instantly.

**Dynamic AI text** — the reasoning paragraphs generated by the AI. These are too long and unpredictable to translate manually, so they are sent to the MyMemory API.

---

## `src/i18n/translateService.js`

**Role:** The low-level translation tool. Sends text to the free MyMemory translation API and returns the translated version. Handles two problems that come up in practice:

1. The API has a 500-character limit per request — so this service automatically splits long texts into chunks, translates each chunk separately, and joins them back together.
2. The same text might be requested multiple times — so this service caches every result in memory. The second time the same text is requested, it returns the cached version instantly without calling the API again.

**Key concepts:**

**MyMemory API** — a free public translation service. The URL is `https://api.mymemory.translated.net/get`. It supports English → French (`en|fr`) and English → Arabic (`en|ar`). Free tier limit: approximately 1000 words per day.

**Chunking** — splitting a long string into 500-character pieces at word boundaries so the API accepts it.

**In-memory cache** — a JavaScript `Map` (key = `"text|targetLang"`, value = translated text) that lives as long as the browser tab is open. Prevents redundant API calls.

**Graceful fallback** — if the translation API fails for any reason, the original English text is returned unchanged. The app never crashes or shows blank text because of a failed translation.

---
---

# Authentication Flow — Step by Step

```
1. User opens the app → App.jsx checks: is there a token in localStorage?

2. No token → ProtectedRoute redirects to /login

3. User enters email + password → Login.jsx calls authStore.login()

4. authStore.login() calls authService.login()
   which calls POST /api/auth/login on the backend

5. Backend checks credentials → returns { token, name, email, role, ... }

6. authService saves token and user to localStorage
   authStore updates its state: isAuthenticated = true, user = {...}

7. React redirects to /dashboard

8. Every future API call → api.js interceptor reads token from localStorage
   and adds: Authorization: Bearer <token> to the request header

9. Token expires after 24 hours → backend returns 401
   api.js interceptor catches it → redirects to /login → user logs in again
```

---

# Role System

New users register and are placed in **pending** status. They cannot log in until an admin approves them.

| Role | What they can do |
|---|---|
| `DEVELOPER` | Submit tasks, view backlog, view scoring |
| `ERP_TEAM` | Same as Developer |
| `PRODUCT_TEAM` | Same as Developer |
| `IT_MANAGER` | Developer access + additional settings |
| `ADMIN` | Everything + approve/reject users, delete tasks, change AI provider |

The role is stored in the JWT token and checked on both the frontend (route guards, conditional buttons) and the backend (Spring Security `@PreAuthorize`).
