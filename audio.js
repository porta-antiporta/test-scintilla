// audio.js — sound feedback via Web Audio API
//
// Generates tones programmatically — no audio files needed.
//
// iOS Safari suspends AudioContext until a synchronous user gesture AND requires
// a silent buffer to be played in that same gesture to fully unlock it.
// unlockAudio() should be called on the first touchstart/click (see game.js).
// After that the context stays running and playTone works normally.

'use strict';

let audioContext = null;

// Call once, from within a touchstart or click handler, before any game sounds
// are needed. Creates the AudioContext and plays a silent buffer to satisfy iOS.
function unlockAudio() {
  if (audioContext) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch {
    // Web Audio not available on this device — all sounds will silently no-op
  }
}

function getAudioContext() {
  if (!audioContext) {
    // Fallback: context wasn't pre-unlocked (e.g. desktop, no touch)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Plays a single tone and fades it out.
function playTone(frequency, duration, type = 'sine', peakGain = 0.25) {
  try {
    const ctx        = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(peakGain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio unavailable — silent failure is acceptable
  }
}

// Pleasant ascending two-note chime for a correct Set
function playCorrectSound() {
  playTone(523.25, 0.18, 'sine', 0.25); // C5
  setTimeout(() => playTone(783.99, 0.35, 'sine', 0.2), 120); // G5
}

// Short low buzz for an incorrect selection
function playWrongSound() {
  playTone(180, 0.28, 'sawtooth', 0.12);
}
