import { SoundEventKey } from "@/dto/GameDTO";
import { SOUND_CONFIG } from "@/service/game-constants";

export type BgmTrack = "NONE" | "LOBBY" | "COMBAT" | "BOSS";

class SoundService {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isMuted = false;
  private bgmVolume = 0.55;
  private sfxVolume = 0.75;
  private lastPlayedAt: Partial<Record<SoundEventKey, number>> = {};
  private lastWeaponShotAt: Record<string, number> = {};

  private bgmGain: GainNode | null = null;
  private desiredBgmTrack: BgmTrack = "NONE";
  private activeBgmTrack: BgmTrack = "NONE";
  private bgmTimerId: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;
  private bgmNextNoteTime = 0;

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

  private getBgmGain(ctx: AudioContext): GainNode {
    if (!this.bgmGain) {
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0, ctx.currentTime);
      this.bgmGain.connect(ctx.destination);
    }
    return this.bgmGain;
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
    const ctx = this.getAudioContext();
    if (ctx && this.desiredBgmTrack !== "NONE" && this.bgmTimerId === null) {
      this.startBgmScheduler(ctx);
    }
  }

  private computeBgmTargetGain(): number {
    if (!SOUND_CONFIG.enabled || this.isMuted || this.desiredBgmTrack === "NONE") return 0;
    return 0.32 * this.bgmVolume * SOUND_CONFIG.masterVolume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this.computeBgmTargetGain(), this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this.computeBgmTargetGain(), this.ctx.currentTime, 0.05);
    }
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setBgmTrack(track: BgmTrack): void {
    this.desiredBgmTrack = track;
    if (typeof window === "undefined") return;
    if (track === "NONE") {
      this.stopBgmScheduler();
      return;
    }
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (this.activeBgmTrack !== track) {
      this.activeBgmTrack = track;
      this.bgmStep = 0;
      this.bgmNextNoteTime = ctx.currentTime + 0.05;
    }
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this.computeBgmTargetGain(), ctx.currentTime, 0.08);
    }
    if (ctx.state === "running" && this.bgmTimerId === null) {
      this.startBgmScheduler(ctx);
    }
  }

  private startBgmScheduler(ctx: AudioContext): void {
    if (this.bgmTimerId !== null) return;
    const gain = this.getBgmGain(ctx);
    gain.gain.setTargetAtTime(this.computeBgmTargetGain(), ctx.currentTime, 0.08);
    this.activeBgmTrack = this.desiredBgmTrack;
    this.bgmNextNoteTime = Math.max(this.bgmNextNoteTime, ctx.currentTime + 0.04);

    this.bgmTimerId = setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running" || this.desiredBgmTrack === "NONE") return;
      const horizon = this.ctx.currentTime + 0.18;
      while (this.bgmNextNoteTime < horizon) {
        this.scheduleBgmStep(this.ctx, this.bgmNextNoteTime, this.bgmStep, this.desiredBgmTrack);
        const bpm =
          this.desiredBgmTrack === "BOSS" ? 152 : this.desiredBgmTrack === "COMBAT" ? 138 : 104;
        const stepSec = 60 / bpm / 4; // 16th-note step
        this.bgmNextNoteTime += stepSec;
        this.bgmStep = (this.bgmStep + 1) % 32;
      }
    }, 70);
  }

  private stopBgmScheduler(): void {
    if (this.bgmTimerId !== null) {
      clearInterval(this.bgmTimerId);
      this.bgmTimerId = null;
    }
    this.activeBgmTrack = "NONE";
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
    }
  }

  private scheduleBgmStep(
    ctx: AudioContext,
    time: number,
    step: number,
    track: BgmTrack
  ): void {
    if (!SOUND_CONFIG.enabled || this.isMuted) return;
    const dest = this.getBgmGain(ctx);

    if (track === "LOBBY") {
      // Chill cyberpunk progression: A1 - F1 - G1 - E1
      const bassRoots = [55.0, 43.65, 49.0, 41.2];
      const bar = Math.floor(step / 8);
      if (step % 4 === 0) {
        this.playBgmTone(ctx, dest, "triangle", bassRoots[bar], bassRoots[bar] * 0.99, 0.28, 0.32, time, 420);
      }
      const arpNotes = [220, 261.63, 329.63, 392.0, 174.61, 220, 261.63, 329.63, 196.0, 246.94, 293.66, 392.0, 164.81, 207.65, 246.94, 329.63];
      if (step % 2 === 0) {
        const note = arpNotes[(bar * 4 + ((step % 8) / 2)) % arpNotes.length];
        this.playBgmTone(ctx, dest, "sine", note, note, 0.18, 0.14, time);
      }
      if (step % 8 === 0) {
        this.playBgmTone(ctx, dest, "sine", 95, 38, 0.14, 0.35, time);
      }
      if (step % 4 === 2) {
        this.playBgmHat(ctx, dest, time, 0.04, 0.06);
      }
      return;
    }

    if (track === "COMBAT") {
      // Driving 138 BPM action synthwave: A1 - C2 - G1 - F1
      const bassRoots = [55.0, 65.41, 49.0, 43.65];
      const bar = Math.floor(step / 8);
      const root = bassRoots[bar];
      const bassFreq = step % 4 === 2 ? root * 2 : root;
      if (step % 2 === 0) {
        this.playBgmTone(ctx, dest, "sawtooth", bassFreq, bassFreq, 0.11, 0.22, time, 650);
      }
      const lead = [440, 523.25, 659.25, 523.25, 493.88, 587.33, 659.25, 783.99];
      if (step % 2 === 1) {
        const f = lead[(step + bar * 2) % lead.length];
        this.playBgmTone(ctx, dest, "square", f, f * 0.995, 0.08, 0.07, time, 1800);
      }
      if (step % 4 === 0) {
        this.playBgmTone(ctx, dest, "sine", 125, 40, 0.12, 0.55, time);
      }
      if (step % 8 === 4) {
        this.playBgmHat(ctx, dest, time, 0.09, 0.18, 1600);
      } else if (step % 2 === 1) {
        this.playBgmHat(ctx, dest, time, 0.03, 0.07, 5200);
      }
      return;
    }

    // BOSS track: 152 BPM intense Phrygian
    const bossRoots = [41.2, 43.65, 49.0, 43.65]; // E1 - F1 - G1 - F1
    const bar = Math.floor(step / 8);
    const root = bossRoots[bar];
    const bassFreq = step % 2 === 1 ? root * 2 : root;
    this.playBgmTone(ctx, dest, "sawtooth", bassFreq, bassFreq, 0.085, 0.24, time, 820);
    const bossArp = [329.63, 349.23, 440, 493.88, 659.25, 493.88, 440, 349.23];
    if (step % 2 === 0) {
      const f = bossArp[(step / 2 + bar) % bossArp.length];
      this.playBgmTone(ctx, dest, "sawtooth", f, f, 0.09, 0.09, time, 2200);
    }
    if (step % 4 === 0 || step === 14 || step === 30) {
      this.playBgmTone(ctx, dest, "sine", 140, 36, 0.12, 0.6, time);
    }
    if (step % 8 === 4) {
      this.playBgmHat(ctx, dest, time, 0.1, 0.22, 1800);
    }
  }

  private playBgmTone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    volume: number,
    startTime: number,
    cutoffHz?: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), startTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + durationSec);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    if (cutoffHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoffHz, startTime);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
  }

  private playBgmHat(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    durationSec: number,
    volume: number,
    highpassHz = 4500
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(highpassHz, startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(startTime);
    src.stop(startTime + durationSec + 0.01);
  }

  public play(event: SoundEventKey): void {
    if (typeof window === "undefined") return;
    if (!SOUND_CONFIG.enabled || this.isMuted || this.sfxVolume <= 0) return;

    const entry = SOUND_CONFIG.events[event];
    if (!entry || !entry.enabled) return;

    const nowMs = performance.now();
    const lastMs = this.lastPlayedAt[event] ?? 0;
    if (nowMs - lastMs < entry.cooldownMs) return;
    this.lastPlayedAt[event] = nowMs;

    const effectiveVolume = Math.max(
      0,
      Math.min(1, entry.volume * this.sfxVolume * SOUND_CONFIG.masterVolume)
    );
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

  /** Phát tiếng súng tổng hợp riêng biệt cho từng loại trong 20 vũ khí */
  public playWeaponShot(weaponId: string): void {
    if (typeof window === "undefined") return;
    if (!SOUND_CONFIG.enabled || this.isMuted || this.sfxVolume <= 0) return;

    const nowMs = performance.now();
    const cooldownMs =
      weaponId === "minigun" || weaponId === "smg_neon" || weaponId === "flamethrower"
        ? 45
        : weaponId === "cannon" || weaponId === "rocket_launcher" || weaponId === "nuke_launcher" || weaponId === "icbm" || weaponId === "rail_gun"
          ? 100
          : 55;
    if (nowMs - (this.lastWeaponShotAt[weaponId] ?? 0) < cooldownMs) return;
    this.lastWeaponShotAt[weaponId] = nowMs;

    const ctx = this.getAudioContext();
    if (!ctx) return;
    const vol = 0.42 * this.sfxVolume * SOUND_CONFIG.masterVolume;
    if (vol <= 0) return;

    const jitter = 0.94 + Math.random() * 0.12;
    switch (weaponId) {
      case "pistol":
        this.playTone(ctx, "triangle", 620 * jitter, 180 * jitter, 0.065, vol * 0.75);
        this.playNoise(ctx, 2600, 0.035, vol * 0.35);
        break;
      case "ak47":
        this.playTone(ctx, "sawtooth", 340 * jitter, 110 * jitter, 0.08, vol * 0.55);
        this.playNoise(ctx, 1800, 0.06, vol * 0.5);
        break;
      case "shotgun":
        this.playTone(ctx, "sine", 210 * jitter, 48, 0.16, vol * 0.9);
        this.playNoise(ctx, 1100, 0.14, vol * 0.85);
        break;
      case "smg_neon":
        this.playTone(ctx, "square", 520 * jitter, 190 * jitter, 0.04, vol * 0.38);
        this.playNoise(ctx, 2800, 0.035, vol * 0.32);
        break;
      case "cryo_gun":
        this.playTone(ctx, "sine", 1150 * jitter, 680 * jitter, 0.09, vol * 0.45);
        this.playNoise(ctx, 3600, 0.08, vol * 0.4);
        break;
      case "minigun":
        this.playTone(ctx, "sawtooth", 440 * jitter, 150 * jitter, 0.04, vol * 0.42);
        this.playNoise(ctx, 2400, 0.035, vol * 0.38);
        break;
      case "tesla_gun":
        this.playTone(ctx, "square", 980 * jitter, 280 * jitter, 0.075, vol * 0.42);
        this.playTone(ctx, "sawtooth", 1420 * jitter, 420 * jitter, 0.055, vol * 0.25, 0.01);
        break;
      case "scatter":
        this.playTone(ctx, "triangle", 320 * jitter, 75, 0.12, vol * 0.75);
        this.playNoise(ctx, 1500, 0.1, vol * 0.7);
        break;
      case "cannon":
        this.playTone(ctx, "sine", 160 * jitter, 40, 0.24, vol * 1.05);
        this.playNoise(ctx, 680, 0.2, vol * 0.9);
        break;
      case "rocket_launcher":
        this.playTone(ctx, "sawtooth", 140 * jitter, 310 * jitter, 0.18, vol * 0.55);
        this.playNoise(ctx, 1100, 0.22, vol * 0.75);
        break;
      case "grenade_launcher":
        this.playTone(ctx, "sine", 210 * jitter, 72, 0.13, vol * 0.85);
        this.playNoise(ctx, 900, 0.08, vol * 0.45);
        break;
      case "flamethrower":
        this.playNoise(ctx, 950 * jitter, 0.09, vol * 0.55);
        this.playTone(ctx, "sawtooth", 130 * jitter, 90, 0.08, vol * 0.22);
        break;
      case "acid_sprayer":
        this.playTone(ctx, "triangle", 480 * jitter, 740 * jitter, 0.075, vol * 0.4);
        this.playNoise(ctx, 2200, 0.065, vol * 0.42);
        break;
      case "plasma_rifle":
        this.playTone(ctx, "sawtooth", 860 * jitter, 220 * jitter, 0.085, vol * 0.48);
        this.playTone(ctx, "sine", 520 * jitter, 140 * jitter, 0.07, vol * 0.4);
        break;
      case "rail_gun":
        this.playTone(ctx, "sawtooth", 1680 * jitter, 95, 0.19, vol * 0.7);
        this.playNoise(ctx, 3200, 0.12, vol * 0.7);
        break;
      case "laser_cannon":
        this.playTone(ctx, "sawtooth", 960 * jitter, 340 * jitter, 0.12, vol * 0.52);
        this.playTone(ctx, "square", 640 * jitter, 210 * jitter, 0.11, vol * 0.35);
        break;
      case "vortex_gun":
        this.playTone(ctx, "sine", 150 * jitter, 460 * jitter, 0.12, vol * 0.65);
        this.playTone(ctx, "triangle", 460 * jitter, 85, 0.14, vol * 0.55, 0.08);
        break;
      case "photon_burst":
        this.playTone(ctx, "sine", 1240 * jitter, 520 * jitter, 0.08, vol * 0.55);
        this.playTone(ctx, "triangle", 1760 * jitter, 880 * jitter, 0.07, vol * 0.35, 0.015);
        break;
      case "nuke_launcher":
        this.playTone(ctx, "sine", 125 * jitter, 34, 0.28, vol * 1.1);
        this.playNoise(ctx, 560, 0.24, vol * 0.9);
        break;
      case "icbm":
        this.playTone(ctx, "sawtooth", 110 * jitter, 260 * jitter, 0.28, vol * 0.65);
        this.playNoise(ctx, 720, 0.26, vol * 0.95);
        break;
      default:
        this.playTone(ctx, "sawtooth", 360 * jitter, 120 * jitter, 0.075, vol * 0.5);
        this.playNoise(ctx, 1800, 0.055, vol * 0.45);
        break;
    }
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
