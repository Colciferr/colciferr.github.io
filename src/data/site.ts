// The lists shown on the Projects and Work pages.
// Everything here is placeholder text: replace it with your own.
// Add an entry by copying one { ... } block; delete one by removing it.

export interface Entry {
  when: string; // shown in the left column, e.g. '2026' or '2023 to now'
  name: string;
  about: string; // appears when the row is opened
  link?: { href: string; text: string };
}

export const projects: Entry[] = [
  {
    when: '2026',
    name: 'This website',
    about: 'A personal site built with Astro and published with GitHub Pages. The home page is a railway map of Tokyo.',
    link: { href: 'https://github.com/colciferr/colciferr.github.io', text: 'Source' },
  },
  {
    when: 'Year',
    name: 'A project name',
    about: 'Two or three sentences on what it is, why you made it, and what state it is in.',
  },
  {
    when: 'Year',
    name: 'Another project',
    about: 'Half-built and abandoned things belong here too.',
  },
];

export const work: Entry[] = [
  {
    when: 'Year to now',
    name: 'Role, Organisation',
    about: 'What you do there, in a sentence or two that a stranger could follow.',
  },
  {
    when: 'Year to year',
    name: 'Earlier role, Organisation',
    about: 'What you did, and what you took away from it.',
  },
];
