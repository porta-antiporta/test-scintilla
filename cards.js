// cards.js — SVG card rendering
//
// Each card is a self-contained <svg> element. All shapes are SVG paths so
// that striped fills can use <clipPath> within the same SVG document context.

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Card canvas in SVG viewBox units
const CARD_WIDTH  = 100;
const CARD_HEIGHT = 140;

// Each shape lives in a fixed bounding box, centered horizontally on the card
const SHAPE_WIDTH    = 70;
const SHAPE_HEIGHT   = 35;
const SHAPE_X_OFFSET = (CARD_WIDTH - SHAPE_WIDTH) / 2; // 15

// Color palette — red/green/purple chosen for maximum distinguishability
const SHAPE_COLORS = ['#D33', '#0A0', '#63C'];

// ── Vertical layout ──────────────────────────────────────────────────────────
// Returns the y coordinate (top of bounding box) for each shape on a card,
// spacing them evenly with a fixed gap so they never overlap.

function getShapeYPositions(count) {
  const GAP = 10;
  const totalHeight = count * SHAPE_HEIGHT + (count - 1) * GAP;
  const startY = (CARD_HEIGHT - totalHeight) / 2;
  return Array.from({ length: count }, (_, i) => startY + i * (SHAPE_HEIGHT + GAP));
}

// ── Shape path generators ────────────────────────────────────────────────────
// Each function returns an SVG path `d` string fitting within
// a SHAPE_WIDTH × SHAPE_HEIGHT bounding box whose top-left is (x, y).

function diamondPath(x, y) {
  // Pointed rhombus: top, right, bottom, left cardinal points
  const cx = x + SHAPE_WIDTH / 2;
  const cy = y + SHAPE_HEIGHT / 2;
  return [
    `M ${cx},${y}`,
    `L ${x + SHAPE_WIDTH},${cy}`,
    `L ${cx},${y + SHAPE_HEIGHT}`,
    `L ${x},${cy}`,
    `Z`,
  ].join(' ');
}

function squigglePath(x, y) {
  // Two-lobe wavy shape matching the real Set card game squiggle.
  // The left lobe sits slightly higher; the right lobe slightly lower,
  // creating the characteristic gentle S-curve between them.
  // Traced clockwise; fits within the 70×35 bounding box.
  const p = (dx, dy) => `${x + dx},${y + dy}`;
  return [
    `M ${p( 4, 18)}`,
    `C ${p( 2,  9)} ${p(10,  1)} ${p(22,  2)}`,  // arch over left lobe (top)
    `C ${p(32,  3)} ${p(37, 11)} ${p(40, 17)}`,  // right side of left lobe → S-transition
    `C ${p(43, 23)} ${p(48, 30)} ${p(58, 30)}`,  // S-transition → left side of right lobe
    `C ${p(64, 30)} ${p(69, 24)} ${p(67, 17)}`,  // right rounded end
    `C ${p(65, 10)} ${p(57,  4)} ${p(48,  7)}`,  // top of right lobe
    `C ${p(39, 10)} ${p(33, 20)} ${p(30, 20)}`,  // right lobe back toward centre
    `C ${p(27, 20)} ${p(20, 29)} ${p(12, 30)}`,  // S-transition → bottom of left lobe
    `C ${p( 6, 31)} ${p( 2, 26)} ${p( 4, 18)}`,  // left rounded end (bottom)
    `Z`,
  ].join(' ');
}

function ovalPath(x, y) {
  // Pill / stadium / capsule shape — matching the real Set card oval.
  // Straight sides with fully semicircular ends; end radius = half the usable height.
  // This is visually distinct from the ellipse and matches the physical card game.
  const r   = 14;           // semicircle radius (usable height ≈ 28, so r = 14)
  const lx  = x + 17;      // x-centre of left  semicircle
  const rx  = x + 53;      // x-centre of right semicircle
  const top = y +  3.5;
  const bot = y + 31.5;
  return [
    `M ${lx},${top}`,
    `L ${rx},${top}`,
    `A ${r},${r} 0 0 1 ${rx},${bot}`,
    `L ${lx},${bot}`,
    `A ${r},${r} 0 0 1 ${lx},${top}`,
    `Z`,
  ].join(' ');
}

