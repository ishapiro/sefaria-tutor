# Support Ticket System — Design Document

## Overview

A simple support ticket system for Shoresh that allows registered users to submit tickets and admins to manage them. The system integrates with the existing auth flow, admin panel, and Resend email infrastructure.

---

## 1. User Flow Summary

| Actor | Action | Outcome |
|-------|--------|---------|
| **Anonymous user** | Clicks Support button | Modal: "Support is for registered users. Registration is free and only requires an email. Register via Login page." |
| **Logged-in user** | Clicks Support button | Modal with two options: **Existing tickets** / **New ticket** |
| **Logged-in user** | Clicks Existing tickets | List of their tickets (subject, status, date) |
| **Logged-in user** | Clicks New ticket | Form: email (read-only), page (read-only), checkboxes (bug/suggestion/help), description, status=new (read-only) |
| **Admin** | Visits Admin page | New section: Support Tickets — list all tickets, add reply, change status |
| **System** | New ticket created | Email to shoresh@cogitations.com and to user |
| **System** | Ticket updated or status changed | Email to user |

---

## 2. UI / Layout Design

### 2.1 Header — Support Button

**Location:** `layouts/default.vue`, in the header nav area

```
[ Cogitations logo ] [ Shoresh ]     ...  [ Support ] [ Login ] / [ displayName ] [ Logout ]
```

- **Support** button sits to the **left** of the Login/Logout area.
- Styling: Match existing nav links (`text-xs sm:text-sm font-medium text-gray-700 hover:text-indigo-600`).
- Click opens a modal (behavior depends on auth state).

---

### 2.2 Modals

#### A. Not Logged In — “Register to Use Support” Modal

- **Title:** “Support”
- **Body:**
  - Support is provided for registered users.
  - Registration is completely free and only requires an email address.
  - To register: go to **Login** in the top navigation, then click **“register a new account”**.
- **Actions:** “Login / Register” (link to `/login`), “Close”

#### B. Logged In — “Support Options” Modal

- **Title:** “Support”
- **Body:** Two buttons:
  - **Existing tickets** — Opens “My tickets” view
  - **New ticket** — Opens “New ticket” form
- **Actions:** “Close”

#### C. My Tickets (Logged In)

- **Title:** “My support tickets”
- **Content:** List of tickets (table or cards) showing:
  - Ticket ID or short subject
  - Status (new, open, closed, in-progress)
  - Created date
  - Page URL (optional, truncated)
- **Actions:** Click row to open ticket detail / thread view; “New ticket”; “Back” (to Support options)
- **Empty state:** “You have no tickets yet. Click New ticket to create one.”

#### D. Ticket Detail View (User)

- **Title:** “Ticket #&lt;id&gt;”
- **Read-only:** Subject/type, status, page, created date
- **Thread:** List of messages (user description + admin replies) in chronological order
- **Actions:** “Back to my tickets”

#### E. New Ticket Form (Logged In)

- **Title:** “New support ticket”
- **Fields:**

| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Email | Text | No | Prefilled from session |
| Page | Text | No | Prefilled from `window.location.href` at click time |
| Type | Checkboxes | Yes | Bug, Suggestion, Help (can select multiple) |
| Description | Textarea | Yes | Required |
| Status | Select | No | Fixed to “new” |

- **Validation:** Description required; at least one type selected.
- **Actions:** “Submit”, “Cancel”
- **On submit:** Create ticket, send emails, show success message, redirect to “My tickets” or close modal.

---

### 2.3 Admin Panel — Support Tickets Section

**Location:** `pages/admin.vue`, new collapsible section (same pattern as User Management, Phrase Cache, Pronunciation Cache)

- **Section title:** “Support Tickets”
- **Toggle:** “Manage Support Tickets” / “Hide”
- **Content when expanded:**
  - **Filters (optional):** Status, date range, search by email or description
  - **Table:**
    - Columns: ID, User email, Page, Type (bug/suggestion/help), Status, Created, Last updated
    - Row click or “View” opens ticket detail
  - **Ticket detail (admin view):**
    - All ticket fields (read-only)
    - Thread of messages (user + admin replies)
    - **Add reply** textarea + “Send reply”
    - **Change status** dropdown (new, open, closed, in-progress) + “Update”
    - On reply or status change: save, send email to user

---

## 3. Data Model

### 3.1 Tables

#### `support_tickets`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID or nanoid |
| user_id | TEXT | FK to users.id |
| email | TEXT | Snapshot at creation (for display) |
| page_url | TEXT | Page where “New ticket” was clicked |
| type_bug | INTEGER | 0/1 |
| type_suggestion | INTEGER | 0/1 |
| type_help | INTEGER | 0/1 |
| description | TEXT | User’s initial message |
| status | TEXT | 'new', 'open', 'closed', 'in-progress' |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

#### `support_ticket_replies`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID or nanoid |
| ticket_id | TEXT | FK to support_tickets.id |
| author_type | TEXT | 'user' or 'admin' |
| author_id | TEXT | user_id (null for system) |
| message | TEXT | Reply content |
| created_at | INTEGER | Unix timestamp |

- Initial ticket description is stored in `support_tickets.description`; no initial “reply” row needed.
- Admin replies are stored as `support_ticket_replies` with `author_type = 'admin'`.

---

## 4. API Endpoints

### 4.1 User Endpoints (require logged-in, verified user)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/support/tickets` | List current user’s tickets |
| GET | `/api/support/tickets/:id` | Get ticket + replies (own only) |
| POST | `/api/support/tickets` | Create new ticket |

