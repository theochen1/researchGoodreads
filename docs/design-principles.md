# Cairn Design Principles

Cairn is a serious, elegant research-paper workspace. It should feel like **Linear × Readwise × Semantic Scholar**: fast, refined, information-dense, and quietly intelligent.

The goal is not to look playful, social, or overly academic. Cairn should feel like a tool that a thoughtful researcher would trust as their long-term intellectual workspace.

---

## 1. Product Personality

Cairn should feel:

- Calm
- Precise
- Scholarly
- Fast
- Minimal
- Tasteful
- Organized
- Slightly premium
- Built for people who think deeply

Cairn should not feel:

- Gimmicky
- Consumer-social
- Overly colorful
- Corporate SaaS generic
- Like Goodreads
- Like a university portal
- Like a CRUD app
- Like a chaotic AI wrapper

The emotional target is:

> “This is where serious researchers organize, understand, and discuss the literature.”

---

## 2. Core Visual References

Use these as directional references, not as things to copy exactly.

### Linear

Borrow:

- High-density layouts
- Crisp typography
- Command-menu feeling
- Subtle interaction polish
- Minimal chrome
- Professional dark/light surfaces
- Precise spacing

Avoid:

- Becoming too issue-tracker-like
- Excessive gray-on-gray monotony

### Readwise Reader

Borrow:

- Reading-first layouts
- Library organization patterns
- Calm document surfaces
- Highlight and annotation affordances
- Personal knowledge-base feeling

Avoid:

- Looking too much like an article reader only

### Semantic Scholar / academic search tools

Borrow:

- Paper metadata hierarchy
- Citation count, venue, authors, abstract patterns
- Search and filtering affordances
- Trustworthy research-product feeling

Avoid:

- Looking outdated, utilitarian, or cluttered

### Notion / Obsidian

Borrow:

- Personal workspace feeling
- Flexible information structure
- Notes, tags, collections, and backlinks
- Knowledge graph metaphors, when useful

Avoid:

- Too much blank canvas ambiguity
- Excessive document-editor UI

---

## 3. Layout Philosophy

Cairn is a dense knowledge workspace, not a marketing site.

Prefer layouts with:

- Left sidebar navigation
- Main content area
- Optional right-side context panel
- Fast search entry points
- Compact cards and rows
- Clear metadata hierarchy

Common app shell:

```txt
┌───────────────────────────────────────────────┐
│ Top bar: search / command / account           │
├──────────────┬────────────────────┬───────────┤
│ Sidebar      │ Main content        │ Context   │
│ Library      │ Papers / feeds      │ Details   │
│ Collections  │ Reviews / notes     │ Metadata  │
│ Topics       │                     │ Actions   │
└──────────────┴────────────────────┴───────────┘
```

The interface should support both:

1. **Browsing** — feeds, collections, recommendations, field activity
2. **Focused research** — reading, annotating, saving, reviewing, comparing papers

---

## 4. Spacing System

Use an 8px spacing grid.

Preferred spacing scale:

```ts
4px   // tiny internal gaps
8px   // compact spacing
12px  // metadata gaps
16px  // default component padding
24px  // section spacing
32px  // major layout spacing
48px  // page-level breathing room
```

Avoid random spacing values unless necessary.

Rules:

- Dense lists should use 12–16px vertical padding.
- Paper cards should not feel oversized.
- Use whitespace to clarify hierarchy, not to create emptiness.
- Prefer compact elegance over spacious marketing-page design.

---

## 5. Typography

Typography should carry the interface.

Recommended font stack:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Use a restrained type scale:

```css
--text-xs: 12px; /* metadata, labels */
--text-sm: 14px; /* default UI text */
--text-base: 16px; /* abstracts, readable content */
--text-lg: 18px; /* section titles */
--text-xl: 20px; /* page subtitles */
--text-2xl: 24px; /* page titles */
--text-3xl: 30px; /* rare hero title */
```

Typography rules:

- Paper titles should be prominent but not huge.
- Metadata should be compact and slightly muted.
- Abstract text should be readable, not tiny.
- Use font weight sparingly.
- Prefer `font-medium` over `font-bold`.
- Avoid giant headings inside the app.

