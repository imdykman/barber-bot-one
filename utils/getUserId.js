function getUserId(ctx) {
  // Для callback - пользователь в callback.user (не sender!)
  if (ctx.callback?.user?.user_id) {
    return ctx.callback.user.user_id;
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
