module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: 'sqlite/dev.sqlite3',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    useNullAsDefault: true,
  },
}
