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


interface Jingle {
  wave: OscillatorType;
  /** [frequency, seconds] pairs, played one after the other. */
  notes: Array<[number, number]>;
  /** A held note underneath, for the ones that need weight. */
  drone?: number;
  gain?: number;
}

/**
 * A calling card for whoever sits down opposite you.
 *
 * Every regular and every boss announced itself with the same card flick (or
 * the same alarm), so fifteen different faces sounded like two. A motif is
 * cheap - six notes and a waveform - and it does what the portrait does: tells
 * you who this is before you read the name.
 */
const OPPONENT_JINGLES: Record<string, Jingle> = {
  // --- gli habitué ---
  // Gennaro: la scampanellata del bar, tre note e una strizzata d'occhio.
  gennaro: {
    wave: 'square',
    notes: [[523.25, 0.12], [659.25, 0.12], [783.99, 0.1], [659.25, 0.1], [880.0, 0.26]],
  },
  // Nonna Assunta: un valzerino lento, tutto in tono maggiore.
  assunta: {
    wave: 'triangle',
    notes: [[392.0, 0.2], [493.88, 0.16], [587.33, 0.16], [493.88, 0.14], [440.0, 0.3]],
  },
  // Mimì: entrata da sipario, sale e si prende l'ultima nota.
  mimi: {
    wave: 'triangle',
    notes: [[587.33, 0.1], [739.99, 0.1], [880.0, 0.1], [1046.5, 0.12], [1318.51, 0.34]],
    gain: 0.24,
  },
  // 'O Muto: due note basse e poi niente. È tutto quello che dice.
  o_muto: { wave: 'sine', notes: [[164.81, 0.22], [130.81, 0.5]], gain: 0.3 },
  // Il cadetto: fanfara di scherma, corta e impaziente.
  salvatore: {
    wave: 'square',
    notes: [[659.25, 0.1], [659.25, 0.08], [830.61, 0.1], [987.77, 0.28]],
  },
  // Rocco: colpi d'ascia sul ceppo.
  rocco: {
    wave: 'sawtooth',
    notes: [[164.81, 0.16], [164.81, 0.16], [196.0, 0.16], [130.81, 0.34]],
    drone: 82.41,
  },
  // Il ragioniere: un orologio a pendolo che conta.
  esposito: {
    wave: 'square',
    notes: [[440.0, 0.1], [440.0, 0.1], [415.3, 0.1], [415.3, 0.1], [392.0, 0.28]],
    gain: 0.2,
  },

  // --- i boss: stessa idea, ma con la terra sotto ---
  boss_ante_1: {
    wave: 'square',
    notes: [[440.0, 0.12], [523.25, 0.12], [622.25, 0.14], [523.25, 0.12], [415.3, 0.36]],
    drone: 110.0,
  },
  boss_ante_2: {
    wave: 'sawtooth',
    notes: [[146.83, 0.28], [138.59, 0.24], [110.0, 0.46]],
    drone: 73.42,
  },
  boss_ante_3: {
    wave: 'triangle',
    notes: [[622.25, 0.09], [739.99, 0.09], [622.25, 0.09], [880.0, 0.09], [739.99, 0.32]],
    drone: 155.56,
  },
  boss_ante_4: {
    wave: 'square',
    notes: [[311.13, 0.1], [329.63, 0.1], [349.23, 0.1], [369.99, 0.1], [277.18, 0.34]],
    drone: 92.5,
  },
  boss_ante_5: {
    wave: 'square',
    notes: [[493.88, 0.12], [587.33, 0.12], [739.99, 0.14], [587.33, 0.12], [493.88, 0.34]],
    drone: 123.47,
  },
  boss_ante_6: {
    wave: 'sawtooth',
    notes: [[110.0, 0.2], [110.0, 0.16], [146.83, 0.2], [98.0, 0.44]],
    drone: 65.41,
  },
  boss_ante_7: {
    wave: 'triangle',
    notes: [[1046.5, 0.08], [880.0, 0.08], [739.99, 0.08], [622.25, 0.1], [523.25, 0.34]],
    drone: 130.81,
  },
  // Il Sovrano: fanfara di corte, l'unica che si prende il suo tempo.
  boss_ante_8: {
    wave: 'square',
    notes: [
      [523.25, 0.14],
      [659.25, 0.14],
      [783.99, 0.14],
      [1046.5, 0.22],
      [987.77, 0.12],
      [1046.5, 0.44],
    ],
    drone: 130.81,
    gain: 0.3,
  },
  default: {
    wave: 'square',
    notes: [[523.25, 0.12], [659.25, 0.12], [783.99, 0.3]],
  },
};

