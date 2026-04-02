// animations.js — card dealing and removal animations
//
// Designed to be CSS-driven: JS only adds/removes classes and listens for
// animationend. The actual motion is declared in styles.css so the browser's
// compositor can run it off the main thread where possible.

'use strict';

// Animate a single card element sliding in from above.
// Called once per card from renderBoard(); delayMs staggers simultaneous deals.
function animateDeal(cardElement, delayMs = 0) {
  cardElement.style.animationDelay = `${delayMs}ms`;
  cardElement.classList.add('card-dealing');

  // Clean up after the animation so later state changes (hover, selection)
  // aren't affected by a stale animation-delay or the dealing class.
  cardElement.addEventListener('animationend', () => {
    cardElement.classList.remove('card-dealing');
    cardElement.style.animationDelay = '';
  }, { once: true });
}

// Animate an array of card elements fading and scaling out, then call onComplete.
// game.js waits for onComplete before wiping the DOM and re-rendering.
function animateRemoval(cardElements, onComplete) {
  if (!cardElements || cardElements.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  let finishedCount = 0;
  let completed = false;

  // Single entry point for completion — guards against double-fire from
  // both the animationend path and the fallback timer path.
  function complete() {
    if (completed) return;
    completed = true;
    clearTimeout(fallbackTimer);
    if (onComplete) onComplete();
  }

  // Fallback: if animationend never fires (prefers-reduced-motion, tab
  // hidden, browser quirk), unblock the game after 600ms so it can't hang.
  const fallbackTimer = setTimeout(complete, 600);

  cardElements.forEach(el => {
    // Disable pointer events immediately so the player can't re-click during animation
    el.style.pointerEvents = 'none';
    el.classList.add('card-removing');

    el.addEventListener('animationend', () => {
      finishedCount++;
      // Only fire the callback once all cards have finished
      if (finishedCount === cardElements.length) {
        complete();
      }
    }, { once: true });
  });
}
