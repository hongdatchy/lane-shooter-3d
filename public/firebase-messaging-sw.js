// Tự động hủy đăng ký Service Worker cũ còn sót lại trên localhost:3000 từ dự án khác
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.registration.unregister();
});
