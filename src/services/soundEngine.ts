/**
 * Briscolatro Web Audio Sound Synthesizer
 * Generates dynamic 8-bit / 16-bit retro sounds procedurally without external assets.
 */


interface UnoAccent {
  wave: OscillatorType;
  /** Frequencies in Hz, played one after the other. */
  notes: number[];
  /** Seconds between notes. */
  step?: number;
  /** Seconds each note takes to die out. */
  decay?: number;
  gain?: number;
  /** Multiplier a note glides towards, for sweeps. */
  glide?: number;
  /** Frequency of a low body hit under the notes. */
  thump?: number;
}

const UNO_ACCENTS: Record<string, UnoAccent> = {
  // Pesca due: two blips, red bright and blue dark, so the pair is a pair.
  uno_plus_two_red: { wave: 'square', notes: [587.33, 880.0], step: 0.07, decay: 0.16 },
  uno_plus_two_blue: { wave: 'square', notes: [392.0, 587.33], step: 0.07, decay: 0.16 },
  // Pesca quattro: the same idea, four notes and a body under it.
  uno_plus_four_wild: {
    wave: 'square',
    notes: [523.25, 659.25, 783.99, 1046.5],
    step: 0.06,
    decay: 0.18,
    thump: 110,
  },
  // Reverse: a whirl that goes up and comes back.
  uno_reverse_green: { wave: 'sine', notes: [880.0, 440.0], step: 0.11, decay: 0.24, glide: 0.55 },
  // Skip: a door slammed in your face.
  uno_skip_red: { wave: 'sawtooth', notes: [233.08, 155.56], step: 0.08, decay: 0.2, thump: 90 },
  // Cambio seme: a clean bell triad.
  uno_wild_suit: { wave: 'triangle', notes: [659.25, 830.61, 987.77], step: 0.08, decay: 0.3 },
  // Scambio: two notes crossing over each other.
  uno_swap_yellow: { wave: 'triangle', notes: [740.0, 494.0, 740.0], step: 0.075, decay: 0.18 },
  // The three finishes: metal, shimmer, rainbow.
  uno_custom_foil: { wave: 'sine', notes: [1318.51, 1567.98], step: 0.05, decay: 0.34, gain: 0.22 },
  uno_custom_holo: { wave: 'sine', notes: [987.77, 1244.51, 1567.98], step: 0.055, decay: 0.36, glide: 1.06, gain: 0.2 },
  uno_custom_polychrome: {
    wave: 'triangle',
    notes: [523.25, 659.25, 783.99, 987.77, 1174.66],
    step: 0.05,
    decay: 0.26,
  },
  // Money: coins, and twice the coins.
  uno_gold_yellow: { wave: 'square', notes: [1046.5, 1396.91], step: 0.06, decay: 0.24, gain: 0.24 },
  uno_double_cash: {
    wave: 'square',
    notes: [1046.5, 1396.91, 1046.5, 1396.91],
    step: 0.055,
    decay: 0.2,
    gain: 0.24,
  },
  // "UNO!": three shouts, no subtlety.
  uno_call_uno: { wave: 'square', notes: [659.25, 659.25, 880.0], step: 0.09, decay: 0.16, gain: 0.34, thump: 130 },
  // Tutto briscola: a rising chord with weight behind it.
  uno_all_wild: { wave: 'sawtooth', notes: [261.63, 392.0, 523.25, 659.25], step: 0.07, decay: 0.3, thump: 98 },
  // Scudo: a low ring that holds.
  uno_block_boss: { wave: 'sine', notes: [196.0, 293.66], step: 0.1, decay: 0.42, thump: 80 },
  // Il jolly misterioso: a jester's trill.
  uno_wild_joker: {
    wave: 'triangle',
    notes: [784.0, 932.33, 784.0, 1046.5],
    step: 0.055,
    decay: 0.18,
  },
  default: { wave: 'square', notes: [587.33, 880.0, 1174.66], step: 0.075, decay: 0.22 },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicOsc1: OscillatorNode | null = null;
  private musicOsc2: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private isMusicPlaying = false;
  private sfxVolume = 0.5;
  private musicVolume = 0.25;
  private isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(sfx: number, music: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume * (this.isMuted ? 0 : 1), this.ctx.currentTime);
    }
  }

  public setMasterVolume(vol: number) {
    this.setVolume(vol, this.musicVolume);
  }

  public setSfxVolume(sfx: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
  }

  public setMusicVolume(music: number) {
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume * (this.isMuted ? 0 : 1), this.ctx.currentTime);
    }
  }

  // Card Slam / Table Drop sound
  public playCardSlam() {
    this.playTrumpSlam();
  }


  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime);
    }
  }

  // Card Flick / Deal sound
  public playCardFlick() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Card select/hover sound
  public playCardSelect() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);

    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Briscola Trump Slam (Bass punch)
  public playTrumpSlam() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

    gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.28);
    subOsc.stop(now + 0.28);
  }

  // Ticking score tally (Ascending pitch)
  public playScoreTick(step: number) {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 400;
    const freq = baseFreq + Math.min(step * 45, 1200);

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Trick Won Arpeggio
  public playTrickWin() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A major
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, now + idx * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  // Trick Lost Thud
  public playTrickLose() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [330, 293.66, 246.94];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.12);
    });
  }

  // Mult Explosion impact
  public playMultImpact() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Carico (Asso / Tre) Special Powerful Fanfare
  public playCaricoWin() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  }

  // Shop Buy / Coin Chime
  public playCashChime() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Booster pack rip
  public playBoosterRip() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(3500, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  // Joker Ability Trigger
  public playJokerTrigger() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1);

    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Boss Alarm
  public playBossAlarm() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    osc.frequency.linearRampToValueAtTime(300, now + 0.3);
    osc.frequency.linearRampToValueAtTime(600, now + 0.45);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // UNO Action Sound (Chiptune action surge)
  public playUnoSound() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.00, now + 0.08); // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.16); // D6

    osc2.frequency.setValueAtTime(293.66, now);
    osc2.frequency.setValueAtTime(440.00, now + 0.08);
    osc2.frequency.setValueAtTime(587.33, now + 0.16);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // UNO Reverse Sound (Whirl/sweep)
  public playReverseSound() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);

    gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  // UNO Skip Sound (Thump + buzzer)
  public playSkipSound() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(160, now + 0.08);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Victory Fanfare
  public playVictoryFanfare() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.35 },
    ];

    let time = this.ctx.currentTime;
    melody.forEach(note => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, time);

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + note.d);

      time += note.d * 0.9;
    });
  }

  // Background Synth Loop (Balatro vibes)
  public toggleMusic(enable: boolean) {
    if (!enable) {
      this.stopMusic();
      return;
    }
    if (this.isMusicPlaying) return;
    this.initContext();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    let step = 0;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);

    const playStep = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      const freq = bassline[step % bassline.length];
      osc.type = step % 4 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(0.2, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(noteGain);
      noteGain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.23);

      step++;
      this.musicTimer = window.setTimeout(playStep, 240);
    };

    playStep();
  }


  /**
   * The whoosh of a consumable leaving your hand for the middle of the table.
   * Generic on purpose: what the card *is* gets said by its accent, later.
   */
  public playUnoCast() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.26);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22 * this.sfxVolume, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * One accent per UNO card, played the instant its effect lands.
   *
   * Sixteen cards all firing the same chiptune surge told you something had
   * happened but never *what*: the ear should recognise a Reverse from a
   * Raddoppio without reading the feedback line. Each entry is a short note
   * sequence plus a waveform, which is enough to make them distinguishable.
   */
  public playUnoAccent(cardId: string) {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const accent = UNO_ACCENTS[cardId] || UNO_ACCENTS.default;
    const step = accent.step ?? 0.075;

    accent.notes.forEach((freq, index) => {
      const start = this.ctx!.currentTime + index * step;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = accent.wave;
      osc.frequency.setValueAtTime(freq, start);
      if (accent.glide) {
        osc.frequency.exponentialRampToValueAtTime(freq * accent.glide, start + step * 1.6);
      }

      const peak = (accent.gain ?? 0.28) * this.sfxVolume;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (accent.decay ?? 0.22));

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + (accent.decay ?? 0.22) + 0.02);
    });

    // A body under the notes, so the accent lands instead of just chirping.
    if (accent.thump) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent.thump, now);
      osc.frequency.exponentialRampToValueAtTime(accent.thump * 0.4, now + 0.18);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundEngine();
