# ✂️ Ножницы&Ко — Бот онлайн-записи для сети салонов красоты

Бот для MAX (российский мессенджер) для онлайн-записи клиентов в сеть салонов красоты "Ножницы&Ко" с тремя филиалами в Екатеринбурге.

## 🎯 Возможности

### Для клиентов

- ✅ Выбор филиала (3 филиала)
- ✅ Выбор мастера
- ✅ Выбор услуги с ценой
- ✅ Выбор даты (календарь на 7 дней, включая сегодня)
- ✅ Выбор времени (свободные слоты с учётом длительности услуги)
- ✅ Согласие с политикой конфиденциальности
- ✅ Отправка контакта через нативную кнопку MAX
- ✅ Просмотр "Мои записи" (активные + история)
- ✅ Отмена записи

### Для админов

- 🔐 Вход через `/admin` или кнопку "Админ-панель" (только для ADMIN_IDS)
- 📅 Записи на сегодня
- 📋 Все записи с фильтрами:
  - По дате (7 дней)
  - По мастеру
  - По филиалу
  - По статусу (подтверждено/отменено/ожидает)
  - Поиск по имени или телефону
- 📊 Статистика:
  - Записи сегодня
  - Записи за месяц
  - Всего клиентов
  - Топ мастеров
  - Топ услуг
  - Топ филиалов
- 🔄 Управление записями:
  - Детальный просмотр записи
  - Изменение статуса (подтвердить/отменить/завершить)
  - Перенос записи на другую дату/время
  - Автоматическое уведомление клиента через MAX API

### Уведомления

- 📧 Email админу при новой записи
- 📧 Email админу при изменении статуса записи
- ⏰ Напоминание клиенту за 24 часа до записи (через MAX API)
- ⏰ Напоминание клиенту за 1 час до записи (через MAX API)

## 🏗️ Архитектура

### Структура проекта

```
max-dialog-barber-bot/
├── bot.js                  # Точка входа (~75 строк)
├── routes/                 # Роутеры (обработчики событий)
│   ├── commands.js         # События bot_started, команды /start, /admin
│   ├── client.js           # Клиентские callback-обработчики
│   ├── admin.js            # Админские callback-обработчики
│   └── messages.js         # Обработка текстовых сообщений
├── handlers/               # Бизнес-логика
│   ├── client/             # Клиентская часть
│   │   ├── welcome.js      # Главное меню
│   │   ├── masters.js      # Выбор мастера
│   │   ├── services.js     # Выбор услуги
│   │   ├── calendar.js     # Выбор даты
│   │   ├── time.js         # Выбор времени
│   │   ├── booking.js      # Подтверждение записи
│   │   └── my-bookings.js  # Мои записи
│   └── admin/              # Админская часть
│       ├── index.js        # Админ-меню
│       ├── today-bookings.js    # Записи на сегодня
│       ├── stats.js        # Статистика
│       ├── all-bookings.js # Все записи с фильтрами
│       └── booking-details.js   # Управление записями
├── database/
│   └── database.js         # Работа с SQLite
├── data/
│   └── seed.js             # Начальные данные (филиалы, мастера, услуги)
├── services/
│   ├── states.js           # Хранилище состояний пользователей (в БД)
│   ├── email.js            # Email-уведомления через SMTP
│   └── reminders.js        # Напоминания через MAX API
├── utils/
│   ├── getUserId.js        # Извлечение userId из контекста
│   └── isAdmin.js          # Проверка прав админа
├── migrations/
│   ├── add-status.js       # Миграция: поле status в bookings
│   ├── add-reminder-fields.js  # Миграция: поля reminder_*_sent
│   └── add-user-states.js  # Миграция: таблица user_states
├── queries/                # Полезные SQL-запросы для работы с БД
│   ├── today-bookings.sql
│   ├── monthly-stats.sql
│   ├── popular-services.sql
│   ├── new-clients.sql
│   └── master-workload.sql
├── .env                    # Секреты (не в git)
├── .env.example            # Пример .env
├── .gitattributes          # Настройки окончаний строк
└── package.json
```

