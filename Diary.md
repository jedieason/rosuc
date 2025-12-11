# Agentic Editing Workflow: Technical Challenges & Solutions Log

## Overview
This document details the technical evolution of the Agentic Editing Workflow implemented in `script.js`. It documents the challenges encountered when building a context-aware AI editing system for a web-based text editor, the specific failure modes of initial approaches, and the robust solutions developed to handle complex, real-world editing scenarios (especially multilingual and structural edits).

---

## 1. Context Retrieval & Semantic Search

### Challenge: Low Precision in Locating User Intent
**Initial State:**
The system used a basic TF-IDF / Cosine Similarity search on DOM elements (`<p>`, `<h1>`, etc.) to match the user's natural language instruction with the relevant document section.

**Issues:**
1.  **Tokenizer Failure (CJK):** The initial tokenizer split text by whitespace. For CJK (Chinese/Japanese/Korean) languages, sentences are continuous streams of characters without spaces.
    *   *Result:* "這是一段測試" became a single, unique token. User queries like "測試" failed to match because `tf("測試")` in the document was 0.
2.  **Strict Selector Scope:** The search only looked at specific block tags (`p`, `h1-h6`).
    *   *Result:* Content inside `<div>`, `<span>`, or `<li>` was invisible to the search engine, causing "No context found" errors for complex HTML structures.
3.  **Keyword Extraction Quality:** The LLM prompt for keyword extraction was generic.
    *   *Result:* For "Translate the principal list", it might extract "list" (too broad) or "translate" (verb, irrelevant), missing the specific noun entities required for precise matching.

### Solution: Enhanced Semantic Search Engine
1.  **Character-Level CJK Tokenization:**
    *   **Logic:** Modified the tokenizer to treat every single CJK character as a distinct token, while keeping Latin words intact.
    *   **Implementation:** Used Regex `match(/[\p{Script=Han}...]` to decompose Chinese strings.
    *   **Benefit:** Allows partial matching. Query "建中共產黨" now matches document text "建國中學學生自發成立..." based on shared character overlap, significantly boosting recall.
2.  **Expanded DOM Traversal:**
    *   **Logic:** broadened the query selector to include `div`, `span`, `li`, `article`, etc., but added a heuristic filter to exclude "container" divs (divs that only contain other blocks) and focus on "content" divs (divs containing direct text nodes).
3.  **Hybrid Scoring with Phrase Bonus:**
    *   **Logic:** Pure TF-IDF misses the *order* of words.
    *   **Optimization:** Added a scoring bonus (+1.0) for exact substring matches and a smaller bonus (+0.5) for partial sequential matches (e.g., matching >50% of the query characters in order).

---

## 2. Context Expansion (The "Snippet vs. Section" Problem)

### Challenge: Insufficient Context for LLM
**Initial State:**
The system identified the *single best matching element* (e.g., the header `<div>歷屆校長</div>`) and sent only that element to the LLM for editing.

**Issues:**
1.  **Missing Content:** Users often search by header ("Edit the principal list"), but the actual content to be edited is in the *subsequent* paragraphs or list items.
    *   *Result:* The LLM received only the header text, so it could only translate the header, leaving the actual list untouched.
2.  **Loss of Cohesion:** Editing a single paragraph in isolation can break flow or reference.

### Solution: Smart Block Expansion (Semantic Traversal)
**Logic:**
We implemented a heuristic algorithm to dynamically determine the "logical section" surrounding the best match.

1.  **Header Detection:**
    *   We define a "Header" not just by tags (`H1`-`H6`) but also by content features: `< 20 chars`, no list markers, potentially bold.
2.  **Forward/Backward Expansion:**
    *   **Scenario A (Match is Header):** If the user matches a header, we assume they want the section content. The system expands *forward* (captures next siblings) until it hits a "Stop Condition".
    *   **Scenario B (Match is Content):** We look *backward* to find the parent header (for context) and forward/backward to capture immediate neighbors.