**POST body for create:**
```json
{
  "pageUrl": "https://shoresh.cogitations.com/...",
  "typeBug": true,
  "typeSuggestion": false,
  "typeHelp": true,
  "description": "User's message..."
}
```

### 4.2 Admin Endpoints (require admin role)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/support/tickets` | List all tickets (with filters) |
| GET | `/api/admin/support/tickets/:id` | Get ticket + replies |
| POST | `/api/admin/support/tickets/:id/reply` | Add admin reply |
| PUT | `/api/admin/support/tickets/:id` | Update status (and optionally other fields) |

---

## 5. Email Triggers

### 5.1 New ticket created

- **To shoresh@cogitations.com:** Notification with ticket ID, user email, page, type, description, link to admin ticket view.
- **To user:** Confirmation with ticket ID, summary, and note that someone will respond.

### 5.2 Ticket updated (reply or status change)

- **To user only:** “Your support ticket has been updated” with ticket ID, new reply text (if any), new status, and link to view ticket.

### 5.3 Implementation

- Extend `server/utils/email.ts` with:
  - `sendNewTicketNotification(event, ticket, userEmail)` — to shoresh + user
  - `sendTicketUpdateNotification(event, ticket, updateSummary)` — to user
- Use existing Resend setup and `from: 'Shoresh <noreply@shoresh.cogitations.com>'`.

---

## 6. Localization

**V1:** English only. All support UI strings are hardcoded in English. No i18n or locale handling.

---

## 7. File Structure (Proposed)

```
server/
  api/
    support/
      tickets.get.ts      # List current user's tickets
      tickets.post.ts     # Create ticket
      tickets/[id].get.ts # Get ticket + replies (user)
    admin/
      support/
        tickets.get.ts           # List all (admin)
        tickets/[id].get.ts      # Get ticket (admin)
        tickets/[id].put.ts      # Update status
        tickets/[id]/reply.post.ts # Add admin reply

server/utils/
  email.ts               # Add sendNewTicketNotification, sendTicketUpdateNotification

migrations/
  0012_support_tickets.sql

components/              # Optional: extract modals into components
  Support/
    SupportModal.vue
    NewTicketForm.vue
    MyTicketsList.vue
    TicketDetail.vue

layouts/
  default.vue            # Add Support button
```

---

## 8. Wireframe Summary

### Header (logged out)
```
[Logo] Shoresh                    [ Support ] [ Login ]
```

### Header (logged in)
```
[Logo] Shoresh                    [ Support ] [ displayName ] [ Logout ]
```

### Support modal — not logged in
```
┌─────────────────────────────────────────────┐
│ Support                               [ X ] │
├─────────────────────────────────────────────┤
│ Support is provided for registered users.   │
│ Registration is completely free and only    │
│ requires an email address.                  │
│                                             │
│ To register: go to Login in the top         │
│ navigation, then click "register a new      │
│ account".                                   │
│                                             │
│            [ Login / Register ]  [ Close ]   │
└─────────────────────────────────────────────┘
```

### Support modal — logged in (initial)
```
┌─────────────────────────────────────────────┐
│ Support                               [ X ] │
├─────────────────────────────────────────────┤
│  [ Existing tickets ]                       │
│  [ New ticket ]                             │
│                                             │
│                              [ Close ]      │
└─────────────────────────────────────────────┘
```

### New ticket form
```
┌─────────────────────────────────────────────┐
│ New support ticket                    [ X ] │
├─────────────────────────────────────────────┤
│ Email:     user@example.com     (read-only) │
│ Page:      /dictionary          (read-only) │
│                                             │
│ Type:      [x] Bug [ ] Suggestion [ ] Help  │
│                                             │
│ Description:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ User enters problem here...             │ │
│ └─────────────────────────────────────────┘ │
│ Status: new (fixed)                         │
│                                             │
│            [ Submit ]  [ Cancel ]            │
└─────────────────────────────────────────────┘
```

### Admin — Support tickets section
```
┌─────────────────────────────────────────────────────────────┐
│ Support Tickets                                             │
│ [ Manage Support Tickets ]                                  │
├─────────────────────────────────────────────────────────────┤
│ (when expanded)                                             │
│                                                             │
│ ID    | Email         | Page      | Type   | Status | Date  │
│ ----- | ------------- | --------- | ------ | ------ | ----- │
│ #abc  | user@x.com    | /         | bug    | open   | ...   │
│                                                             │
│ [Click row → Ticket detail with thread, reply box, status]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

- **Auth:** All user endpoints require `useAuth().loggedIn` and verified email.
- **Admin:** Admin endpoints require `useAuth().isAdmin`.
- **Ownership:** Users can only read/update their own tickets via user endpoints.
- **Input:** Sanitize description and reply text; limit length (e.g. 2000 chars).
- **Rate limiting (optional):** Limit ticket creation per user (e.g. 5/hour) to prevent abuse.

---

## 10. Migration

```sql
-- 0012_support_tickets.sql
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  page_url TEXT,
  type_bug INTEGER NOT NULL DEFAULT 0,
  type_suggestion INTEGER NOT NULL DEFAULT 0,
  type_help INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_id TEXT,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
```

---

## 11. Implementation Order

1. **Migration** — Create tables.
2. **API — User** — Create ticket, list tickets, get ticket.
3. **API — Admin** — List all, get, reply, update status.
4. **Email utils** — New ticket + update notifications.
5. **Layout** — Support button in header.
6. **Modals** — Not-logged-in prompt, Support options, New ticket form, My tickets, Ticket detail.
7. **Admin UI** — Support Tickets section.
8. ~~Localization~~ — Deferred; v1 is English only.

---

*End of design document. No code implemented yet.*
