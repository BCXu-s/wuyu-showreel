(() => {
  "use strict";

  const section = document.querySelector(".cinema-scroll");
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rail = document.querySelector("#project-rail");
  const originalCards = Array.from(document.querySelectorAll(".project-card"));
  const prevBtn = document.querySelector(".rail-prev");
  const nextBtn = document.querySelector(".rail-next");
  const counter = document.querySelector("#rail-counter");
  const dialog = document.querySelector("#player-dialog");
  const dialogVideo = document.querySelector("#dialog-video");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogMeta = document.querySelector("#dialog-meta");
  const closeBtn = document.querySelector(".dialog-close");
  const chromeTime = document.querySelector("#chrome-time");
  const layerA = document.querySelector("#layer-a");
  const layerB = document.querySelector("#layer-b");

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (e0, e1, value) => {
    const x = clamp((value - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const segmentInOut = (s, a, b, c, d) => {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  };
  const getScrollDistance = () =>
    clamp(
      -section.getBoundingClientRect().top,
      0,
      section.offsetHeight - window.innerHeight
    );

  const MEDIA = Array.from(document.querySelectorAll(".project-video")).map((video) => video.getAttribute("src"));

  let targetScroll = 0;
  let smoothScroll = 0;
  let initialized = false;
  let rafPending = false;
  let railCards = [];
  let originalCount = originalCards.length;
  let activeRail = originalCount;
  let activeBg = 0;
  let currentLiveLayer = null;
  let bgStarted = false;
  let bgSwapTimer = null;

  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return "--:--";
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function formatTimecode(seconds) {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const frames = Math.floor((safe % 1) * 24);
    const total = Math.floor(safe);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (value, size = 2) => String(value).padStart(size, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
  }

  function tryPlay(video) {
    if (!video) return;
    const play = video.play;
    if (play) play.call(video).catch(() => {});
  }

  function pauseVideo(video) {
    if (!video) return;
    video.pause();
  }

  function activateLayer(video) {
    if (!video) return;
    if (currentLiveLayer && currentLiveLayer !== video) {
      currentLiveLayer.classList.remove("is-live");
      pauseVideo(currentLiveLayer);
    }
    video.classList.add("is-live");
    currentLiveLayer = video;
  }

  async function playBackground(src, layer) {
    const target = layer || (currentLiveLayer === layerA ? layerB : layerA);
    target.src = src;
    target.poster = src.replace(".mp4", "-poster.jpg");
    target.load();
    try {
      await target.play();
      activateLayer(target);
    } catch (error) {
      activateLayer(target);
      if (document.visibilityState === "visible") {
        setTimeout(() => tryPlay(target), 500);
      }
    }
  }

  function swapBackground() {
    if (!bgStarted) return;
    activeBg = (activeBg + 1) % MEDIA.length;
    playBackground(MEDIA[activeBg]);
  }

  async function startBackground() {
    if (bgStarted) return;
    bgStarted = true;
    await playBackground(MEDIA[0], layerA);
    if (bgSwapTimer) window.clearInterval(bgSwapTimer);
    bgSwapTimer = window.setInterval(swapBackground, 15000);
  }

  function updateRailShift() {
    if (!railCards.length) return;
    const width = railCards[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(rail).columnGap || "0") || 0;
    root.style.setProperty("--work-shift", `${-(width + gap) * activeRail}px`);

    railCards.forEach((card, index) => {
      const isActive = index === activeRail;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const displayNumber = ((activeRail % originalCount) + originalCount) % originalCount + 1;
    if (counter) counter.textContent = `${String(displayNumber).padStart(2, "0")} / ${String(originalCount).padStart(2, "0")}`;
  }

  function moveRail(direction) {
    activeRail += direction;
    updateRailShift();
  }

  function jumpRail(index) {
    rail.classList.add("is-jumping");
    activeRail = index;
    updateRailShift();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => rail.classList.remove("is-jumping"));
    });
  }

  function normalizeRail() {
    if (activeRail >= originalCount * 2) {
      jumpRail(activeRail - originalCount);
    } else if (activeRail < originalCount) {
      jumpRail(activeRail + originalCount);
    }
  }

  function setupRail() {
    if (!rail) return;
    rail.replaceChildren();

    for (let setIndex = 0; setIndex < 3; setIndex += 1) {
      originalCards.forEach((card, index) => {
        const clone = card.cloneNode(true);
        clone.dataset.railIndex = String(setIndex * originalCount + index);
        rail.append(clone);
      });
    }

    railCards = Array.from(rail.children);
    activeRail = originalCount;
    rail.addEventListener("transitionend", normalizeRail);
    updateRailShift();
  }

  function openProject(card) {
    const video = card.querySelector(".project-video");
    const title = card.querySelector(".project-copy h3");
    const meta = card.querySelector(".project-tag");
    if (!video || !dialog) return;
    dialogVideo.src = video.getAttribute("src");
    dialogTitle.textContent = title ? title.textContent : "Project";
    dialogMeta.textContent = meta ? meta.textContent : "Finished cut";
    dialog.showModal();
    dialogVideo.load();
    tryPlay(dialogVideo);
  }

  function closeDialog() {
    if (!dialog) return;
    pauseVideo(dialogVideo);
    dialog.close();
  }

  function update() {
    targetScroll = getScrollDistance();
    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.13);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) {
      smoothScroll = targetScroll;
    }

    const progress = clamp(smoothScroll / 3600);
    const introExit = smoothstep(90, 680, smoothScroll);
    const story = segmentInOut(smoothScroll, 820, 1240, 1740, 2060);
    const method = segmentInOut(smoothScroll, 2050, 2460, 2850, 3120);
    const workRaw = smoothstep(2680, 3320, smoothScroll);
    const workEnter = Math.pow(workRaw, 1.45);
    const workLeave = smoothstep(3440, 3600, smoothScroll);
    const workOpacity = workEnter * (1 - workLeave);
    const contactOpacity = smoothstep(3480, 3600, smoothScroll);

    const bgScale = 1.02 + progress * 0.06 + method.active * 0.015;
    const bgBrightness = 1 - (story.active * 0.1 + method.active * 0.12);
    const bgBlur = (story.active * 0.35 + method.active * 0.5).toFixed(2);

    root.style.setProperty("--bg-scale", bgScale.toFixed(5));
    root.style.setProperty("--bg-brightness", bgBrightness.toFixed(5));
    root.style.setProperty("--bg-saturate", String(1 + method.active * 0.08));
    root.style.setProperty("--bg-blur", `${bgBlur}px`);
    root.style.setProperty("--bg-x", `${(-introExit * 4).toFixed(2)}px`);
    root.style.setProperty("--bg-y", `${(introExit * 18 - progress * 24).toFixed(2)}px`);

    root.style.setProperty("--title-y", `${(introExit * -180).toFixed(2)}px`);
    root.style.setProperty("--title-scale", String(1 - introExit * 0.1));
    root.style.setProperty("--title-opacity", String(1 - introExit));
    root.style.setProperty("--deck-y", `${(introExit * 70).toFixed(2)}px`);
    root.style.setProperty("--deck-opacity", String(1 - introExit));
    root.style.setProperty("--hint-opacity", String(1 - smoothstep(180, 420, smoothScroll)));

    root.style.setProperty("--panel-story-opacity", String(story.active * (1 - method.enter)));
    root.style.setProperty("--panel-story-y", `calc(-50% + ${(-story.exit * 92 + (1 - story.enter) * 58).toFixed(2)}px)`);
    root.style.setProperty("--panel-method-opacity", String(method.active * (1 - workEnter)));
    root.style.setProperty("--panel-method-y", `calc(-50% + ${(-method.exit * 92 + (1 - method.enter) * 58).toFixed(2)}px)`);

    root.style.setProperty("--work-opacity", String(workOpacity));
    root.style.setProperty("--work-visible", workEnter > 0.01 ? "visible" : "hidden");
    root.style.setProperty("--work-x", `${((1 - workEnter) * 46).toFixed(2)}vw`);
    root.style.setProperty("--work-y", `${(workLeave * 90).toFixed(2)}px`);
    root.style.setProperty("--work-rail-visible", workOpacity > 0.01 ? "visible" : "hidden");
    root.style.setProperty("--contact-opacity", String(contactOpacity));
    root.style.setProperty("--chrome-opacity", String(1 - smoothstep(2520, 3160, smoothScroll) * 0.65));

    if (workOpacity > 0.02) primeVisiblePreviews(); const needsAnotherFrame =
      Math.abs(smoothScroll - targetScroll) > 0.08;
    rafPending = false;
    if (needsAnotherFrame) requestTick();
  }

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", () => {
    updateRailShift();
    requestTick();
  });

  const previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector(".project-video");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
        tryPlay(video);
      } else {
        pauseVideo(video);
      }
    });
  }, { threshold: 0.45 });

  function watchPreviews() {
    railCards.forEach((card) => {
      previewObserver.observe(card);
      const previewVideo = card.querySelector(".project-video");
      if (previewVideo) {
        previewVideo.addEventListener("timeupdate", () => {
          if (Number.isFinite(previewVideo.duration) && previewVideo.duration > 15 && previewVideo.currentTime >= 15) {
            previewVideo.currentTime = 0;
          }
        });
      }
      card.addEventListener("pointerenter", () => {
        const video = card.querySelector(".project-video");
        tryPlay(video);
      });
    });
  }

  function primeVisiblePreviews() { if (!railCards.length) return; railCards.forEach((card) => { const rect = card.getBoundingClientRect(); const inView = rect.right > -80 && rect.left < window.innerWidth + 80 && rect.bottom > 0 && rect.top < window.innerHeight; const video = card.querySelector(".project-video"); if (!video) return; if (inView) { tryPlay(video); } else { pauseVideo(video); } }); }

  rail.addEventListener("click", (event) => {
    const card = event.target.closest(".project-card");
    if (card) openProject(card);
  });

  rail.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".project-card");
    if (!card) return;
    event.preventDefault();
    openProject(card);
  });

  if (prevBtn) prevBtn.addEventListener("click", () => moveRail(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => moveRail(1));
  if (closeBtn) closeBtn.addEventListener("click", closeDialog);

  if (dialog) {
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) closeDialog();
    });
  }

  document.addEventListener("pointerdown", startBackground, { once: true });
  window.addEventListener("scroll", startBackground, { once: true, passive: true });

  window.setInterval(() => {
    railCards.forEach((card) => {
      const video = card.querySelector(".project-video");
      const durationNode = card.querySelector(".project-duration");
      if (video && durationNode && durationNode.textContent === "--:--" && Number.isFinite(video.duration) && video.duration > 0) {
        durationNode.textContent = formatDuration(Math.min(video.duration, 15));
      }
    });
    const live = currentLiveLayer;
    if (chromeTime && live) {
      chromeTime.textContent = formatTimecode(live.currentTime);
    }
  }, 80);

  function scrollToHash(hash) {
    const maxScroll = Math.max(0, section.offsetHeight - window.innerHeight);
    const targets = {
      "#reel": 0,
      "#work": Math.min(maxScroll, 3320),
      "#method": Math.min(maxScroll, 2400),
      "#contact": maxScroll,
      "#about": (document.querySelector("#about")?.offsetTop || maxScroll) + 1
    };
    const target = targets[hash];
    if (target === undefined) return false;
    history.replaceState(null, "", hash);
    window.scrollTo({ top: target, behavior: reduceMotion.matches ? "auto" : "smooth" });
    return true;
  }

  document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (scrollToHash(link.getAttribute("href"))) event.preventDefault();
    });
  });

  window.addEventListener("load", () => {
    setupRail();
    watchPreviews();
    requestTick();
    startBackground();
    if (location.hash) setTimeout(() => scrollToHash(location.hash), 80);
  });
})();
