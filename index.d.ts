declare module '*/schema.graphql' {
  const content: string
  export = content
}

declare module '*/knexfile' {
  import { Config } from 'knex'

  const config: {
    development: Config
    production: Config
  }

  export = config
}
