// The map's default camera pose, shared by the interface (ui.js frames the map from it) and the scenery (scenery.js
// prints the zone names for the views a reader starts from).  Change it here only.
// (az 1.40: the AI's island with its sunflower lies at the near left, its seed hall in front of the flower, so the
// flower's head never covers it; the three brands' districts lie along the far rim; on a phone held upright every
// district stands inside the screen, none cut by its sides)
export const MAP_AZ = 1.4;
// (a phone held upright looks down more steeply: the rings read as rings, and the disc fills the screen's width)
export const MAP_EL = { desk: 0.72, portrait: 1.2 };
// The opening draws the map outward from its middle: the drawing's front stands REVEAL.r0 units out from the origin
// at once (the consumers' hilltop and their square together, never the square alone on blank paper) and spreads
// REVEAL.span units further over the opening.  The origin is the map's middle, or the district a deep link opens on
// (npr.js uRevealO): that place is drawn first.
export const REVEAL = { r0: 20, span: 140 };
export const revealFront = (v) => REVEAL.r0 + v * REVEAL.span;
