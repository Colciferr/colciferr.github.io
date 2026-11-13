// The lists shown on the Projects and Work pages.
// Add an entry by copying one { ... } block; delete one by removing it.

export interface Entry {
  when: string; // shown in the left column, e.g. '2026' or '2023 to now'
  name: string;
  about: string; // appears when the row is opened
  link?: { href: string; text: string };
}

export const projects: Entry[] = [
  {
    when: 'GitHub',
    name: 'Eustace',
    about: "An AI agent modeled on Claude Code, built to integrate with the U.S. military's internal generative AI platform.",
    link: { href: 'https://github.com/Colciferr/eustace', text: 'Source' },
  },
  {
    when: 'Obsidian',
    name: 'Sakura',
    about: 'A TypeScript plugin for Obsidian that generates color-coded tree diagrams of file systems and other hierarchies for project documentation. Published in the Obsidian community plugin directory.',
    link: { href: 'https://community.obsidian.md/plugins/sakura', text: 'Plugin page' },
  },
  {
    when: 'GitHub',
    name: 'Yahoo Mail MCP',
    about: 'A Python MCP server that gives Claude access to Yahoo Mail over IMAP and SMTP, filling a gap left by the lack of an official Yahoo connector.',
    link: { href: 'https://github.com/Colciferr/Yahoo-Mail-MCP', text: 'Source' },
  },
  {
    when: '2026',
    name: 'This website',
    about: 'A personal site built with Astro and published with GitHub Pages. The home page is a railway map of Tokyo.',
    link: { href: 'https://github.com/colciferr/colciferr.github.io', text: 'Source' },
  },
];

// The short version of each job. The full résumé is in src/data/resume.ts.
export const work: Entry[] = [
  {
    when: '2026 to now',
    name: 'IT Project Management Office Lead, Yokota Air Base',
    about: 'Leads a team of three project managers delivering new IT infrastructure and capabilities for 3,400 users.',
  },
  {
    when: '2025 to 2026',
    name: 'Cyber Defense Section Lead, Yokota Air Base',
    about: "Led a cyber defense section of four managers and 20 technicians, and designed the base's vulnerability management program covering 4,800 systems.",
  },
  {
    when: '2024 to 2025',
    name: 'Quality Assurance Evaluator, Osan Air Base',
    about: 'Evaluated technicians, led acceptance testing for command center upgrades, and served on the inspection team for two large US and South Korean exercises.',
  },
  {
    when: '2022 to 2024',
    name: 'Vulnerability Management Supervisor, Eglin Air Force Base',
    about: "Led an eight-person team keeping 16,000+ systems compliant, and built the unit's vulnerability management program.",
  },
  {
    when: '2020 to 2022',
    name: 'Vulnerability Management Technician, Eglin Air Force Base',
    about: 'Remediated vulnerabilities across 16,000+ systems and built PowerShell patching workflows. Deployed to Al Udeid Air Base, Qatar, as a systems administrator.',
  },
  {
    when: '2018 to 2020',
    name: 'Network Operations Center Technician, Ramstein Air Base',
    about: "Administered the base's endpoint security servers for 67,000 users and automated software deployment with PowerShell.",
  },
];