Suggested hierarchy for a paper card:

```txt
Paper title                         15–16px medium
Authors / venue / year              12–13px muted
Abstract snippet                    14px regular
Tags / citations / saved status     12px muted
```

---

## 6. Color Philosophy

Cairn should use a restrained, scholarly palette.

Default palette direction:

- Slate
- Zinc
- Stone
- Neutral
- Muted blue or indigo accent
- Occasional amber for highlights
- Occasional green for positive states

Avoid:

- Bright saturated gradients
- Rainbow tag systems
- Neon colors
- Excessive accent usage
- Pure black backgrounds unless deliberately designed

Light mode should feel like:

- Paper
- Archive
- Clean workspace
- Calm research desk

Dark mode should feel like:

- Command center
- Deep reading environment
- Modern developer/research tool

Recommended Tailwind direction:

```txt
Background:      zinc-50 / neutral-50 / stone-50
Surface:         white
Elevated surface: white with subtle border
Text primary:    zinc-950
Text secondary:  zinc-600
Text muted:      zinc-400
Border:          zinc-200
Accent:          indigo-600 or blue-600
Accent subtle:   indigo-50 or blue-50
```

For dark mode:

```txt
Background:      zinc-950
Surface:         zinc-900
Elevated surface: zinc-900 / zinc-850
Text primary:    zinc-50
Text secondary:  zinc-400
Text muted:      zinc-500
Border:          zinc-800
Accent:          indigo-400 or blue-400
Accent subtle:   indigo-950 / blue-950
```

Accent colors should guide attention, not decorate the interface.

---

## 7. Borders, Shadows, and Surfaces

Prefer borders over shadows.

Use:

- `border border-zinc-200`
- `rounded-xl`
- `bg-white`
- subtle hover states
- very light shadows only for floating elements

Avoid:

- Heavy drop shadows
- Glassmorphism
- Overly rounded bubbly cards
- Thick borders
- Excessive dividers

Cards should feel like organized paper objects, not floating marketing tiles.

Recommended card style:

```tsx
className =
  "rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50";
```

For dark mode:

```tsx
className =
  "rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700 hover:bg-zinc-850";
```

---

## 8. Component Principles

### Paper Cards

Paper cards are the core object in Cairn.

Each paper card should clearly show:

- Title
- Authors
- Venue / year
- Abstract preview
- Tags or fields
- Citation count, if available
- Save/read/review state
- Optional social signal: friends, researchers, or communities discussing it

Cards should be compact but scannable.

Avoid making paper cards look like blog posts or ecommerce products.

---

### Paper Detail Page

The paper detail page should feel like a research dossier.

Ideal sections:

- Title and metadata
- Abstract
- Personal notes
- Reviews / community discussion
- Related papers
- Citations / references
- Collections containing this paper
- Reading status
- External links: arXiv, DOI, PDF, code, project page

The layout should support a right-side metadata/action panel.

---

### Library Views

Library views should prioritize scanning and filtering.

Support:

- List view
- Compact card view
- Collection view
- Topic view
- Recently read
- Saved for later
- Currently reading
- Finished
- Reviewed

The default should feel like an intelligent reading queue.

---

### Reviews

Reviews should feel more like thoughtful research notes than casual Goodreads reviews.

A good review object may include:

- Summary
- Contribution
- Strengths
- Weaknesses
- Methodological concerns
- Who should read this
- Related papers
- Confidence level

Avoid making reviews feel like consumer star ratings alone.

If ratings exist, they should be secondary to written judgment.

---

### Social Features

Cairn is social, but not noisy.

Social features should feel like:

- “Researchers I respect are reading this.”
- “This paper is active in my field.”
- “People are debating this claim.”
- “This paper is foundational for this topic.”

Avoid:

- Likes as the primary interaction
- Infinite-feed dopamine design
- Follower-count vanity
- Overly casual comment sections

Social proof should increase trust and discovery, not distract.

---

## 9. Interaction Design

Interactions should be fast, subtle, and predictable.

Use:

