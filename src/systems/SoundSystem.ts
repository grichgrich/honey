import { Howl, Howler } from 'howler';
import { useEffect } from 'react';

interface Sound {
  id: string;
  howl: Howl;
  category: 'sfx' | 'music' | 'ambient' | 'ui';
  volume: number;
  loop?: boolean;
}

interface SoundOptions {
  volume?: number;
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  spatial?: boolean;
  position?: [number, number, number];
}

class SoundSystem {
  private sounds: Map<string, Sound> = new Map();
  private categories = {
    sfx: { volume: 1, muted: false },
    music: { volume: 0.7, muted: false },
    ambient: { volume: 0.5, muted: false },
    ui: { volume: 0.8, muted: false }
  };

  private masterVolume: number = 1;
  private muted: boolean = false;
  private currentMusic: string | null = null;
  private musicFadeTime: number = 2000;

  constructor() {
    // Initialize Howler settings
    Howler.autoUnlock = true;
    Howler.html5PoolSize = 10;
  }

  loadSound(
    id: string,
    src: string[],
    category: 'sfx' | 'music' | 'ambient' | 'ui',
    options: SoundOptions = {}
  ) {
    const sound = new Howl({
      src,
      volume: options.volume ?? 1,
      loop: options.loop ?? false,
      autoplay: false,
      preload: true,
      html5: category === 'music',
      spatial: options.spatial ?? false,
      ...options.position && { pos: options.position }
    });

    this.sounds.set(id, {
      id,
      howl: sound,
      category,
      volume: options.volume ?? 1,
      loop: options.loop
    });

    return sound;
  }

  play(id: string, options: SoundOptions = {}) {
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound ${id} not found`);
      return;
    }

    const category = this.categories[sound.category];
    if (category.muted || this.muted) return;

    const volume = options.volume ?? sound.volume;
    sound.howl.volume(volume * category.volume * this.masterVolume);

    if (options.fadeIn) {
      sound.howl.volume(0);
      const soundId = sound.howl.play();
      sound.howl.fade(0, volume * category.volume * this.masterVolume, options.fadeIn, soundId);
      return soundId;
    }

    return sound.howl.play();
  }

  stop(id: string, options: SoundOptions = {}) {
    const sound = this.sounds.get(id);
    if (!sound) return;

    if (options.fadeOut) {
      sound.howl.fade(sound.howl.volume(), 0, options.fadeOut);
      setTimeout(() => sound.howl.stop(), options.fadeOut);
    } else {
      sound.howl.stop();
    }
  }

  playMusic(id: string, crossfade: boolean = true) {
    if (this.currentMusic === id) return;

    const newMusic = this.sounds.get(id);
    if (!newMusic || newMusic.category !== 'music') return;

    if (this.currentMusic) {
      const currentMusic = this.sounds.get(this.currentMusic);
      if (currentMusic) {
        if (crossfade) {
          currentMusic.howl.fade(
            currentMusic.howl.volume(),
            0,
            this.musicFadeTime
          );
          setTimeout(() => currentMusic.howl.stop(), this.musicFadeTime);
        } else {
          currentMusic.howl.stop();
        }
      }
    }

    const category = this.categories.music;
    const volume = newMusic.volume * category.volume * this.masterVolume;

    if (crossfade) {
      newMusic.howl.volume(0);
      newMusic.howl.play();
      newMusic.howl.fade(0, volume, this.musicFadeTime);
    } else {
      newMusic.howl.volume(volume);
      newMusic.howl.play();
    }

    this.currentMusic = id;
  }

  stopMusic(fadeOut: boolean = true) {
    if (!this.currentMusic) return;

    const music = this.sounds.get(this.currentMusic);
    if (!music) return;

    if (fadeOut) {
      music.howl.fade(music.howl.volume(), 0, this.musicFadeTime);
      setTimeout(() => music.howl.stop(), this.musicFadeTime);
    } else {
      music.howl.stop();
    }

    this.currentMusic = null;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  setCategoryVolume(category: 'sfx' | 'music' | 'ambient' | 'ui', volume: number) {
    this.categories[category].volume = Math.max(0, Math.min(1, volume));
    
    // Update all playing sounds in this category
    this.sounds.forEach(sound => {
      if (sound.category === category) {
        const effectiveVolume = sound.volume * this.categories[category].volume * this.masterVolume;
        sound.howl.volume(effectiveVolume);
      }
    });
  }

  muteCategory(category: 'sfx' | 'music' | 'ambient' | 'ui', muted: boolean) {
    this.categories[category].muted = muted;
    
    // Update all playing sounds in this category
    this.sounds.forEach(sound => {
      if (sound.category === category) {
        if (muted) {
          sound.howl.volume(0);
        } else {
          const effectiveVolume = sound.volume * this.categories[category].volume * this.masterVolume;
          sound.howl.volume(effectiveVolume);
        }
      }
    });
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
  }

  updatePosition(id: string, position: [number, number, number]) {
    const sound = this.sounds.get(id);
    if (!sound) return;
    sound.howl.pos(...position);
  }

  setListenerPosition(position: [number, number, number], orientation: [number, number, number] = [0, 0, -1]) {
    Howler.pos(...position);
    Howler.orientation(...orientation);
  }

  cleanup() {
    this.sounds.forEach(sound => {
      sound.howl.stop();
      sound.howl.unload();
    });
    this.sounds.clear();
    this.currentMusic = null;
  }
}

export const soundSystem = new SoundSystem();

// Example sound preloading
export const preloadSounds = () => {
  // UI Sounds
  soundSystem.loadSound('click', ['sounds/ui/click.mp3'], 'ui', { volume: 0.5 });
  soundSystem.loadSound('hover', ['sounds/ui/hover.mp3'], 'ui', { volume: 0.3 });
  soundSystem.loadSound('success', ['sounds/ui/success.mp3'], 'ui', { volume: 0.6 });
  soundSystem.loadSound('error', ['sounds/ui/error.mp3'], 'ui', { volume: 0.6 });

  // Game Sounds
  soundSystem.loadSound('harvest', ['sounds/game/harvest.mp3'], 'sfx', { volume: 0.7 });
  soundSystem.loadSound('claim', ['sounds/game/claim.mp3'], 'sfx', { volume: 0.8 });
  soundSystem.loadSound('levelup', ['sounds/game/levelup.mp3'], 'sfx', { volume: 0.9 });
  soundSystem.loadSound('combat', ['sounds/game/combat.mp3'], 'sfx', { volume: 0.7 });

  // Music
  soundSystem.loadSound('main_theme', ['sounds/music/main_theme.mp3'], 'music', {
    volume: 0.7,
    loop: true
  });
  soundSystem.loadSound('combat_theme', ['sounds/music/combat_theme.mp3'], 'music', {
    volume: 0.7,
    loop: true
  });

  // Ambient
  soundSystem.loadSound('ambient_space', ['sounds/ambient/space.mp3'], 'ambient', {
    volume: 0.4,
    loop: true
  });
};

// Sound hooks for React components
export const useSoundEffect = (id: string, options: SoundOptions = {}) => {
  return () => soundSystem.play(id, options);
};

export const useMusic = (id: string, autoPlay: boolean = true) => {
  useEffect(() => {
    if (autoPlay) {
      soundSystem.playMusic(id);
      return () => soundSystem.stopMusic();
    }
  }, [id, autoPlay]);

  return {
    play: () => soundSystem.playMusic(id),
    stop: () => soundSystem.stopMusic()
  };
};