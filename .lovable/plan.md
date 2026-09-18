# Markdown agent answers

## Goal
Make AI responses easier to scan by rendering their Markdown formatting instead of showing raw plain text.

## Changes
- Add a reusable Markdown renderer for trusted agent-generated text.
- Support headings, paragraphs, bold and italic text, lists, links, quotes, code blocks, and horizontally scrollable tables.
- Use it for agent answers in the Copilot conversation and the final answer on run details.
- Keep user messages as plain text and preserve the existing chart option.

## Technical details
- Parse Markdown with `react-markdown` and GitHub-flavoured tables via `remark-gfm`.
- Style every Markdown element with the existing semantic theme tokens.
- Keep external links safe and opening in a new tab.
- Verify both desktop and narrow layouts, then check current build diagnostics.
