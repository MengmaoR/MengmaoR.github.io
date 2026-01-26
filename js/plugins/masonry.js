export function initMasonry() {
  var loadingPlaceholder = document.querySelector(".loading-placeholder");
  var masonryContainer = document.querySelector("#masonry-container");
  if (!loadingPlaceholder || !masonryContainer) return;

  var images = Array.from(document.querySelectorAll(
    "#masonry-container .masonry-item img",
  ));
  var masonryItems = Array.from(document.querySelectorAll(
    "#masonry-container .masonry-item",
  ));
  var masonry = null;
  var currentDisplayIndex = 0;
  var loadedImages = 0;
  var totalImages = images.length;

  // 计算 baseWidth
  function getBaseWidth() {
    var screenWidth = window.innerWidth;
    if (screenWidth >= 768) {
      return 255;
    } else {
      return 150;
    }
  }

  // 预加载所有图片获取尺寸，然后进行布局
  function preloadAllImages() {
    var baseWidth = getBaseWidth();
    var preloadPromises = [];
    var imageDimensions = []; // 存储每张图片的尺寸信息
    
    // 首先隐藏所有图片（不显示占位图）
    images.forEach(function(img) {
      img.style.visibility = 'hidden';
      img.style.opacity = '0';
    });
    
    images.forEach(function(img, index) {
      var imageSrc = img.getAttribute("data-src") || img.src;
      var masonryItem = masonryItems[index];
      
      // 跳过占位符
      if (!imageSrc || imageSrc.indexOf("loading.svg") !== -1) {
        // 使用默认尺寸
        var defaultHeight = baseWidth * 1.5;
        imageDimensions[index] = {
          width: baseWidth,
          height: defaultHeight, // 默认宽高比 2:3
          item: masonryItem
        };
        if (masonryItem) {
          masonryItem.style.minHeight = defaultHeight + 'px';
        }
        return;
      }

      // 如果图片已经加载，直接使用
      if (img.complete && img.naturalWidth > 0 && img.src === imageSrc) {
        var aspectRatio = img.naturalHeight / img.naturalWidth;
        var displayHeight = baseWidth * aspectRatio;
        imageDimensions[index] = {
          width: baseWidth,
          height: displayHeight,
          item: masonryItem,
          loaded: true
        };
        if (masonryItem) {
          masonryItem.style.minHeight = displayHeight + 'px';
        }
        return;
      }

      // 预加载图片获取尺寸
      var promise = new Promise(function(resolve) {
        var preloadImg = new Image();
        preloadImg.onload = function() {
          // 根据 baseWidth 和图片宽高比计算实际显示高度
          var aspectRatio = preloadImg.height / preloadImg.width;
          var displayHeight = baseWidth * aspectRatio;
          
          // 存储尺寸信息
          imageDimensions[index] = {
            width: baseWidth,
            height: displayHeight,
            item: masonryItem
          };
          
          // 设置占位符高度，确保布局正确（不显示图片，只设置容器高度）
          if (masonryItem) {
            // 设置 masonry-item 的最小高度，确保布局时能正确计算位置
            masonryItem.style.minHeight = displayHeight + 'px';
          }
          
          resolve();
        };
        preloadImg.onerror = function() {
          // 加载失败，使用默认尺寸
          var defaultHeight = baseWidth * 1.5;
          imageDimensions[index] = {
            width: baseWidth,
            height: defaultHeight,
            item: masonryItem
          };
          if (masonryItem) {
            masonryItem.style.minHeight = defaultHeight + 'px';
          }
          resolve();
        };
        preloadImg.src = imageSrc;
      });
      
      preloadPromises.push(promise);
    });

    // 等待所有图片预加载完成
    Promise.all(preloadPromises).then(function() {
      // 所有图片尺寸已获取，进行布局
      initializeMasonryLayout();
      // 开始按顺序显示图片
      startDisplayingImages();
    });
  }

  // 初始化 masonry 布局
  function initializeMasonryLayout() {
    loadingPlaceholder.style.opacity = 0;
    setTimeout(() => {
      loadingPlaceholder.style.display = "none";
      masonryContainer.style.display = "block";
      var baseWidth = getBaseWidth();
      
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

  // 按顺序显示图片（从前往后）
  function startDisplayingImages() {
    if (currentDisplayIndex >= images.length) {
      return;
    }

    var img = images[currentDisplayIndex];
    var imageSrc = img.getAttribute("data-src") || img.src;

    // 如果没有有效的图片源，跳过
    if (!imageSrc || imageSrc.indexOf("loading.svg") !== -1) {
      currentDisplayIndex++;
      startDisplayingImages();
      return;
    }

    // 如果图片已经加载完成（从缓存中），直接显示
    if (img.complete && img.naturalWidth > 0 && img.src === imageSrc) {
      if (img.hasAttribute("lazyload")) {
        img.src = imageSrc;
        img.removeAttribute("lazyload");
        // 显示图片（淡入效果）
        img.style.visibility = "visible";
        img.style.opacity = "1";
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.transition = "opacity 0.3s ease-in";
        
        // 移除 masonry-item 的固定高度
        var masonryItem = masonryItems[currentDisplayIndex];
        if (masonryItem) {
          masonryItem.style.minHeight = "";
        }
      }
      // 布局已经完成，不需要再次布局
      currentDisplayIndex++;
      startDisplayingImages();
      return;
    }

    // 加载并显示图片
    var loadImg = new Image();
    loadImg.onload = function() {
      // 图片加载完成，显示真实图片
      img.src = imageSrc;
      img.removeAttribute("lazyload");
      // 显示图片（淡入效果）
      img.style.visibility = "visible";
      img.style.opacity = "1";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.transition = "opacity 0.3s ease-in";
      
      // 移除 masonry-item 的固定高度，让图片自然撑开
      var masonryItem = masonryItems[currentDisplayIndex];
      if (masonryItem) {
        masonryItem.style.minHeight = "";
      }
      
      // 布局已经完成，不需要再次布局（因为占位符尺寸已经正确）
      
      // 显示下一张
      currentDisplayIndex++;
      startDisplayingImages();
    };
    loadImg.onerror = function() {
      // 加载失败，保持隐藏状态
      img.removeAttribute("lazyload");
      img.style.visibility = "hidden";
      img.style.opacity = "0";
      
      // 移除 masonry-item 的固定高度
      var masonryItem = masonryItems[currentDisplayIndex];
      if (masonryItem) {
        masonryItem.style.minHeight = "";
      }
      
      currentDisplayIndex++;
      startDisplayingImages();
    };
    loadImg.src = imageSrc;
  }

  // 开始预加载所有图片
  if (images.length > 0) {
    preloadAllImages();
  } else {
    // 没有图片，直接显示布局
    initializeMasonryLayout();
  }
}

if (data.masonry) {
  try {
    swup.hooks.on("page:view", initMasonry);
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", initMasonry);
}
