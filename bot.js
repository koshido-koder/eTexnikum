/*
 * TELEGRAM ANSWER BOT
 * Node.js
 *
 * Запуск:
 *   node bot.js
 *
 * Всё находится в этом одном файле:
 * - Telegram bot
 * - inline-кнопки
 * - FAQ
 * - профиль
 * - избранное
 * - custom emoji
 * - HTTP API для sw.js
 */

const http = require("http");

const BOT_TOKEN = "8955872735:AAFWCOAF6Fhk_tCIGkW5Uz2exwvxyA0R12Q";

// ID администраторов
const ADMIN_IDS = [
  // 123456789
];

const PORT = 3000;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ============================================================
// CUSTOM / PREMIUM EMOJI
// ============================================================

const CUSTOM_EMOJI = {
  bot: "5359289009389628379",
  question: "5368324172331521012",
  star: "5368324172331521014",
  fire: "5368324172331521016",
  info: "5368324172331521018",
  heart: "5368324172331521020"
};

function emoji(id, fallback = "") {
  return id
    ? `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`
    : fallback;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ============================================================
// FAQ
// ============================================================

const FAQ = [
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
      "Откройте eTexnikum и войдите с помощью выданного логина и пароля."
  },
  {
    id: 3,
    question: "Как изменить аватар?",
    keywords: ["аватар", "фото", "фотографию", "профиль"],
    answer:
      "Откройте свой профиль и выберите изменение фотографии профиля."
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
      "Обратитесь к администратору eTexnikum для восстановления доступа."
  },
  {
    id: 6,
    question: "Как добавить участника в группу?",
    keywords: ["добавить", "участник", "группа"],
    answer:
      "Откройте нужную группу и используйте функцию добавления участника. Доступность функции зависит от вашей роли."
  },
  {
    id: 7,
    question: "Что такое Face ID?",
    keywords: ["face id", "лицо", "камера", "биометрия"],
    answer:
      "Face ID в eTexnikum используется для дополнительной идентификации пользователя через камеру устройства."
  }
];

// ============================================================
// ДАННЫЕ В ПАМЯТИ
// ============================================================

const users = new Map();
const favorites = new Map();

function getUser(user) {
  const id = Number(user.id);

  if (!users.has(id)) {
    users.set(id, {
      id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      username: user.username || "",
      questions: 0,
      joinedAt: Date.now()
    });
  } else {
    const old = users.get(id);

    old.firstName =
      user.first_name || old.firstName;

    old.lastName =
      user.last_name || old.lastName;

    old.username =
      user.username || old.username;
  }

  return users.get(id);
}

function getFavorites(userId) {
  if (!favorites.has(Number(userId))) {
    favorites.set(
      Number(userId),
      new Set()
    );
  }

  return favorites.get(Number(userId));
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(
    Number(userId)
  );
}

// ============================================================
// TELEGRAM API
// ============================================================

async function telegram(
  method,
  body = {}
) {
  if (
    !BOT_TOKEN ||
    BOT_TOKEN.includes(
      "PASTE_YOUR"
    )
  ) {
    throw new Error(
      "Укажи BOT_TOKEN в bot.js"
    );
  }

  const response =
    await fetch(
      `${API}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(body)
      }
    );

  const data =
    await response.json();

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
      callback_query_id:
        callbackId,
      text
    }
  );
}

// ============================================================
// INLINE BUTTONS
// ============================================================

function button(
  text,
  callbackData,
  emojiId = null
) {
  const result = {
    text,
    callback_data:
      callbackData
  };

  if (emojiId) {
    result.icon_custom_emoji_id =
      emojiId;
  }

  return result;
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        button(
          "❓ Задать вопрос",
          "ask",
          CUSTOM_EMOJI.question
        ),
        button(
          "🔥 Популярное",
          "popular",
          CUSTOM_EMOJI.fire
        )
      ],
      [
        button(
          "⭐ Избранное",
          "favorites",
          CUSTOM_EMOJI.star
        ),
        button(
          "👤 Профиль",
          "profile",
          CUSTOM_EMOJI.info
        )
      ],
      [
        button(
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
      ...FAQ
        .slice(0, 7)
        .map(item => [
          button(
            item.question,
            `faq:${item.id}`,
            CUSTOM_EMOJI.question
          )
        ]),
      [
        button(
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
        button(
          "🔥 Популярные вопросы",
          "popular",
          CUSTOM_EMOJI.fire
        )
      ],
      [
        button(
          "👤 Профиль",
          "profile",
          CUSTOM_EMOJI.info
        )
      ],
      [
        button(
          "⬅️ Назад",
          "home"
        )
      ]
    ]
  };
}

// ============================================================
// ПОИСК ОТВЕТА
// ============================================================

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

function findAnswers(question) {
  const q =
    normalize(question);

  if (!q) {
    return [];
  }

  const words =
    q.split(" ")
      .filter(Boolean);

  return FAQ
    .map(item => {
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
    })
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

// ============================================================
// ПРОФИЛЬ
// ============================================================

async function showProfile(
  chatId,
  user
) {
  const data =
    getUser(user);

  const fav =
    getFavorites(user.id);

  const name =
    [
      data.firstName,
      data.lastName
    ]
      .filter(Boolean)
      .join(" ") ||
    "Пользователь";

  const username =
    data.username
      ? `@${data.username}`
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
    `ID: <code>${data.id}</code>\n` +
    `Вопросов: <b>${data.questions}</b>\n` +
    `Избранных: <b>${fav.size}</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            button(
              "⭐ Избранное",
              "favorites",
              CUSTOM_EMOJI.star
            )
          ],
          [
            button(
              "⬅️ Назад",
              "home"
            )
          ]
        ]
      }
    }
  );
}