### Ключевые решения

#### 1. Разделение на роутеры

**Проблема:** `bot.js` стал слишком большим (578 строк).
**Решение:** Разделили на 4 роутера по принципу ответственности:

- `commands.js` — события и команды
- `client.js` — клиентская логика
- `admin.js` — админская логика
- `messages.js` — обработка сообщений

**Результат:** `bot.js` стал картой проекта (~75 строк), каждый файл отвечает за одну область.

#### 2. Гибридная бизнес-логика

**Проблема:** Как обрабатывать записи — автоматически или с модерацией?
**Решение:** Гибридный подход:

- Запись создаётся сразу как `confirmed` (клиент не ждёт)
- Админ получает email-уведомление (в курсе всех записей)
- Админ может отменить/перенести через панель (полный контроль)
- Клиент получает напоминания в MAX (не забывает о записи)

**Результат:** Баланс между удобством клиента и контролем админа.

#### 3. Алгоритм свободных слотов

**Проблема:** Как показать только свободное время?
**Решение:** В `database.js` функция `getFreeTimeSlots`:

- Читает расписание мастера из таблицы `schedule`
- Учитывает праздники из таблицы `holidays`
- Проверяет пересечения с учётом длительности услуги
- Для "сегодня" фильтрует прошедшие слоты
- Возвращает только свободные слоты

**Результат:** Клиент видит только реально свободное время.

#### 4. Состояния пользователей в БД

**Проблема:** Как хранить промежуточные данные (выбранный филиал, мастер и т.д.)?
**Решение:** `services/states.js` — SQLite таблица `user_states`:

```javascript
// Синхронный API (благодаря better-sqlite3)
userStates.get(userId); // → объект состояния
userStates.set(userId, state);
userStates.delete(userId);
```

**Результат:**

- ✅ Состояния переживают перезапуск бота
- ✅ Клиент может продолжить запись после перезапуска
- ✅ Автоматическая очистка старых состояний (через 24 часа)
- ✅ Синхронный API — код handlers не изменился

#### 5. Проверка доступа админа

**Проблема:** Как ограничить доступ к админке?
**Решение:** `utils/isAdmin.js`:

```javascript
function isAdmin(userId) {
  const adminIds = process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];
  return adminIds.includes(userId);
}
```

**Результат:** Поддержка нескольких админов через `.env`, проверка на каждом шаге.

## 🔌 Работа с MAX API

SDK `@maxhub/max-bot-api` предоставляет методы через объект `bot.api`. Все методы асинхронные.

### Отправка сообщений

#### Пользователю по user_id (глобальный ID)

```javascript
// Простое текстовое сообщение
await bot.api.sendMessageToUser(userId, 'Привет!');

// Сообщение с клавиатурой
const { Keyboard } = require('@maxhub/max-bot-api');
const keyboard = Keyboard.inlineKeyboard([[Keyboard.button.callback('Кнопка', 'callback_data')]]);
await bot.api.sendMessageToUser(userId, 'Выберите:', {
  attachments: [keyboard],
});
```

#### В чат по chat_id (конкретный диалог)

```javascript
await bot.api.sendMessageToChat(chatId, 'Сообщение в чат');
```

#### В контексте обработчика (через ctx)

В обработчиках событий (`message_callback`, `message_created`) используйте `ctx.reply`:

```javascript
bot.on('message_callback', async (ctx) => {
  await ctx.reply('Ответ пользователю', {
    attachments: [keyboard],
  });
});
```

### Другие полезные методы