/**
 * How heavy a card sounds, as numbers rather than as audio.
 *
 * Kept out of the engine so the curve can be checked without an AudioContext:
 * everything here is arithmetic, and it is the only part that can be wrong in
 * a way you would notice.
 */
export function cardSlamVoice(points: number, isBriscola = false) {
  // 0 for a liscia, 1 for an Asso. Trump lands a shade heavier than its points
  // alone: taking the trick with it is the point of playing it.
  const weight = Math.min(1, Math.max(0, points / 11) + (isBriscola ? 0.18 : 0));
  const lerp = (light: number, heavy: number) => light + (heavy - light) * weight;
  return {
    weight,
    release: lerp(0.09, 0.34),
    // Light cards keep the triangle's paper edge; heavy ones need the sawtooth
    // to have anything for the sub to sit under.
    type: (weight < 0.3 ? 'triangle' : 'sawtooth') as OscillatorType,
    startFreq: lerp(320, 190),
    endFreq: lerp(95, 38),
    gain: lerp(0.26, 0.55),
    // The sub is what "heavy" actually is. Below a Cavallo there is nothing to
    // feel, and adding it anyway would make every card sound like a carico.
    hasSub: weight >= 0.25,
    subStartFreq: lerp(120, 96),
    subEndFreq: lerp(42, 28),
    subGain: lerp(0.1, 0.42),
  };
}

/**
 * How loud the room should be for a given moment of a run, 0 to 3.
 *
 * A Boss owns the level outright: whatever the streak was, the table is theirs
 * now. Short of one it climbs with a win streak, and the deep Antes are never
 * quiet even when you are losing.
 */
/**
 * How far out of tune the room is, 0 to 5, one step per Endless tier.
 *
 * Intensity says how much is playing; this says whether it still agrees with
 * itself. The campaign is always in tune, and past Ante 8 it stops being.
 */
export function musicDissonanceFor(tierIndex: number | null): number {
  if (tierIndex === null || tierIndex < 0) return 0;
  return Math.min(5, tierIndex + 1);
}

