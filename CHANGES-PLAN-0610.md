# Changes & New Features — Plan (Doc: "Changes and new features 0610.docx")

> **Status of this document:** PLAN ONLY. Nothing below is implemented yet.
> Review, mark which items to start, and approve. Implementation begins only after your approval.

Legend for **Status** column:
- 🟢 **DONE** — already exists in the codebase, no work needed (only verify).
- 🟡 **PARTIAL** — exists but needs a small change/extension.
- 🔵 **BUILD** — genuinely new work to implement.
- ⚪ **NOT WORKING ON** — content/terminology/citation-only or out of scope per your note ("outline all comments we are not working on like terminologies, citation, etc.").

Repos:
- **FE** = `ongera-platform-frontend`
- **BE** = `ongera-platform-backend`

---

## A. Excellence Dashboard — intro / welcome copy (doc lines 1–11)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| A1 | Welcome copy for outstanding bwenge users (talent side) | FE `src/app/dashboard/user/excellence/page.tsx` | ⚪ NOT WORKING ON | Pure marketing/content text. Drop-in copy, no logic. Can add at the end as a quick content pass if you want. |
| A2 | "To Our Partner Institutions and Companies" copy | FE institution excellence landing | ⚪ NOT WORKING ON | Content-only. |
| A3 | Tagline "BWENGE – Turning Challenges into Opportunities…" | FE excellence headers | ⚪ NOT WORKING ON | Content-only. |

---

## B. New feature — Students / research / outstanding diaspora + subscription (doc lines 12–16)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| B1 | Enroll bwenge users into Excellence based on outstanding performance | BE excellence enrollment + FE talent/institution lists | 🟢 DONE | This is the existing Excellence talent/bounty/assessment system already built. |
| B2 | "Companies need to subscribe to access this dashboard" | BE access gate + FE paywall | 🔵 BUILD (NEEDS DECISION) | No subscription/access gate exists today. **Decision needed:** negotiation-only for now vs. build full online subscription. See "Open decisions" §M. |
| B3 | "Negotiation is an option now; online subscription added later" | BE + FE | 🔵 BUILD (NEEDS DECISION) | Tied to B2. |

---

## C. Reverse Pitching / Bounties (doc lines 17–21)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| C1 | Secure portal for enterprises to post bounties | FE `institution-portal/excellence/bounties`, BE `ExcellenceController` | 🟢 DONE | Bounty post/list/detail already built. |
| C2 | Community sees post, submits solutions, 2–3 week deadline | FE `user/excellence/bounties`, submissions | 🟢 DONE | Submission flow + notifications + live sockets already built. |
| C3 | Payout + winner selection + 15–20% platform commission cut | BE bounty review/payout | 🟡 PARTIAL | Winner selection + shortlist + notify are DONE. **Commission %% calculation/recording (15–20% cut) — verify whether it's stored/computed.** If not present → small BUILD on payout record. |

---

## D. `app/research-projects` — Project / Downloads / Cite (doc lines 22–26)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| D1 | "No need to add a picture" | FE `src/app/research-projects/page.tsx` (+ `[id]`) | ⚪ NOT WORKING ON | **Per your instruction: KEEP the existing cover image — do NOT remove it.** The doc's "no need to add a picture" is overridden by you. No change. |
| D2 | Add citation links (e.g. "Twishime, Alexis, et al. … SAE Technical Paper, 2023.") | FE detail page `research-projects/[id]/page.tsx`; BE `citation` field | 🟡 PARTIAL | Citation **input field already exists** in upload form (`research/upload/page.tsx` line ~695) and `citation` is saved to BE. **Remaining:** confirm the public detail page (`research-projects/[id]`) **displays** the citation block. If not shown → small FE BUILD (render citation section). |
| D3 | Downloads | FE detail page | 🟢 DONE (verify) | Download of project files already exists; verify present on public detail page. |

---

## E. Institution research portal (doc lines 27–29)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| E1 | Research pipeline for institutions/universities/NGOs | FE `institution-portal/projects`, supervisors | 🟢 DONE | Institution portal + supervision flow already built. |
| E2 | "Request to join us: send an email" | FE static CTA | ⚪ NOT WORKING ON | Content/CTA mailto link. Trivial; bundle with content pass if desired. |

---

## F. Communities (doc lines 30, 37–43)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| F1 | "Trusted talent database of vetted participants… Click to join" | FE communities landing | ⚪ NOT WORKING ON | Content + existing join CTA. |
| F2 | Discussion / announcement / article management — **edit or delete** | FE `dashboard/user/communities/dashboard/[id]/page.tsx` | 🟡 PARTIAL | Delete = "OK" (doc line 40, fine as-is). **Edit needs work** — see F3. |
| F3 | Editor too small → "add editors' options. Same like on projects" | FE community discussion/announcement/article editor | 🔵 BUILD | Replace the small editor with the **same rich text editor used on projects** (`RichTextEditor` / react-quill-new) for discussions, announcements & articles. Mirror the projects implementation. |
| F4 | Share, like and comments | FE communities | 🟢 DONE (verify) | Like/comment exist on content; verify **share** action is present. If share missing → small BUILD. |
| F5 | "Add more admins for the institution. Refer to bwenge plus" | FE `institution-portal/admins/page.tsx`, BE admin roles | 🟡 PARTIAL | Admins page exists. **Verify** multi-admin add matches the "bwenge plus" pattern; extend if capped. |