function getShapePath(shapeIndex, x, y) {
  switch (shapeIndex) {
    case 0: return diamondPath(x, y);
    case 1: return squigglePath(x, y);
    case 2: return ovalPath(x, y);
  }
}

// ── Shape rendering ──────────────────────────────────────────────────────────
// Renders one shape into `svg`, adding clipPath defs to `defs` as needed.
// fillIndex: 0 = solid, 1 = striped, 2 = open

function renderShape(svg, defs, shapeIndex, colorIndex, fillIndex, x, y, uniqueId) {
  const color = SHAPE_COLORS[colorIndex];
  const pathData = getShapePath(shapeIndex, x, y);

  if (fillIndex === 1) {
    // Striped: white background + horizontal lines clipped to shape + clean outline
    // clipPath must live inside the same <svg> to be referenced with url(#id)
    const clipId = `clip-${uniqueId}`;

    const clipPath = document.createElementNS(SVG_NS, 'clipPath');
    clipPath.setAttribute('id', clipId);
    const clipShape = document.createElementNS(SVG_NS, 'path');
    clipShape.setAttribute('d', pathData);
    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);

    // White fill so the card background doesn't show through stripe gaps
    const bgPath = document.createElementNS(SVG_NS, 'path');
    bgPath.setAttribute('d', pathData);
    bgPath.setAttribute('fill', 'white');
    bgPath.setAttribute('stroke', color);
    bgPath.setAttribute('stroke-width', '2.5');
    svg.appendChild(bgPath);

    // Horizontal stripe lines, clipped to shape outline
    const stripeGroup = document.createElementNS(SVG_NS, 'g');
    stripeGroup.setAttribute('clip-path', `url(#${clipId})`);
    for (let sy = y + 2; sy < y + SHAPE_HEIGHT; sy += 5) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', String(sy));
      line.setAttribute('x2', String(x + SHAPE_WIDTH));
      line.setAttribute('y2', String(sy));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '1.5');
      stripeGroup.appendChild(line);
    }
    svg.appendChild(stripeGroup);

    // Re-draw outline on top so shape edge is crisp over the stripes
    const outlinePath = document.createElementNS(SVG_NS, 'path');
    outlinePath.setAttribute('d', pathData);
    outlinePath.setAttribute('fill', 'none');
    outlinePath.setAttribute('stroke', color);
    outlinePath.setAttribute('stroke-width', '2.5');
    svg.appendChild(outlinePath);

  } else {
    // Solid (0) or open/outline (2)
    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', pathData);
    pathEl.setAttribute('fill', fillIndex === 0 ? color : 'none');
    pathEl.setAttribute('stroke', color);
    pathEl.setAttribute('stroke-width', '2.5');
    svg.appendChild(pathEl);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

// Returns a fully rendered <svg> element for the given card object.
// card: { id, shape, color, fill, number } — all values 0/1/2
function createCardSVG(card) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('xmlns', SVG_NS);

  // <defs> must exist before any shape rendering that adds clipPaths
  const defs = document.createElementNS(SVG_NS, 'defs');
  svg.appendChild(defs);

  // Card background — white with subtle border
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width',  String(CARD_WIDTH));
  bg.setAttribute('height', String(CARD_HEIGHT));
  bg.setAttribute('rx', '8');
  bg.setAttribute('ry', '8');
  bg.setAttribute('fill',         'white');
  bg.setAttribute('stroke',       '#ddd');
  bg.setAttribute('stroke-width', '2');
  svg.appendChild(bg);

  // Draw 1, 2, or 3 shapes (card.number 0/1/2 → count 1/2/3)
  const count      = card.number + 1;
  const yPositions = getShapeYPositions(count);

  for (let i = 0; i < count; i++) {
    // Unique ID for clipPath: card id + shape position index
    const uniqueId = `${card.id}-${i}`;
    renderShape(
      svg, defs,
      card.shape, card.color, card.fill,
      SHAPE_X_OFFSET, yPositions[i],
      uniqueId
    );
  }

  return svg;
}
