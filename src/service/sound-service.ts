import { SoundEventKey } from "@/dto/GameDTO";
import { SOUND_CONFIG } from "@/service/game-constants";

class SoundService {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isMuted = false;
  private lastPlayedAt: Partial<Record<SoundEventKey, number>> = {};

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public unlock(): void {
    this.getAudioContext();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public play(event: SoundEventKey): void {
    if (typeof window === "undefined") return;
    if (!SOUND_CONFIG.enabled || this.isMuted) return;

    const entry = SOUND_CONFIG.events[event];
    if (!entry || !entry.enabled) return;

    const nowMs = performance.now();
    const lastMs = this.lastPlayedAt[event] ?? 0;
    if (nowMs - lastMs < entry.cooldownMs) return;
    this.lastPlayedAt[event] = nowMs;

    const effectiveVolume = Math.max(0, Math.min(1, entry.volume * SOUND_CONFIG.masterVolume));
    if (effectiveVolume <= 0) return;

    // Nếu người dùng đã điền file âm thanh riêng trong SOUND_CONFIG.events[event].src -> phát file đó
    if (entry.src) {
      try {
        const audio = new Audio(entry.src);
        audio.volume = effectiveVolume;
        audio.play().catch(() => {});
      } catch {
        // Bỏ qua lỗi autoplay hoặc thiếu file
      }
      return;
    }

    // Ngược lại, dùng Web Audio API tổng hợp âm thanh mặc định (không cần tải file ngoài)
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.playSynth(ctx, event, effectiveVolume);
  }

  private playTone(
    ctx: AudioContext,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    volume: number,
    delaySec = 0
  ): void {
    const start = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + durationSec);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
  }

