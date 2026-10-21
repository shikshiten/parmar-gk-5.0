/**
 * Parmar GK 5.0 - Dedicated Cinema Player
 *
 * A self-contained HTML5/HLS player with YouTube-style controls:
 *  - custom progress bar (hover preview + drag seek + buffered range)
 *  - double-tap / double-click to seek +/-10s with ripple feedback
 *  - playback speed menu (0.25x - 3x)
 *  - quality menu driven by hls.js levels (Auto + manual)
 *  - volume, mute, PiP, fullscreen, keyboard shortcuts
 *  - per-lecture resume position
 *  - automatic fallback to the original embed if resolution fails
 *
 * Exposes: window.CinemaPlayer = { open, close, isOpen }
 * Emits:   document "cinema:ended"
 */
(function () {
  'use strict';

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const SPEED_KEY = 'parmar_gk_speed';
  const VOLUME_KEY = 'parmar_gk_volume';
  const MUTED_KEY = 'parmar_gk_muted';
  const POS_PREFIX = 'parmar_gk_pos_';
  const CONTROLS_TIMEOUT = 3000;
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
  let hideTimer = null;
  let toastTimer = null;
  let lastSave = 0;
  let endedFired = false;
  let recoveryAttempts = 0;
  let resolveAttempts = 0;
  let resumeApplied = false;
  let token = 0;

  const state = {
    speed: readNumber(SPEED_KEY, 1, SPEEDS),
    quality: -1,
    volume: Math.min(1, Math.max(0, readNumber(VOLUME_KEY, 1))),
    muted: localStorage.getItem(MUTED_KEY) === 'true'
  };

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

  function formatSpeedShort(speed) {
    return speed + 'x';
  }

  function posKey() {
    return POS_PREFIX + (currentItem ? currentItem.id : '');
  }

  function playerToast(message, duration) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, duration || 1400);
  }

  function setStageClass(name, on) {
    if (!stage) return;
    stage.classList.toggle(name, !!on);
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
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
    el.error = $('cpError');
    el.errorText = $('cpErrorText');

    video.volume = state.volume;
    video.muted = state.muted;
    applySpeed(state.speed, false);
    buildSpeedMenu();
    updateVolumeUI();
    updateProgressUI();

    if (!document.pictureInPictureEnabled) {
      el.pip.style.display = 'none';
    }

    bindVideoEvents();
    bindControls();
    bindProgress();
    bindZones(el.seekLeftZone, -10, el.seekLeftBadge);
    bindZones(el.seekRightZone, 10, el.seekRightBadge);
    bindMenu();
    bindKeyboard();
    bindFullscreen();

    showControls();
  }

  /* ------------------------------------------------------------------ */
  /* Video events                                                       */
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
      scheduleHide();
    });

    video.addEventListener('progress', updateBufferUI);
    video.addEventListener('loadeddata', updateBufferUI);

    video.addEventListener('play', function () {
      setStageClass('is-playing', true);
      setStageClass('is-paused', false);
      updatePlayIcons();
      scheduleHide();
    });

    video.addEventListener('playing', function () {
      setStageClass('is-buffering', false);
      setStageClass('is-playing', true);
      setStageClass('is-paused', false);
      updatePlayIcons();
      el.spinner.classList.remove('visible');
      scheduleHide();
    });

    video.addEventListener('pause', function () {
      setStageClass('is-playing', false);
      setStageClass('is-paused', true);
      clearTimeout(hideTimer);
      showControls(true);
      updatePlayIcons();
      savePosition(true);
    });

    video.addEventListener('waiting', function () {
      setStageClass('is-buffering', true);
      showControls(true);
    });

    video.addEventListener('canplay', function () {
      setStageClass('is-buffering', false);
      el.spinner.classList.remove('visible');
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
      if (endedFired) return;
      endedFired = true;
      try {
        localStorage.removeItem(posKey());
      } catch (e) {}
      setStageClass('is-playing', false);
      setStageClass('is-paused', true);
      updatePlayIcons();
      document.dispatchEvent(new CustomEvent('cinema:ended'));
    });

    video.addEventListener('error', function () {
      if (isIframeMode || !currentItem) return;
      fallbackToIframe('This stream could not be played.');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Controls                                                           */
  /* ------------------------------------------------------------------ */

  function bindControls() {
    el.playPause.addEventListener('click', togglePlay);
    el.bigPlay.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePlay();
    });
    el.rewind.addEventListener('click', function () {
      seekBy(-10);
    });
    el.forward.addEventListener('click', function () {
      seekBy(10);
    });
    el.mute.addEventListener('click', toggleMute);
    el.volume.addEventListener('input', function () {
      setVolume(parseFloat(el.volume.value));
    });
    el.settings.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menuOpen) closeMenu();
      else openMenu();
    });
    el.pip.addEventListener('click', togglePictureInPicture);
    el.fullscreen.addEventListener('click', toggleFullscreen);

    stage.addEventListener('click', function (e) {
      if (isIframeMode) return;
      if (e.target.closest('.cp-controls, .cp-menu, .cp-seek-zone, .cp-big-play')) return;
      togglePlay();
    });

    stage.addEventListener('pointermove', function () {
      showControls();
    });
    stage.addEventListener('touchstart', function () {
      showControls();
    }, { passive: true });

    // Hide menu when tapping anywhere else
    document.addEventListener('pointerdown', function (e) {
      if (!menuOpen) return;
      if (!e.target.closest('#cpMenu') && !e.target.closest('#cpSettings')) {
        closeMenu();
      }
    });
  }

  function updatePlayIcons() {
    const paused = video.paused || video.ended;
    stage.classList.toggle('is-paused', paused);
    stage.classList.toggle('is-playing', !paused);
  }

  function togglePlay() {
    if (!video || isIframeMode) return;
    if (video.paused || video.ended) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          showControls(true);
          playerToast('Tap play to start');
        });
      }
    } else {
      video.pause();
    }
  }

  function seekBy(seconds) {
    if (!video || isIframeMode) return;
    const duration = isFinite(video.duration) ? video.duration : Infinity;
    video.currentTime = clamp(video.currentTime + seconds, 0, duration);
    updateProgressUI();
    showControls();
  }

  function seekToRatio(ratio) {
    if (!video || isIframeMode) return;
    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) return;
    video.currentTime = clamp(ratio, 0, 1) * duration;
    updateProgressUI();
  }

  function setVolume(value) {
    video.volume = clamp(value, 0, 1);
    if (video.volume > 0 && video.muted) video.muted = false;
    showControls();
  }

  function changeVolume(delta) {
    setVolume(video.volume + delta);
    playerToast('Volume ' + Math.round(video.volume * 100) + '%');
  }

  function toggleMute() {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.6;
    playerToast(video.muted ? 'Muted' : 'Unmuted');
  }

  function updateVolumeUI() {
    const isMuted = video.muted || video.volume === 0;
    el.mute.classList.toggle('is-muted', isMuted);
    el.volume.value = String(isMuted ? 0 : video.volume);
    el.volume.style.setProperty('--vol-fill', (isMuted ? 0 : video.volume) * 100 + '%');
  }

  /* ------------------------------------------------------------------ */
  /* Progress bar                                                       */
  /* ------------------------------------------------------------------ */

  function bindProgress() {
    el.progress.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (!video.duration) return;
      dragging = true;
      el.progress.classList.add('is-dragging');
      try {
        el.progress.setPointerCapture(e.pointerId);
      } catch (err) {}
      seekToRatio(ratioFromEvent(e));
      showControls(true);
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
    if (!el.tooltip) return;
    const duration = isFinite(video.duration) ? video.duration : 0;
    el.tooltip.textContent = formatTime(ratio * duration);
    el.tooltip.style.left = ratio * 100 + '%';
    const rect = el.progress.getBoundingClientRect();
    if (e && e.clientX >= rect.left && e.clientX <= rect.right) {
      el.progress.classList.add('show-tooltip');
    }
  }

  function updateProgressUI() {
    if (!video) return;
    const duration = isFinite(video.duration) ? video.duration : 0;
    const current = video.currentTime || 0;
    const ratio = duration > 0 ? current / duration : 0;

    el.played.style.width = ratio * 100 + '%';
    el.thumb.style.left = ratio * 100 + '%';

    if (el.current) el.current.textContent = formatTime(current);
    if (el.duration) el.duration.textContent = formatTime(duration);

    updateBufferUI();
  }

  function updateBufferUI() {
    if (!video || !video.buffered || !video.buffered.length) {
      if (el.buffer) el.buffer.style.width = '0%';
      return;
    }
    const duration = isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) return;

    let end = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime + 0.5) {
        end = Math.max(end, video.buffered.end(i));
      }
    }
    if (!end) end = video.buffered.end(video.buffered.length - 1);
    el.buffer.style.width = clamp(end / duration, 0, 1) * 100 + '%';
  }

  /* ------------------------------------------------------------------ */
  /* Double-tap seek zones                                              */
  /* ------------------------------------------------------------------ */

  function bindZones(zone, seconds, badge) {
    if (!zone) return;
    let lastTap = 0;

    zone.addEventListener('pointerup', function (e) {
      if (isIframeMode) return;
      const now = Date.now();
      if (now - lastTap < DOUBLE_TAP_MS) {
        lastTap = 0;
        e.preventDefault();
        seekBy(seconds);
        playRipple(badge, seconds > 0 ? 'Forward 10s' : 'Rewind 10s');
      } else {
        lastTap = now;
        showControls();
      }
    });

    zone.addEventListener('dblclick', function (e) {
      e.preventDefault();
    });
  }

  function playRipple(badge, label) {
    if (!badge) return;
    if (label) badge.setAttribute('data-label', label);
    badge.classList.remove('show');
    // force reflow so the animation can restart
    void badge.offsetWidth;
    badge.classList.add('show');
    setTimeout(function () {
      badge.classList.remove('show');
    }, 700);
  }

  /* ------------------------------------------------------------------ */
  /* Settings menu                                                      */
  /* ------------------------------------------------------------------ */

  function bindMenu() {
    el.menuMain.addEventListener('click', function (e) {
      const row = e.target.closest('[data-menu]');
      if (!row) return;
      if (row.getAttribute('data-menu') === 'speed') showPanel('speed');
      else showPanel('quality');
    });

    el.menu.addEventListener('click', function (e) {
      const back = e.target.closest('[data-back]');
      if (back) showPanel('main');
    });

    el.speedOptions.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-speed]');
      if (!btn) return;
      setSpeed(parseFloat(btn.getAttribute('data-speed')));
    });

    el.qualityOptions.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-quality]');
      if (!btn) return;
      setQuality(parseInt(btn.getAttribute('data-quality'), 10));
    });
  }

  function openMenu() {
    menuOpen = true;
    el.menu.hidden = false;
    showPanel('main');
    setStageClass('menu-open', true);
    showControls(true);
  }

  function closeMenu() {
    menuOpen = false;
    el.menu.hidden = true;
    setStageClass('menu-open', false);
    showPanel('main');
    scheduleHide();
  }

  function showPanel(name) {
    el.menuMain.hidden = name !== 'main';
    el.menuSpeed.hidden = name !== 'speed';
    el.menuQuality.hidden = name !== 'quality';
    if (name === 'speed') updateSpeedUI();
    if (name === 'quality') updateQualityUI();
  }

  function buildSpeedMenu() {
    el.speedOptions.innerHTML = SPEEDS.map(function (speed) {
      return (
        '<button type="button" class="cp-menu-option" data-speed="' +
        speed +
        '">' +
        (speed === 1 ? '1x (Normal)' : speed + 'x') +
        '</button>'
      );
    }).join('');
    updateSpeedUI();
  }

  function setSpeed(speed, announce) {
    if (SPEEDS.indexOf(speed) === -1) return;
    state.speed = speed;
    applySpeed(speed, true);
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch (e) {}
    if (announce !== false) playerToast(formatSpeed(speed) + ' speed');
  }

  function applySpeed(speed, announce) {
    video.playbackRate = speed;
    video.defaultPlaybackRate = speed;
    // Keep the pitch natural (supported in modern browsers)
    video.preservesPitch = true;
    video.mozPreservesPitch = true;
    video.webkitPreservesPitch = true;
    updateSpeedUI();
  }

  function updateSpeedUI() {
    const label = formatSpeedShort(state.speed);
    if (el.speedBadge) el.speedBadge.textContent = label;
    if (el.settingsLabel) el.settingsLabel.textContent = label;
    if (el.menuSpeedVal) el.menuSpeedVal.textContent = formatSpeed(state.speed);
    if (el.speedOptions) {
      Array.prototype.forEach.call(
        el.speedOptions.querySelectorAll('[data-speed]'),
        function (btn) {
          btn.classList.toggle(
            'active',
            parseFloat(btn.getAttribute('data-speed')) === state.speed
          );
        }
      );
    }
  }

  function stepSpeed(direction) {
    const index = SPEEDS.indexOf(state.speed);
    const next = clamp(index + direction, 0, SPEEDS.length - 1);
    setSpeed(SPEEDS[next]);
  }

  function setQuality(value) {
    state.quality = value;

    if (!hls) {
      playerToast('Quality: Auto');
      updateQualityUI();
      return;
    }

    if (value === -1) {
      hls.currentLevel = -1;
      playerToast('Quality: Auto');
    } else if (value >= 0 && hlsLevels[value]) {
      hls.currentLevel = value;
      const level = hlsLevels[value];
      playerToast('Quality: ' + (level.height ? level.height + 'p' : 'Selected'));
    }
    updateQualityUI();
  }

  function buildQualityMenu(levels) {
    hlsLevels = levels || [];
    const options = [];

    options.push({
      value: -1,
      label: 'Auto' + (hlsLevels.length ? ' (adaptive)' : '')
    });

    hlsLevels
      .slice()
      .sort(function (a, b) {
        return (b.height || 0) - (a.height || 0);
      })
      .forEach(function (level) {
        const index = hlsLevels.indexOf(level);
        const height = level.height ? level.height + 'p' : 'Level ' + (index + 1);
        options.push({ value: index, label: height });
      });

    if (!hlsLevels.length) {
      options.push({ value: -2, label: 'Source quality' });
    }

    el.qualityOptions.innerHTML = options
      .map(function (option) {
        return (
          '<button type="button" class="cp-menu-option' +
          (option.value === state.quality ? ' active' : '') +
          '" data-quality="' +
          option.value +
          '"' +
          (option.value === -2 ? ' disabled' : '') +
          '>' +
          option.label +
          '</button>'
        );
      })
      .join('');

    state.quality = -1;
    updateQualityUI();
  }

  function updateQualityUI() {
    if (!el.menuQualityVal) return;
    let label = 'Auto';

    if (state.quality >= 0 && hlsLevels[state.quality]) {
      const level = hlsLevels[state.quality];
      label = level.height ? level.height + 'p' : 'Selected';
    } else if (hls && hls.currentLevel >= 0 && hlsLevels[hls.currentLevel]) {
      const level = hlsLevels[hls.currentLevel];
      label = 'Auto (' + (level.height ? level.height + 'p' : 'live') + ')';
    } else if (hlsLevels.length) {
      const best = hlsLevels.reduce(function (max, l) {
        return Math.max(max, l.height || 0);
      }, 0);
      label = best ? 'Auto (' + best + 'p max)' : 'Auto';
    }

    el.menuQualityVal.textContent = label;

    if (el.qualityOptions) {
      Array.prototype.forEach.call(
        el.qualityOptions.querySelectorAll('[data-quality]'),
        function (btn) {
          btn.classList.toggle(
            'active',
            parseInt(btn.getAttribute('data-quality'), 10) === state.quality
          );
        }
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Controls visibility                                                */
  /* ------------------------------------------------------------------ */

  function showControls(keepVisible) {
    if (!stage) return;
    stage.classList.remove('ui-hidden');
    clearTimeout(hideTimer);
    if (!keepVisible) scheduleHide();
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    if (!video || video.paused || menuOpen || isIframeMode) return;
    hideTimer = setTimeout(function () {
      if (!video.paused && !menuOpen) {
        stage.classList.add('ui-hidden');
        el.progress.classList.remove('show-tooltip');
      }
    }, CONTROLS_TIMEOUT);
  }

  /* ------------------------------------------------------------------ */
  /* Fullscreen / PiP                                                   */
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
    } else if (video.webkitSupportsFullscreen) {
      video.webkitEnterFullscreen();
    }
  }

  function togglePictureInPicture() {
    if (!document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(function () {});
    } else {
      video.requestPictureInPicture().catch(function () {
        playerToast('Picture-in-picture unavailable');
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard shortcuts                                                 */
  /* ------------------------------------------------------------------ */

  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!currentItem || isIframeMode) return;
      const modal = $('videoModal');
      if (!modal || !modal.classList.contains('active')) return;

      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
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
          showControls();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          showControls();
          break;
        case 'j':
        case 'J':
          seekBy(-10);
          showControls();
          break;
        case 'l':
        case 'L':
          seekBy(10);
          showControls();
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
  /* Resume position                                                    */
  /* ------------------------------------------------------------------ */

  function applyResumePosition() {
    if (resumeApplied || !currentItem) return;
    resumeApplied = true;

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) return;

    let saved = 0;
    try {
      saved = Number(localStorage.getItem(posKey()) || 0);
    } catch (e) {}

    if (saved > 5 && saved < duration - 10) {
      video.currentTime = saved;
      playerToast('Resumed at ' + formatTime(saved), 2200);
    }
  }

  function scheduleSavePosition() {
    const now = Date.now();
    if (now - lastSave < 5000) return;
    lastSave = now;
    savePosition();
  }

  function savePosition(force) {
    if (!currentItem || isIframeMode || !video) return;
    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) return;

    const time = video.currentTime;
    try {
      if (video.ended || time < 5 || duration - time < 10) {
        localStorage.removeItem(posKey());
      } else {
        localStorage.setItem(posKey(), String(Math.floor(time)));
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Stream resolution & playback                                       */
  /* ------------------------------------------------------------------ */

  function extractCode(item) {
    if (item.fileCode) return item.fileCode;
    const match = String(item.embedUrl || '').match(/embed-([A-Za-z0-9]+)\.html/);
    return match ? match[1] : null;
  }

  async function resolveStream(item) {
    const code = extractCode(item);
    if (!code) throw new Error('Missing video code');

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, 15000);

    try {
      const res = await fetch('/api/resolve?code=' + encodeURIComponent(code), {
        signal: controller.signal,
        cache: 'no-store'
      });
      if (!res.ok) {
        let message = 'Resolver failed';
        try {
          const body = await res.json();
          if (body && body.error) message = body.error;
        } catch (e) {}
        throw new Error(message);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
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

  function loadSource(data, useProxyAll) {
    const src =
      useProxyAll && data.streamUrl
        ? '/api/hls?u=' + encodeURIComponent(data.streamUrl) + '&all=1'
        : data.proxyUrl || data.streamUrl;

    if (!src) {
      fallbackToIframe('No playable stream was found.');
      return;
    }

    setStageClass('is-buffering', true);
    el.spinner.classList.add('visible');
    el.error.hidden = true;

    if (window.Hls && window.Hls.isSupported()) {
      destroyHls();
      hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      });

      hls.loadSource(src);
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

      hls.on(window.Hls.Events.ERROR, onHlsError);
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      buildQualityMenu([]);
      video.addEventListener(
        'loadedmetadata',
        function () {
          attemptPlay();
        },
        { once: true }
      );
      return;
    }

    fallbackToIframe('HLS playback is not supported in this browser.');
  }

  function attemptPlay() {
    const p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay blocked: wait for the user's tap.
        setStageClass('is-paused', true);
        setStageClass('is-playing', false);
        el.spinner.classList.remove('visible');
        showControls(true);
      });
    }
  }

  function onHlsError(event, data) {
    if (!data || !data.fatal) return;

    if (
      data.type === window.Hls.ErrorTypes.MEDIA_ERROR &&
      recoveryAttempts < 2
    ) {
      recoveryAttempts++;
      hls.recoverMediaError();
      return;
    }

    if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
      if (recoveryAttempts < 1) {
        recoveryAttempts++;
        hls.startLoad();
        return;
      }
      // Token may have expired or the CDN refused the request: try once more
      // with fresh resolution, then a fully-proxied stream.
      if (resolveAttempts < 2) {
        resolveAttempts++;
        reResolve(resolveAttempts === 2);
        return;
      }
    }

    fallbackToIframe('The stream could not be loaded.');
  }

  async function reResolve(useProxyAll) {
    if (!currentItem) return;
    const item = currentItem;
    const myToken = token;

    destroyHls();
    setStageClass('is-buffering', true);
    el.spinner.classList.add('visible');

    try {
      const data = await resolveStream(item);
      if (myToken !== token || currentItem !== item) return;
      loadSource(data, useProxyAll);
    } catch (e) {
      fallbackToIframe('Could not reconnect to the stream.');
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
    el.spinner.classList.remove('visible');
    el.error.hidden = true;
    closeMenu();

    if (currentItem && currentItem.embedUrl) {
      iframe.src = currentItem.embedUrl;
      iframe.style.display = 'block';
    }

    playerToast(message || 'Using the backup player', 2600);
    document.dispatchEvent(new CustomEvent('cinema:fallback'));
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
    endedFired = false;
    resumeApplied = false;
    recoveryAttempts = 0;
    resolveAttempts = 0;
    lastSave = 0;

    stage.classList.remove('iframe-mode', 'ui-hidden');
    stage.classList.remove('is-playing', 'is-buffering');
    stage.classList.add('is-paused');
    iframe.style.display = 'none';
    iframe.src = '';
    video.style.display = 'block';
    video.poster = item.poster || '';

    el.error.hidden = true;
    el.spinner.classList.add('visible');
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
    showControls(true);

    try {
      const data = await resolveStream(item);
      if (myToken !== token || currentItem !== item) return;
      if (data.poster) video.poster = data.poster;
      loadSource(data);
    } catch (err) {
      if (myToken !== token || currentItem !== item) return;
      fallbackToIframe('Direct stream unavailable.');
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
    el.spinner.classList.remove('visible');
    closeMenu();
    clearTimeout(hideTimer);
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
