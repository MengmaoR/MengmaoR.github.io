export function initMasonry() {
  var loadingPlaceholder = document.querySelector(".loading-placeholder");
  var masonryContainer = document.querySelector("#masonry-container");
  if (!loadingPlaceholder || !masonryContainer) return;

  var images = Array.from(document.querySelectorAll(
    "#masonry-container .masonry-item img",
  ));
  var masonry = null;
  var currentIndex = 0;

  // 立即显示 masonry 布局（不等待图片加载）
  function initializeMasonryLayout() {
    loadingPlaceholder.style.opacity = 0;
    setTimeout(() => {
      loadingPlaceholder.style.display = "none";
      masonryContainer.style.display = "block";
      var screenWidth = window.innerWidth;
      var baseWidth;
      if (screenWidth >= 768) {
        baseWidth = 255;
      } else {
        baseWidth = 150;
      }
      masonry = new MiniMasonry({
        baseWidth: baseWidth,
        container: masonryContainer,
        gutterX: 10,
        gutterY: 10,
        surroundingGutter: false,
      });
      masonry.layout();
      masonryContainer.style.opacity = 1;
    }, 100);
  }

  // 按顺序加载图片（从前往后）
  function loadNextImage() {
    if (currentIndex >= images.length) {
      return; // 所有图片都已开始加载
    }

    var img = images[currentIndex];
    var imageSrc = img.getAttribute("data-src") || img.src;

    // 如果没有有效的图片源，跳过
    if (!imageSrc || imageSrc.indexOf("loading.svg") !== -1) {
      currentIndex++;
      loadNextImage();
      return;
    }

    // 如果图片已经加载完成（从缓存中），直接显示并加载下一张
    if (img.complete && img.naturalWidth > 0 && img.src === imageSrc) {
      if (img.hasAttribute("lazyload")) {
        img.removeAttribute("lazyload");
      }
      if (masonry) {
        masonry.layout(); // 更新布局
      }
      currentIndex++;
      loadNextImage();
      return;
    }

    // 预加载图片
    var loadImg = new Image();
    loadImg.onload = function() {
      // 图片加载完成，更新显示
      img.src = imageSrc;
      img.removeAttribute("lazyload");
      // 更新 masonry 布局
      if (masonry) {
        masonry.layout();
      }
      // 加载下一张
      currentIndex++;
      loadNextImage();
    };
    loadImg.onerror = function() {
      // 加载失败，移除 lazyload 属性，显示占位符，继续下一张
      img.removeAttribute("lazyload");
      if (masonry) {
        masonry.layout();
      }
      currentIndex++;
      loadNextImage();
    };
    loadImg.src = imageSrc;
  }

  // 立即初始化布局
  initializeMasonryLayout();

  // 开始按顺序加载图片
  if (images.length > 0) {
    loadNextImage();
  }
}

if (data.masonry) {
  try {
    swup.hooks.on("page:view", initMasonry);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", initMasonry);
}
