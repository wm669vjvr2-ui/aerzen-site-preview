/* User-supplied footage; native scroll and native video, no animation library. */
const clamp = value => Math.max(0, Math.min(1, value));

export function initBlowerVideo(section) {
  if (typeof IntersectionObserver !== 'function') return null;
  const video = section.querySelector('[data-blower-video]');
  const caption = section.querySelector('[data-scene-caption]');
  const toggle = section.querySelector('[data-motion-toggle]');
  const play = section.querySelector('[data-video-play]');
  const status = section.querySelector('[data-video-status]');
  const labels = [...section.querySelectorAll('[data-part]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 767px)');
  const removers = [];
  let loaded = false, failed = false, destroyed = false, manualStatic = false;
  let visible = false, playing = false, seeking = false, frame = 0, loadTimer = 0;
  let target = 0, forced = null, lastProgress = 0, pendingPlay = false;
  const listen = (node, name, fn, options) => {
    node.addEventListener(name, fn, options);
    removers.push(() => node.removeEventListener(name, fn, options));
  };
  const isStatic = () => manualStatic || reduced.matches || failed;
  const endTime = () => Math.max(0, video.duration - 1 / 30);

  labels.forEach(label => {
    const name = label.querySelector('[data-part-name]');
    label.setAttribute('aria-label', name.textContent);
    label.querySelector('small').setAttribute('aria-hidden', 'true');
    const text = name.textContent;
    name.textContent = '';
    name.setAttribute('aria-hidden', 'true');
    [...text].forEach((character, index) => {
      const letter = document.createElement('span');
      letter.className = 'assembly-letter';
      letter.textContent = character === ' ' ? '\u00a0' : character;
      letter.style.setProperty('--letter-delay', `${index * 22}ms`);
      name.append(letter);
    });
  });
  section.dataset.videoEnhanced = 'true';
  video.muted = true;
  toggle.hidden = false;
  play.hidden = reduced.matches;

  function measure() {
    if (forced !== null) return forced;
    const rect = section.getBoundingClientRect();
    if (mobile.matches) return clamp((innerHeight * .65 - rect.top) / (rect.height + innerHeight * .15));
    const sticky = section.querySelector('.assembly-sticky');
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 88;
    return clamp((header - rect.top) / Math.max(1, rect.height - sticky.offsetHeight));
  }

  function present(progress) {
    lastProgress = progress;
    section.style.setProperty('--assembly-progress', progress);
    const phase = progress < .04 ? 'assembled' : progress < .31 ? 'disassembling'
      : progress < .64 ? 'exploded' : progress < .98 ? 'reassembling' : 'assembled';
    section.dataset.motionState = phase;
    section.dataset.motionActive = String(!isStatic());
    caption.textContent = phase === 'disassembling' ? 'Разборка агрегата'
      : phase === 'exploded' ? 'Устройство в деталях'
      : phase === 'reassembling' ? 'Сборка агрегата' : 'Агрегат в сборе';
    labels.forEach((label, index) => {
      const shown = progress >= .29 + index * .029 && progress < .68;
      label.classList.toggle('is-visible', shown);
      section.querySelector(`[data-leader="${label.dataset.part}"]`)?.classList.toggle('is-visible', shown);
    });
  }

  function syncControls() {
    const still = isStatic();
    section.dataset.static = String(still);
    section.dataset.motionActive = String(!still && loaded);
    toggle.setAttribute('aria-pressed', String(still));
    toggle.disabled = reduced.matches || failed;
    toggle.textContent = reduced.matches ? 'Анимация отключена' : still ? 'Включить анимацию' : 'Статичный вид';
    play.hidden = reduced.matches || failed;
    play.textContent = playing ? 'Пауза' : 'Смотреть видео ↗';
    if (still) {
      video.pause();
      playing = false;
      section.dataset.motionState = failed ? 'error' : 'static';
      caption.textContent = failed ? 'Агрегат в сборе' : 'Статичный вид';
      cancelAnimationFrame(frame); frame = 0;
    }
  }

  function fail() {
    failed = true;
    pendingPlay = false;
    clearTimeout(loadTimer);
    section.dataset.videoReady = 'false';
    status.textContent = 'Видео недоступно. Показан статичный вид.';
    syncControls();
  }

  function load() {
    if (video.hasAttribute('src') || destroyed || isStatic()) return;
    if (!video.canPlayType('video/mp4; codecs="avc1.64001f"')) { fail(); return; }
    status.textContent = 'Загружаем видео…';
    video.src = video.dataset.src;
    video.preload = 'auto';
    video.load();
    loadTimer = setTimeout(() => { if (!loaded) fail(); }, 15000);
  }

  function draw() {
    frame = 0;
    if (!loaded || destroyed || isStatic() || !visible || document.hidden || playing || seeking) return;
    const time = target * endTime();
    if (Math.abs(video.currentTime - time) < 1 / 60) { present(video.currentTime / endTime()); return; }
    seeking = true;
    video.currentTime = time;
  }
  function schedule() {
    if (!frame && loaded && !destroyed && !isStatic() && visible && !document.hidden && !playing && !seeking) frame = requestAnimationFrame(draw);
  }
  function scroll() {
    target = measure();
    if (playing) return;
    schedule();
  }
  function stopPlayback() {
    pendingPlay = false;
    if (!playing) return;
    playing = false; video.pause(); syncControls();
  }
  function onDecoded() {
    seeking = false;
    if (!loaded || isStatic() || destroyed) return;
    present(clamp(video.currentTime / endTime()));
    if (Math.abs(video.currentTime - target * endTime()) > 1 / 60) schedule();
  }

  listen(video, 'loadeddata', () => {
    if (destroyed || failed) return;
    loaded = true; clearTimeout(loadTimer);
    status.textContent = '';
    section.dataset.videoReady = 'true';
    syncControls(); scroll();
    if (pendingPlay) startPlayback();
  });
  listen(video, 'seeked', onDecoded);
  listen(video, 'timeupdate', () => { if (playing && !isStatic()) present(clamp(video.currentTime / endTime())); });
  listen(video, 'ended', () => { stopPlayback(); target = 1; present(1); });
  listen(video, 'error', fail);
  listen(window, 'scroll', scroll, {passive: true});
  listen(window, 'resize', scroll, {passive: true});
  listen(window, 'wheel', stopPlayback, {passive: true});
  listen(window, 'touchstart', stopPlayback, {passive: true});
  listen(window, 'keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) stopPlayback();
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { stopPlayback(); cancelAnimationFrame(frame); frame = 0; }
    else scroll();
  });
  listen(reduced, 'change', () => { syncControls(); if (!isStatic()) { load(); scroll(); } });
  listen(toggle, 'click', () => {
    manualStatic = !manualStatic; stopPlayback(); syncControls();
    if (!isStatic()) { load(); scroll(); }
  });
  async function startPlayback() {
    pendingPlay = false;
    if (destroyed || isStatic() || !visible || document.hidden) return;
    if (video.currentTime >= endTime() - .1) video.currentTime = 0;
    playing = true; video.playbackRate = .65; syncControls();
    try { await video.play(); } catch { playing = false; syncControls(); status.textContent = 'Прокрутите страницу, чтобы посмотреть разборку.'; }
  }
  listen(play, 'click', () => {
    if (playing) { stopPlayback(); return; }
    manualStatic = false; syncControls(); load();
    if (!loaded) { pendingPlay = true; return; }
    startPlayback();
  });
  const near = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !isStatic()) load();
  }, {rootMargin: '500px'});
  const visibility = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { stopPlayback(); cancelAnimationFrame(frame); frame = 0; }
    else scroll();
  });
  near.observe(section); visibility.observe(section); syncControls();

  // A small, deterministic API for scene QA; production input is ordinary scroll.
  const controller = {
    setProgress(progress) { forced = progress === null ? null : clamp(progress); target = measure(); load(); schedule(); },
    getState() { return {loaded, failed, progress: lastProgress, time: video.currentTime, target, playing, static: isStatic()}; },
    destroy() {
      destroyed = true; clearTimeout(loadTimer); cancelAnimationFrame(frame);
      video.pause(); near.disconnect(); visibility.disconnect(); removers.forEach(remove => remove());
    },
  };
  section.blowerVideo = controller;
  listen(window, 'pagehide', event => {
    if (!event.persisted) controller.destroy();
    else { stopPlayback(); cancelAnimationFrame(frame); frame = 0; }
  });
  listen(window, 'pageshow', event => { if (event.persisted) scroll(); });
  return controller;
}