```javascript
// Получить информацию о чате
const chat = await bot.api.getChat(chatId);

// Получить участников чата
const members = await bot.api.getChatMembers(chatId);

// Редактировать сообщение
await bot.api.editMessage(messageId, { text: 'Новый текст' });

// Удалить сообщение
await bot.api.deleteMessage(messageId);

// Отправить действие (typing, upload_photo и т.д.)
await bot.api.sendAction(chatId, 'typing');

// Загрузить изображение
const image = await bot.api.uploadImage({ filename: 'photo.jpg' });
```

### ⚠️ Важные замечания

1. **Нет метода `sendMessage`** — используйте `sendMessageToUser` или `sendMessageToChat`
2. **Методы в camelCase** — `sendMessageToUser`, а не `send_message_to_user`
3. **Доступ через `bot.api`** — методы находятся в `bot.api`, не в `bot` напрямую
4. **Текст — второй параметр** — `sendMessageToUser(userId, text, extra)`

## 📚 Используемые библиотеки

### Основные

- **@maxhub/max-bot-api** — SDK для MAX API (работа с ботом, кнопками, сообщениями)
- **better-sqlite3** — SQLite база данных (быстрая, нативная)
- **dotenv** — Загрузка переменных окружения из `.env`
- **nodemailer** — Отправка email через SMTP
- **express** — Веб-сервер для веб-версии записи
- **cors** — Поддержка кросс-доменных запросов

### Вспомогательные

- **node-gyp** — Компиляция нативных модулей (для better-sqlite3)
- **Visual Studio Build Tools** — Компилятор C++ (требуется для better-sqlite3 на Windows)

### Почему именно эти библиотеки

#### better-sqlite3 (а не sql.js или pg)

- ✅ Синхронный API — проще код
- ✅ Быстрее, чем sql.js (нативная библиотека)
- ✅ Не требует отдельного сервера БД (в отличие от PostgreSQL)
- ✅ Идеально для MVP и небольших проектов
- ❌ Требует компиляции (нужны Build Tools)

#### @maxhub/max-bot-api (а не telegraf или grammy)

- ✅ Официальный SDK для MAX
- ✅ Поддержка всех функций MAX (кнопки, контакт, геолокация)
- ✅ Простой API
- ❌ Меньше сообщество, чем у Telegram-библиотек

#### nodemailer (а не sendgrid или mailgun)

- ✅ Работает с любым SMTP (Яндекс, Gmail, Mail.ru)
- ✅ Бесплатно (используем существующий SMTP)
- ✅ Полный контроль
- ❌ Нужно настраивать SMTP вручную

## 🗄️ База данных

### Схема

```sql
-- Филиалы
CREATE TABLE branches (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL
);

-- Мастера
CREATE TABLE masters (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER,
  name TEXT NOT NULL,
  specialty TEXT,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Услуги
CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT
);

-- Цены и длительность для каждого мастера
CREATE TABLE master_services (
  id INTEGER PRIMARY KEY,
  master_id INTEGER,
  service_id INTEGER,
  price INTEGER,
  duration_minutes INTEGER,
  FOREIGN KEY (master_id) REFERENCES masters(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- График работы мастеров
CREATE TABLE schedule (
  id INTEGER PRIMARY KEY,
  master_id INTEGER,
  day_of_week INTEGER,
  start_time TEXT,
  end_time TEXT,
  FOREIGN KEY (master_id) REFERENCES masters(id)
);

-- Праздники/выходные мастеров
CREATE TABLE holidays (
  id INTEGER PRIMARY KEY,
  master_id INTEGER,
  holiday_date TEXT,
  FOREIGN KEY (master_id) REFERENCES masters(id)
);

-- Клиенты
CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE,
  name TEXT,
  phone TEXT
);

-- Записи
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  client_id INTEGER,
  master_id INTEGER,
  service_id INTEGER,
  branch_id INTEGER,
  booking_date TEXT,
  booking_time TEXT,
  status TEXT DEFAULT 'confirmed',
  reminder_24h_sent INTEGER DEFAULT 0,
  reminder_1h_sent INTEGER DEFAULT 0,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (master_id) REFERENCES masters(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Состояния пользователей (временные данные процесса записи)
CREATE TABLE user_states (
  user_id INTEGER PRIMARY KEY,
  state_data TEXT NOT NULL,  -- JSON
  updated_at TEXT NOT NULL
);
```

