# OutARC — Day 2 Manual Testing Checklist

**Branch:** `feat/a-auth`  
**Purpose:** Verify all Day 1 features work end-to-end before building Day 2.  
**Prereqs:** `.env.local` populated, `npm run dev` running at `http://localhost:3000`, Railway Postgres + Redis reachable.

---

## Legend
- `[ ]` not tested yet  
- `[x]` passed  
- `[!]` failed — note the issue inline

---

## 1. Routing & Auth Guards

### 1A. Unauthenticated redirects
- [ ] Visit `http://localhost:3000/` — should redirect to `/dashboard`, then to `/login`
- [ ] Visit `http://localhost:3000/dashboard` directly — should redirect to `/login?callbackUrl=/dashboard`
- [ ] Visit `http://localhost:3000/dashboard/profile` directly — should redirect to `/login`
- [ ] Visit `http://localhost:3000/dashboard/filters` directly — should redirect to `/login`
- [ ] Visit `http://localhost:3000/dashboard/history` directly — should redirect to `/login`

### 1B. Login page appearance
- [ ] `http://localhost:3000/login` loads without console errors
- [ ] Black background with animated gradient orbs visible
- [ ] "OutARC" brand name and violet "A" logo shown
- [ ] "Continue with Google" button is present and not disabled
- [ ] Footer: "For UW-Madison students (@wisc.edu) only" visible

### 1C. Google OAuth — non-wisc.edu rejection
- [ ] Click "Continue with Google", sign in with a **non-@wisc.edu** Google account
- [ ] Access is denied — not granted dashboard access, redirected back to `/login`

### 1D. Google OAuth — wisc.edu success
- [ ] Click "Continue with Google", sign in with a **@wisc.edu** account
- [ ] Redirected to `/dashboard` after login completes
- [ ] Session cookie `next-auth.session-token` visible in DevTools → Application → Cookies

### 1E. Logged-in redirect away from login
- [ ] While logged in, visit `http://localhost:3000/login` — should redirect to `/dashboard`
- [ ] While logged in, visit `http://localhost:3000/` — should redirect to `/dashboard`

---

## 2. Dashboard Home (`/dashboard`)

- [ ] Page loads without errors
- [ ] Greeting shows your first name (e.g. "Hey, Rithik")
- [ ] Four stat cards are present — all show `0` on a fresh account:
  - [ ] Total Applications
  - [ ] Successful Applications
  - [ ] Active Resumes
  - [ ] Active Filters
- [ ] "Recent Applications" section shows empty state
- [ ] Sidebar visible with navigation links

---

## 3. Sidebar Navigation

- [ ] Click **Profile** — navigates to `/dashboard/profile`
- [ ] Click **Filters** — navigates to `/dashboard/filters`
- [ ] Click **History** — navigates to `/dashboard/history`
- [ ] Click **Dashboard** (or logo) — navigates back to `/dashboard`
- [ ] Active link is visually highlighted

---

## 4. Profile Page (`/dashboard/profile`)

### 4A. Page load
- [ ] Page loads with no errors
- [ ] Name field pre-filled from Google account, disabled/read-only
- [ ] Email field pre-filled from Google account, disabled/read-only
- [ ] Major, Grad Year, LinkedIn, GitHub fields are empty on first visit

### 4B. Save basic profile info
- [ ] Fill in **Major**: `Computer Science`
- [ ] Fill in **Graduation Year**: `2026`
- [ ] Fill in **LinkedIn URL**: `https://linkedin.com/in/testuser`
- [ ] Fill in **GitHub URL**: `https://github.com/testuser`
- [ ] Click **Save Profile**
- [ ] Toast: "Profile saved" appears
- [ ] Reload the page — all four fields retain the saved values

### 4C. Resume upload (PDF)
- [ ] Click **Upload PDF** button
- [ ] Select a valid PDF file
- [ ] Upload spinner appears briefly
- [ ] Resume filename appears in the list with today's date
- [ ] Toast: "Resume uploaded"

### 4D. Resume upload — non-PDF rejection
- [ ] Click **Upload PDF**, select a `.docx` or `.txt` file
- [ ] Toast: "Only PDF files are supported" — file is not uploaded
- [ ] Resume list is unchanged

### 4E. Resume delete
- [ ] Click the trash icon next to a resume
- [ ] Resume disappears from the list immediately
- [ ] Toast: "Resume deleted"
- [ ] Reload page — resume is gone

### 4F. Handshake credentials — validation
- [ ] Leave both fields blank, click **Save Credentials**
- [ ] Toast: "Enter both email and password" — no API call made

### 4G. Handshake credentials — save
- [ ] Enter a valid email (e.g. `yournetid@wisc.edu`) and a password
- [ ] Click the **eye icon** — password becomes visible as plain text
- [ ] Click eye icon again — password is masked
- [ ] Click **Save Credentials**
- [ ] Toast: "Handshake credentials saved"
- [ ] Both fields clear after save
- [ ] Reload page — green "checkmark Credentials saved" indicator appears in the section header
- [ ] Button text changes to **Update Credentials**

### 4H. Handshake credentials — update
- [ ] Enter new email and password
- [ ] Click **Update Credentials**
- [ ] Toast: "Handshake credentials saved"
- [ ] Reload — checkmark still shown (credentials not cleared)

