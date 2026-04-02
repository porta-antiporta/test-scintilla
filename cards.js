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
  // S-shaped squiggle: upper-right lobe bows upward, lower-left lobe bows downward.
  // Traced as a closed path clockwise around the S outline.
  // All coordinates are offsets from (x, y); they stay within the 70×35 box.
  const p = (dx, dy) => `${x + dx},${y + dy}`;
  return [
    `M ${p(8, 8)}`,
    `C ${p(8, 1)}   ${p(28, 1)}  ${p(35, 11)}`, // top of upper lobe (bows up)
    `C ${p(42, 21)} ${p(60, 21)} ${p(62, 14)}`, // crossing right (bows down briefly)
    `C ${p(65, 7)}  ${p(62, 1)}  ${p(55, 3)}`,  // upper-right tip
    `C ${p(48, 5)}  ${p(42, 14)} ${p(35, 24)}`, // inner return, descending to center
    `C ${p(28, 34)} ${p(10, 34)} ${p(8, 26)}`,  // bottom of lower lobe (bows down)
    `C ${p(6, 19)}  ${p(10, 13)} ${p(18, 12)}`, // lower-left approach
    `Z`,
  ].join(' ');
}

function ovalPath(x, y) {
  // Horizontal ellipse expressed as two arcs so it shares the path API
  // with diamond and squiggle (needed for consistent clipPath usage).
  const cx  = x + SHAPE_WIDTH / 2;
  const cy  = y + SHAPE_HEIGHT / 2;
  const rx  = SHAPE_WIDTH / 2 - 3;  // slight inset so stroke stays within box
  const ry  = SHAPE_HEIGHT / 2 - 2;
  return [
    `M ${cx - rx},${cy}`,
    `A ${rx},${ry} 0 0 1 ${cx + rx},${cy}`,
    `A ${rx},${ry} 0 0 1 ${cx - rx},${cy}`,
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
