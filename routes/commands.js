const { showWelcome } = require('../handlers/client/welcome');
const { showAdminMenu } = require('../handlers/admin/index');
const { isAdmin } = require('../utils/isAdmin');

function register(bot, { getUserId, userStates }) {
  // Стартовое событие
  bot.on('bot_started', async (ctx) => {
    const userId = getUserId(ctx);
    console.log(`\n🚀 bot_started | userId: ${userId}`);
    await showWelcome(ctx, userId, userStates);
  });

  // Команда /start
  bot.command('start', async (ctx) => {
    const userId = getUserId(ctx);
    console.log(`\n🚀 /start | userId: ${userId}`);
    await showWelcome(ctx, userId, userStates);
  });

  // Команда /admin
  bot.command('admin', async (ctx) => {
    const userId = getUserId(ctx);
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`🔐 Вход в админку: ${userId}`);
    await showAdminMenu(ctx, userId);
  });
}

module.exports = { register };