- Hover states on all clickable rows/cards
- Focus rings for keyboard accessibility
- Command palette for power actions
- Keyboard shortcuts where useful
- Smooth but fast transitions
- Optimistic UI for saves and status changes

Avoid:

- Slow animations
- Playful bounces
- Overly decorative motion
- Hidden essential actions

Motion duration should usually be:

```txt
100ms–200ms
```

Motion should communicate state, not entertain.

---

## 10. Navigation

Cairn should be search-first.

Primary navigation:

- Home / Feed
- Library
- Collections
- Topics
- Reviews
- People / Labs
- Search

There should be a prominent global search or command bar.

Search should eventually feel like:

> “Find any paper, author, topic, collection, note, or review instantly.”

The command menu should support actions like:

- Save paper
- Add to collection
- Mark as reading
- Start review
- Find related papers
- Search by author
- Search within notes

---

## 11. Information Hierarchy

Always ask:

> “What is the most important thing on this screen?”

For most screens, the answer is one of:

- Paper title
- Research question
- Reading state
- Search result relevance
- Collection organization
- Community judgment
- Personal note

Do not give equal visual weight to everything.

Use hierarchy through:

- Font size
- Font weight
- Muted metadata
- Spacing
- Alignment
- Background surface
- Progressive disclosure

Avoid cluttering the first view with every available action.

---

## 12. Empty States

Empty states should feel intelligent and useful, not cute.

Good empty states:

```txt
No papers saved yet.
Start by searching for a paper, importing a BibTeX file, or following a topic.
```

```txt
No reviews in this collection.
As you read papers, Cairn can help you turn notes into structured reviews.
```

Avoid:

- Cartoon mascots
- Overly cheerful copy
- Generic “Nothing here yet!”
- Large decorative illustrations

---

## 13. Voice and Copy

Cairn’s voice should be concise, calm, and competent.

Use language like:

- Save to library
- Add to collection
- Mark as reading
- Start review
- Find related work
- Discuss contribution
- Summarize claims
- Compare methods
- Trace citations

Avoid language like:

- Awesome!
- Supercharge your research!
- Crush your reading goals!
- Unlock your potential!
- Join the revolution!

The product should respect the user’s intelligence.

## 15. What to Avoid

Do not make Cairn look like:

- Goodreads
- Facebook
- Twitter/X
- A generic SaaS dashboard
- A university library website
- A Notion clone
- A ChatGPT wrapper
- A crypto dashboard
- A colorful productivity toy

Avoid:

- Big gradients
- Huge cards
- Excessive rounded corners
- Too many icons
- Random emoji
- Overuse of shadows
- Unstructured feeds
- Loud colors
- Decorative illustrations
- Marketing-page UI inside the app

---

## 16. Tailwind Defaults

Prefer Tailwind components with restrained styling.

Default button styles:

```tsx
// Primary
className =
  "inline-flex items-center justify-center rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800";

// Secondary
className =
  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50";

// Ghost
className =
  "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950";
```

Default input style:

```tsx
className =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200";
```

Default card style:

```tsx
className =
  "rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50";
```

Default page container:

```tsx
className = "mx-auto w-full max-w-6xl px-6 py-8";
```

---

## 17. App-Level Design North Star

Every screen should answer at least one of these questions:

1. What should I read next?
2. What have I already read?
3. What do I think about this paper?
4. What does the field think about this paper?
5. How does this paper connect to other work?
6. Which papers are foundational for this topic?
7. Which papers are currently shaping the field?

If a screen does not help answer one of these questions, simplify it.

---

## 18. Implementation Instruction for Codex

Before making UI changes, read this document.

When implementing new UI:

1. Use existing components where possible.
2. Preserve visual consistency.
3. Prefer simple, elegant layouts.
4. Use restrained colors.
5. Make paper metadata easy to scan.
6. Avoid generic SaaS dashboard aesthetics.
7. Prioritize speed, clarity, and density.
8. Do not add decorative UI unless it improves comprehension.
9. Keep interactions subtle.
10. Make the product feel like a serious research workspace.

When uncertain, choose the quieter, more precise design.
