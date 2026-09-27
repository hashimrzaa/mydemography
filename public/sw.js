/* Kharcha service worker — sirf push notifications ke liye. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Aaj ka kharcha 💸";
  const options = {
    body: data.body || "Tap karke aaj ka kharcha add karo.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "daily-reminder",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/?add=1" },
    actions: [{ action: "add", title: "Kharcha add karo" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/?add=1";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
