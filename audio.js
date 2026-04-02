// audio.js — sound feedback via Web Audio API
//
// Generates tones programmatically — no audio files needed.
// AudioContext is created lazily on first use (browsers require a user gesture).

'use strict';

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (can happen after page interaction policy kicks in)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
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