// ============================================================
// ИЗБРАННОЕ
// ============================================================

async function toggleFavorite(
  userId,
  faqId
) {
  const fav =
    getFavorites(userId);

  const id =
    Number(faqId);

  if (fav.has(id)) {
    fav.delete(id);
    return false;
  }

  fav.add(id);
  return true;
}

async function showFavorites(
  chatId,
  userId
) {
  const fav =
    getFavorites(userId);

  if (!fav.size) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.star,
        "⭐"
      )} <b>Избранное пусто</b>\n\n` +
      `Добавляйте вопросы кнопкой «В избранное».`,
      {
        reply_markup:
          mainKeyboard()
      }
    );

    return;
  }

  const buttons = [];

  for (
    const id of fav
  ) {
    const item =
      FAQ.find(
        x =>
          Number(x.id) ===
          id
      );

    if (item) {
      buttons.push([
        button(
          item.question,
          `faq:${item.id}`,
          CUSTOM_EMOJI.question
        )
      ]);
    }
  }

  buttons.push([
    button(
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

// ============================================================
// FAQ
// ============================================================

async function showFAQ(
  chatId,
  id
) {
  const item =
    FAQ.find(
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
    )}</b>\n\n` +
    `${esc(
      item.answer
    )}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            button(
              "⭐ В избранное",
              `fav:${item.id}`,
              CUSTOM_EMOJI.star
            )
          ],
          [
            button(
              "🔥 Другие вопросы",
              "popular",
              CUSTOM_EMOJI.fire
            )
          ],
          [
            button(
              "⬅️ Назад",
              "home"
            )
          ]
        ]
      }
    }
  );
}

// ============================================================
// ВОПРОС ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function answerQuestion(
  chatId,
  user,
  question
) {
  const clean =
    String(
      question || ""
    ).trim();

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

  const data =
    getUser(user);

  data.questions++;

  const answers =
    findAnswers(clean);

  if (!answers.length) {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.info,
        "ℹ️"
      )} <b>Ответ не найден</b>\n\n` +
      `Я пока не нашёл подходящий ответ. Попробуйте переформулировать вопрос.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              button(
                "🔥 Популярные вопросы",
                "popular",
                CUSTOM_EMOJI.fire
              )
            ],
            [
              button(
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
    `${esc(
      first.answer
    )}`;

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
        button(
          "⭐ В избранное",
          `fav:${first.id}`,
          CUSTOM_EMOJI.star
        )
      ],
      ...answers
        .slice(1)
        .map(item => [
          button(
            item.question,
            `faq:${item.id}`,
            CUSTOM_EMOJI.question
          )
        ]),
      [
        button(
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

// ============================================================
// CALLBACKS
// ============================================================

async function handleCallback(
  query
) {
  await answerCallback(
    query.id
  );

  const chatId =
    query.message?.chat?.id;

  const messageId =
    query.message?.message_id;

  const data =
    query.data || "";

  const user =
    query.from;

  if (!chatId) {
    return;
  }

  getUser(user);

  if (data === "home") {
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

  if (data === "ask") {
    await sendMessage(
      chatId,
      `${emoji(
        CUSTOM_EMOJI.question,
        "❓"
      )} <b>Задайте вопрос</b>\n\n` +
      `Напишите его следующим сообщением.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              button(
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

  if (data === "popular") {
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

  if (data === "favorites") {
    await showFavorites(
      chatId,
      user.id
    );

    return;
  }

  if (data === "profile") {
    await showProfile(
      chatId,
      user
    );

    return;
  }

  if (data === "help") {
    await editMessage(
      chatId,
      messageId,
      `${emoji(
        CUSTOM_EMOJI.info,
        "ℹ️"
      )} <b>Помощь</b>\n\n` +
      `Напишите вопрос обычным сообщением, а я попробую найти ответ.`,
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

    await answerCallback(
      query.id,
      added
        ? "Добавлено в избранное ⭐"
        : "Удалено из избранного"
    );

    return;
  }
}

// ============================================================
// TELEGRAM UPDATE
// ============================================================

async function handleUpdate(
  update
) {
  try {
    if (
      update.callback_query
    ) {
      await handleCallback(
        update.callback_query
      );

      return;
    }

    if (!update.message) {
      return;
    }

    const message =
      update.message;

    if (!message.from) {
      return;
    }

    const chatId =
      message.chat.id;

    const user =
      message.from;

    getUser(user);

    const text =
      message.text || "";

    if (!text) {
      return;
    }

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
