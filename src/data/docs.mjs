// The docs pages, in reading order, for the sidebar of every page and the sitemap.
export const DOCS = [
  { group: 'Set up', pages: [
    ['/start/', 'Get started'],
    ['/install/macos/', 'Install on macOS'],
    ['/install/linux/', 'Install on Linux'],
    ['/configure/', 'Configure agents'],
    ['/pair/', 'Pair devices'],
  ] },
  { group: 'Use', pages: [
    ['/remote/', 'Remote access'],
    ['/desktops/', 'Desktops & live view'],
    ['/files/', 'File transfers'],
  ] },
  { group: 'Reference', pages: [
    ['/commands/', 'Commands'],
    ['/faq/', 'FAQ & help'],
  ] },
];

export const DOC_PATHS = DOCS.flatMap(g => g.pages.map(([href]) => href));