  private playNoise(
    ctx: AudioContext,
    cutoffHz: number,
    durationSec: number,
    volume: number,
    delaySec = 0
  ): void {
    const start = ctx.currentTime + delaySec;
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoffHz, start);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + durationSec + 0.02);
  }

  private playSynth(ctx: AudioContext, event: SoundEventKey, vol: number): void {
    switch (event) {
      case "shootPistol":
        this.playTone(ctx, "triangle", 580, 180, 0.07, vol * 0.7);
        break;

      case "shootAk":
        this.playTone(ctx, "sawtooth", 360, 120, 0.075, vol * 0.5);
        this.playNoise(ctx, 1800, 0.055, vol * 0.45);
        break;

      case "shootMachineGun":
        this.playTone(ctx, "square", 420, 150, 0.045, vol * 0.35);
        this.playNoise(ctx, 2200, 0.04, vol * 0.35);
        break;

      case "shootCannon":
        this.playTone(ctx, "sine", 160, 42, 0.24, vol * 0.9);
        this.playNoise(ctx, 680, 0.2, vol * 0.85);
        break;

      case "hitEnemy":
        this.playTone(ctx, "sine", 720, 420, 0.045, vol * 0.55);
        break;

      case "cannonExplosion":
        this.playTone(ctx, "sine", 120, 32, 0.3, vol * 0.9);
        this.playNoise(ctx, 520, 0.28, vol * 0.85);
        break;

      case "killEnemy":
        this.playTone(ctx, "triangle", 340, 85, 0.12, vol * 0.7);
        this.playNoise(ctx, 1100, 0.09, vol * 0.45);
        break;

      case "killBoss":
        this.playNoise(ctx, 480, 0.5, vol);
        this.playTone(ctx, "sine", 150, 30, 0.45, vol, 0);
        this.playTone(ctx, "sine", 180, 35, 0.4, vol * 0.85, 0.14);
        this.playTone(ctx, "triangle", 440, 880, 0.3, vol * 0.65, 0.26);
        break;

      case "hitCrate":
        this.playTone(ctx, "sine", 980, 1280, 0.045, vol * 0.5);
        break;

      case "upgradeWeapon":
        this.playTone(ctx, "triangle", 523.25, 523.25, 0.1, vol * 0.65, 0);
        this.playTone(ctx, "triangle", 659.25, 659.25, 0.1, vol * 0.65, 0.08);
        this.playTone(ctx, "triangle", 783.99, 783.99, 0.18, vol * 0.75, 0.16);
        break;

      case "rageReady":
        this.playTone(ctx, "sine", 783.99, 783.99, 0.1, vol * 0.65, 0);
        this.playTone(ctx, "sine", 1046.5, 1046.5, 0.2, vol * 0.75, 0.09);
        break;

      case "rageActivate":
        this.playTone(ctx, "sawtooth", 180, 720, 0.32, vol * 0.55, 0);
        this.playTone(ctx, "triangle", 523.25, 1046.5, 0.3, vol * 0.65, 0.08);
        break;

      case "icbmLaunch":
        this.playTone(ctx, "sawtooth", 130, 520, 0.65, vol * 0.55, 0);
        this.playNoise(ctx, 900, 0.6, vol * 0.75, 0);
        break;

      case "icbmImpact":
        this.playNoise(ctx, 420, 0.85, vol);
        this.playTone(ctx, "sine", 140, 26, 0.75, vol, 0);
        this.playTone(ctx, "sine", 95, 22, 0.85, vol * 0.9, 0.12);
        break;

      case "playerHit":
        this.playTone(ctx, "sawtooth", 170, 62, 0.2, vol * 0.7);
        break;

      case "stageClear":
        this.playTone(ctx, "triangle", 523.25, 523.25, 0.09, vol * 0.65, 0);
        this.playTone(ctx, "triangle", 659.25, 659.25, 0.09, vol * 0.65, 0.09);
        this.playTone(ctx, "triangle", 783.99, 783.99, 0.1, vol * 0.65, 0.18);
        this.playTone(ctx, "triangle", 1046.5, 1046.5, 0.24, vol * 0.8, 0.27);
        break;

      case "bossWarning":
        this.playTone(ctx, "sawtooth", 210, 310, 0.22, vol * 0.65, 0);
        this.playTone(ctx, "sine", 95, 45, 0.28, vol * 0.85, 0);
        this.playTone(ctx, "sawtooth", 210, 330, 0.26, vol * 0.65, 0.28);
        this.playTone(ctx, "sine", 95, 40, 0.32, vol * 0.85, 0.28);
        break;

      case "bossBite":
        this.playTone(ctx, "sawtooth", 240, 52, 0.18, vol * 0.85, 0);
        this.playNoise(ctx, 980, 0.22, vol * 0.9, 0);
        this.playTone(ctx, "sine", 115, 34, 0.3, vol, 0.03);
        break;

      case "victory":
        this.playTone(ctx, "triangle", 523.25, 523.25, 0.11, vol * 0.7, 0);
        this.playTone(ctx, "triangle", 659.25, 659.25, 0.11, vol * 0.7, 0.11);
        this.playTone(ctx, "triangle", 783.99, 783.99, 0.11, vol * 0.7, 0.22);
        this.playTone(ctx, "triangle", 1046.5, 1046.5, 0.16, vol * 0.8, 0.33);
        this.playTone(ctx, "triangle", 783.99, 783.99, 0.1, vol * 0.7, 0.5);
        this.playTone(ctx, "triangle", 1046.5, 1046.5, 0.35, vol * 0.85, 0.61);
        break;

      case "gameOver":
        this.playTone(ctx, "triangle", 392.0, 370.0, 0.18, vol * 0.65, 0);
        this.playTone(ctx, "triangle", 349.23, 329.63, 0.18, vol * 0.65, 0.19);
        this.playTone(ctx, "triangle", 293.66, 261.63, 0.22, vol * 0.65, 0.38);
        this.playTone(ctx, "triangle", 220.0, 146.83, 0.42, vol * 0.75, 0.6);
        break;
    }
  }
}

export const soundService = new SoundService();
export default soundService;
