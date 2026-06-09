# V0 Product Pattern Research

## Purpose

This document distills design patterns from successful adjacent products so we can build Cairn from proven product mechanics instead of reinventing weaker versions.

The goal is not to copy another product wholesale. The goal is to identify working interaction patterns for:

- Capturing objects from the user's normal workflow.
- Maintaining a personal library.
- Layering lightweight social signal on top of private organization.
- Resolving canonical objects from messy links.
- Avoiding social/product complexity that does not serve v0.

## Reference Products

### Goodreads

Relevant pattern:

- Personal shelves plus friend-based discovery.

Goodreads' original insight was that when users want to know what to read, they often prefer friends' bookshelves and opinions over generic lists. It combines private organization with social discovery.

What to copy:

- Canonical object pages.
- User-object states.
- Followed/friend activity as discovery.
- Private utility first, social value second.

What not to copy yet:

- Broad public review culture.
- Reading challenges/gamification.
- Groups and discussion boards.

Implication for Cairn:

- The paper page should be the canonical object surface.
- The user's relationship to the paper should be first-class.
- Followed-user activity should help with triage, not become a general discussion forum.

Source: https://www.goodreads.com/about/us

## Letterboxd

Relevant pattern:

- Social cataloging built around a personal diary, watchlist, ratings, reviews, lists, and followed-user activity.

Letterboxd works because its private logging loop is useful even without heavy social interaction. Social discovery is a layer on top of the diary/catalog, not the only reason to use the product.

What to copy:

- Object page plus personal state.
- Optional review/comment.
- Lists/watchlist/diary model as personal memory.
- Followed-user activity feed.
- Lightweight social layer, not a heavy messaging network.

What not to copy yet:

- Public likes/comments culture.
- Large public review ecosystem.
- Stats and year-in-review mechanics.
- Customization and patron features.

Implication for Cairn:

- Visible comments should stay optional and secondary.
- The primary visible social primitive should be state/signal, not essays.
- The feed should show latest meaningful paper state rather than noisy event history.

Sources:

- https://letterboxd.com/
- https://embed.letterboxd.com/about/
- https://apps.apple.com/us/app/letterboxd/id1054271011

## Beli

Relevant pattern:

- Personal ranked list-keeping with friend-based discovery.

Beli's strength is that it turns the user's real-world restaurant history into a personal memory system, then makes friend taste useful for discovery. Its social value compounds after the private tracking loop exists.

What to copy:

- Low-friction save/log loop.
- Trusted people over anonymous global consensus.
- Personal notes/signals.
- Taste or preference profile later, once enough behavior exists.

What not to copy yet:

- Ranking as the main primitive.
- Match scores.
- Complex recommendation system.
- Map-centric interface.

Implication for Cairn:

- Do not force paper rankings.
- Use low-effort signals like `worth_reading`, `worth_skimming`, and `useful_reference`.
- Build enough data exhaust for future reading-profile/recommendation work without making recommendations v0.

Source: https://apps.apple.com/us/app/beli/id1478375386

## Pocket

Relevant pattern:

- One-click save from the browser, then read later in a dedicated app.

Pocket's core pattern is capture at the moment of encounter. The browser extension is valuable because it prevents the user from switching context just to save something.

What to copy:

- Browser extension as capture wedge.
- Save first, organize later.
- Graceful degradation when content extraction fails.
- Cross-surface continuity between extension and web app.

What not to copy:

- Depending on storing full content.
- Making reader mode the core v0 value.

Implication for Cairn:

- Extension capture is correctly required.
- The extension should be faster than opening the web app.
- The extension should not need full social context.
- Capturing a canonical link is enough for v0.

Source: https://support.mozilla.org/kb/how-to-save-to-pocket-overview

## Zotero

Relevant pattern:

- Research capture from the browser plus structured personal library.

Zotero's Connector detects scholarly resources in the browser and saves them to a library. Zotero also separates metadata/data syncing from attachment file syncing, which is directly relevant to the Cairn decision to store links/metadata rather than PDF binaries.

What to copy:

- Browser connector pattern.
- Metadata-first research object capture.
- Personal library as durable workspace.
- Data sync without requiring file storage.
- Groups/collaboration later, not v0.

What not to copy:

- Citation-management scope.
- Full PDF/file management.
- Word processor integrations.
- Complex collection/tag systems before the core loop works.

Implication for Cairn:

- Store canonical paper metadata and links, not files.
- Avoid becoming a Zotero replacement.
- Use the extension to capture papers from the user's research workflow.
- Keep the first library view simple before adding collections/tags.

Sources:

- https://www.zotero.org/start
- https://www.zotero.org/support/quick_start_guide
- https://www.zotero.org/support/sync

## ResearchGate

Relevant pattern:

- Follow researchers to receive updates about publications and activity.

ResearchGate validates the idea that following researchers is a natural academic workflow. Its help docs frame following as the primary way to build a network and stay up to date with work of interest.

What to copy:

- Follow researchers.
- Feed based on followed people's activity.
- Researcher identity and affiliation matter.

What not to copy:

- Broad professional network surface.
- Q&A/forums/jobs.
- Aggressive network-growth mechanics.
- Automatic following.

Implication for Cairn:

- One-way following is the right v0 social primitive.
- Basic identity fields matter: name, username, affiliation/role.
- The feed should stay focused on paper activity, not become a general professional network.

Sources:

- https://help.researchgate.net/getting-started/following-researchers
- https://help.researchgate.net/profile/what-is-my-profile

## Semantic Scholar

Relevant pattern:

- Canonical literature search/discovery at scale.

