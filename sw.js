/*
 * eTexnikum / Telegram Answer Bot — ONE FILE
 * File: sw.js
 *
 * ВАЖНО:
 * Service Worker не может надёжно работать как постоянный Telegram-бот:
 * браузер может остановить Service Worker, поэтому getUpdates через него
 * не является постоянным серверным процессом.
 *
 * Этот файл содержит всю логику без main.py и bot.db:
 * - FAQ хранится в Cache Storage
 * - Telegram Bot API вызывается напрямую
 * - inline-кнопки
 * - custom/premium emoji
 * - ответы на вопросы
 * - профиль/статистика в Cache Storage
 *
 * Перед использованием укажи BOT_TOKEN.
 */

const BOT_TOKEN = "8955872735:AAFWCOAF6Fhk_tCIGkW5Uz2exwvxyA0R12Q";

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CACHE_NAME = "answer-bot-data-v1";
const FAQ_KEY = "/__faq__";
const USERS_KEY = "/__users__";

const CUSTOM_EMOJI = {
  bot: "5359289009389628379",
  question: "5368324172331521012",
  star: "5368324172331521014",
  fire: "5368324172331521016",
  info: "5368324172331521018",
  heart: "5368324172331521020"
};

// Начальные вопросы
const DEFAULT_FAQ = [
  {
    id: 1,
    question: "Что такое eTexnikum?",
    keywords: ["etexnikum", "техникум", "что это"],
    answer:
      "eTexnikum — учебная система для общения, профилей, групп, сообщений и других функций техникума."
  },
  {
    id: 2,
    question: "Как войти в аккаунт?",
    keywords: ["войти", "вход", "логин", "пароль"],
    answer:
      "Откройте страницу eTexnikum и войдите с помощью выданного логина и пароля."
  },
  {
    id: 3,
    question: "Как изменить аватар?",
    keywords: ["аватар", "фото", "фотографию", "профиль"],
    answer:
      "Откройте профиль и выберите изменение фотографии профиля."
  },
  {
    id: 4,
    question: "Как написать учителю?",
    keywords: ["учитель", "преподаватель", "написать учителю"],
    answer:
      "Откройте профиль учителя или чат с ним и отправьте сообщение, если у вас есть соответствующие права."
  },
  {
    id: 5,
    question: "Что делать, если забыл пароль?",
    keywords: ["забыл пароль", "восстановить пароль", "пароль"],
    answer:
      "Обратитесь к администратору системы для восстановления доступа."
  }
];

function emoji(id, fallback = "") {
  if (!id) return fallback;

  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function tgButton(text, callbackData, emojiId = null) {
  const button = {
    text,
    callback_data: callbackData
  };

  if (emojiId) {
    button.icon_custom_emoji_id = emojiId;
  }

  return button;
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        tgButton(
          "❓ Задать вопрос",
          "ask",
          CUSTOM_EMOJI.question
        ),
        tgButton(
          "🔥 Популярное",
          "popular",
          CUSTOM_EMOJI.fire
        )
      ],
      [
        tgButton(
          "⭐ Избранное",
          "favorites",
          CUSTOM_EMOJI.star
        ),
        tgButton(
          "👤 Профиль",
          "profile",
          CUSTOM_EMOJI.info
        )
      ],
      [
        tgButton(
          "ℹ️ Помощь",
          "help",
          CUSTOM_EMOJI.info
        )
      ]
    ]
  };
}

function popularKeyboard() {
  return {
    inline_keyboard: [
      ...DEFAULT_FAQ.slice(0, 5).map(item => [
        tgButton(
          item.question,
          `faq:${item.id}`,
          CUSTOM_EMOJI.question
        )
      ]),
      [
        tgButton(
          "⬅️ Назад",
          "home"
        )
      ]
    ]
  };
}

function helpKeyboard() {
  return {
    inline_keyboard: [
      [
        tgButton(
          "❓ Популярные вопросы",
          "popular",
          CUSTOM_EMOJI.question
        )
      ],
      [
        tgButton(
          "👤 Профиль",
          "profile",
          CUSTOM_EMOJI.info
        )
      ],
      [
        tgButton(
          "⬅️ Назад",
          "home"
        )
      ]
    ]
  };
}

