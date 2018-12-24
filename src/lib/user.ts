import { stripe } from '../lib/stripe'

import { knex } from '../db'

const table = () => knex('user')

interface Constructor {
  uuid: string
  email: string
  discord_id?: string
  discordId?: string
  stripe_id?: string
  stripeId?: string
  created_at?: Date
  createdAt?: Date
}

export class User {
  public readonly uuid: string
  public readonly discordId: string
  public readonly email: string
  public stripeId: string | null
  public readonly createdAt: Date

  constructor(params: Constructor) {
    this.uuid = params.uuid
    ;(this.discordId = params.discord_id || (params.discordId as string)),
      (this.createdAt = params.created_at || params.createdAt || new Date()),
      (this.stripeId = params.stripe_id || params.stripeId || null),
      (this.email = params.email)
  }

  public static getByUuid = async (uuid: string) => {
    const user = await table()
      .where({ uuid })
      .first()

    if (!user) throw new Error(`Could not find User:${uuid}`)

    return new User(user)
  }

  public static findByUuid = async (uuid: string) => {
    const user = await table()
      .where({ uuid })
      .first()

    if (!user) return null

    return new User(user)
  }

  public static findByDiscordId = async (id: string) => {
    const user = await table()
      .where({ discord_id: id })
      .first()

    if (!user) return null

    return new User(user)
  }

  public createStripeCustomer = async (stripeToken: string) => {
    const customer = await stripe.customers.create({
      email: this.email,
      source: stripeToken,
      metadata: { uuid: this.uuid },
    })

    if (!customer.id) {
      throw new Error('Could not create Stripe customer')
    }

    this.stripeId = customer.id

    await this.save()
  }

  public exists = async () => {
    const result = await table()
      .count()
      .where({ uuid: this.uuid })
      .orWhere({ discord_id: this.discordId })
      .first()

    console.log(result)

    return Number(result.count) === 1
  }

  public save = async () => {
    const data = {
      uuid: this.uuid,
      discord_id: this.discordId,
      email: this.email,
      stripe_id: this.stripeId,
      created_at: this.createdAt,
    }

    if (await this.exists()) {
      await table()
        .update(data)
        .where({ uuid: this.uuid })

      return
    }

    await table().insert(data)
  }
}
