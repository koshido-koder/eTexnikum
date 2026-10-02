const http = require("http");

const BOT_TOKEN = "8955872735:AAFWCOAF6Fhk_tCIGkW5Uz2exwvxyA0R12Q";
const PORT = 3000;

const ADMIN_IDS = [];

const CUSTOM_EMOJI = {
  bot: "5359289009389628379",
  question: "5368324172331521012",
  star: "5368324172331521014",
  fire: "5368324172331521016",
  info: "5368324172331521018",
  heart: "5368324172331521020"
};

const FAQ = [
  {
    id: 1,
    question: "Что такое eTexnikum?",
    answer: "eTexnikum — учебная платформа для работы с информацией, участниками и учебными материалами."
  },
  {
    id: 2,
    question: "Как войти в систему?",
    answer: "Откройте сайт eTexnikum и используйте свои данные для входа. Если вход не работает, обратитесь к администратору."
  },
  {
    id: 3,
    question: "Как изменить профиль?",
    answer: "Откройте раздел «Профиль», затем выберите редактирование данных."
  },
  {
    id: 4,
    question: "Кто может пользоваться системой?",
    answer: "В системе могут работать участники, учителя, администраторы и другие роли."
  },
  {
    id: 5,
    question: "Что делать, если забыл пароль?",
    answer: "Используйте восстановление доступа или обратитесь к администратору системы."
  },
  {
    id: 6,
    question: "Как связаться с поддержкой?",
    answer: "Нажмите кнопку «Помощь» в боте и выберите подходящий вариант."
  },
  {
    id: 7,
    question: "Можно ли задать свой вопрос?",
    answer: "Да. Нажмите «Задать вопрос» и отправьте сообщение боту."
  }
];

const users = new Map();
const favorites = new Map();

function getUser(id, username = "") {
  if (!users.has(id)) {
    users.set(id, {
      id,
      username,
      firstSeen: new Date().toISOString(),
      questions: 0
    });
  }

  return users.get(id);
}

function getFavorites(id) {
  if (!favorites.has(id)) {
    favorites.set(id, new Set());
  }

  return favorites.get(id);
}

function isAdmin(id) {
  return ADMIN_IDS.includes(Number(id));
}

async function telegram(method, body = {}) {
  if (!BOT_TOKEN || BOT_TOKEN === "PASTE_YOUR_BOT_TOKEN_HERE") {
    throw new Error("Укажите BOT_TOKEN в bot.js");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
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
    throw new Error(data.description || "Telegram API error");
  }

  return data.result;
}

async function sendMessage(chatId, text, replyMarkup = undefined) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function editMessageText(
  chatId,
  messageId,
  text,
  replyMarkup = undefined
) {
  return telegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function answerCallback(callbackId, text = "") {
  return telegram("answerCallbackQuery", {
    callback_query_id: callbackId,
    ...(text
      ? {
          text,
          show_alert: false
        }
      : {})
  });
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "❓ Вопросы", callback_data: "faq" },
        { text: "🔥 Популярное", callback_data: "popular" }
      ],
      [
        { text: "⭐ Избранное", callback_data: "favorites" },
        { text: "👤 Профиль", callback_data: "profile" }
      ],
      [
        { text: "ℹ️ Помощь", callback_data: "help" }
      ]
    ]
  };
}

function faqKeyboard() {
  const rows = FAQ.map(item => [
    {
      text: `${item.id}. ${item.question}`,
      callback_data: `faq_${item.id}`
    }
  ]);

  rows.push([
    {
      text: "⬅️ Назад",
      callback_data: "home"
    }
  ]);

  return {
    inline_keyboard: rows
  };
}

function popularKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "1. Что такое eTexnikum?",
          callback_data: "faq_1"
        }
      ],
      [
        {
          text: "2. Как войти?",
          callback_data: "faq_2"
        }
      ],
      [
        {
          text: "3. Как изменить профиль?",
          callback_data: "faq_3"
        }
      ],
      [
        {
          text: "⬅️ Назад",
          callback_data: "home"
        }
      ]
    ]
  };
}

function helpKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "❓ Частые вопросы",
          callback_data: "faq"
        }
      ],
      [
        {
          text: "⬅️ Назад",
          callback_data: "home"
        }
      ]
    ]
  };
}

function adminKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: "📊 Статистика",
          callback_data: "admin_stats"
        }
      ],
      [
        {
          text: "⬅️ Назад",
          callback_data: "home"
        }
      ]
    ]
  };
}

function favoriteKeyboard(itemId, isFav) {
  return {
    inline_keyboard: [
      [
        {
          text: isFav
            ? "💔 Убрать из избранного"
            : "⭐ В избранное",
          callback_data: `fav:${itemId}`
        }
      ],
      [
        {
          text: "⬅️ К вопросам",
          callback_data: "faq"
        },
        {
          text: "🏠 Главная",
          callback_data: "home"
        }
      ]
    ]
  };
}

function findFAQ(query) {
  const q = String(query).toLowerCase().trim();

  if (!q) return null;

  let best = null;
  let bestScore = 0;

  for (const item of FAQ) {
    const text =
      `${item.question} ${item.answer}`.toLowerCase();

    const words = q
      .split(/\s+/)
      .filter(Boolean);

    let score = 0;

    for (const word of words) {
      if (text.includes(word)) {
        score++;
      }
    }

    if (text.includes(q)) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

async function showFAQ(chatId) {
  return sendMessage(
    chatId,
    "❓ <b>Частые вопросы</b>\n\nВыберите вопрос:",
    faqKeyboard()
  );
}

async function showProfile(chatId, from) {
  const user = getUser(
    from.id,
    from.username || ""
  );

  const favCount =
    getFavorites(from.id).size;

  return sendMessage(
    chatId,
    `👤 <b>Профиль</b>\n\n` +
      `ID: <code>${user.id}</code>\n` +
      `Username: ${
        user.username
          ? "@" + user.username
          : "не указан"
      }\n` +
      `Вопросов: ${user.questions}\n` +
      `Избранных: ${favCount}`,
    mainKeyboard()
  );
}

async function showFavorites(chatId, from) {
  const ids = [
    ...getFavorites(from.id)
  ];

  if (!ids.length) {
    return sendMessage(
      chatId,
      "⭐ <b>Избранное</b>\n\n" +
        "У вас пока нет сохранённых вопросов.",
      mainKeyboard()
    );
  }

  const list = ids
    .map(id =>
      FAQ.find(
        item => item.id === Number(id)
      )
    )
    .filter(Boolean)
    .map(
      item => `• <b>${item.question}</b>`
    )
    .join("\n");

  return sendMessage(
    chatId,
    `⭐ <b>Избранное</b>\n\n${list}`,
    mainKeyboard()
  );
}

async function answerQuestion(chatId, from, text) {
  const user = getUser(
    from.id,
    from.username || ""
  );

  user.questions++;

  const item = findFAQ(text);

  if (item) {
    const isFav =
      getFavorites(from.id).has(item.id);

    return sendMessage(
      chatId,
      `🤖 <b>Ответ</b>\n\n${item.answer}`,
      favoriteKeyboard(
        item.id,
        isFav
      )
    );
  }

  return sendMessage(
    chatId,
    "🤖 Я пока не нашёл точный ответ.\n\n" +
      "Попробуйте выбрать вопрос из FAQ.",
    mainKeyboard()
  );
}

async function handleStart(message) {
  const chatId = message.chat.id;
  const from = message.from;

  getUser(
    from.id,
    from.username || ""
  );

  await sendMessage(
    chatId,
    `🤖 <b>Привет, ${
      from.first_name || "пользователь"
    }!</b>\n\n` +
      "Я бот-ответчик eTexnikum.\n" +
      "Выберите действие или напишите свой вопрос.",
    mainKeyboard()
  );
}

async function handleAdmin(chatId, from) {
  if (!isAdmin(from.id)) {
    return sendMessage(
      chatId,
      "⛔ Доступ только для администратора."
    );
  }

  await sendMessage(
    chatId,
    "🛠 <b>Админ-панель</b>\n\n" +
      "Выберите действие:",
    adminKeyboard()
  );
}

async function handleCallback(query) {
  const from = query.from;
  const chatId = query.message?.chat?.id;
  const messageId =
    query.message?.message_id;

  const data = query.data || "";

  if (!chatId) {
    await answerCallback(query.id);
    return;
  }

  try {
    if (data === "home") {
      await answerCallback(query.id);

      return editMessageText(
        chatId,
        messageId,
        "🤖 <b>Главное меню</b>\n\n" +
          "Выберите действие:",
        mainKeyboard()
      );
    }

    if (data === "faq") {
      await answerCallback(query.id);

      return editMessageText(
        chatId,
        messageId,
        "❓ <b>Частые вопросы</b>\n\n" +
          "Выберите вопрос:",
        faqKeyboard()
      );
    }

    if (data === "popular") {
      await answerCallback(query.id);

      return editMessageText(
        chatId,
        messageId,
        "🔥 <b>Популярные вопросы</b>",
        popularKeyboard()
      );
    }

    if (data === "help") {
      await answerCallback(query.id);

      return editMessageText(
        chatId,
        messageId,
        "ℹ️ <b>Помощь</b>\n\n" +
          "Вы можете:\n" +
          "• выбрать вопрос из FAQ;\n" +
          "• написать свой вопрос;\n" +
          "• сохранять ответы;\n" +
          "• открыть профиль.",
        helpKeyboard()
      );
    }

    if (data === "profile") {
      await answerCallback(query.id);

      return showProfile(
        chatId,
        from
      );
    }

    if (data === "favorites") {
      await answerCallback(query.id);

      return showFavorites(
        chatId,
        from
      );
    }

    if (data === "admin_stats") {
      if (!isAdmin(from.id)) {
        return answerCallback(
          query.id,
          "⛔ Нет доступа"
        );
      }

      await answerCallback(query.id);

      let totalQuestions = 0;

      for (const user of users.values()) {
        totalQuestions += user.questions;
      }

      return sendMessage(
        chatId,
        `📊 <b>Статистика</b>\n\n` +
          `Пользователей: <b>${users.size}</b>\n` +
          `Вопросов: <b>${totalQuestions}</b>\n` +
          `FAQ: <b>${FAQ.length}</b>`
      );
    }

    if (data.startsWith("faq_")) {
      await answerCallback(query.id);

      const itemId =
        Number(data.slice(4));

      const item =
        FAQ.find(
          x => x.id === itemId
        );

      if (!item) {
        return sendMessage(
          chatId,
          "Вопрос не найден.",
          mainKeyboard()
        );
      }

      const isFav =
        getFavorites(from.id)
          .has(item.id);

      return sendMessage(
        chatId,
        `❓ <b>${item.question}</b>\n\n` +
          item.answer,
        favoriteKeyboard(
          item.id,
          isFav
        )
      );
    }

    if (data.startsWith("fav:")) {
      const itemId =
        Number(data.slice(4));

      const item =
        FAQ.find(
          x => x.id === itemId
        );

      if (!item) {
        return answerCallback(
          query.id,
          "Вопрос не найден"
        );
      }

      const favs =
        getFavorites(from.id);

      if (favs.has(itemId)) {
        favs.delete(itemId);

        await answerCallback(
          query.id,
          "Удалено из избранного"
        );
      } else {
        favs.add(itemId);

        await answerCallback(
          query.id,
          "Добавлено в избранное"
        );
      }

      const isFav =
        favs.has(itemId);

      return sendMessage(
        chatId,
        `❓ <b>${item.question}</b>\n\n` +
          item.answer,
        favoriteKeyboard(
          item.id,
          isFav
        )
      );
    }

    await answerCallback(query.id);
  } catch (error) {
    console.error(
      "Callback error:",
      error.message
    );
  }
}

async function handleUpdate(update) {
  try {
    if (update.callback_query) {
      await handleCallback(
        update.callback_query
      );
      return;
    }

    const message =
      update.message;

    if (!message) return;

    const chatId =
      message.chat.id;

    const from =
      message.from;

    if (message.text) {
      const text =
        message.text.trim();

      if (text === "/start") {
        await handleStart(message);
        return;
      }

      if (text === "/help") {
        await sendMessage(
          chatId,
          "ℹ️ <b>Помощь</b>\n\n" +
            "Выберите действие:",
          helpKeyboard()
        );
        return;
      }

      if (text === "/faq") {
        await showFAQ(chatId);
        return;
      }

      if (text === "/profile") {
        await showProfile(
          chatId,
          from
        );
        return;
      }

      if (text === "/admin") {
        await handleAdmin(
          chatId,
          from
        );
        return;
      }

      await answerQuestion(
        chatId,
        from,
        text
      );
    }
  } catch (error) {
    console.error(
      "Update error:",
      error.message
    );
  }
}

let offset = 0;

async function pollingLoop() {
  console.log(
    "Telegram bot запущен."
  );

  while (true) {
    try {
      const updates =
        await telegram(
          "getUpdates",
          {
            offset,
            timeout: 30,
            allowed_updates: [
              "message",
              "callback_query"
            ]
          }
        );

      for (const update of updates) {
        offset =
          update.update_id + 1;

        await handleUpdate(update);
      }
    } catch (error) {
      console.error(
        "Polling error:",
        error.message
      );

      await new Promise(
        resolve =>
          setTimeout(resolve, 3000)
      );
    }
  }
}

function startHttpServer() {
  const server =
    http.createServer(
      async (req, res) => {
        const origin =
          req.headers.origin || "*";

        res.setHeader(
          "Access-Control-Allow-Origin",
          origin
        );

        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS"
        );

        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type"
        );

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        const url =
          new URL(
            req.url,
            `http://${req.headers.host}`
          );

        try {
          if (
            req.method === "GET" &&
            url.pathname === "/api/status"
          ) {
            res.writeHead(
              200,
              {
                "Content-Type":
                  "application/json; charset=utf-8"
              }
            );

            res.end(
              JSON.stringify({
                ok: true,
                bot: true,
                users: users.size,
                faq: FAQ.length
              })
            );

            return;
          }

          if (
            req.method === "GET" &&
            url.pathname === "/api/faq"
          ) {
            res.writeHead(
              200,
              {
                "Content-Type":
                  "application/json; charset=utf-8"
              }
            );

            res.end(
              JSON.stringify(FAQ)
            );

            return;
          }

          if (
            req.method === "POST" &&
            url.pathname === "/api/ask"
          ) {
            let body = "";

            req.on(
              "data",
              chunk => {
                body += chunk;
              }
            );

            req.on(
              "end",
              async () => {
                try {
                  const data =
                    JSON.parse(
                      body || "{}"
                    );

                  const item =
                    findFAQ(
                      data.question || ""
                    );

                  res.writeHead(
                    200,
                    {
                      "Content-Type":
                        "application/json; charset=utf-8"
                    }
                  );

                  res.end(
                    JSON.stringify({
                      ok: true,
                      found: Boolean(item),
                      answer: item
                        ? item.answer
                        : "Я пока не нашёл точный ответ на этот вопрос."
                    })
                  );
                } catch {
                  res.writeHead(
                    400,
                    {
                      "Content-Type":
                        "application/json; charset=utf-8"
                    }
                  );

                  res.end(
                    JSON.stringify({
                      ok: false,
                      error:
                        "Неверный JSON"
                    })
                  );
                }
              }
            );

            return;
          }

          res.writeHead(
            404,
            {
              "Content-Type":
                "application/json; charset=utf-8"
            }
          );

          res.end(
            JSON.stringify({
              ok: false,
              error: "Not found"
            })
          );
        } catch (error) {
          res.writeHead(
            500,
            {
              "Content-Type":
                "application/json; charset=utf-8"
            }
          );

          res.end(
            JSON.stringify({
              ok: false,
              error: error.message
            })
          );
        }
      }
    );

  server.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `HTTP API запущен: http://localhost:${PORT}`
      );
    }
  );
}

startHttpServer();
pollingLoop();