async function telegram(method, body = {}) {
  if (
    !BOT_TOKEN ||
    BOT_TOKEN.includes("PASTE_YOUR")
  ) {
    throw new Error(
      "BOT_TOKEN не указан в sw.js"
    );
  }

  const response = await fetch(
    `${API}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      data.description ||
      "Telegram API error"
    );
  }

  return data.result;
}

async function sendMessage(
  chatId,
  text,
  extra = {}
) {
  return telegram(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...extra
    }
  );
}

async function editMessage(
  chatId,
  messageId,
  text,
  extra = {}
) {
  return telegram(
    "editMessageText",
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...extra
    }
  );
}

async function answerCallback(
  callbackId,
  text = ""
) {
  return telegram(
    "answerCallbackQuery",
    {
      callback_query_id: callbackId,
      text
    }
  );
}

async function getData(
  key,
  fallback
) {
  const cache =
    await caches.open(CACHE_NAME);

  const response =
    await cache.match(key);

  if (!response) {
    return fallback;
  }

  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

async function setData(
  key,
  data
) {
  const cache =
    await caches.open(CACHE_NAME);

  await cache.put(
    key,
    new Response(
      JSON.stringify(data),
      {
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    )
  );
}

async function getFAQ() {
  const faq =
    await getData(
      FAQ_KEY,
      null
    );

  if (
    Array.isArray(faq) &&
    faq.length
  ) {
    return faq;
  }

  await setData(
    FAQ_KEY,
    DEFAULT_FAQ
  );

  return DEFAULT_FAQ;
}

async function getUsers() {
  return getData(
    USERS_KEY,
    {}
  );
}

async function saveUser(user) {
  const users =
    await getUsers();

  const id =
    String(user.id);

  if (!users[id]) {
    users[id] = {
      id: user.id,
      first_name:
        user.first_name || "",
      username:
        user.username || "",
      questions: 0,
      favorites: [],
      joined:
        new Date().toISOString()
    };
  } else {
    users[id].first_name =
      user.first_name ||
      users[id].first_name;

    users[id].username =
      user.username ||
      users[id].username;
  }

  await setData(
    USERS_KEY,
    users
  );

  return users[id];
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

async function findAnswers(
  question
) {
  const faq =
    await getFAQ();

  const q =
    normalize(question);

  if (!q) {
    return [];
  }

  const words =
    q.split(" ")
      .filter(Boolean);

  const scored =
    faq.map(item => {
      const haystack =
        normalize(
          `${item.question} ${
            (item.keywords || [])
              .join(" ")
          } ${item.answer}`
        );

      let score = 0;

      if (
        haystack.includes(q)
      ) {
        score += 20;
      }

      for (
        const word of words
      ) {
        if (
          word.length >= 3 &&
          haystack.includes(word)
        ) {
          score += 2;
        }
      }

      return {
        item,
        score
      };
    });

  return scored
    .filter(
      x => x.score > 0
    )
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 3)
    .map(x => x.item);
}

async function registerQuestion(
  user
) {
  const users =
    await getUsers();

  const id =
    String(user.id);

  if (!users[id]) {
    await saveUser(user);
    return;
  }

  users[id].questions =
    Number(
      users[id].questions || 0
    ) + 1;

  await setData(
    USERS_KEY,
    users
  );
}

async function answerQuestion(
  chatId,
  user,
  question
) {
  const clean =
    String(question || "")
      .trim();

  if (!clean) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.question,
        "❓"
      )} Напишите вопрос обычным сообщением.`,
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return;
  }

  await registerQuestion(
    user
  );

  const answers =
    await findAnswers(
      clean
    );

  if (!answers.length) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.info,
        "ℹ️"
      )} Я пока не нашёл точного ответа.\n\n` +
      `Попробуйте переформулировать вопрос или выберите раздел FAQ.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              tgButton(
                "🔥 Популярные вопросы",
                "popular",
                CUSTOM_EMOJI.fire
              )
            ],
            [
              tgButton(
                "⬅️ Главное меню",
                "home"
              )
            ]
          ]
        }
      }
    );

    return;
  }

  const first =
    answers[0];

  let text =
    `${emoji(
      CUSTOM_EMOJI.bot,
      "🤖"
    )} <b>${esc(
      first.question
    )}</b>\n\n` +
    esc(first.answer);

  if (
    answers.length > 1
  ) {
    text +=
      `\n\n${emoji(
        CUSTOM_EMOJI.question,
        "❓"
      )} <b>Похожие вопросы:</b>`;
  }

  const keyboard = {
    inline_keyboard: [
      [
        tgButton(
          "⭐ В избранное",
          `fav:${first.id}`,
          CUSTOM_EMOJI.star
        )
      ],
      ...answers
        .slice(1)
        .map(item => [
          tgButton(
            item.question,
            `faq:${item.id}`,
            CUSTOM_EMOJI.question
          )
        ]),
      [
        tgButton(
          "⬅️ Главное меню",
          "home"
        )
      ]
    ]
  };

  await sendMessage(
    chatId,
    text,
    {
      reply_markup:
        keyboard
    }
  );
}

