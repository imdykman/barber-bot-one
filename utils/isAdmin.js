function isAdmin(userId) {
  const adminIds = process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];
  return adminIds.includes(userId);
}

module.exports = { isAdmin };
