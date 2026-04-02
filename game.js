// game.js — game state machine, logic, and UI wiring
//
// Depends on: cards.js (createCardSVG), audio.js (playCorrectSound/playWrongSound),
//             animations.js (animateDeal/animateRemoval)

'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

// How long to wait (ms) before showing "Deal 3 More" when no Set exists on table
const NO_SET_DELAY_MS = 20_000;

// How long (ms) to show correct/wrong feedback before clearing it
const CORRECT_FEEDBACK_MS = 600;
const WRONG_FEEDBACK_MS   = 700;

// ── Module-level state ───────────────────────────────────────────────────────

let gameState          = null;
let noSetTimerId       = null;
let statsTimerId       = null;
let resizeDebounceTimer = null;

// ── Deck ─────────────────────────────────────────────────────────────────────

function generateDeck() {
  const cards = [];
  // 81 unique cards: 3 shapes × 3 colors × 3 fills × 3 numbers
  for (let shape = 0; shape < 3; shape++) {
    for (let color = 0; color < 3; color++) {
      for (let fill = 0; fill < 3; fill++) {
        for (let number = 0; number < 3; number++) {
          cards.push({
            // Stable unique ID 0–80, used for SVG clipPath IDs
            id: shape * 27 + color * 9 + fill * 3 + number,
            shape,  // 0=diamond  1=squiggle  2=oval
            color,  // 0=red      1=green     2=purple
            fill,   // 0=solid    1=striped   2=open
            number, // 0=one      1=two       2=three
          });
        }
      }
    }
  }
  return cards;
}

function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Set validation ────────────────────────────────────────────────────────────
// For each of the 4 features, the 3 values must be all-same OR all-different.
// With only 3 possible values (0/1/2), "not all-same and not all-different"
// means exactly two cards share a value — which is the failure case.

function isValidSet(cardA, cardB, cardC) {
  return ['shape', 'color', 'fill', 'number'].every(feature => {
    const a = cardA[feature];
    const b = cardB[feature];
    const c = cardC[feature];
    // All same: a===b===c
    // All different: no two are equal (with 3 possible values, 3 distinct = all different)
    return (a === b && b === c) || (a !== b && b !== c && a !== c);
  });
}

// Returns [i, j, k] indices of the first valid Set found among `cards`, or null.
function findAnySet(cards) {
  for (let i = 0; i < cards.length - 2; i++) {
    for (let j = i + 1; j < cards.length - 1; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        if (isValidSet(cards[i], cards[j], cards[k])) {
          return [i, j, k];
        }
      }
    }
  }
  return null;
}

// ── Game initialisation ───────────────────────────────────────────────────────

function initGame() {
  clearTimeout(noSetTimerId);
  clearInterval(statsTimerId);

  const deck = shuffleDeck(generateDeck());

  gameState = {
    phase:           'playing', // 'playing' | 'correct' | 'wrong' | 'game-over'
    deck:            deck.slice(12),   // cards not yet on the table
    tableCards:      deck.slice(0, 12),// cards currently visible
    selectedIndices: [],               // up to 3 table indices the player has clicked
    setsFound:       0,
    startTime:       Date.now(),
    setTimestamps:   [Date.now()],     // timestamps per set; first = game start
  };

  document.getElementById('game-end-overlay').classList.add('hidden');
  hideDealMoreButton();

  // Animate all 12 cards on the initial deal
  renderBoard(12);
  updateStats();
  startStatsTimer();
  scheduleNoSetCheck();
}

// ── Stats timer ───────────────────────────────────────────────────────────────

function startStatsTimer() {
  clearInterval(statsTimerId);
  statsTimerId = setInterval(updateStats, 1000);
}

