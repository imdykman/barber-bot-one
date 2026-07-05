function getUserId(ctx) {
  // Для callback
  if (ctx.callback?.sender?.user_id) {
    return ctx.callback.sender.user_id;
  }
  // Для сообщений
  if (ctx.message?.sender?.user_id) {
    return ctx.message.sender.user_id;
  }
  // Для bot_started
  if (ctx.user?.user_id) {
    return ctx.user.user_id;
  }
  return null;
}

module.exports = { getUserId };