3.  **Dynamic Stop Conditions (The List Problem):**
    *   *Problem:* A list of items (e.g., school names) often consists of many short `<div>`s. A naive "Stop if next is Header" logic would interpret the second list item as a new header (because it's short) and stop early.
    *   *Refined Logic:*
        *   **Strong Stop:** Always stop at explicit `H1`-`H6`.
        *   **Weak Stop:** For ambiguous short `<div>`s, check if we are in a "List Pattern". If we see a sequence of short items, we disable the stop condition and continue capturing (up to a safety limit of 60 items).
        *   **Buffer:** Allow a minimum number of items (e.g., 20) before applying weak stop conditions, ensuring short lists are captured entirely.

---

## 3. Applying Edits (The "Search & Replace" Failure)

### Challenge: Fragile JSON Diff Application
**Initial State:**
The system asked the LLM to return a JSON array of `{"original": "...", "replacement": "..."}`. It then used `String.replace()` to apply these changes to `editor.innerHTML`.

**Issues:**
1.  **Whitespace/Formatting Mismatch:** The HTML string sent to the LLM was constructed via `join('\n')`. The LLM's returned `original` string often contained normalized whitespace or missing attributes that didn't *exactly* bit-match the browser's `innerHTML`.
    *   *Result:* `String.replace` failed silently, and no changes were applied.
2.  **Multi-Node Edits:** When context expansion captured multiple sibling nodes (e.g., Header + 10 list items), the LLM might return a single large `original` block spanning all of them. `innerHTML` rarely matches such a large multi-tag string perfectly due to browser serialization differences.
3.  **Partial Hallucinations:** The LLM sometimes slightly altered the `original` text (e.g., fixing a typo in the quote), causing the match to fail.

### Solution: Whole-Block Rewrite Strategy
**Logic:**
Instead of asking the LLM to identify *diffs*, we ask it to **rewrite the entire targeted context**.

1.  **Target Locking:**
    *   We identify the specific DOM elements involved in the expanded context (`contextElements`).
    *   We concatenate their `outerHTML` to form the `Original Text` for the prompt.
2.  **Generative Rewrite:**
    *   **Prompt Engineering:** We instructed the LLM to act as a "Smart Editing Engine".
    *   *Instruction:* "Rewrite the following block based on instructions. Output ONLY the new HTML."
3.  **Direct DOM Replacement (The Breakthrough):**
    *   We do NOT use string matching to find where to insert the new content.
    *   **Implementation:**
        1.  Insert a marker node before the first element of `contextElements`.
        2.  Remove all elements in `contextElements` from the DOM.
        3.  Insert the LLM-generated HTML (parsed into nodes) at the marker's position.
    *   **Benefit:** Zero dependency on string matching. As long as we hold the references to the DOM nodes, we can replace them 100% reliably.

---

## 4. User Experience & Verification

### Challenge: Trust & Undo
**Issue:**
Replacing large chunks of text automatically can be dangerous. Users need to verify changes.

### Solution: Visual Diff Blocks
1.  **Wrapper Interface:**
    *   The new content is wrapped in a temporary `<div>` with a distinct border (Green dashed line) and a "Highlight Pulse" animation.
2.  **Actionable UI:**
    *   Added floating **[Accept]** and **[Reject]** buttons directly attached to the edited block in the editor.
    *   **Accept:** Unwraps the content (removes border/buttons) and merges it into the document.
    *   **Reject:** Uses a stored backup of the `originalHtml` to revert the specific block to its pre-edit state.

---

## Summary of Optimization Path

| Feature | Gen 1 (Naive) | Gen 2 (Improved) | Gen 3 (Final / Production) |
| :--- | :--- | :--- | :--- |
| **Search Scope** | `p`, `h1-h6` only | All blocks (`div`, `li`) | Filtered Content Blocks (excluding containers) |
| **Tokenization** | Whitespace (English only) | Basic Regex | **Character-level CJK** + Hybrid TF-IDF |
| **Context** | Single matched node | Fixed neighbors (+2/-2) | **Smart Section Expansion** (Header detection, List awareness) |
| **Edit Logic** | `String.replace` (Exact match) | `String.replace` (Relaxed) | **DOM Node Replacement** (Rewrite Strategy) |
| **Prompting** | "Extract JSON Diffs" | "Extract JSON" | **"Rewrite this HTML Block"** |

## Future Optimizations
1.  **Hierarchical Context:** Instead of just flat siblings, send the *parent path* (e.g., "Document > H1 > H2 > Text") to the LLM so it understands the macro-structure.
2.  **Streaming Edits:** For very long sections, stream the rewritten HTML to the editor in real-time to reduce perceived latency.
3.  **Fuzzy Search Fallback:** If DOM node replacement fails (rare), implement a fuzzy string search (Levenshtein distance) to locate the text to replace.