function updateStats() {
  if (!gameState) return;

  const elapsedSec = Math.floor((Date.now() - gameState.startTime) / 1000);
  const minutes    = Math.floor(elapsedSec / 60);
  const seconds    = elapsedSec % 60;

  document.getElementById('stat-sets').textContent = `Sets: ${gameState.setsFound}`;
  document.getElementById('stat-time').textContent =
    `${minutes}:${String(seconds).padStart(2, '0')}`;

  if (gameState.setsFound > 0) {
    const avgSec = Math.round((Date.now() - gameState.startTime) / gameState.setsFound / 1000);
    document.getElementById('stat-avg').textContent = `Avg: ${avgSec}s`;
  } else {
    document.getElementById('stat-avg').textContent = 'Avg: —';
  }
}

// ── No-set detection ──────────────────────────────────────────────────────────
// After each board change, start a countdown. If it expires and there's truly
// no Set on the table (and the deck isn't empty), surface the "Deal 3 More" button.

function scheduleNoSetCheck() {
  clearTimeout(noSetTimerId);
  hideDealMoreButton();

  // Don't schedule if there's nothing left to deal
  if (!gameState || gameState.deck.length === 0) return;

  noSetTimerId = setTimeout(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (!findAnySet(gameState.tableCards)) {
      showDealMoreButton();
    }
  }, NO_SET_DELAY_MS);
}

function showDealMoreButton() {
  document.getElementById('btn-deal-more').classList.remove('hidden');
}

function hideDealMoreButton() {
  document.getElementById('btn-deal-more').classList.add('hidden');
}

// ── Card selection ────────────────────────────────────────────────────────────

function handleCardClick(index) {
  if (gameState.phase !== 'playing') return;

  const selected = gameState.selectedIndices;

  if (selected.includes(index)) {
    // Deselect this card
    gameState.selectedIndices = selected.filter(i => i !== index);
    updateSelectionClasses();
    return;
  }

  if (selected.length >= 3) return; // Already have 3, ignore extra taps

  gameState.selectedIndices = [...selected, index];
  updateSelectionClasses();

  if (gameState.selectedIndices.length === 3) {
    evaluateSelection();
  }
}

function evaluateSelection() {
  const [i, j, k]  = gameState.selectedIndices;
  const trio        = [gameState.tableCards[i], gameState.tableCards[j], gameState.tableCards[k]];

  if (isValidSet(...trio)) {
    handleCorrectSet();
  } else {
    handleWrongSelection();
  }
}

// ── Correct Set ───────────────────────────────────────────────────────────────

function handleCorrectSet() {
  gameState.phase = 'correct';
  gameState.setsFound++;
  gameState.setTimestamps.push(Date.now());

  const indices = [...gameState.selectedIndices];

  // Capture the DOM elements now — they'll be gone after renderBoard clears the grid
  const allCardEls = [...document.querySelectorAll('.card')];
  const matchedEls = indices.map(i => allCardEls[i]).filter(Boolean);

  markCards(indices, 'correct');
  playCorrectSound();
  showMessage('');

  // Let the green flash play, then animate the cards out before removing them
  setTimeout(() => {
    animateRemoval(matchedEls, () => {
      // Track how many replacement cards are dealt so we can animate only those
      const deckLengthBefore = gameState.deck.length;

      removeAndReplaceCards(indices);

      const newCardCount = deckLengthBefore - gameState.deck.length;
      gameState.selectedIndices = [];
      gameState.phase = 'playing';

      renderBoard(newCardCount);
      updateStats();

      if (isGameOver()) {
        endGame();
      } else {
        scheduleNoSetCheck();
      }
    });
  }, CORRECT_FEEDBACK_MS);
}

// Remove the 3 Set cards and deal replacements if table drops below 12.
// Indices are sorted descending so splice offsets stay valid.
function removeAndReplaceCards(indices) {
  const sortedDesc = [...indices].sort((a, b) => b - a);
  sortedDesc.forEach(i => gameState.tableCards.splice(i, 1));

  // Only deal replacements when table would drop below 12 (standard play).
  // If we had >12 cards (extra deal), removing 3 naturally reduces toward 12.
  const deficit = 12 - gameState.tableCards.length;
  if (deficit > 0 && gameState.deck.length > 0) {
    const newCards = gameState.deck.splice(0, Math.min(deficit, gameState.deck.length));
    gameState.tableCards.push(...newCards);
  }
}