Semantic Scholar indexes a large corpus of papers and builds AI-driven search/discovery tools. This is useful as a reference for what Cairn should not try to be in v0.

What to copy:

- Canonical paper identity.
- Metadata-rich paper pages.
- Paper discovery as a long-term direction.

What not to copy:

- Full scholarly search engine.
- Large-scale literature graph.
- AI-driven recommendations as v0.
- Corpus ingestion and indexing.

Implication for Cairn:

- Use existing metadata sources rather than trying to build a paper search engine.
- Start from user-captured papers.
- Let canonical identity/deduplication be good enough for beta, not comprehensive.

Sources:

- https://www.semanticscholar.org/about
- https://www.semanticscholar.org/faq

## Papers With Code

Relevant pattern:

- Paper pages become more useful when linked to concrete external artifacts, such as code, benchmarks, datasets, and tasks.

Papers With Code is not a social tracking tool, but it demonstrates the value of turning papers into structured objects connected to useful external signals.

What to copy:

- Canonical paper pages.
- External links as value, not owned storage.
- Structured signals around papers.

What not to copy:

- Benchmark leaderboard scope.
- Task taxonomy.
- Code/result verification.

Implication for Cairn:

- Canonical paper pages should be link-rich.
- Source/PDF/code links can become useful later.
- Do not build benchmark or reproduction infrastructure in v0.

Source: https://cs.paperswithcode.com/about

## Cross-Product Patterns To Index On

### 1. Personal Utility First

Goodreads, Letterboxd, Beli, Zotero, and Pocket all work because they are useful before the social graph is dense.

Cairn design rule:

- A user with zero followers must still get value from capture, library, reading state, and private notes.

### 2. Capture At The Moment Of Encounter

Pocket and Zotero prove that browser capture is a critical workflow when the object is discovered elsewhere.

Cairn design rule:

- Extension capture should be a first-class v0 path.
- It should save the current paper faster than opening the app manually.

### 3. Canonical Object + User Relationship

Goodreads has books plus shelves/reviews. Letterboxd has films plus watched/diary/review states. Beli has restaurants plus personal rankings/notes. Zotero has items plus user library organization.

Cairn design rule:

- `Paper` and `UserPaper` must stay separate.
- Paper identity is canonical.
- Reading state, private notes, recommendation signals, comments, and capture provenance are user-specific.

### 4. Optional Expression Beats Required Reviews

Letterboxd and Goodreads allow reviews, but logging/rating/shelving can happen without writing. Beli can collect useful signal through lightweight ranking/saving.

Cairn design rule:

- Visible comments must stay optional.
- The primary social signal should be reading state plus recommendation signal.

### 5. Followed-Person Signal Beats Global Consensus

Goodreads, Beli, Letterboxd, and ResearchGate all benefit from trusted-person discovery.

Cairn design rule:

- Following is the correct v0 social graph.
- The feed should emphasize followed people, not global rankings or trending papers.

### 6. Avoid Over-Socializing The Product

Letterboxd's strength is partly that it is not a full messaging network. ResearchGate shows the risk of expanding into broad professional-network behavior.

Cairn design rule:

- No replies, likes, DMs, public comments, groups, or forums in v0.
- Keep social context tied to papers.

### 7. Link And Metadata Storage Is Enough For V0

Zotero separates data syncing from file syncing. Pocket's link-saving pattern shows the value of lightweight capture. Papers With Code shows that external links can make canonical pages useful without owning every artifact.

Cairn design rule:

- Store links and metadata, not PDFs.
- PDF preview is a stretch goal.
- External source links are a valid first product surface.

### 8. Admin/Editorial Ops Matter Early

Products with canonical objects need some way to correct metadata and manage quality. Letterboxd relies on an external canonical database. Research tools rely on metadata providers. Cairn will need minimal admin tooling because early metadata will be imperfect.

Cairn design rule:

- Admin metadata repair and duplicate handling are v0 needs, not polish.

### 9. Recommendations Should Come After Behavior

Beli and Semantic Scholar both make recommendations valuable by indexing on user behavior or large corpora. Cairn does not have either at v0.

Cairn design rule:

- Do not build recommendations now.
- Capture behavior that could power recommendations later.

### 10. Identity Matters, But Profiles Should Stay Sparse

ResearchGate shows that researcher identity and affiliation matter. Goodreads/Letterboxd/Beli show that social discovery needs recognizable people.

Cairn design rule:

- Profiles need name, username, affiliation/role.
- Rich public profiles are out of scope.

## Resulting Cairn Design Rules

The v0 should index on these product rules:

1. Save first, enrich later.
2. Personal library is the core surface.
3. Paper page is the canonical object surface.
4. User-paper relationship is the core data primitive.
5. Private notes are for memory.
6. Recommendation signals are the main visible social primitive.
7. Visible comments are optional and secondary.
8. Following is the social graph.
9. Feed shows latest followed-user paper state, not event spam.
10. Store links/metadata, not PDFs.
11. Admin repair is required because metadata will be imperfect.
12. No recommendation system until usage behavior exists.

## What This Means For V0 System Design

The current `v0-system-design.md` is aligned with these patterns:

- Supabase/Postgres supports canonical objects plus user-object relationships.
- Next.js route handlers provide one consistent mutation/orchestration layer.
- Plasmo extension supports the capture-at-encounter pattern.
- RLS supports private utility plus followed-user visibility.
- Metadata/source-link paper pages are enough before PDF preview.
- Admin tooling is justified early.

The main thing to preserve while tasking:

> Do not let social features, metadata completeness, PDF rendering, or recommendation logic slow down the capture-library-signal loop.

