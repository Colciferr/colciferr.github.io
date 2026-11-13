---
title: How to add a thought
date: 2026-11-12
summary: A placeholder post that explains how posts work. Replace it with a real one.
---

This post is a placeholder. It lives at `src/content/thoughts/how-to-add-a-thought.md`, and it is here to show how writing on this site works.

## Adding a post

Create a new `.md` file in `src/content/thoughts/`. The file name becomes the address, so `on-cameras.md` is published at `/thoughts/on-cameras`.

Start the file with a short header between two `---` lines:

```md
---
title: On cameras
date: 2026-12-01
summary: One line that shows up in the list of thoughts.
---
```

Then write the post underneath in Markdown. The list on the Thoughts page updates itself, newest first.

## Things Markdown gives you

Paragraphs are separated by a blank line. You get *italics*, **bold**, [links](https://docs.astro.build), `inline code`, and headings like the ones in this post.

> Quotes look like this.

## Hiding a post

Add `draft: true` to the header and the post stays out of the published site until you remove the line.