// ── Wrong selection ───────────────────────────────────────────────────────────

function handleWrongSelection() {
  gameState.phase = 'wrong';

  const indices = [...gameState.selectedIndices];
  markCards(indices, 'wrong');
  playWrongSound();
  showMessage('Not a Set — try again');

  setTimeout(() => {
    clearCardClasses(indices, ['wrong', 'selected']);
    gameState.selectedIndices = [];
    showMessage('');
    gameState.phase = 'playing';
  }, WRONG_FEEDBACK_MS);
}

// ── Deal 3 More ───────────────────────────────────────────────────────────────

function handleDealMore() {
  // Guard: ignore if mid-feedback (wrong-shake window) or game over —
  // the button should only act when we're genuinely in the playing phase.
  if (!gameState || gameState.phase !== 'playing') return;
  if (gameState.deck.length === 0) return;

  const newCards = gameState.deck.splice(0, Math.min(3, gameState.deck.length));
  gameState.tableCards.push(...newCards);
  hideDealMoreButton();

  // Animate only the newly added cards, not the ones already on the table
  renderBoard(newCards.length);

  if (isGameOver()) {
    endGame();
  } else {
    scheduleNoSetCheck();
  }
}

// ── Game over ─────────────────────────────────────────────────────────────────

function isGameOver() {
  return gameState.deck.length === 0 && !findAnySet(gameState.tableCards);
}

function endGame() {
  clearInterval(statsTimerId);
  clearTimeout(noSetTimerId);
  gameState.phase = 'game-over';

  const totalMs  = Date.now() - gameState.startTime;
  const totalSec = Math.round(totalMs / 1000);
  const minutes  = Math.floor(totalSec / 60);
  const seconds  = totalSec % 60;
  const timeStr  = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const avgSec   = gameState.setsFound > 0
    ? Math.round(totalMs / gameState.setsFound / 1000)
    : 0;

  document.getElementById('final-stats').innerHTML = `
    <p>Sets found: <strong>${gameState.setsFound}</strong></p>
    <p>Total time: <strong>${timeStr}</strong></p>
    <p>Average per set: <strong>${avgSec}s</strong></p>
  `;

  document.getElementById('game-end-overlay').classList.remove('hidden');

  // Move focus to "Play Again" so keyboard and switch-access users don't
  // need to navigate through the whole page to interact with the overlay.
  // A short delay lets the browser paint the overlay before focusing.
  setTimeout(() => {
    document.getElementById('btn-play-again').focus();
  }, 50);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

// newCardCount: how many of the last cards in tableCards were just added and
// should animate in. Pass 0 (default) to skip deal animation entirely.
function renderBoard(newCardCount = 0) {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = '';

  const totalCards       = gameState.tableCards.length;
  // New cards are always appended to the end of tableCards
  const newCardStartIndex = totalCards - newCardCount;

  gameState.tableCards.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.setAttribute('role', 'button');
    cardDiv.setAttribute('tabindex', '0');
    cardDiv.setAttribute('aria-label', describeCard(card));
    cardDiv.setAttribute('aria-pressed', 'false');
    cardDiv.dataset.index = String(index);

    if (gameState.selectedIndices.includes(index)) {
      cardDiv.classList.add('selected');
      cardDiv.setAttribute('aria-pressed', 'true');
    }

    cardDiv.appendChild(createCardSVG(card));

    cardDiv.addEventListener('click', () => handleCardClick(index));
    cardDiv.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(index);
      }
    });

    grid.appendChild(cardDiv);

    // Stagger new cards by 70ms each so they don't all pop in simultaneously
    if (newCardCount > 0 && index >= newCardStartIndex) {
      const staggerDelay = (index - newCardStartIndex) * 70;
      animateDeal(cardDiv, staggerDelay);
    }
  });
}

