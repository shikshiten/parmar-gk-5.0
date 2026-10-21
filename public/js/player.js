/**
 * Parmar GK 5.0 - Dedicated Custom Player
 *
 * Features:
 *  - Native HTML5 video with YouTube-style custom controls
 *  - Speed increase & decrease (0.25x - 3x) with persistent preference
 *  - Double-tap to seek +/-10s with YouTube-style ripple animations
 *  - Quality selector (Auto adaptive based on network speed + Manual 1080p/720p/480p/360p)
 *  - Auto-fading overlay when playing (hides after 3s of inactivity, reveals on touch/move)
 *  - Hover & drag seek progress bar with timestamp preview
 *  - Volume control, mute, Picture-in-Picture, Fullscreen
 *  - Keyboard shortcuts (Space/K, J, L, Left, Right, Up, Down, M, F, >, <)
 *  - Resume playback position per lecture
 *  - Direct browser HLS playback with fallback resolution
 *
 * Exposes: window.CinemaPlayer = { open, close, isOpen }
 */
(function () {
  'use strict';

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const SPEED_KEY = 'parmar_gk_player_speed';
  const VOLUME_KEY = 'parmar_gk_player_volume';
  const MUTED_KEY = 'parmar_gk_player_muted';
  const POS_PREFIX = 'parmar_gk_pos_';
  const FADE_TIMEOUT_MS = 3000;
  const DOUBLE_TAP_MS = 320;

  const el = {};
  let video = null;
  let iframe = null;
  let stage = null;
  let hls = null;
  let currentItem = null;
  let isIframeMode = false;
  let menuOpen = false;
  let hlsLevels = [];
  let dragging = false;
  let fadeTimer = null;
  let toastTimer = null;
  let lastSave = 0;
  let resumeApplied = false;
  let token = 0;

  // Double-tap tracker
  let lastTapTime = 0;
  let lastTapSide = null;
  let singleTapTimer = null;

  const state = {
    speed: readNumber(SPEED_KEY, 1, SPEEDS),
    quality: -1, // -1 means Auto
    volume: Math.min(1, Math.max(0, readNumber(VOLUME_KEY, 1))),
    muted: localStorage.getItem(MUTED_KEY) === 'true'
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function readNumber(key, fallback, allowed) {
    const raw = parseFloat(localStorage.getItem(key));
    if (!isFinite(raw)) return fallback;
    if (allowed && allowed.indexOf(raw) === -1) return fallback;
    return raw;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    return m + ':' + String(s).padStart(2, '0');
  }

  function formatSpeed(speed) {
    return speed === 1 ? 'Normal' : speed + 'x';
  }

  function playerToast(message, duration) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, duration || 1800);
  }

  function setStageClass(name, on) {
    if (!stage) return;
    stage.classList.toggle(name, !!on);
  }

  function posKey() {
    return POS_PREFIX + (currentItem ? currentItem.id : '');
  }

  /* ------------------------------------------------------------------ */
  /* Initialization                                                     */
  /* ------------------------------------------------------------------ */

  function init() {
    video = $('videoNative');
    iframe = $('videoIframe');
    stage = $('videoStageWrapper');
    if (!video || !stage) return;

    el.centerLayer = $('cpCenterLayer');
    el.bigPlay = $('cpBigPlay');
    el.spinner = $('cpSpinner');
    el.seekLeftZone = $('seekLeftZone');
    el.seekRightZone = $('seekRightZone');
    el.seekLeftBadge = $('seekLeftBadge');
    el.seekRightBadge = $('seekRightBadge');
    el.controls = $('cpControls');
    el.progress = $('cpProgress');
    el.buffer = $('cpBuffer');
    el.played = $('cpPlayed');
    el.thumb = $('cpThumb');
    el.tooltip = $('cpTooltip');
    el.playPause = $('cpPlayPause');
    el.rewind = $('cpRewind');
    el.forward = $('cpForward');
    el.mute = $('cpMute');
    el.volume = $('cpVolume');
    el.current = $('cpCurrent');
    el.duration = $('cpDuration');
    el.speedBadge = $('cpSpeedBadge');
    el.settings = $('cpSettings');
    el.settingsLabel = $('cpSettingsLabel');
    el.pip = $('cpPip');
    el.fullscreen = $('cpFullscreen');
    el.menu = $('cpMenu');
    el.menuMain = $('cpMenuMain');
    el.menuSpeed = $('cpMenuSpeed');
    el.menuQuality = $('cpMenuQuality');
    el.menuSpeedVal = $('cpMenuSpeedVal');
    el.menuQualityVal = $('cpMenuQualityVal');
    el.speedOptions = $('cpSpeedOptions');
    el.qualityOptions = $('cpQualityOptions');
    el.toast = $('cpToast');

    video.volume = state.volume;
    video.muted = state.muted;
    applySpeed(state.speed, false);
    buildSpeedMenu();
    updateVolumeUI();
    updateProgressUI();

    if (!document.pictureInPictureEnabled && el.pip) {
      el.pip.style.display = 'none';
    }

    bindVideoEvents();
    bindControls();
    bindProgress();
    bindDoubleTapZones();
    bindMenu();
    bindKeyboard();
    bindFullscreen();

    revealControls();
  }

  /* ------------------------------------------------------------------ */
  /* Video Native Events                                                */
  /* ------------------------------------------------------------------ */

  function bindVideoEvents() {
    video.addEventListener('loadedmetadata', function () {
      updateProgressUI();
      applyResumePosition();
      if (el.duration) el.duration.textContent = formatTime(video.duration);
    });

    video.addEventListener('durationchange', updateProgressUI);

    video.addEventListener('timeupdate', function () {
      if (!dragging) updateProgressUI();
      scheduleSavePosition();
    });

    video.addEventListener('progress', updateBufferUI);
    video.addEventListener('loadeddata', updateBufferUI);

    video.addEventListener('play', function () {
      setStageClass('is-playing', true);
      setStageClass('is-paused', false);
      updatePlayIcons();
      scheduleFade();
    });

    video.addEventListener('playing', function () {
      setStageClass('is-buffering', false);
      setStageClass('is-playing', true);
      setStageClass('is-paused', false);
      if (el.spinner) el.spinner.classList.remove('visible');
      updatePlayIcons();
      scheduleFade();
    });

    video.addEventListener('pause', function () {
      setStageClass('is-playing', false);
      setStageClass('is-paused', true);
      revealControls(true);
      updatePlayIcons();
      savePosition(true);
    });

    video.addEventListener('waiting', function () {
      setStageClass('is-buffering', true);
      if (el.spinner) el.spinner.classList.add('visible');
      revealControls(true);
    });

    video.addEventListener('canplay', function () {
      setStageClass('is-buffering', false);
      if (el.spinner) el.spinner.classList.remove('visible');
    });

    video.addEventListener('ratechange', function () {
      updateSpeedUI();
    });

    video.addEventListener('volumechange', function () {
      state.volume = video.volume;
      state.muted = video.muted;
      localStorage.setItem(VOLUME_KEY, String(video.volume));
      localStorage.setItem(MUTED_KEY, String(video.muted));
      updateVolumeUI();
    });

    video.addEventListener('ended', function () {
      setStageClass('is-playing', false);
      setStageClass('is-paused', true);
      revealControls(true);
      updatePlayIcons();
      try {
        localStorage.removeItem(posKey());
      } catch (e) {}
    });

    video.addEventListener('error', function () {
      if (isIframeMode || !currentItem) return;
      fallbackToIframe('Stream encountered an error. Switched to backup.');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Controls Binding                                                   */
  /* ------------------------------------------------------------------ */

  function bindControls() {
    if (el.playPause) el.playPause.addEventListener('click', togglePlay);
    if (el.bigPlay) el.bigPlay.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePlay();
    });
    if (el.rewind) el.rewind.addEventListener('click', function () {
      seekBy(-10);
    });
    if (el.forward) el.forward.addEventListener('click', function () {
      seekBy(10);
    });
    if (el.mute) el.mute.addEventListener('click', toggleMute);
    if (el.volume) el.volume.addEventListener('input', function () {
      setVolume(parseFloat(el.volume.value));
    });

    if (el.settings) el.settings.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menuOpen) closeMenu();
      else openMenu();
    });

    if (el.speedBadge) el.speedBadge.addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu('speed');
    });

    if (el.pip) el.pip.addEventListener('click', togglePictureInPicture);
    if (el.fullscreen) el.fullscreen.addEventListener('click', toggleFullscreen);

    // Fade overlay mouse/touch interactions
    stage.addEventListener('pointermove', function () {
      revealControls();
    });
    stage.addEventListener('touchstart', function () {
      revealControls();
    }, { passive: true });

    // Close menu when tapping outside
    document.addEventListener('pointerdown', function (e) {
      if (!menuOpen) return;
      if (!e.target.closest('#cpMenu') && !e.target.closest('#cpSettings') && !e.target.closest('#cpSpeedBadge')) {
        closeMenu();
      }
    });
  }

  function updatePlayIcons() {
    const paused = video ? (video.paused || video.ended) : true;
    if (stage) {
      stage.classList.toggle('is-paused', paused);
      stage.classList.toggle('is-playing', !paused);
    }
  }

  function togglePlay() {
    if (!video || isIframeMode) return;
    if (video.paused || video.ended) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          revealControls(true);
          playerToast('Tap to play');
        });
      }
    } else {
      video.pause();
    }
  }

  function seekBy(seconds) {
    if (!video || isIframeMode) return;
    const dur = isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = clamp(video.currentTime + seconds, 0, dur);
    updateProgressUI();
    revealControls();
  }

  function seekToRatio(ratio) {
    if (!video || isIframeMode) return;
    const dur = video.duration;
    if (!isFinite(dur) || dur <= 0) return;
    video.currentTime = clamp(ratio, 0, 1) * dur;
    updateProgressUI();
  }

  function setVolume(value) {
    if (!video) return;
    video.volume = clamp(value, 0, 1);
    if (video.volume > 0 && video.muted) video.muted = false;
    revealControls();
  }

  function changeVolume(delta) {
    if (!video) return;
    setVolume(video.volume + delta);
    playerToast('Volume ' + Math.round(video.volume * 100) + '%');
  }

  function toggleMute() {
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.6;
    playerToast(video.muted ? 'Muted' : 'Unmuted');
  }

  function updateVolumeUI() {
    if (!video || !el.volume || !el.mute) return;
    const isMuted = video.muted || video.volume === 0;
    el.mute.classList.toggle('is-muted', isMuted);
    el.volume.value = String(isMuted ? 0 : video.volume);
    el.volume.style.setProperty('--vol-fill', (isMuted ? 0 : video.volume) * 100 + '%');
  }

  /* ------------------------------------------------------------------ */
  /* Double Tap to Seek (YouTube-style)                                 */
  /* ------------------------------------------------------------------ */

  function bindDoubleTapZones() {
    // Tap on stage handles single tap (play/pause toggle) and double tap (seek)
    stage.addEventListener('click', function (e) {
      if (isIframeMode) return;
      if (e.target.closest('.cp-controls, .cp-menu, .modal-header, .btn-player-mini')) return;

      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const now = Date.now();
      const side = x < width * 0.4 ? 'left' : x > width * 0.6 ? 'right' : 'center';

      if (now - lastTapTime < DOUBLE_TAP_MS && lastTapSide === side) {
        // Double tap confirmed!
        clearTimeout(singleTapTimer);
        lastTapTime = 0;
        lastTapSide = null;

        if (side === 'left') {
          triggerSeekAnimation(-10, el.seekLeftBadge);
        } else if (side === 'right') {
          triggerSeekAnimation(10, el.seekRightBadge);
        } else {
          togglePlay();
        }
      } else {
        // First tap: wait to see if second tap follows
        lastTapTime = now;
        lastTapSide = side;
        singleTapTimer = setTimeout(function () {
          // Single tap: toggle overlay or play/pause
          if (stage.classList.contains('ui-hidden')) {
            revealControls();
          } else {
            togglePlay();
          }
        }, DOUBLE_TAP_MS);
      }
    });
  }

  function triggerSeekAnimation(delta, badge) {
    seekBy(delta);
    if (!badge) return;
    badge.classList.remove('show', 'animate');
    void badge.offsetWidth; // Force reflow
    badge.classList.add('show');
    badge.classList.add('animate');
    setTimeout(function () {
      badge.classList.remove('show', 'animate');
    }, 650);
  }

  /* ------------------------------------------------------------------ */
  /* Progress Bar                                                       */
  /* ------------------------------------------------------------------ */

  function bindProgress() {
    if (!el.progress) return;

    el.progress.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (!video || !video.duration) return;
      dragging = true;
      el.progress.classList.add('is-dragging');
      try {
        el.progress.setPointerCapture(e.pointerId);
      } catch (err) {}
      seekToRatio(ratioFromEvent(e));
      revealControls(true);
    });

    el.progress.addEventListener('pointermove', function (e) {
      const ratio = ratioFromEvent(e);
      updateTooltip(ratio, e);
      if (dragging) seekToRatio(ratio);
    });

    el.progress.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      el.progress.classList.remove('is-dragging');
      updateTooltip(ratioFromEvent(e), e);
      savePosition(true);
    });

    el.progress.addEventListener('pointercancel', function () {
      dragging = false;
      el.progress.classList.remove('is-dragging');
    });

    el.progress.addEventListener('pointerleave', function () {
      el.progress.classList.remove('show-tooltip');
      if (dragging) {
        dragging = false;
        el.progress.classList.remove('is-dragging');
      }
    });
  }

  function ratioFromEvent(e) {
    const rect = el.progress.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp((e.clientX - rect.left) / rect.width, 0, 1);
  }

  function updateTooltip(ratio, e) {
    if (!el.tooltip || !video) return;
    const dur = isFinite(video.duration) ? video.duration : 0;
    el.tooltip.textContent = formatTime(ratio * dur);
    el.tooltip.style.left = ratio * 100 + '%';
    const rect = el.progress.getBoundingClientRect();
    if (e && e.clientX >= rect.left && e.clientX <= rect.right) {
      el.progress.classList.add('show-tooltip');
    }
  }

  function updateProgressUI() {
    if (!video || !el.played || !el.thumb) return;
    const dur = isFinite(video.duration) ? video.duration : 0;
    const cur = video.currentTime || 0;
    const ratio = dur > 0 ? cur / dur : 0;

    el.played.style.width = ratio * 100 + '%';
    el.thumb.style.left = ratio * 100 + '%';

    if (el.current) el.current.textContent = formatTime(cur);
    if (el.duration && dur > 0) el.duration.textContent = formatTime(dur);
  }

  function updateBufferUI() {
    if (!video || !el.buffer || !video.duration) return;
    const dur = video.duration;
    const cur = video.currentTime;
    let bufferedEnd = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= cur && cur <= video.buffered.end(i)) {
        bufferedEnd = video.buffered.end(i);
        break;
      }
    }
    const ratio = dur > 0 ? bufferedEnd / dur : 0;
    el.buffer.style.width = ratio * 100 + '%';
  }

  /* ------------------------------------------------------------------ */
  /* Speed & Quality Settings Menu                                      */
  /* ------------------------------------------------------------------ */

  function bindMenu() {
    if (!el.menu) return;

    el.menu.querySelectorAll('[data-menu]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-menu');
        switchMenuPanel(target);
      });
    });

    el.menu.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchMenuPanel('main');
      });
    });

    if (el.speedOptions) {
      el.speedOptions.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-speed]');
        if (!btn) return;
        const speed = parseFloat(btn.getAttribute('data-speed'));
        setSpeed(speed);
        closeMenu();
      });
    }

    if (el.qualityOptions) {
      el.qualityOptions.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-quality]');
        if (!btn) return;
        const q = parseInt(btn.getAttribute('data-quality'), 10);
        setQuality(q);
        closeMenu();
      });
    }
  }

  function openMenu(panel) {
    if (!el.menu) return;
    menuOpen = true;
    el.menu.hidden = false;
    switchMenuPanel(panel || 'main');
    revealControls(true);
  }

  function closeMenu() {
    if (!el.menu) return;
    menuOpen = false;
    el.menu.hidden = true;
    switchMenuPanel('main');
    scheduleFade();
  }

  function switchMenuPanel(panel) {
    if (el.menuMain) el.menuMain.hidden = panel !== 'main';
    if (el.menuSpeed) el.menuSpeed.hidden = panel !== 'speed';
    if (el.menuQuality) el.menuQuality.hidden = panel !== 'quality';
  }

  function buildSpeedMenu() {
    if (!el.speedOptions) return;
    el.speedOptions.innerHTML = SPEEDS.map(function (s) {
      return (
        '<button type="button" class="cp-menu-option' +
        (s === state.speed ? ' active' : '') +
        '" data-speed="' +
        s +
        '">' +
        formatSpeed(s) +
        '</button>'
      );
    }).join('');
    updateSpeedUI();
  }

  function setSpeed(speed) {
    state.speed = speed;
    localStorage.setItem(SPEED_KEY, String(speed));
    applySpeed(speed, true);
  }

  function applySpeed(speed, showNotice) {
    if (video) video.playbackRate = speed;
    updateSpeedUI();
    if (showNotice) playerToast('Speed: ' + formatSpeed(speed));
  }

  function updateSpeedUI() {
    const label = formatSpeed(state.speed);
    if (el.speedBadge) el.speedBadge.textContent = label;
    if (el.settingsLabel) el.settingsLabel.textContent = label;
    if (el.menuSpeedVal) el.menuSpeedVal.textContent = label;
    if (el.speedOptions) {
      el.speedOptions.querySelectorAll('[data-speed]').forEach(function (btn) {
        btn.classList.toggle(
          'active',
          parseFloat(btn.getAttribute('data-speed')) === state.speed
        );
      });
    }
  }

  function stepSpeed(direction) {
    const idx = SPEEDS.indexOf(state.speed);
    const nextIdx = clamp(idx + direction, 0, SPEEDS.length - 1);
    setSpeed(SPEEDS[nextIdx]);
  }

  function setQuality(levelIndex) {
    state.quality = levelIndex;

    if (!hls) {
      playerToast('Quality: Auto');
      updateQualityUI();
      return;
    }

    if (levelIndex === -1) {
      hls.currentLevel = -1; // Auto adaptive bitrate
      playerToast('Quality: Auto (adaptive to internet speed)');
    } else if (levelIndex >= 0 && hlsLevels[levelIndex]) {
      hls.currentLevel = levelIndex;
      const lvl = hlsLevels[levelIndex];
      playerToast('Quality: ' + (lvl.height ? lvl.height + 'p' : 'Selected'));
    }
    updateQualityUI();
  }

  function buildQualityMenu(levels) {
    hlsLevels = levels || [];
    if (!el.qualityOptions) return;

    const options = [
      { value: -1, label: 'Auto (adapts to internet)' }
    ];

    hlsLevels
      .slice()
      .sort(function (a, b) {
        return (b.height || 0) - (a.height || 0);
      })
      .forEach(function (lvl) {
        const origIdx = hlsLevels.indexOf(lvl);
        const name = lvl.height ? lvl.height + 'p' : 'Level ' + (origIdx + 1);
        options.push({ value: origIdx, label: name });
      });

    el.qualityOptions.innerHTML = options
      .map(function (opt) {
        return (
          '<button type="button" class="cp-menu-option' +
          (opt.value === state.quality ? ' active' : '') +
          '" data-quality="' +
          opt.value +
          '">' +
          opt.label +
          '</button>'
        );
      })
      .join('');

    updateQualityUI();
  }

  function updateQualityUI() {
    if (!el.menuQualityVal) return;
    let label = 'Auto';

    if (state.quality >= 0 && hlsLevels[state.quality]) {
      const lvl = hlsLevels[state.quality];
      label = lvl.height ? lvl.height + 'p' : 'Selected';
    } else if (hls && hls.currentLevel >= 0 && hlsLevels[hls.currentLevel]) {
      const lvl = hlsLevels[hls.currentLevel];
      label = 'Auto (' + (lvl.height ? lvl.height + 'p' : 'live') + ')';
    }

    el.menuQualityVal.textContent = label;

    if (el.qualityOptions) {
      el.qualityOptions.querySelectorAll('[data-quality]').forEach(function (btn) {
        btn.classList.toggle(
          'active',
          parseInt(btn.getAttribute('data-quality'), 10) === state.quality
        );
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Overlay Fading (fade when not in use)                              */
  /* ------------------------------------------------------------------ */

  function revealControls(keepVisible) {
    if (!stage) return;
    stage.classList.remove('ui-hidden');
    clearTimeout(fadeTimer);
    if (!keepVisible) scheduleFade();
  }

  function scheduleFade() {
    clearTimeout(fadeTimer);
    if (!video || video.paused || menuOpen || isIframeMode) return;
    fadeTimer = setTimeout(function () {
      if (video && !video.paused && !menuOpen) {
        stage.classList.add('ui-hidden');
        if (el.progress) el.progress.classList.remove('show-tooltip');
      }
    }, FADE_TIMEOUT_MS);
  }

  /* ------------------------------------------------------------------ */
  /* Fullscreen & PiP                                                   */
  /* ------------------------------------------------------------------ */

  function bindFullscreen() {
    document.addEventListener('fullscreenchange', function () {
      const isFull = !!document.fullscreenElement;
      stage.classList.toggle('is-fullscreen', isFull);
    });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (stage.requestFullscreen) {
      stage.requestFullscreen().catch(function () {
        if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      });
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }

  function togglePictureInPicture() {
    if (!document.pictureInPictureEnabled || !video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(function () {});
    } else {
      video.requestPictureInPicture().catch(function () {
        playerToast('Picture-in-picture unavailable');
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard Shortcuts                                                 */
  /* ------------------------------------------------------------------ */

  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!currentItem || isIframeMode) return;
      const modal = $('videoModal');
      if (!modal || !modal.classList.contains('active')) return;

      const tag = e.target ? e.target.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          break;
        case 'j':
        case 'J':
          seekBy(-10);
          break;
        case 'l':
        case 'L':
          seekBy(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.05);
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '>':
        case '.':
          if (e.shiftKey) {
            e.preventDefault();
            stepSpeed(1);
          }
          break;
        case '<':
        case ',':
          if (e.shiftKey) {
            e.preventDefault();
            stepSpeed(-1);
          }
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            seekToRatio(Number(e.key) / 10);
          }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Resume Position                                                    */
  /* ------------------------------------------------------------------ */

  function applyResumePosition() {
    if (resumeApplied || !currentItem || !video) return;
    resumeApplied = true;

    const dur = video.duration;
    if (!isFinite(dur) || dur <= 0) return;

    let saved = 0;
    try {
      saved = Number(localStorage.getItem(posKey()) || 0);
    } catch (e) {}

    if (saved > 5 && saved < dur - 10) {
      video.currentTime = saved;
      playerToast('Resumed at ' + formatTime(saved), 2200);
    }
  }

  function scheduleSavePosition() {
    const now = Date.now();
    if (now - lastSave < 4000) return;
    lastSave = now;
    savePosition();
  }

  function savePosition(force) {
    if (!currentItem || isIframeMode || !video) return;
    const dur = video.duration;
    if (!isFinite(dur) || dur <= 0) return;

    const time = video.currentTime;
    try {
      if (video.ended || time < 5 || dur - time < 10) {
        localStorage.removeItem(posKey());
      } else {
        localStorage.setItem(posKey(), String(Math.floor(time)));
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Stream Resolution & Playback                                       */
  /* ------------------------------------------------------------------ */

  function extractCode(item) {
    if (item.fileCode) return item.fileCode;
    const m = String(item.embedUrl || '').match(/embed-([A-Za-z0-9]+)\.html/);
    return m ? m[1] : null;
  }

  // Attempt client-side direct embed fetch first (CORS allowed by vidmoly.biz / vidmoly.org)
  async function resolveStreamClient(item) {
    const code = extractCode(item);
    if (!code) throw new Error('Missing video code');

    const host = item.embedUrl ? new URL(item.embedUrl).origin : 'https://vidmoly.biz';
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 7000);

    try {
      const res = await fetch(`${host}/embed-${code}.html`, {
        signal: controller.signal,
        headers: { Accept: 'text/html' }
      });
      if (!res.ok) throw new Error('Client fetch failed');
      const html = await res.text();
      const m = html.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/) ||
                html.match(/['"](https?:\/\/[^'"]+\/master\.m3u8[^'"]*)['"]/);
      if (m && m[1]) {
        const img = html.match(/image\s*:\s*['"]([^'"]+)['"]/);
        return {
          streamUrl: m[1].replace(/\\\//g, '/').replace(/&amp;/g, '&'),
          poster: img ? img[1].replace(/\\\//g, '/') : null
        };
      }
      throw new Error('Stream pattern not found');
    } finally {
      clearTimeout(timer);
    }
  }

  // Worker endpoint fallback
  async function resolveStreamWorker(item) {
    const code = extractCode(item);
    if (!code) throw new Error('Missing video code');

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 9000);

    try {
      const res = await fetch('/api/resolve?code=' + encodeURIComponent(code), {
        signal: controller.signal,
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Worker resolve failed');
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function resolveStream(item) {
    try {
      return await resolveStreamClient(item);
    } catch (e1) {
      return await resolveStreamWorker(item);
    }
  }

  function destroyHls() {
    if (hls) {
      try {
        hls.destroy();
      } catch (e) {}
      hls = null;
    }
  }

  function loadSource(streamUrl) {
    if (!streamUrl) {
      fallbackToIframe('Could not load stream.');
      return;
    }

    setStageClass('is-buffering', true);
    if (el.spinner) el.spinner.classList.add('visible');

    // HLS.js direct playback in browser
    if (window.Hls && window.Hls.isSupported()) {
      destroyHls();
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(window.Hls.Events.MANIFEST_PARSED, function (event, payload) {
        buildQualityMenu(payload.levels || []);
        applySpeed(state.speed, false);
        attemptPlay();
      });

      hls.on(window.Hls.Events.LEVEL_SWITCHED, function () {
        updateQualityUI();
        updateBufferUI();
      });

      hls.on(window.Hls.Events.FRAG_BUFFERED, updateBufferUI);

      hls.on(window.Hls.Events.ERROR, function (event, data) {
        if (!data || !data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          fallbackToIframe('Network issue. Switched to backup player.');
        } else {
          fallbackToIframe('Stream error. Switched to backup player.');
        }
      });
      return;
    }

    // Native Safari / iOS HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      buildQualityMenu([]);
      video.addEventListener('loadedmetadata', function () {
        attemptPlay();
      }, { once: true });
      return;
    }

    fallbackToIframe('HLS playback is not supported in this browser.');
  }

  function attemptPlay() {
    if (!video) return;
    const p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        setStageClass('is-paused', true);
        setStageClass('is-playing', false);
        if (el.spinner) el.spinner.classList.remove('visible');
        revealControls(true);
      });
    }
  }

  function fallbackToIframe(message) {
    destroyHls();
    isIframeMode = true;
    try {
      video.pause();
    } catch (e) {}

    video.style.display = 'none';
    stage.classList.add('iframe-mode');
    stage.classList.remove('ui-hidden');
    if (el.spinner) el.spinner.classList.remove('visible');
    closeMenu();

    if (currentItem && currentItem.embedUrl) {
      iframe.src = currentItem.embedUrl;
      iframe.style.display = 'block';
    }

    playerToast(message || 'Using backup player', 2500);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  async function open(item) {
    if (!video) init();
    if (!video || !item) return;

    if (currentItem && currentItem.id !== item.id) {
      savePosition(true);
    }

    const myToken = ++token;
    currentItem = item;
    isIframeMode = false;
    resumeApplied = false;
    lastSave = 0;

    stage.classList.remove('iframe-mode', 'ui-hidden');
    stage.classList.remove('is-playing', 'is-buffering');
    stage.classList.add('is-paused');

    if (iframe) {
      iframe.style.display = 'none';
      iframe.src = '';
    }
    video.style.display = 'block';
    video.poster = item.poster || '';

    if (el.spinner) el.spinner.classList.add('visible');
    closeMenu();

    try {
      video.pause();
    } catch (e) {}
    destroyHls();
    try {
      video.removeAttribute('src');
      video.load();
    } catch (e) {}

    applySpeed(state.speed, false);
    updateProgressUI();
    revealControls(true);

    try {
      const data = await resolveStream(item);
      if (myToken !== token || currentItem !== item) return;
      if (data.poster) video.poster = data.poster;
      loadSource(data.streamUrl);
    } catch (err) {
      if (myToken !== token || currentItem !== item) return;
      fallbackToIframe('Loading backup player...');
    }
  }

  function close() {
    if (!video) return;
    token++;
    savePosition(true);
    try {
      video.pause();
    } catch (e) {}
    destroyHls();
    try {
      video.removeAttribute('src');
      video.load();
    } catch (e) {}
    if (iframe) {
      iframe.src = '';
      iframe.style.display = 'none';
    }
    stage.classList.remove('iframe-mode', 'ui-hidden', 'is-buffering');
    if (el.spinner) el.spinner.classList.remove('visible');
    closeMenu();
    clearTimeout(fadeTimer);
    currentItem = null;
    isIframeMode = false;
  }

  function isOpen() {
    return !!currentItem;
  }

  window.CinemaPlayer = { open: open, close: close, isOpen: isOpen };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
