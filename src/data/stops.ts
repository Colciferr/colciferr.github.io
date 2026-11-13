// Which page of the site lives at which station on the map.
// To move a page, change the station name on the left.

export const stops: Record<string, { title: string; href: string }> = {
  Shinjuku: { title: 'Thoughts', href: '/thoughts' },
  Ueno: { title: 'Projects', href: '/projects' },
  Takadanobaba: { title: 'Work', href: '/work' },
};