### Ключевые функции database.js

- `getBranches()` — список филиалов
- `getMastersByBranch(branchId)` — мастера филиала
- `getServicesByMaster(masterId)` — услуги мастера с ценами
- `getFreeTimeSlots(masterId, date, serviceId)` — свободные слоты
- `createBooking(...)` — создание записи
- `getActiveBookingsByClient(clientId)` — активные записи клиента
- `getTodayBookings()` — записи на сегодня (для админа)
- `getAllBookings(filters)` — все записи с фильтрами
- `updateBookingStatus(bookingId, status)` — изменение статуса
- `updateBookingDateTime(bookingId, date, time)` — перенос записи
- `getStats()` — статистика
- `getBookingWithClient(bookingId)` — детали записи с данными клиента

## 🔐 Безопасность

### Что в `.env` (не в git)

- `MAX_BOT_API_TOKEN` — токен бота MAX
- `ADMIN_IDS` — ID админов (через запятую)
- `ADMIN_EMAIL` — email для уведомлений
- `SMTP_*` — настройки SMTP

### Проверка доступа

- Все админские callback проверяют `isAdmin(userId)`
- Команда `/admin` проверяет права
- Кнопка "Админ-панель" показывается только админам

### Политика конфиденциальности

- Перед записью клиент соглашается с политикой
- Ссылка: https://max-dialog.ru/privacy
- Согласие сохраняется в состоянии

## 🚀 Запуск

### Требования

- Node.js v24+
- Visual Studio Build Tools (для better-sqlite3)
- SMTP-сервер (Яндекс, Gmail, Mail.ru)

### Установка

```bash
# Клонировать репозиторий
git clone <repo-url>
cd max-dialog-barber-bot

# Установить зависимости
npm install

# Заполнить .env (скопировать из .env.example)
cp .env.example .env
# Отредактировать .env

# Инициализировать базу данных
npm run seed

# Запустить бота
npm start
```

### Переменные окружения (.env)

```env
# MAX Bot API
MAX_BOT_API_TOKEN=your-bot-token
MAX_API_BASE_URL=https://platform-api2.max.ru

# Админы
ADMIN_IDS=18245428,123456789

# Email
ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@yandex.ru
SMTP_PASS=your-password
SMTP_FROM=your-email@yandex.ru
```

## 🛠️ Работа с базой данных

### DB Browser for SQLite

