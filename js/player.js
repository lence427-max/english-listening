/**
 * Silentium — 音频播放器（修复版）
 */

export function createPlayer(options = {}) {
  const audio = new Audio();
  let onTimeUpdate = options.onTimeUpdate || null;
  let onLoaded = options.onLoaded || null;
  let loadReady = false;

  audio.playbackRate = options.playbackRate || 1;
  audio.preload = 'auto';

  audio.addEventListener('loadedmetadata', () => {
    loadReady = true;
    if (onLoaded) onLoaded({ duration: audio.duration });
  });

  audio.addEventListener('error', (e) => {
    console.error('[Player] 错误:', audio.error?.message || e);
    loadReady = false;
  });

  audio.addEventListener('timeupdate', () => {
    if (onTimeUpdate) {
      onTimeUpdate({
        currentTime: audio.currentTime,
        duration: audio.duration,
        isPlaying: !audio.paused,
      });
    }
  });

  function load(blob) {
    loadReady = false;
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.src = URL.createObjectURL(blob);
  }

  function play() {
    return audio.play();
  }

  function pause() {
    audio.pause();
  }

  function seek(time) {
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }

  function setRate(rate) {
    audio.playbackRate = rate;
  }

  function getState() {
    return {
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      isPlaying: !audio.paused,
      playbackRate: audio.playbackRate,
    };
  }

  function destroy() {
    audio.pause();
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.src = '';
    audio.load();
  }

  function isReady() {
    return loadReady;
  }

  return { audio, load, play, pause, seek, setRate, getState, destroy, isReady };
}