async function showFAQ(
  chatId,
  id
) {
  const faq =
    await getFAQ();

  const item =
    faq.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  if (!item) {
    await sendMessage(
      chatId,
      "Вопрос не найден.",
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return;
  }

  await sendMessage(
    chatId,
    `${emoji(
      CUSTOM_EMOJI.question,
      "❓"
    )} <b>${esc(
      item.question
    )}</b>\n\n${esc(
      item.answer
    )}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            tgButton(
              "⭐ В избранное",
              `fav:${item.id}`,
              CUSTOM_EMOJI.star
            )
          ],
          [
            tgButton(
              "🔥 Другие вопросы",
              "popular",
              CUSTOM_EMOJI.fire
            )
          ],
          [
            tgButton(
              "⬅️ Назад",
              "home"
            )
          ]
        ]
      }
    }
  );
}

async function toggleFavorite(
  userId,
  faqId
) {
  const users =
    await getUsers();

  const id =
    String(userId);

  if (!users[id]) {
    users[id] = {
      id: userId,
      first_name: "",
      username: "",
      questions: 0,
      favorites: [],
      joined:
        new Date().toISOString()
    };
  }

  users[id].favorites ||=
    [];

  const index =
    users[id]
      .favorites
      .indexOf(
        Number(faqId)
      );

  if (index >= 0) {
    users[id]
      .favorites
      .splice(index, 1);
  } else {
    users[id]
      .favorites
      .push(
        Number(faqId)
      );
  }

  await setData(
    USERS_KEY,
    users
  );

  return index < 0;
}

async function showFavorites(
  chatId,
  userId
) {
  const users =
    await getUsers();

  const user =
    users[
      String(userId)
    ];

  if (
    !user ||
    !user.favorites?.length
  ) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.star,
        "⭐"
      )} У вас пока нет избранных вопросов.`,
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return;
  }

  const faq =
    await getFAQ();

  const buttons =
    user.favorites
      .map(id =>
        faq.find(
          x =>
            Number(x.id) ===
            Number(id)
        )
      )
      .filter(Boolean)
      .map(item => [
        tgButton(
          item.question,
          `faq:${item.id}`,
          CUSTOM_EMOJI.question
        )
      ]);

  buttons.push([
    tgButton(
      "⬅️ Назад",
      "home"
    )
  ]);

  await sendMessage(
    chatId,
    `${emoji(
      CUSTOM_EMOJI.star,
      "⭐"
    )} <b>Избранные вопросы</b>`,
    {
      reply_markup: {
        inline_keyboard:
          buttons
      }
    }
  );
}

async function showProfile(
  chatId,
  user
) {
  const users =
    await getUsers();

  const data =
    users[
      String(user.id)
    ] || {
      questions: 0,
      favorites: []
    };

  const name =
    user.first_name ||
    data.first_name ||
    "Пользователь";

  const username =
    user.username
      ? `@${user.username}`
      : "нет";

  await sendMessage(
    chatId,
    `${emoji(
      CUSTOM_EMOJI.info,
      "👤"
    )} <b>Профиль</b>\n\n` +
    `Имя: <b>${esc(
      name
    )}</b>\n` +
    `Username: <b>${esc(
      username
    )}</b>\n` +
    `ID: <code>${user.id}</code>\n` +
    `Вопросов: <b>${Number(
      data.questions || 0
    )}</b>\n` +
    `Избранных: <b>${
      (data.favorites || [])
        .length
    }</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            tgButton(
              "⭐ Избранное",
              "favorites",
              CUSTOM_EMOJI.star
            )
          ],
          [
            tgButton(
              "⬅️ Назад",
              "home"
            )
          ]
        ]
      }
    }
  );
}

async function handleCommand(
  message
) {
  const chatId =
    message.chat.id;

  const user =
    message.from;

  const text =
    message.text || "";

  await saveUser(user);

  if (
    text.startsWith(
      "/start"
    )
  ) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.bot,
        "🤖"
      )} <b>Привет, ${
        esc(
          user.first_name ||
          "друг"
        )
      }!</b>\n\n` +
      `Я бот-ответчик. Задайте вопрос или выберите раздел ниже.`,
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return true;
  }

  if (
    text === "/help"
  ) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.info,
        "ℹ️"
      )} <b>Помощь</b>\n\n` +
      `Просто напишите вопрос. Я попробую найти подходящий ответ в FAQ.`,
      {
        reply_markup:
          helpKeyboard()
      }
    );

    return true;
  }

  if (
    text === "/faq"
  ) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.fire,
        "🔥"
      )} <b>Популярные вопросы</b>`,
      {
        reply_markup:
          popularKeyboard()
      }
    );

    return true;
  }

  return false;
}

