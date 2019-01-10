import Knex, { CreateTableBuilder } from 'knex'
import uuid from 'uuid/v4'

import { Plan } from './lib/plans'

export const knex = Knex({
  client: 'pg',
  connection: process.env.DB_URL as string,
  searchPath: ['famshare', 'public'],
})

enum Table {
  USER = 'user',
  SESSION = 'session',
  PLAN = 'plan',
}

export interface TableOptions {
  uuid?: string
  created_at?: Date
  createdAt?: Date
  updated_at?: Date
  updatedAt?: Date
}

export class DatabaseTable {
  protected readonly name: string
  public readonly uuid: string
  public readonly createdAt: Date
  public readonly updatedAt: Date

  constructor(options: TableOptions) {
    this.name = this.constructor.name.toLowerCase()

    this.uuid = options.uuid || uuid()
    this.createdAt = options.created_at || options.createdAt || new Date()
    this.updatedAt = options.updated_at || options.updatedAt || new Date()
  }

  public exists = async () => {
    const result = await knex(this.name)
      .count()
      .where({ uuid: this.uuid })
      .first()

    return Number(result.count) === 1
  }

  protected _save = async (extraData: any) => {
    const data = {
      uuid: this.uuid,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      ...extraData,
    }

    if (await this.exists()) {
      await knex(this.name)
        .update(data)
        .where({ uuid: this.uuid })

      return
    }

    await knex(this.name).insert(data)
  }
}

/**
 * Checks if a table exists, and creates it if it doesn't.
 * Always adds a `uuid` column.
 */
const createTableIfDoesNotExist = async (
  name: Table,
  cb: (tableBuilder: CreateTableBuilder) => void,
) => {
  try {
    await knex(name).count('uuid')
  } catch (e) {
    console.log(`Creating table ${name}`)

    await knex.schema.createTable(name, table => {
      table.uuid('uuid').primary()

      cb(table)

      table.timestamps(false, true)
    })
  }
}

const initialize = async () => {
  const promises: Promise<any>[] = []

  promises.push(
    createTableIfDoesNotExist(Table.USER, table => {
      table
        .string('discord_id')
        .notNullable()
        .unique()

      table
        .string('email')
        .notNullable()
        .unique()

      table.string('stripe_id')
    }),

    createTableIfDoesNotExist(Table.SESSION, table => {
      table
        .uuid('user_uuid')
        .notNullable()
        .references('uuid')
        .inTable(Table.USER)

      table.timestamp('expires_at').notNullable()
    }),

    createTableIfDoesNotExist(Table.PLAN, table => {
      table.enum('type', [Plan.YOUTUBE]).notNullable()

      table
        .uuid('owner_uuid')
        .notNullable()
        .references('uuid')
        .inTable(Table.USER)

      table
        .integer('payment_due_day')
        .notNullable()
        .defaultTo(0)
    }),
  )

  await Promise.all(promises)
}

initialize()
