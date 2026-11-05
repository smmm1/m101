// Quiet, low-volume UI sounds for M101. Preferences are local to this browser.
export type UISound = 'click' | 'success' | 'error' | 'open';

type SoundSettings = { enabled: boolean; volume: number };
const STORAGE_KEY = 'm101_sound_settings_v1';
const DEFAULT_SETTINGS: SoundSettings = { enabled: false, volume: 0.22 };
let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

export function getSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<SoundSettings>;
    return {
      enabled: parsed.enabled === true,
      volume: typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)
        ? Math.min(0.5, Math.max(0, parsed.volume))
        : DEFAULT_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  if (typeof window === 'undefined') return;
  const safeSettings = {
    enabled: Boolean(settings.enabled),
    volume: Math.min(0.5, Math.max(0, Number(settings.volume) || 0)),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
  } catch {
    // Sound preferences are optional; storage failure must not affect the app.
  }
}

export function playUISound(type: UISound = 'click', force = false): void {
  if (typeof window === 'undefined') return;
  const settings = getSoundSettings();
  if ((!settings.enabled && !force) || settings.volume <= 0) return;

  const nowMs = Date.now();
  if (type === 'click' && nowMs - lastPlayedAt < 85) return;
  lastPlayedAt = nowMs;

  try {
    const AudioContextConstructor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!audioContext) audioContext = new AudioContextConstructor();
    if (audioContext.state === 'suspended') void audioContext.resume();

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(settings.volume * (type === 'click' ? 0.16 : 0.22), now);
    master.connect(audioContext.destination);

    const notes: Record<UISound, { frequency: number; endFrequency: number; duration: number }> = {
      click: { frequency: 520, endFrequency: 440, duration: 0.045 },
      open: { frequency: 440, endFrequency: 560, duration: 0.085 },
      success: { frequency: 523.25, endFrequency: 659.25, duration: 0.14 },
      error: { frequency: 330, endFrequency: 290, duration: 0.11 },
    };
    const note = notes[type];
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, now + note.duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.65, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + note.duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(now);
    oscillator.stop(now + note.duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      master.disconnect();
    };
  } catch {
    // Audio is an enhancement only; browser restrictions must never interrupt UI.
  }
}

export function initCuteClickSound(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const control = target.closest('button, a, [role="button"]') as HTMLElement | null;
    if (!control || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;
    if (control.closest('[data-sound="off"]') || control.getAttribute('data-sound') === 'off') return;
    playUISound(control.dataset.sound === 'open' ? 'open' : 'click');
  };

  window.addEventListener('click', handleClick, { passive: true, capture: true });
  return () => window.removeEventListener('click', handleClick, { capture: true });
}
