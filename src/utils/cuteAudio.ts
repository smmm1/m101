// Web Audio API synthesized cute click sound
let audioCtx: AudioContext | null = null;

export function playCuteClickSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Pleasant cute bubbly "pop" tone (frequency drops smoothly from 950Hz to 480Hz)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.06);

    // Soft envelope to avoid any harsh clicking or distortion
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    // Ignore audio autoplay restrictions if user hasn't interacted yet
  }
}

// Global listener helper to automatically trigger on buttons and links
export function initCuteClickSound() {
  if (typeof window === 'undefined') return;

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or its parent is interactive
    const isInteractive = target.closest('button, a, input, select, [role="button"], .cursor-pointer');
    if (isInteractive) {
      playCuteClickSound();
    }
  };

  window.addEventListener('click', handleClick, { passive: true, capture: true });

  return () => {
    window.removeEventListener('click', handleClick, { capture: true });
  };
}
