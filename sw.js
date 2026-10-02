/*
 * eTexnikum Service Worker
 *
 * sw.js связывает сайт с Node.js bot.js.
 */

const API_BASE =
  "http://localhost:3000";

const CACHE_NAME =
  "etexnikum-sw-v2";

// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      (async () => {
        await caches.open(
          CACHE_NAME
        );

        await self.skipWaiting();
      })()
    );
  }
);

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();
      })()
    );
  }
);

// ============================================================
// FETCH
// ============================================================

self.addEventListener(
  "fetch",
  event => {
    const url =
      new URL(
        event.request.url
      );

    // Node.js API пропускаем напрямую.
    if (
      url.origin ===
      new URL(API_BASE).origin
    ) {
      return;
    }

    // Telegram API не перехватываем.
    if (
      url.hostname ===
      "api.telegram.org"
    ) {
      return;
    }

    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    event.respondWith(
      (async () => {
        try {
          const response =
            await fetch(
              event.request
            );

          if (response.ok) {
            const cache =
              await caches.open(
                CACHE_NAME
              );

            await cache.put(
              event.request,
              response.clone()
            );
          }

          return response;
        } catch {
          const cached =
            await caches.match(
              event.request
            );

          if (cached) {
            return cached;
          }

          return new Response(
            "Offline",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8"
              }
            }
          );
        }
      })()
    );
  }
);

// ============================================================
// API
// ============================================================

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",
          ...(options.headers || {})
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Node.js API error"
    );
  }

  return data;
}

// ============================================================
// MESSAGE FROM INDEX.HTML
// ============================================================

self.addEventListener(
  "message",
  event => {
    const data =
      event.data || {};

    // Проверка состояния бота
    if (
      data.type ===
      "BOT_STATUS"
    ) {
      event.waitUntil(
        api(
          "/api/status"
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "BOT_STATUS_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "BOT_STATUS_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Поиск ответа
    if (
      data.type ===
      "ASK_BOT"
    ) {
      event.waitUntil(
        api(
          "/api/ask",
          {
            method: "POST",

            body:
              JSON.stringify({
                question:
                  data.question || ""
              })
          }
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "BOT_ANSWER",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "BOT_ANSWER",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Получение FAQ
    if (
      data.type ===
      "GET_FAQ"
    ) {
      event.waitUntil(
        api(
          "/api/faq"
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "FAQ_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "FAQ_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Отправка сообщения через Telegram
    if (
      data.type ===
      "SEND_TELEGRAM"
    ) {
      event.waitUntil(
        api(
          "/api/send",
          {
            method: "POST",

            body:
              JSON.stringify({
                chatId:
                  data.chatId,

                text:
                  data.text || ""
              })
          }
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "TELEGRAM_SEND_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "TELEGRAM_SEND_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }
  }
);/*
 * eTexnikum Service Worker
 *
 * sw.js связывает сайт с Node.js bot.js.
 */

const API_BASE =
  "http://localhost:3000";

const CACHE_NAME =
  "etexnikum-sw-v2";

// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      (async () => {
        await caches.open(
          CACHE_NAME
        );

        await self.skipWaiting();
      })()
    );
  }
);

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();
      })()
    );
  }
);

// ============================================================
// FETCH
// ============================================================

self.addEventListener(
  "fetch",
  event => {
    const url =
      new URL(
        event.request.url
      );

    // Node.js API пропускаем напрямую.
    if (
      url.origin ===
      new URL(API_BASE).origin
    ) {
      return;
    }

    // Telegram API не перехватываем.
    if (
      url.hostname ===
      "api.telegram.org"
    ) {
      return;
    }

    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    event.respondWith(
      (async () => {
        try {
          const response =
            await fetch(
              event.request
            );

          if (response.ok) {
            const cache =
              await caches.open(
                CACHE_NAME
              );

            await cache.put(
              event.request,
              response.clone()
            );
          }

          return response;
        } catch {
          const cached =
            await caches.match(
              event.request
            );

          if (cached) {
            return cached;
          }

          return new Response(
            "Offline",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8"
              }
            }
          );
        }
      })()
    );
  }
);

// ============================================================
// API
// ============================================================

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",
          ...(options.headers || {})
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Node.js API error"
    );
  }

  return data;
}

// ============================================================
// MESSAGE FROM INDEX.HTML
// ============================================================

self.addEventListener(
  "message",
  event => {
    const data =
      event.data || {};

    // Проверка состояния бота
    if (
      data.type ===
      "BOT_STATUS"
    ) {
      event.waitUntil(
        api(
          "/api/status"
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "BOT_STATUS_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "BOT_STATUS_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Поиск ответа
    if (
      data.type ===
      "ASK_BOT"
    ) {
      event.waitUntil(
        api(
          "/api/ask",
          {
            method: "POST",

            body:
              JSON.stringify({
                question:
                  data.question || ""
              })
          }
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "BOT_ANSWER",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "BOT_ANSWER",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Получение FAQ
    if (
      data.type ===
      "GET_FAQ"
    ) {
      event.waitUntil(
        api(
          "/api/faq"
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "FAQ_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "FAQ_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }

    // Отправка сообщения через Telegram
    if (
      data.type ===
      "SEND_TELEGRAM"
    ) {
      event.waitUntil(
        api(
          "/api/send",
          {
            method: "POST",

            body:
              JSON.stringify({
                chatId:
                  data.chatId,

                text:
                  data.text || ""
              })
          }
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "TELEGRAM_SEND_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "TELEGRAM_SEND_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );

      return;
    }
  }
):
