/* eslint-disable @typescript-eslint/camelcase */
import { Field, Int, ObjectType } from 'type-graphql'
import { addMonths, isAfter, setDate } from 'date-fns'

import { DatabaseTable, knex, ITableData, ITableOptions } from '@/db'
import { User } from '@/modules/user/user.model'
import { Invite } from '@/modules/invite/invite.model'
import {
  Subscription,
  SubscriptionStatus,
} from '@/modules/subscription/subscription.model'
import { INVITE_NOT_FOUND, USER_NOT_FOUND } from '@/errors'
import { Table } from '@/constants'
import { isNil } from '@/utils'

interface Constructor extends ITableOptions {
  name: string
  amount: number
  paymentDay: number
  ownerUuid: string
}

interface DatabasePlan extends ITableData {
  name: string
  amount: number
  payment_day: number
  owner_uuid: string
}

@ObjectType()
export class Plan extends DatabaseTable<DatabasePlan> {
  public static readonly table = () => knex<DatabasePlan>(Table.PLAN)

  @Field()
  public name: string
  @Field(() => Int)
  public readonly amount: number
  @Field(() => Int, {
    description: '1-indexed day in month payments are done.',
  })
  public readonly paymentDay: number
  @Field(() => Date, {
    description: 'The date the next payment will be attempted.',
  })
  public nextPaymentDate() {
    let nextPaymentDate = setDate(new Date(), this.paymentDay)

    if (isAfter(new Date(), nextPaymentDate)) {
      nextPaymentDate = addMonths(nextPaymentDate, 1)
    }

    return nextPaymentDate
  }

  @Field(() => User)
  public readonly owner!: User
  public readonly ownerUuid: string
  public getOwner = async () => User.getByUuid(this.ownerUuid)

  @Field(() => [User])
  public readonly members!: User[]
  public getMembers = async () => {
    const results: any[] = await knex(Table.USER)
      .select('user.*')
      .innerJoin(Table.SUBSCRIPTION, function() {
        this.on('user.uuid', '=', 'subscription.user_uuid')
      })
      .where({ 'subscription.plan_uuid': this.uuid })

    return results.map(result => User.fromSql(result))
  }

  constructor(options: Constructor) {
    super(options)

    this.name = options.name
    this.amount = options.amount
    this.paymentDay = options.paymentDay
    this.ownerUuid = options.ownerUuid
  }

  public static fromSql(sql: DatabasePlan & ITableData) {
    return new Plan({
      ...DatabaseTable._fromSql(sql),
      name: sql.name,
      amount: sql.amount,
      paymentDay: sql.payment_day,
      ownerUuid: sql.owner_uuid,
    })
  }

  public static async findByUuid(uuid: string) {
    const plan = await this.table()
      .where({ uuid })
      .first()

    if (!plan) return null

    return Plan.fromSql(plan)
  }

  public static async getByUuid(uuid: string) {
    const plan = await this.table()
      .where({ uuid })
      .first()

    if (!plan) throw new Error(`Could not find Plan:${uuid}`)

    return Plan.fromSql(plan)
  }

  public async createInvite(expiresAt: Date) {
    const invite = new Invite({
      shortId: await Invite.generateShortId(),
      cancelled: false,
      expiresAt,
      planUuid: this.uuid,
    })

    await invite.save()

    return invite
  }

  public async subscribeUser(userUuid: string, inviteShortId: string) {
    const invite = await Invite.findByShortId(inviteShortId)

    if (isNil(await User.findByUuid(userUuid))) {
      throw new Error(USER_NOT_FOUND)
    }

    if (isNil(invite)) {
      throw new Error(INVITE_NOT_FOUND)
    }

    const subscription = new Subscription({
      planUuid: this.uuid,
      userUuid,
      inviteUuid: invite.uuid,
      status: SubscriptionStatus.JOINED,
    })

    await subscription.save()

    return subscription
  }

  public async save() {
    return this._save({
      name: this.name,
      amount: this.amount,
      payment_day: this.paymentDay,
      owner_uuid: this.ownerUuid,
    })
  }
}
