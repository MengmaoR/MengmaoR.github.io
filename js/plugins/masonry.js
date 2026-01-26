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

  // 通过读取文件头快速获取图片尺寸（不加载完整图片）
  function getImageDimensionsFromHeader(imageSrc) {
    return new Promise(function(resolve) {
      // 使用 fetch 只获取文件的前 200 字节（足够解析大多数图片格式的头部）
      // 对于 JPEG，可能需要更多字节来找到 SOF 标记
      fetch(imageSrc, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-200'
        }
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to fetch image header');
        }
        return response.arrayBuffer();
      })
      .then(function(buffer) {
        var view = new DataView(buffer);
        var width = 0;
        var height = 0;
        
        // 检查文件格式并解析尺寸
        // WebP 格式
        if (buffer.byteLength >= 30 && 
            view.getUint32(0) === 0x52494646 && // "RIFF"
            view.getUint32(8) === 0x57454250) { // "WEBP"
          // WebP 格式：RIFF [size] WEBP [chunk_type] [chunk_size] [chunk_data]
          var chunkType = view.getUint32(12, true);
          
          // VP8 (lossy) 格式
          if (chunkType === 0x56503820) { // "VP8 "
            // VP8 头部：frame_tag(3) + width(2) + height(2)
            // 注意：VP8 使用 little-endian，且宽度和高度在特定位置
            if (buffer.byteLength >= 30) {
              width = view.getUint16(26, true) & 0x3FFF;
              height = view.getUint16(28, true) & 0x3FFF;
            }
          }
          // VP8L (lossless) 格式
          else if (chunkType === 0x5650384C) { // "VP8L"
            // VP8L 头部：width(14 bits) + height(14 bits) + alpha(1 bit) + version(3 bits)
            if (buffer.byteLength >= 25) {
              var bits = view.getUint32(21, true);
              width = (bits & 0x3FFF) + 1;
              height = ((bits >> 14) & 0x3FFF) + 1;
            }
          }
          // VP8X (extended) 格式
          else if (chunkType === 0x56503858) { // "VP8X"
            // VP8X 头部：flags(1) + reserved(3) + width(3) + height(3)
            // 尺寸存储在 24-29 字节，使用 little-endian
            if (buffer.byteLength >= 30) {
              width = view.getUint8(24) | (view.getUint8(25) << 8) | ((view.getUint8(26) & 0x0F) << 16);
              width = width + 1;
              height = view.getUint8(27) | (view.getUint8(28) << 8) | ((view.getUint8(29) & 0x0F) << 16);
              height = height + 1;
            }
          }
        }
        // JPEG 格式
        else if (buffer.byteLength >= 20 && 
                 view.getUint8(0) === 0xFF && 
                 view.getUint8(1) === 0xD8) {
          // JPEG: 查找 SOF (Start of Frame) 标记
          var offset = 2;
          while (offset < buffer.byteLength - 9) {
            if (view.getUint8(offset) === 0xFF) {
              var marker = view.getUint8(offset + 1);
              // SOF0, SOF1, SOF2 等标记
              if (marker >= 0xC0 && marker <= 0xC3) {
                height = view.getUint16(offset + 5, false);
                width = view.getUint16(offset + 7, false);
                break;
              }
              // 跳过当前段
              var segmentLength = view.getUint16(offset + 2, false);
              offset += 2 + segmentLength;
            } else {
              offset++;
            }
          }
        }
        // PNG 格式
        else if (buffer.byteLength >= 24 &&
                 view.getUint32(0) === 0x89504E47 && // PNG signature
                 view.getUint32(4) === 0x0D0A1A0A) {
          // PNG IHDR chunk: width(4) + height(4)
          width = view.getUint32(16, false);
          height = view.getUint32(20, false);
        }
        
        if (width > 0 && height > 0) {
          resolve({ width: width, height: height });
        } else {
          // 如果解析失败，回退到传统方法
          resolve(null);
        }
      })
      .catch(function(error) {
        // 如果 Range 请求失败（某些服务器不支持），回退到传统方法
        resolve(null);
      });
    });
  }

  // 预加载所有图片获取尺寸，然后进行布局
  function preloadAllImages() {
    var baseWidth = getBaseWidth();
    var preloadPromises = [];
    var imageDimensions = []; // 存储每张图片的尺寸信息
    
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
          img.style.width = '100%';
          img.style.height = defaultHeight + 'px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          var imageContainer = masonryItem.querySelector('.image-container');
          if (imageContainer) {
            imageContainer.style.height = defaultHeight + 'px';
            imageContainer.style.overflow = 'hidden';
          }
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
          img.style.width = '100%';
          img.style.height = displayHeight + 'px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          var imageContainer = masonryItem.querySelector('.image-container');
          if (imageContainer) {
            imageContainer.style.height = displayHeight + 'px';
            imageContainer.style.overflow = 'hidden';
          }
        }
        return;
      }

      // 快速获取图片尺寸（只读取文件头，不加载完整图片）
      var promise = getImageDimensionsFromHeader(imageSrc).then(function(dimensions) {
        if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
          // 成功从文件头获取尺寸
          var aspectRatio = dimensions.height / dimensions.width;
          var displayHeight = baseWidth * aspectRatio;
          return Promise.resolve({ aspectRatio: aspectRatio, displayHeight: displayHeight });
        } else {
          // 如果文件头解析失败，回退到传统方法（加载完整图片）
          return new Promise(function(resolve) {
            var preloadImg = new Image();
            preloadImg.onload = function() {
              var aspectRatio = preloadImg.height / preloadImg.width;
              var displayHeight = baseWidth * aspectRatio;
              resolve({ aspectRatio: aspectRatio, displayHeight: displayHeight });
            };
            preloadImg.onerror = function() {
              // 加载失败，使用默认尺寸
              var displayHeight = baseWidth * 1.5;
              resolve({ aspectRatio: 1.5, displayHeight: displayHeight });
            };
            preloadImg.src = imageSrc;
          });
        }
      }).then(function(result) {
        var displayHeight = result.displayHeight;
        
        // 存储尺寸信息
        imageDimensions[index] = {
          width: baseWidth,
          height: displayHeight,
          item: masonryItem
        };
        
        // 立即设置占位图（loading.svg）的尺寸，确保与真实图片尺寸一致
        if (masonryItem) {
          // 设置 masonry-item 的最小高度，确保布局时能正确计算位置
          masonryItem.style.minHeight = displayHeight + 'px';
          
          // 设置占位图的尺寸，使其与真实图片尺寸完全一致
          // 此时 img.src 还是 loading.svg，但我们要设置它的显示尺寸
          img.style.width = '100%';
          img.style.height = displayHeight + 'px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          
          // 确保 image-container 也有正确的高度
          var imageContainer = masonryItem.querySelector('.image-container');
          if (imageContainer) {
            imageContainer.style.height = displayHeight + 'px';
            imageContainer.style.overflow = 'hidden';
          }
        }
      }).catch(function(error) {
        // 出错时使用默认尺寸
        var defaultHeight = baseWidth * 1.5;
        imageDimensions[index] = {
          width: baseWidth,
          height: defaultHeight,
          item: masonryItem
        };
        if (masonryItem) {
          masonryItem.style.minHeight = defaultHeight + 'px';
          img.style.width = '100%';
          img.style.height = defaultHeight + 'px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          var imageContainer = masonryItem.querySelector('.image-container');
          if (imageContainer) {
            imageContainer.style.height = defaultHeight + 'px';
            imageContainer.style.overflow = 'hidden';
          }
        }
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
        img.style.visibility = "visible";
        // 保持固定尺寸，确保与占位图尺寸一致
        img.style.width = "100%";
        // img.style.height 已经在预加载时设置好了，保持它
        img.style.objectFit = "cover";
        img.style.display = "block";
        
        // 保持 masonry-item 的高度，确保布局稳定
        // 不需要移除 minHeight，因为占位时已经设置了正确的尺寸
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
      // 保持占位时的尺寸设置，确保无缝切换
      img.src = imageSrc;
      img.removeAttribute("lazyload");
      img.style.visibility = "visible";
      // 保持固定尺寸，确保与占位图尺寸一致，避免布局抖动
      // 占位图已经设置了正确的尺寸，真实图片应该使用相同的尺寸
      img.style.width = "100%";
      // 保持高度不变，因为占位时已经根据真实图片的宽高比设置了正确的高度
      // img.style.height 已经在预加载时设置好了，不需要改变
      img.style.objectFit = "cover";
      img.style.display = "block";
      
      // 保持 masonry-item 和 image-container 的高度，确保布局稳定
      // 不需要移除 minHeight，因为占位时已经设置了正确的尺寸
      
      // 布局已经完成，不需要再次布局（因为占位符尺寸已经正确）
      
      // 显示下一张
      currentDisplayIndex++;
      startDisplayingImages();
    };
    loadImg.onerror = function() {
      // 加载失败，移除 lazyload 属性，保持占位符
      img.removeAttribute("lazyload");
      img.style.visibility = "visible";
      // 保持占位时的尺寸设置
      img.style.width = "100%";
      // img.style.height 已经在预加载时设置好了，保持它
      img.style.objectFit = "cover";
      img.style.display = "block";
      
      // 保持 masonry-item 的高度，确保布局稳定
      // 不需要移除 minHeight，因为占位时已经设置了正确的尺寸
      
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