async function handleCallback(
  query
) {
  const chatId =
    query.message?.chat?.id;

  const messageId =
    query.message?.message_id;

  const data =
    query.data || "";

  const user =
    query.from;

  await answerCallback(
    query.id
  );

  if (!chatId) return;

  if (
    data === "home"
  ) {
    await editMessage(
      chatId,
      messageId,
      `${emoji(
        CUSTOM_EMOJI.bot,
        "🤖"
      )} <b>Главное меню</b>\n\nВыберите действие:`,
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return;
  }

  if (
    data === "ask"
  ) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.question,
        "❓"
      )} <b>Задайте вопрос</b>\n\nНапишите его следующим сообщением.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              tgButton(
                "⬅️ Назад",
                "home"
              )
            ]
          ]
        }
      }
    );

    return;
  }

  if (
    data === "popular"
  ) {
    await editMessage(
      chatId,
      messageId,
      `${emoji(
        CUSTOM_EMOJI.fire,
        "🔥"
      )} <b>Популярные вопросы</b>`,
      {
        reply_markup:
          popularKeyboard()
      }
    );

    return;
  }

  if (
    data === "favorites"
  ) {
    await showFavorites(
      chatId,
      user.id
    );

    return;
  }

  if (
    data === "profile"
  ) {
    await showProfile(
      chatId,
      user
    );

    return;
  }

  if (
    data === "help"
  ) {
    await editMessage(
      chatId,
      messageId,
      `${emoji(
        CUSTOM_EMOJI.info,
        "ℹ️"
      )} <b>Помощь</b>\n\n` +
      `Напишите вопрос обычным сообщением, а я попробую найти ответ в базе FAQ.`,
      {
        reply_markup:
          helpKeyboard()
      }
    );

    return;
  }

  if (
    data.startsWith(
      "faq:"
    )
  ) {
    await showFAQ(
      chatId,
      Number(
        data.slice(4)
      )
    );

    return;
  }

  if (
    data.startsWith(
      "fav:"
    )
  ) {
    const id =
      Number(
        data.slice(4)
      );

    const added =
      await toggleFavorite(
        user.id,
        id
      );

    await sendMessage(
      chatId,
      added
        ? `${emoji(
            CUSTOM_EMOJI.star,
            "⭐"
          )} Добавлено в избранное.`
        : `${emoji(
            CUSTOM_EMOJI.star,
            "⭐"
          )} Удалено из избранного.`,
      {
        reply_markup:
          mainKeyboard()
      }
    );
  }
}

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      (async () => {
        await setData(
          FAQ_KEY,
          DEFAULT_FAQ
        );

        await setData(
          USERS_KEY,
          {}
        );

        await self.skipWaiting();
      })()
    );
  }
);

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      self.clients.claim()
    );
  }
);

self.addEventListener(
  "fetch",
  event => {
    const url =
      new URL(
        event.request.url
      );

    if (
      url.hostname ===
      "api.telegram.org"
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

          if (
            event.request.method ===
            "GET"
          ) {
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

self.addEventListener(
  "message",
  event => {
    const data =
      event.data || {};

    if (
      data.type ===
      "TELEGRAM_SEND"
    ) {
      event.waitUntil(
        sendMessage(
          data.chatId,
          String(
            data.text || ""
          )
        )
          .then(result => {
            event.source?.postMessage({
              type:
                "TELEGRAM_RESULT",
              ok: true,
              result
            });
          })
          .catch(error => {
            event.source?.postMessage({
              type:
                "TELEGRAM_RESULT",
              ok: false,
              error:
                error.message
            });
          })
      );
    }

    if (
      data.type ===
      "FAQ_SEARCH"
    ) {
      event.waitUntil(
        findAnswers(
          data.question
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
    }
  }
);

/*
 * ВАЖНО:
 *
 * Этот sw.js может обращаться к Telegram Bot API,
 * но Telegram не сможет использовать Service Worker
 * как постоянный webhook/getUpdates сервер.
 *
 * Для полноценного автономного Telegram-бота нужен
 * серверный runtime: Node.js, Deno, Cloudflare Worker,
 * Python и т.п.
 */
