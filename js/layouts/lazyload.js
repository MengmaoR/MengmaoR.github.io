export default function initLazyLoad() {
  // 排除 masonry 页面的图片，由 masonry.js 自己处理
  const imgs = document.querySelectorAll("img:not(#masonry-container img)");
  const options = {
    rootMargin: "0px",
    threshold: 0.1,
  };
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.getAttribute("data-src");
        img.removeAttribute("lazyload");
        observer.unobserve(img);
      }
    });
  }, options);
  imgs.forEach((img) => {
    if (img.hasAttribute("lazyload")) {
      observer.observe(img);
    }
  });
}
