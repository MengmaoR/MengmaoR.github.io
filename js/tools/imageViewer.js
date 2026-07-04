let imageViewerApi = null;
let skipFullscreenChange = false;

export function getImageViewerApi() {
  return imageViewerApi;
}

export default function imageViewer() {
  let isBigImage = false;
  let scale = 1;
  let isMouseDown = false;
  let dragged = false;
  let currentImgIndex = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let translateX = 0;
  let translateY = 0;
  let slideshowTimer = null;
  let slideshowInterval = 5000;
  let slideshowEnteredFullscreen = false;
  let slideshowOrder = null;
  let slideshowOrderIndex = 0;
  let slideshowMode = null;

  const maskDom = document.querySelector(".image-viewer-container");
  if (!maskDom) {
    imageViewerApi = null;
    return null;
  }

  const targetImg = maskDom.querySelector("img");

  const showHandle = (isShow) => {
    document.body.style.overflow = isShow ? "hidden" : "auto";
    isShow
      ? maskDom.classList.add("active")
      : maskDom.classList.remove("active");
  };

  const resetTransform = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    targetImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  const getMasonryImageIndices = () => {
    const imgDoms = document.querySelectorAll("#masonry-container .masonry-item img");
    return Array.from({ length: imgDoms.length }, (_, index) => index);
  };

  const buildSequentialOrder = (count) => {
    return Array.from({ length: count }, (_, index) => index);
  };

  const shuffleOrder = (count) => {
    const order = buildSequentialOrder(count);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = order[i];
      order[i] = order[j];
      order[j] = temp;
    }
    return order;
  };

  const setSlideshowButtonState = () => {
    const slideshowBtn = document.getElementById("masonry-slideshow-btn");
    const shuffleBtn = document.getElementById("masonry-shuffle-btn");

    if (slideshowBtn) {
      const isActive = slideshowMode === "sequential";
      slideshowBtn.classList.toggle("is-active", isActive);
      slideshowBtn.setAttribute(
        "aria-label",
        isActive ? "Stop slideshow" : "Start slideshow",
      );
    }

    if (shuffleBtn) {
      const isActive = slideshowMode === "shuffle";
      shuffleBtn.classList.toggle("is-active", isActive);
      shuffleBtn.setAttribute(
        "aria-label",
        isActive ? "Stop random slideshow" : "Start random slideshow",
      );
    }
  };

  const setSlideshowMode = (enabled) => {
    maskDom.classList.toggle("slideshow-mode", enabled);
  };

  const goToNextInSlideshow = () => {
    if (!slideshowOrder || !slideshowOrder.length) {
      return;
    }

    slideshowOrderIndex = (slideshowOrderIndex + 1) % slideshowOrder.length;
    showImageAtIndex(slideshowOrder[slideshowOrderIndex]);
  };

  const enterSlideshowFullscreen = () => {
    const root = document.documentElement;
    const requestFullscreen =
      root.requestFullscreen ||
      root.webkitRequestFullscreen ||
      root.msRequestFullscreen;

    if (!requestFullscreen || document.fullscreenElement) {
      return;
    }

    slideshowEnteredFullscreen = true;
    Promise.resolve(requestFullscreen.call(root)).catch(() => {
      slideshowEnteredFullscreen = false;
    });
  };

  const exitSlideshowFullscreen = () => {
    const exitFullscreen =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.msExitFullscreen;

    if (!document.fullscreenElement) {
      slideshowEnteredFullscreen = false;
      return;
    }

    if (!exitFullscreen) {
      slideshowEnteredFullscreen = false;
      return;
    }

    skipFullscreenChange = true;
    Promise.resolve(exitFullscreen.call(document))
      .catch(() => {})
      .finally(() => {
        skipFullscreenChange = false;
        slideshowEnteredFullscreen = false;
      });
  };

  const handleFullscreenChange = () => {
    if (skipFullscreenChange || document.fullscreenElement) {
      return;
    }

    if (slideshowTimer) {
      stopSlideshow({ exitFullscreen: false });
      closeViewer({ exitFullscreen: false });
    } else {
      slideshowEnteredFullscreen = false;
    }
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  const stopSlideshow = (options = {}) => {
    const { exitFullscreen = true } = options;

    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }

    setSlideshowMode(false);
    slideshowOrder = null;
    slideshowOrderIndex = 0;
    slideshowMode = null;

    if (exitFullscreen && document.fullscreenElement) {
      exitSlideshowFullscreen();
    }

    setSlideshowButtonState();
  };

  const showImageAtIndex = (index, options = {}) => {
    const { openIfClosed = true } = options;
    const imgDoms = document.querySelectorAll(
      ".markdown-body img, .masonry-item img, #shuoshuo-content img",
    );

    if (!imgDoms.length || index < 0 || index >= imgDoms.length) {
      return;
    }

    currentImgIndex = index;
    const currentImg = imgDoms[currentImgIndex];
    let newSrc = currentImg.src;

    if (currentImg.hasAttribute("lazyload")) {
      newSrc = currentImg.getAttribute("data-src");
      currentImg.src = newSrc;
      currentImg.removeAttribute("lazyload");
    }

    if (!isBigImage && openIfClosed) {
      isBigImage = true;
      showHandle(true);
      document.addEventListener("keydown", escapeKeyListener);
    }

    if (maskDom.classList.contains("slideshow-mode")) {
      resetTransform();
    }

    targetImg.src = newSrc;
  };

  const goToNextImage = () => {
    const imgDoms = document.querySelectorAll(
      ".markdown-body img, .masonry-item img, #shuoshuo-content img",
    );
    if (!imgDoms.length) return;
    showImageAtIndex((currentImgIndex + 1) % imgDoms.length);
  };

  const goToPrevImage = () => {
    const imgDoms = document.querySelectorAll(
      ".markdown-body img, .masonry-item img, #shuoshuo-content img",
    );
    if (!imgDoms.length) return;
    showImageAtIndex(
      (currentImgIndex - 1 + imgDoms.length) % imgDoms.length,
    );
  };

  const closeViewer = (options = {}) => {
    const { exitFullscreen = true } = options;

    stopSlideshow({ exitFullscreen });
    isBigImage = false;
    showHandle(false);
    resetTransform();
    document.removeEventListener("keydown", escapeKeyListener);
  };

  const startSlideshowWithOrder = (intervalMs, order, mode) => {
    const imgDoms = document.querySelectorAll("#masonry-container .masonry-item img");
    if (!imgDoms.length || !order.length) {
      return;
    }

    stopSlideshow();
    slideshowInterval =
      typeof intervalMs === "number" && intervalMs > 0
        ? intervalMs
        : slideshowInterval;
    slideshowOrder = order;
    slideshowOrderIndex = 0;
    slideshowMode = mode;

    setSlideshowButtonState();
    setSlideshowMode(true);
    resetTransform();
    showImageAtIndex(slideshowOrder[0]);
    enterSlideshowFullscreen();
    slideshowTimer = setInterval(() => {
      if (isBigImage) {
        goToNextInSlideshow();
      } else {
        stopSlideshow();
      }
    }, slideshowInterval);
  };

  const startSlideshow = (intervalMs) => {
    const indices = getMasonryImageIndices();
    if (!indices.length) {
      return;
    }

    startSlideshowWithOrder(intervalMs, buildSequentialOrder(indices.length), "sequential");
  };

  const startShuffleSlideshow = (intervalMs) => {
    const indices = getMasonryImageIndices();
    if (!indices.length) {
      return;
    }

    startSlideshowWithOrder(intervalMs, shuffleOrder(indices.length), "shuffle");
  };

  const zoomHandle = (event) => {
    event.preventDefault();
    const rect = targetImg.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const dx = offsetX - rect.width / 2;
    const dy = offsetY - rect.height / 2;
    const oldScale = scale;
    scale += event.deltaY * -0.001;
    scale = Math.min(Math.max(0.8, scale), 4);

    if (oldScale < scale) {
      translateX -= dx * (scale - oldScale);
      translateY -= dy * (scale - oldScale);
    } else {
      translateX = 0;
      translateY = 0;
    }

    targetImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  const dragStartHandle = (event) => {
    event.preventDefault();
    isMouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    targetImg.style.cursor = "grabbing";
  };

  let lastTime = 0;
  const throttle = 100;

  const dragHandle = (event) => {
    if (isMouseDown) {
      const currentTime = new Date().getTime();
      if (currentTime - lastTime < throttle) {
        return;
      }
      lastTime = currentTime;
      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;
      translateX += deltaX;
      translateY += deltaY;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      targetImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      dragged = true;
    }
  };

  const dragEndHandle = (event) => {
    if (isMouseDown) {
      event.stopPropagation();
    }
    isMouseDown = false;
    targetImg.style.cursor = "grab";
  };

  targetImg.addEventListener("wheel", zoomHandle, { passive: false });
  targetImg.addEventListener("mousedown", dragStartHandle, { passive: false });
  targetImg.addEventListener("mousemove", dragHandle, { passive: false });
  targetImg.addEventListener("mouseup", dragEndHandle, { passive: false });
  targetImg.addEventListener("mouseleave", dragEndHandle, { passive: false });

  maskDom.addEventListener("click", (event) => {
    if (!dragged) {
      closeViewer();
    }
    dragged = false;
  });

  const imgDoms = document.querySelectorAll(
    ".markdown-body img, .masonry-item img, #shuoshuo-content img",
  );

  const escapeKeyListener = (event) => {
    if (event.key === "Escape" && isBigImage) {
      closeViewer();
    }
  };

  imgDoms.forEach((img, index) => {
    img.addEventListener("click", () => {
      stopSlideshow();
      showImageAtIndex(index);
    });
  });

  const handleArrowKeys = (event) => {
    if (!isBigImage) return;

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      goToPrevImage();
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      goToNextImage();
    } else {
      return;
    }
  };

  document.addEventListener("keydown", handleArrowKeys);

  if (!imgDoms.length && maskDom) {
    maskDom.parentNode.removeChild(maskDom);
    imageViewerApi = null;
    return null;
  }

  imageViewerApi = {
    showImageAtIndex,
    goToNextImage,
    goToPrevImage,
    startSlideshow,
    startShuffleSlideshow,
    stopSlideshow,
    isSlideshowActive: () => Boolean(slideshowTimer),
    getSlideshowMode: () => slideshowMode,
  };

  return imageViewerApi;
}