Для удобной работы с БД используйте бесплатную программу [DB Browser for SQLite](https://sqlitebrowser.org/dl/):

1. Откройте `database/barber.db`
2. Вкладка **Browse Data** — просмотр данных как в Excel
3. Вкладка **Execute SQL** — выполнение SQL-запросов

### Полезные SQL-запросы

В папке `queries/` собраны готовые SQL-запросы:

- `today-bookings.sql` — все записи на сегодня
- `monthly-stats.sql` — статистика за месяц по мастерам
- `popular-services.sql` — топ-10 популярных услуг
- `new-clients.sql` — новые клиенты
- `master-workload.sql` — загруженность мастеров

Подробная документация — в `queries/README.md`.

## 🐛 Известные ограничения

### 1. Напоминания за 24 часа

**Проблема:** Если запись создана менее чем за 24 часа до приёма, напоминание за 24 часа не отправится.
**Следствие:** Клиент получит только напоминание за 1 час.
**Решение (будущее):** Добавить проверку "опоздавших" записей.

### 2. Нет валидации телефона

**Проблема:** Телефон берётся из контакта MAX без валидации.
**Следствие:** Может быть некорректный формат.
**Решение (будущее):** Валидация и форматирование.

### 3. Нет экспорта данных

**Проблема:** Статистику нельзя экспортировать.
**Следствие:** Админ видит только в интерфейсе.
**Решение (будущее):** Экспорт в CSV/Excel.

### 4. Нет мультиязычности

**Проблема:** Весь интерфейс на русском.
**Следствие:** Не подходит для иностранных клиентов.
**Решение (будущее):** i18n.

## 📊 Метрики проекта

- **Строк кода:** ~2500 (без node_modules)
- **Файлов:** ~35
- **Таблиц БД:** 9
- **API endpoints:** 0 (всё через MAX API)
- **Время разработки:** ~15 часов (с нуля до MVP)

## 🎯 Что сделано

### Этап 1: Базовая функциональность

- ✅ Инициализация бота
- ✅ Настройка UTF-8 в Windows
- ✅ Подключение к MAX API
- ✅ Создание структуры проекта

### Этап 2: Запись клиента

- ✅ Выбор филиала
- ✅ Выбор мастера
- ✅ Выбор услуги
- ✅ Выбор даты (календарь)
- ✅ Выбор времени (свободные слоты)
- ✅ Согласие с политикой
- ✅ Запрос контакта
- ✅ Создание записи

### Этап 3: Мои записи

- ✅ Просмотр активных записей
- ✅ История посещений
- ✅ Отмена записи

### Этап 4: Админ-панель

- ✅ Вход по `/admin`
- ✅ Проверка доступа (ADMIN_IDS)
- ✅ Записи на сегодня
- ✅ Все записи с фильтрами
- ✅ Статистика
- ✅ Управление записями (статус, перенос)

### Этап 5: Уведомления

- ✅ Email админу при новой записи
- ✅ Email админу при изменении статуса
- ✅ Напоминания клиенту через MAX API (за 24ч и за 1ч)

### Этап 6: Рефакторинг

- ✅ Разделение bot.js на роутеры
- ✅ Улучшение структуры проекта

### Этап 7: Улучшения

- ✅ Состояния пользователей в БД (переживают перезапуск)
- ✅ Календарь включает "сегодня"
- ✅ Фильтрация прошедших слотов
- ✅ Учёт реальной длительности услуг
- ✅ SQL-запросы для работы с БД

## 🔮 Планы на будущее

### Приоритет 1 (важно)

- [ ] Валидация телефона
- [ ] Экспорт статистики в CSV
- [ ] Просмотр таблиц БД в админке

### Приоритет 2 (полезно)

- [ ] Мультиязычность (i18n)
- [ ] QR-код для быстрой записи
- [ ] Интеграция с платёжными системами
- [ ] Отзывы клиентов после визита
- [ ] Веб-приложение для записи (Express)

### Приоритет 3 (nice to have)

- [ ] Telegram-бот (дублирование функционала)
- [ ] WhatsApp-бот
- [ ] Личный кабинет мастера
- [ ] Мобильное приложение для мастеров

## 👨‍💻 Разработка

### Структура коммитов

- 🎨 UI/UX изменения
- 🔧 Исправления ошибок
- 📧 Email-уведомления
- 📋 Функционал записей
- 🔐 Админ-панель
- 🏗️ Рефакторинг
- 📝 Документация

### Тестирование

- Ручное тестирование в MAX
- Проверка email-уведомлений
- Проверка напоминаний
- Проверка админских функций

### Деплой (будущее)

- VPS (Ubuntu)
- PM2 для управления процессом
- Nginx как reverse proxy (если нужен webhook)
- Мониторинг через PM2 logs

## 📞 Контакты

- **Разработчик:** Максим
- **Email:** imdykman@yandex.ru
- **Проект:** max-dialog-barber-bot

---

**Статус:** ✅ MVP готов к использованию
**Версия:** 1.1.0
**Дата:** 9 июля 2026