// Sync selection CSS classes without re-rendering the whole board
function updateSelectionClasses() {
  document.querySelectorAll('.card').forEach((el, index) => {
    const isSelected = gameState.selectedIndices.includes(index);
    el.classList.toggle('selected', isSelected);
    el.setAttribute('aria-pressed', String(isSelected));
  });
}

// Add a feedback class (e.g. 'correct', 'wrong') to specific cards
function markCards(indices, className) {
  const cards = document.querySelectorAll('.card');
  indices.forEach(i => {
    if (cards[i]) {
      cards[i].classList.remove('selected');
      cards[i].classList.add(className);
    }
  });
}

// Remove one or more CSS classes from specific cards
function clearCardClasses(indices, classNames) {
  const cards = document.querySelectorAll('.card');
  indices.forEach(i => {
    if (cards[i]) cards[i].classList.remove(...classNames);
  });
}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

// Human-readable card description for screen readers
function describeCard(card) {
  const shapes  = ['diamond', 'squiggle', 'oval'];
  const colors  = ['red', 'green', 'purple'];
  const fills   = ['solid', 'striped', 'open'];
  const count   = card.number + 1;
  const shape   = shapes[card.shape];
  return `${count} ${colors[card.color]} ${fills[card.fill]} ${shape}${count > 1 ? 's' : ''}`;
}

// ── Viewport-relative card sizing ─────────────────────────────────────────────
// Computes the card column width such that 4 rows of cards fit in the visible
// viewport without scrolling, accounting for the header and controls area.
// Sets --card-column-width and --card-grid-max-width on :root so CSS can use them.

function updateCardSizing() {
  const header       = document.querySelector('header');
  const headerHeight = header ? header.getBoundingClientRect().height : 60;
  const gridEl       = document.getElementById('card-grid');

  // Read the current row and column gaps from CSS (they vary by breakpoint)
  const rowGap = gridEl ? (parseInt(getComputedStyle(gridEl).rowGap,  10) || 16) : 16;
  const colGap = gridEl ? (parseInt(getComputedStyle(gridEl).columnGap, 10) || 16) : 16;

  // Space consumed by everything except the card grid:
  //   main padding (top 24 + bottom 32) + 2 flex gaps (20 each) + controls (44)
  //   + message (22) = ~162px. Use 165 for a small safety margin.
  const RESERVED_HEIGHT = 165;
  const CARD_ROWS       = 4;
  const ASPECT_RATIO    = 140 / 100; // viewBox 100×140 in cards.js

  const availableForGrid = window.innerHeight - headerHeight - RESERVED_HEIGHT;
  const rawCardHeight    = (availableForGrid - (CARD_ROWS - 1) * rowGap) / CARD_ROWS;

  // Clamp: don't let cards become unreadably small or excessively large
  const cardHeight = Math.max(80, Math.min(200, Math.floor(rawCardHeight)));
  const cardWidth  = Math.floor(cardHeight / ASPECT_RATIO);
  const gridWidth  = 3 * cardWidth + 2 * colGap;

  document.documentElement.style.setProperty('--card-column-width', `${cardWidth}px`);
  document.documentElement.style.setProperty('--card-grid-max-width', `${gridWidth}px`);
}

// Debounce resize events — computing styles on every pixel of resize drag is wasteful
function scheduleCardSizingUpdate() {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(updateCardSizing, 100);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Size cards before the first render so the grid is correct from frame one
  updateCardSizing();

  window.addEventListener('resize',            scheduleCardSizingUpdate);
  window.addEventListener('orientationchange', scheduleCardSizingUpdate);

  // Unlock Web Audio on first interaction — required for iOS Safari, which
  // suspends AudioContext until a synchronous user gesture plays a sound.
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('click',      unlockAudio, { once: true });

  document.getElementById('btn-new-game').addEventListener('click', initGame);
  document.getElementById('btn-deal-more').addEventListener('click', handleDealMore);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-end-overlay').classList.add('hidden');
    initGame();
  });

  initGame();
});
