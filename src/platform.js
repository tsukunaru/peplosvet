import { decodeSave } from './model.js';
const KEY = 'peplosvet-save-v1';
export const platform = {
  sdk: null, player: null, lang: 0, running: false, lastCloud: 0, pending: null, saving: false, storageFailed: false, cloudFailed: false,
  local: ['localhost', '127.0.0.1', '::1', '[::1]', ''].includes(location.hostname),
  async init(onPause) {
    if (!this.local) {
      // Same /sdk.js loading convention used by the other games in this workspace.
      if (!window.YaGames) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = '/sdk.js';
        const timer = setTimeout(() => reject(new Error('SDK_TIMEOUT')), 12000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); reject(new Error('SDK_UNAVAILABLE')); };
        document.head.append(script);
      });
      this.sdk = await window.YaGames.init();
      this.sdk.on('game_api_pause', () => onPause(true));
      this.sdk.on('game_api_resume', () => onPause(false));
      try { this.player = await this.sdk.getPlayer({ scopes: false }); } catch { this.player = null; }
    }
    this.lang = (this.sdk?.environment?.i18n?.lang || navigator.language || 'ru').startsWith('ru') ? 0 : 1;
    return this.load();
  },
  async load() {
    let local = null, cloud = null;
    try { local = decodeSave(localStorage.getItem(KEY)) || decodeSave(localStorage.getItem(KEY + '-backup')); } catch { this.storageFailed = true; }
    if (this.player) try { cloud = decodeSave((await this.player.getData(['save'])).save); } catch { this.cloudFailed = true; }
    return cloud && (!local || cloud.savedAt > local.savedAt) ? cloud : local;
  },
  save(s) {
    s.savedAt = Date.now();
    const snapshot = JSON.stringify(s);
    try {
      const old = localStorage.getItem(KEY);
      if (decodeSave(old)) localStorage.setItem(KEY + '-backup', old);
      localStorage.setItem(KEY, snapshot); this.storageFailed = false;
    } catch { this.storageFailed = true; }
    this.pending = JSON.parse(snapshot);
    this.flush();
  },
  async flush() {
    if (!this.player || this.saving || !this.pending || Date.now() - this.lastCloud < 15000) return;
    this.saving = true; this.lastCloud = Date.now();
    const snapshot = this.pending; this.pending = null;
    try { await this.player.setData({ save: snapshot }, true); this.cloudFailed = false; }
    catch { this.cloudFailed = true; this.pending ||= snapshot; }
    finally { this.saving = false; }
  },
  ready() { this.sdk?.features?.LoadingAPI?.ready(); },
  gameplay(running) {
    if (running === this.running) return;
    this.running = running;
    if (running) this.sdk?.features?.GameplayAPI?.start();
    else this.sdk?.features?.GameplayAPI?.stop();
  },
  reward(onPause) {
    if (!this.sdk?.adv) return Promise.resolve(false);
    onPause(true);
    return new Promise(resolve => {
      let granted = false;
      const close = () => { onPause(false); resolve(granted); };
      try { this.sdk.adv.showRewardedVideo({ callbacks: { onRewarded: () => { granted = true; }, onClose: close, onError: () => { granted = false; close(); } } }); }
      catch { close(); }
    });
  },
};
