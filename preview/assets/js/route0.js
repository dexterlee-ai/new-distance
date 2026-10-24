// Runs before anything is drawn.  index.html carries the opening's words so they read at once, before the modules
// have loaded; a page opened on another place (#/map, #/d/…, #/read/…) hides them until the interface takes over.
if (location.hash.replace(/^#\/?/, '')) document.documentElement.classList.add('deep');