---

## 5. Filters Page (`/dashboard/filters`)

### 5A. Page load
- [ ] Page loads without errors
- [ ] Empty filter list shown on first visit

### 5B. Create a filter
- [ ] Add at least one keyword (e.g. `software`)
- [ ] Add a role (e.g. `Software Engineer Intern`)
- [ ] Set max per day to `5`
- [ ] Submit/save
- [ ] Filter appears in the list
- [ ] Success feedback shown

### 5C. Create a second filter
- [ ] Add a second filter with different keywords
- [ ] Both filters now appear in the list

### 5D. Toggle filter active/inactive
- [ ] Toggle one filter to **inactive**
- [ ] Visual state changes (e.g. greyed out or toggle flips)
- [ ] Reload — the inactive state persists

### 5E. Delete a filter
- [ ] Delete one filter
- [ ] It is removed from the list
- [ ] Reload — it does not reappear

---

## 6. History Page (`/dashboard/history`)

- [ ] Page loads without errors
- [ ] Clock icon and "No applications yet" empty state shown
- [ ] "Set up filters and upload a resume to get started." helper text visible

---

## 7. API Routes

Open DevTools Network tab for these, or use the browser directly for GET requests.

### 7A. Profile API
- [ ] Save profile → DevTools shows POST `/api/profile` returns `200`
- [ ] Response JSON contains `major`, `gradYear`, `linkedin`, `github`
- [ ] Response does **not** contain any password or credential fields

### 7B. Handshake creds API
- [ ] Save credentials → POST `/api/handshake-creds` returns `200 { "success": true }`
- [ ] Response does **not** echo back the password (not even encrypted form)

### 7C. Filters API
- [ ] Create filter → POST `/api/filters` returns `201`
- [ ] Delete filter → DELETE `/api/filters?id=...` returns `200 { "success": true }`
- [ ] GET `/api/filters` returns array of filters

### 7D. Resume API
- [ ] Upload → POST `/api/resume` returns `200` with `{ id, filename, url, isActive, uploadedAt }`
- [ ] Delete → DELETE `/api/resume?id=...` returns `200`

### 7E. Jobs status API (in browser while logged in)
- [ ] Visit `http://localhost:3000/api/jobs/status`
- [ ] Returns `{ "queued": 0, "active": 0, "completed": 0, "failed": 0 }`

### 7F. Unauthenticated API access
Open an incognito window (no session) and visit these URLs directly:
- [ ] `http://localhost:3000/api/profile` — returns `401 Unauthorized`
- [ ] `http://localhost:3000/api/filters` — returns `401 Unauthorized`
- [ ] `http://localhost:3000/api/jobs/status` — returns `401 Unauthorized`
- [ ] `http://localhost:3000/api/handshake-creds` (POST) — returns `401 Unauthorized`

---

## 8. Sign Out

- [ ] Find the sign out option in the sidebar or user menu
- [ ] Click sign out
- [ ] Redirected to `/login`
- [ ] `next-auth.session-token` cookie is gone (check DevTools)
- [ ] Visiting `http://localhost:3000/dashboard` now redirects to `/login`

---

## 9. Database Persistence

After completing sections 4-5, verify data landed in Railway Postgres.  
Go to Railway → your Postgres service → Query (or use a DB client).

- [ ] `SELECT "major", "gradYear", "linkedin", "github", "handshakeCredEnc" FROM "User" LIMIT 1;`
  - [ ] `major`, `gradYear`, `linkedin`, `github` are populated
  - [ ] `handshakeCredEnc` is a long colon-delimited hex string (format: `iv:authTag:ciphertext`) — NOT plaintext

- [ ] `SELECT filename, "isActive" FROM "Resume" LIMIT 5;`
  - [ ] Uploaded resume appears with correct filename

- [ ] `SELECT keywords, roles, "maxPerDay", "isActive" FROM "JobFilter" LIMIT 5;`
  - [ ] Created filters appear with correct values

---

## 10. Edge Cases & Validation

- [ ] **Grad year out of range**: Enter `1999` in Graduation Year and save — should be blocked or return a validation error
- [ ] **Handshake email invalid**: Enter `notanemail` in the Handshake email field and save — should return an error toast
- [ ] **Jobs trigger — no filters**: Delete all active filters, then POST to `http://localhost:3000/api/jobs/trigger` (from DevTools or Postman while logged in) — should return `400 { "error": "No active filters set" }`
- [ ] **Jobs trigger — no resume**: (If resume was deleted) Trigger a job — verify behavior is graceful

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Routing & auth guards | | |
| Login page appearance | | |
| Google OAuth rejection (non-wisc) | | |
| Google OAuth success (wisc.edu) | | |
| Dashboard home & stats | | |
| Sidebar navigation | | |
| Profile — basic info save | | |
| Profile — resume upload & delete | | |
| Profile — Handshake credentials | | |
| Filters CRUD | | |
| History empty state | | |
| API responses & status codes | | |
| Unauthenticated API blocks | | |
| Sign out | | |
| DB persistence check | | |
| Edge cases & validation | | |

---

*Mark any `[!]` items as bugs and fix before starting Day 2 features.*