export function musicIntensityFor(state: {
  hasBoss: boolean;
  winStreak: number;
  ante: number;
  isEndless?: boolean;
}): 0 | 1 | 2 | 3 {
  if (state.hasBoss) return 3;
  if (state.winStreak >= 3) return 2;
  if (state.ante >= 4 || state.isEndless) return 1;
  return 0;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
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

  /**
   * A card hitting the table, weighed by what it is worth.
   *
   * Briscola points run 0 to 11, and that spread is the whole gesture: a liscia
   * is a sheet of card sliding down, an Asso is a thud you feel. Synthesising it
   * from the points beats recording the samples - the weight is a curve, not
   * six separate files, and a PWA ships none of it.
   */
  public playCardSlam(points?: number, isBriscola = false) {
    if (points === undefined) {
      this.playTrumpSlam();
      return;
    }
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const v = cardSlamVoice(points, isBriscola);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = v.type;
    osc.frequency.setValueAtTime(v.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(v.endFreq, now + v.release);

    gain.gain.setValueAtTime(v.gain * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + v.release);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + v.release);

    if (v.hasSub) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(v.subStartFreq, now);
      subOsc.frequency.exponentialRampToValueAtTime(v.subEndFreq, now + v.release);
      subGain.gain.setValueAtTime(v.subGain * this.sfxVolume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + v.release);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + v.release);
    }
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

  /**
   * How loud the room is, 0 to 3.
   *
   * The loop is one bassline and always was; what changes with the level is how
   * many voices are playing over it and how fast they come. Voices on a shared
   * clock beat stems: there is nothing to keep in sync, a level change lands on
   * the next step instead of on the next bar, and none of it ships as audio.
   */
  private musicIntensity = 0;

  private musicDissonance = 0;

  public setMusicIntensity(level: number) {
    this.musicIntensity = Math.max(0, Math.min(3, Math.round(level)));
  }

  public setMusicDissonance(level: number) {
    this.musicDissonance = Math.max(0, Math.min(5, Math.round(level)));
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
    // A minor, which is where the bassline already lives.
    const arpeggio = [440, 523.25, 659.25, 523.25, 587.33, 493.88, 440, 392];
    let step = 0;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);

    /** One voice, one note. Every layer below is a call to this. */
    const voice = (
      type: OscillatorType,
      freq: number,
      at: number,
      dur: number,
      level: number
    ) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(level, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(at);
      osc.stop(at + dur);
    };

    const playStep = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const intensity = this.musicIntensity;
      const beat = step % bassline.length;

      // Layer 0: the double bass. Always there, it is the room.
      voice(step % 4 === 0 ? 'sawtooth' : 'triangle', bassline[beat], now, 0.22, 0.2);

      // Layer 1: brushes on the offbeat. The first sign the night is moving.
      if (intensity >= 1 && step % 2 === 1) {
        voice('square', 3800, now, 0.03, 0.02);
      }

      // Layer 2: the mandolin comes out on a streak, two notes to the step.
      if (intensity >= 2) {
        voice('triangle', arpeggio[beat], now, 0.12, 0.07);
        voice('triangle', arpeggio[(beat + 2) % arpeggio.length], now + 0.11, 0.12, 0.055);
      }

      // Layer 3: a Boss sits down. An octave under the bass, detuned against
      // itself so it beats rather than sings, and the brushes stop.
      if (intensity >= 3) {
        voice('sawtooth', bassline[beat] / 2, now, 0.3, 0.13);
        voice('sawtooth', bassline[beat] / 2 + 1.5, now, 0.3, 0.1);
      }

      // Endless: the room stops agreeing with itself. A tritone over the bass,
      // pushed further off pitch each tier, plus a slow drift so it never
      // settles. It is the same bassline underneath the whole way down - what
      // changes is that something is now arguing with it.
      if (this.musicDissonance > 0) {
        const d = this.musicDissonance;
        const drift = Math.sin(step * 0.37) * d * 1.6;
        voice('triangle', bassline[beat] * 1.414 + drift, now, 0.26, 0.02 + d * 0.014);
        if (d >= 3) {
          voice('sawtooth', bassline[beat] * 2.02 + drift * 2, now + 0.06, 0.2, 0.012 + d * 0.008);
        }
      }

      step++;
      const period = intensity >= 3 ? 190 : intensity >= 2 ? 210 : 240;
      this.musicTimer = window.setTimeout(playStep, period);
    };

    playStep();
  }

  /**
   * A Boss sits down: the room stops, you hear your own pulse, and then the
   * night starts again heavier. Ducks the music rather than stopping it, so
   * there is no loop to restart and nothing to get out of step.
   */
  public playBossSting() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (this.musicGain) {
      const target = this.musicVolume;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      this.musicGain.gain.setValueAtTime(0.0001, now + 1.5);
      this.musicGain.gain.linearRampToValueAtTime(target, now + 1.9);
    }

    const thump = (at: number, gainLevel: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(64, at);
      osc.frequency.exponentialRampToValueAtTime(32, at + 0.22);
      g.gain.setValueAtTime(gainLevel * this.sfxVolume, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.24);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(at);
      osc.stop(at + 0.25);
    };

    // Two beats, the second weaker, twice over: a heart, not a drum.
    thump(now + 0.25, 0.5);
    thump(now + 0.47, 0.3);
    thump(now + 0.85, 0.55);
    thump(now + 1.07, 0.34);

    // The drop.
    const hit = this.ctx.createOscillator();
    const hitGain = this.ctx.createGain();
    hit.type = 'sawtooth';
    hit.frequency.setValueAtTime(180, now + 1.45);
    hit.frequency.exponentialRampToValueAtTime(41, now + 1.95);
    hitGain.gain.setValueAtTime(0.55 * this.sfxVolume, now + 1.45);
    hitGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    hit.connect(hitGain);
    hitGain.connect(this.ctx.destination);
    hit.start(now + 1.45);
    hit.stop(now + 2.0);
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


  /**
   * The motif of whoever is sitting down: see OPPONENT_JINGLES.
   *
   * The boss keeps its alarm on top - that one is a warning, not a name.
   */
  public playOpponentJingle(characterId: string, isBoss = false) {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const jingle = OPPONENT_JINGLES[characterId] || OPPONENT_JINGLES.default;
    const start = this.ctx.currentTime + (isBoss ? 0.22 : 0.02);
    let at = start;

    jingle.notes.forEach(([freq, length]) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = jingle.wave;
      osc.frequency.setValueAtTime(freq, at);

      const peak = (jingle.gain ?? 0.26) * this.sfxVolume;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + length);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(at);
      osc.stop(at + length + 0.02);
      at += length;
    });

    if (jingle.drone) {
      const total = at - start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(jingle.drone, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16 * this.sfxVolume, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + total);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + total + 0.05);
    }

    if (isBoss) this.playBossAlarm();
  }

  /** A short burst of filtered noise: paper, shuffling, anything with grain. */
  private noiseBurst(duration: number, filterHz: number, peak: number, sweepTo?: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterHz, now);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peak * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  /** A card coming off the stock, once per card drawn. */
  public playCardDraw() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;
    this.noiseBurst(0.12, 1800, 0.16, 3200);
  }

  /** Scarto: a card pushed back into the deck. */
  public playDiscard() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;
    this.noiseBurst(0.22, 2600, 0.2, 700);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);
    gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * A Vetro card breaking: the high crack, then the pieces.
   *
   * It plays on a lost trick, in the middle of the losing sound, so it sits
   * above it rather than competing - short, bright, and clearly bad news.
   */
  public playCardShatter() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // The crack.
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.09);
    gain.gain.setValueAtTime(0.16 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);

    // The shards, scattering.
    this.noiseBurst(0.35, 5200, 0.3, 3000);
    setTimeout(() => this.noiseBurst(0.2, 4200, 0.22, 2400), 70);
  }

  /** The door of the Bar Sport: two bells and you are inside. */
  public playShopEnter() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    [
      [1318.51, 0],
      [1760.0, 0.09],
    ].forEach(([freq, delay]) => {
      const at = this.ctx!.currentTime + delay;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(at);
      osc.stop(at + 0.6);
    });
  }

  /** Manche superata: short and bright, the fanfare is for the whole run. */
  public playRoundWin() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const at = this.ctx!.currentTime + i * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.24 * this.sfxVolume, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(at);
      osc.stop(at + 0.32);
    });
  }

  /** Manche fallita: the same shape, walking downstairs. */
  public playRoundLose() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initContext();
    if (!this.ctx) return;

    [392.0, 349.23, 293.66, 220.0].forEach((freq, i) => {
      const at = this.ctx!.currentTime + i * 0.13;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(at);
      osc.stop(at + 0.42);
    });
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
