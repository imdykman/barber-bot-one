async function notifyClient(ctx, clientUserId, message) {
  try {
    // В MAX API можно отправить сообщение через bot.api
    // Но это зависит от версии API. Пока просто логируем.
    console.log(`📱 Уведомление клиенту ${clientUserId}: ${message}`);

    // TODO: В будущем добавить реальную отправку через MAX API
    // Например: await ctx.api.sendMessage({recipient: {chat_id: clientUserId}, body: {text: message}});

    return true;
  } catch (error) {
    console.error(`❌ Ошибка уведомления клиента ${clientUserId}:`, error.message);
    return false;
  }
}

module.exports = { notifyClient };
