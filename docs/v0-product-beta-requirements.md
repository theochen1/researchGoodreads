# V0 Requirements For Research Orbit Testing

## Purpose

This document defines the minimum requirements for a v0 research-paper tracking and social reading tool to be ready for testing by people in the builders' research orbit.

The v0 is not a polished product, a citation manager, a PDF reader, a recommendation engine, or a complete academic search system. It is a small tool designed to test whether researchers get value from:

1. Capturing papers they encounter online.
2. Tracking their own relationship to those papers.
3. Seeing lightweight reading signals from trusted people in their research orbit.
4. Leaving low-effort private notes and simple shared signals that help themselves and others decide what to read.

## Raw Signal From Recent Feedback

The latest product feedback changes the v0 in two important ways:

1. Do not make shared annotations or visible note-reading a v0 requirement.
   - Users should be able to keep private notes for memory.
   - Other users should see lightweight social signals, not each other's full annotations.
   - The v0 should avoid feeling like a public peer-review or commenting system.

2. The beta should not be scoped to one lab.
   - The first testing circle should be an invite-based research orbit.
   - The desired outcome is adoption by a small number of respected senior researchers and the students/postdocs around them.
   - Early network quality matters more than raw user count.
   - Example seed users could include Manolis, Philip Isola, Gabriele Farina, Omar Khattab, Tomaso Poggio, Josh Tenenbaum, and members of their labs or nearby research groups.

## V0 Success Definition

The v0 is ready for research orbit testing when a researcher can complete the following loop without help from the builders:

1. Create an account.
2. Add a paper from a URL or manual search/paste flow.
3. Save the paper to a personal library.
4. Assign a reading state.
5. Update that state later.
6. Leave a private note for themselves.
7. Leave a simple visible recommendation signal.
8. View trusted users' lightweight signals on the same paper.
9. Discover papers recently saved, read, or recommended by people in their research orbit.

If this loop works reliably for a small group, the v0 is testable.

## Target Test Users

Initial users should be people in the builders' research orbit who regularly encounter and read research papers.

The ideal beta tester:

- Reads or skims papers weekly.
- Encounters papers through X, arXiv, OpenReview, Semantic Scholar, Google Scholar, lab chats, newsletters, or citations.
- Has some current paper-tracking workflow, even if messy.
- Is willing to use the tool for real paper activity for at least one to two weeks.
- Is either a trusted researcher whose reading activity would be valuable to others, or a student/postdoc who works near such a researcher.

The v0 does not need to support external public users yet.

The ideal first cohort is not random. It should be intentionally seeded with high-signal researchers and nearby lab members so the social feed is valuable from day one.

## Core User Jobs

The v0 must support four jobs.

### 1. Capture A Paper

The user needs to quickly save a paper they encounter so it is not lost.

Minimum requirements:

- User can add a paper by pasting a URL.
- Supported URL types should include at least arXiv paper pages, DOI links, OpenReview pages, Semantic Scholar pages, and direct PDF links when metadata can be inferred.
- User can add a paper by pasting a title if URL resolution fails.
- The system creates or finds a canonical paper record.
- Duplicate papers are avoided when possible.
- If metadata lookup fails, the user can still create a paper with a title and URL.

Readiness bar:

- A beta user can add common papers they encounter online without needing developer intervention.

### 2. Track Personal Reading State

The user needs to know what they want to read, what they are currently reading, and what they have already read.

Minimum reading states:

- `Want to read`
- `Reading`
- `Read`
- `Deep read`
- `Skipped`

Minimum requirements:

- User can assign one reading state to each paper.
- User can update the state later.
- User can view their library grouped or filtered by state.
- User can remove a paper from their library.
- User can see when they added or last updated a paper.

Readiness bar:

- A user can replace a basic paper bookmark list with this library for the duration of the beta test.

### 3. Leave Lightweight Human Signal

The user needs to leave a small amount of judgment or context after engaging with a paper.

Minimum requirements:

- User can leave an optional private note on a paper.
- User can choose a simple recommendation signal that is visible to trusted beta users.
- User can edit or delete their own private note.
- User can edit or clear their own recommendation signal.
- User can write a private note visible only to themselves.
- Other users cannot read private notes or annotations.

Minimum recommendation signals:

- `Worth reading`
- `Worth skimming`
- `Useful reference`
- `Not worth prioritizing`
- `Unsure`

Readiness bar:

- A user can communicate whether a paper is worth attention without writing a full review or exposing private annotations.

### 4. See Trusted Social Context

The user needs to see what trusted people in their research orbit are reading and lightly signaling.

Minimum requirements:

- User can see which trusted beta users have saved, read, deep-read, or skipped a paper.
- User can see trusted beta users' recommendation signals.
- User cannot see other users' private notes or annotations.
- User can view a simple feed of recent activity from trusted beta users.
- Feed items include paper title, user, reading state or recommendation signal, and timestamp.
- User can click from feed item to paper page.

Readiness bar:

- A user can answer: "Has anyone I trust looked at this paper, and did they think it was worth attention?"

## Required Screens

The v0 needs only a small number of screens.

### Account / Access

Requirements:

- User can sign up or be invited.
- User can log in and log out.
- Access can be limited to invited beta users.
- User has a basic profile: name, username or handle, and optional affiliation/role.
- User can identify which people they want to follow or treat as trusted sources.

### Personal Library

Requirements:

- Shows papers saved by the current user.
- Supports filtering by reading state.
- Supports sorting by recently added or recently updated.
- Shows enough paper metadata to identify the paper: title, authors, year, and source/venue if available.
- Provides quick state update controls.

### Add Paper

Requirements:

- User can paste URL or title.
- System attempts metadata lookup.
- User can confirm or edit title/authors/year/source before saving.
- User can immediately assign a reading state.

### Paper Page

Requirements:

- Shows canonical paper metadata.
- Shows user's current reading state.
- Allows state update.
- Allows private note creation and editing.
- Allows recommendation signal creation and editing.
- Shows reading states and recommendation signals from trusted beta users.
- Does not show other users' private notes or annotations.
- Links out to original paper source and PDF when available.

### Research Orbit Activity Feed

Requirements:

- Shows recent paper activity from trusted beta users.
- Includes saves, state changes, and recommendation signals.
- Allows user to click through to the paper page.
- Can be simple reverse-chronological feed.

## Paper Metadata Requirements

The v0 should store enough metadata to make papers identifiable and usable.

Required fields:

- Title
- Authors
- Year
- Primary URL
- Source type, such as arXiv, DOI, OpenReview, Semantic Scholar, PDF, or manual
- Date added

Strongly preferred fields:

- Abstract
- Venue or conference/journal
- DOI
- arXiv ID
- OpenReview ID
- PDF URL

The system should tolerate incomplete metadata. It is better to let users save a paper with partial metadata than to block capture.

## Identity And Visibility Requirements

The v0 should be built for an invite-based trusted research orbit.

Minimum requirements:

- Each note has an author.
- Private notes are visible only to the author.
- Recommendation signals can be visible to trusted beta users.
- Other users cannot read private notes or annotations.
- The system should not expose beta activity publicly by default.

Public profiles, anonymous notes, shared annotations, complex groups, and external sharing are not required for v0.

## Browser Extension Requirements

The browser extension is important but can be scoped tightly.

Minimum acceptable v0:

- Extension can save the current page URL to the user's library.
- Extension can assign an initial reading state.
- Extension works on common paper pages such as arXiv, OpenReview, Semantic Scholar, DOI pages, and PDFs.
- Extension shows whether the current paper is already saved.
- Extension links to the paper page in the web app.

Nice-to-have for v0, but not required:

- Inline detection of paper links on X or other pages.
- Hover cards over paper links.
- Displaying trusted users' recommendation signals directly in the extension.
- One-click recommendation signal from the extension.

Readiness bar:

- The extension makes capture easier than opening the web app manually, even if it is not yet deeply integrated into every browsing context.

## Non-Goals For V0

The v0 should not attempt to solve these yet:

- Full PDF reading or annotation.
- Shared notes or shared annotations.
- Citation manager replacement.
- Zotero/Mendeley integration.
- Complex recommendation algorithms.
- Global ratings or rankings.
- Public social network.
- Topic maps or graph visualization.
- AI-generated summaries as a central feature.
- Reading goals, streaks, or gamification.
- Advanced search across all academic literature.
- Support for every publisher or metadata edge case.

## Quality Bar

The v0 does not need to be beautiful, but it must be usable and reliable enough that beta users can test the behavior rather than fight the tool.

Minimum quality requirements:

- Core flows should work without obvious crashes.
- Adding a paper should be fast enough to feel lightweight.
- State updates should persist reliably.
- Notes should not be lost.
- Duplicate handling should be reasonable for common identifiers like DOI, arXiv ID, and OpenReview ID.
- Loading states and failures should be understandable.
- Users should be able to recover from bad metadata by editing fields.
- Basic mobile support is useful, but desktop can be the primary target for v0.

## Test Plan

The beta test should evaluate behavior, not just software correctness.

Suggested test duration:

- 2 to 4 weeks.

Suggested participants:

- 10 to 30 invited researchers, students, and postdocs across the builders' research orbit.
- At least 2 to 4 high-signal seed users whose reading activity would make the product more valuable for others.

Before the test:

- Create accounts or invites.
- Ask each participant to add at least 5 papers they recently encountered.
- Ask each participant to use the tool during normal paper discovery/reading.
- Personally onboard the highest-signal seed users so their first sessions produce useful activity.

During the test:

- Track number of papers added.
- Track number of state changes.
- Track number of private notes created.
- Track number of recommendation signals left.
- Track number of papers with more than one trusted-user interaction.
- Track whether activity clusters around influential seed users and their nearby lab members.
- Collect qualitative feedback on friction and usefulness.

After the test, answer:

- Did users actually capture papers from their normal workflow?
- Did users update reading states after initial capture?
- Did visible recommendation signals help others decide what to read?
- Did users check what trusted people were reading?
- Was the extension meaningfully easier than manual entry?
- What existing workflow did this replace or fail to replace?
- Did any seed users cause second-order adoption from students, collaborators, or adjacent labs?

## V0 Acceptance Criteria

The v0 is ready for research orbit testing when all of the following are true:

- A new invited beta user can create an account and access the app.
- A user can add a paper from URL or manual entry.
- A user can save a paper to their library.
- A user can set and update reading state.
- A user can leave, edit, and delete a private note.
- A user can leave, edit, and clear a visible recommendation signal.
- A user cannot see another user's private notes or annotations.
- A user can see lightweight visible activity from trusted beta users.
- A user can open a paper page and understand trusted users' lightweight interaction with that paper.
- The browser extension can save the current page and assign a reading state.
- Common identifiers are deduplicated where feasible.
- The app is stable enough for 10 to 30 people to use for 2 to 4 weeks.

## Core Question For The Beta

The beta should answer one main question:

> Does a low-friction paper tracking tool with lightweight trusted social signal help researchers read more intentionally?

If the answer is yes, the next version can expand into stronger discovery, better extension integration, richer profiles, and more advanced social/recommendation mechanics.
