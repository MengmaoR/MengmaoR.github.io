export function initMasonry() {
  var loadingPlaceholder = document.querySelector(".loading-placeholder");
  var masonryContainer = document.querySelector("#masonry-container");
  if (!loadingPlaceholder || !masonryContainer) return;

  loadingPlaceholder.style.display = "block";
  masonryContainer.style.display = "none";

  var images = document.querySelectorAll(
    "#masonry-container .masonry-item img",
  );
  var loadedCount = 0;
  var totalImages = images.length;
  var hasInitialized = false;

  function onImageLoad() {
    loadedCount++;
    // 检查是否所有图片都已加载
    if (loadedCount === totalImages && !hasInitialized) {
      hasInitialized = true;
      initializeMasonryLayout();
    }
  }

  function checkImage(img) {
    // 如果图片有 lazyload 属性，需要等待 data-src 加载
    if (img.hasAttribute("lazyload")) {
      var dataSrc = img.getAttribute("data-src");
      if (dataSrc) {
        // 创建一个新的 Image 对象来检测真实图片是否加载
        var testImg = new Image();
        testImg.onload = function() {
          onImageLoad();
        };
        testImg.onerror = function() {
          // 即使加载失败也计数，避免一直等待
          onImageLoad();
        };
        testImg.src = dataSrc;
      } else {
        // 没有 data-src，直接计数
        onImageLoad();
      }
    } else {
      // 没有 lazyload，正常检测
      if (img.complete && img.naturalWidth > 0) {
        onImageLoad();
      } else {
        img.addEventListener("load", onImageLoad);
        img.addEventListener("error", onImageLoad); // 加载失败也计数
      }
    }
  }

  // 检查所有图片
  for (var i = 0; i < images.length; i++) {
    checkImage(images[i]);
  }

  // 如果所有图片都已加载（可能从缓存中）
  if (loadedCount === totalImages && !hasInitialized) {
    hasInitialized = true;
    initializeMasonryLayout();
  }

  // 超时保护：如果 10 秒后还没加载完，强制显示
  setTimeout(function() {
    if (!hasInitialized) {
      hasInitialized = true;
      initializeMasonryLayout();
    }
  }, 10000);

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
      var masonry = new MiniMasonry({
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
}

if (data.masonry) {
  try {
    swup.hooks.on("page:view", initMasonry);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", initMasonry);
}