---

## G. Create main project (doc lines 31–34)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| G1 | Add: Dissertation | FE `research/upload/page.tsx` `ACADEMIC_LEVELS` (line 19) | 🟢 DONE | Already added. |
| G2 | Add citation | FE `research/upload/page.tsx` | 🟢 DONE | Field exists (see D2). |
| G3 | **Delete: Diaspora and institution** | FE upload form option lists | 🟡 PARTIAL / VERIFY | `ACADEMIC_LEVELS` no longer shows Diaspora/institution. **Action:** locate where "Diaspora"/"institution" still appear as a selectable option in the create-project flow and remove. If already gone → mark DONE. |
| G4 | Change "researcher" → "research" | FE upload `ACADEMIC_LEVELS` (line 20–21) | 🟢 DONE | Label shows "Research"; stored value kept as `Researcher` for backward compat. Other UI strings: ⚪ terminology-only, not changing stored data. |

---

## H. Events (doc lines 35–36)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| H1 | Add YouTube link from dashboard; embedded recorded events watched via platform | FE `event/manage/[id]`, `event/[id]`, `components/event/YouTubeEmbed.tsx` | 🟢 DONE (verify) | `YouTubeEmbed` component + event youtube refs already exist. **Verify** the manage form lets organizers paste a YouTube link and the public event page embeds it. Extend only if missing. |

---

## I. Institution Research Portal — fixes (doc lines 44–47)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| I1 | "Change to an industrial supervisor" | FE supervisor pages/badges, `industrial-supervisors` | 🟢 DONE (verify) | "Industrial supervisor" naming already present across supervisor UI. Verify no stale "supervisor" label remains where it should read "industrial supervisor". |
| I2 | **"Industrial review comment was not saved"** (BUG) | BE supervisor/industrial review save + FE form | 🔵 BUILD (BUG FIX) | Reported persistence bug. Reproduce → trace review-comment save endpoint → fix. Highest-priority functional item here. |
| I3 | Settings — **Logout with Phone** | FE/BE auth logout for phone-login sessions | 🔵 BUILD | Verify logout works for phone-number login accounts; fix if broken. |
| I4 | Settings — **Responsiveness of navigation bar** | FE dashboard nav | 🟡 PARTIAL | Recent nav fixes landed (`8a72c82`). Re-check institution-portal nav responsiveness specifically; tweak if still off. |

---

## J. Social media links (doc lines 48–52)

| # | Comment (doc) | Where | Status | Notes |
|---|---|---|---|---|
| J1 | Instagram: Bwenge TEANDA | FE `src/app/page.tsx` footer (line ~2126) | 🟡 PARTIAL | Link exists but points to generic `instagram.com/`. **Update** to the real Bwenge TEANDA handle (need exact URL). |
| J2 | X: https://x.com/alexis_twishime | FE footer (line ~2130) | 🟢 DONE | Already correct. |
| J3 | LinkedIn: linkedin.com/company/bwenge-rwanda | FE footer (line ~2134) | 🟢 DONE | Already correct. |
| J4 | WhatsApp support | FE footer | 🔵 BUILD | No WhatsApp link present. **Need the support number** to add a `wa.me/<number>` link + icon. |

---

## K. Misc (doc lines 52–53)

| # | Comment (doc) | Status | Notes |
|---|---|---|---|
| K1 | "Budget: 75K" | ⚪ NOT WORKING ON | Project budget note, not a software change. |

---

## L. Summary — what actually needs building

**🔵 BUILD (new functional work):**
- **I2** Fix "industrial review comment not saved" bug *(priority)*
- **F3** Rich text editor for community discussions/announcements/articles (mirror projects)
- **J4** Add WhatsApp support link *(needs number)*
- **B2/B3** Company subscription/access gate *(needs decision: negotiation-only vs full online subscription)*
- **I3** Logout for phone-login sessions *(verify → fix)*

**🟡 PARTIAL / VERIFY (likely small):**
- **C3** Record 15–20% commission cut on bounty payout
- **D2** Show citation on public research detail page
- **G3** Remove any lingering Diaspora/institution option in create-project
- **F4** "Share" action on community content
- **F5** Multi-admin add limit
- **H1** YouTube link input + embed on events (verify)
- **I4** Institution nav responsiveness re-check
- **J1** Correct Instagram URL *(needs handle)*

**🟢 DONE / ⚪ NOT WORKING ON:** all Excellence/bounty core, intro copy, terminology, Dissertation, citation field, researcher→research label, industrial-supervisor naming, X & LinkedIn links, budget note.

---

## M. Open decisions I need from you before building

1. **B2/B3 Subscription/access gate:** For now — negotiation-only (just a "Contact us to subscribe" gate), or build the full online subscription (payment + plan + access control)? This is the single largest item.
2. **J1 Instagram:** exact Bwenge TEANDA Instagram URL.
3. **J4 WhatsApp:** the support phone number.
4. **A/E2/F1 content copy:** do you want me to also drop in the welcome/marketing copy (content pass), or skip all content-only items?
5. **Implementation order:** suggest starting with **I2 (bug)** → **F3 (editor)** → verify cluster (C3/D2/G3/H1/F4) → then subscription once decided.
