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
import {
  INVITE_ALREADY_USED,
  INVITE_NOT_FOUND,
  OWNER_OF_PLAN_SUBSCRIBE,
  USER_NOT_FOUND,
} from '@/errors'
import { Table } from '@/constants'
import { isNil } from '@/utils'

interface Constructor extends ITableOptions {
  name: string
  amount: number
  feeBasisPoints: number
  paymentDay: number
  ownerUuid: string
}

interface DatabasePlan extends ITableData {
  name: string
  amount: number
  fee_basis_points: number
  payment_day: number
  owner_uuid: string
}
/*
 * fees and payments
 */
@ObjectType()
export class Plan extends DatabaseTable<DatabasePlan> {
  public static readonly table = () => knex<DatabasePlan>(Table.PLAN)

  @Field()
  public name: string
  @Field(() => Int)
  public readonly amount: number
  @Field(() => Int)
  public readonly feeBasisPoints: number
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
  public async owner(): Promise<User> {
    return User.getByUuid(this.ownerUuid)
  }
  public readonly ownerUuid: string

  @Field(() => [User])
  public async members(): Promise<User[]> {
    const results: any[] = await knex(Table.USER)
      .select('user.*')
      .innerJoin(Table.SUBSCRIPTION, function() {
        this.on('user.uuid', '=', 'subscription.user_uuid')
      })
      .where({ 'subscription.plan_uuid': this.uuid })

    return results.map(result => User.fromSql(result))
  }

  @Field(() => [Invite])
  public async invites(): Promise<Invite[]> {
    return Invite.findByPlan(this.uuid)
  }

  constructor(options: Constructor) {
    super(options)

    this.name = options.name
    this.amount = options.amount
    this.feeBasisPoints = options.feeBasisPoints
    this.paymentDay = options.paymentDay
    this.ownerUuid = options.ownerUuid
  }

  public static fromSql(sql: DatabasePlan) {
    return new Plan({
      ...DatabaseTable._fromSql(sql),
      name: sql.name,
      amount: sql.amount,
      feeBasisPoints: sql.fee_basis_points,
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

  public static async getByOwnerUuid(uuid: string) {
    const plan = await this.table().where({ owner_uuid: uuid })

    return plan.map(Plan.fromSql)
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
    if (userUuid === this.ownerUuid) {
      throw new Error(OWNER_OF_PLAN_SUBSCRIBE)
    }

    if (isNil(await User.findByUuid(userUuid))) {
      throw new Error(USER_NOT_FOUND)
    }

    const invite = await Invite.findByShortId(inviteShortId)
    if (isNil(invite)) {
      throw new Error(INVITE_NOT_FOUND)
    }

    const isClaimed = !isNil(await invite.user())
    if (isClaimed) {
      throw new Error(INVITE_ALREADY_USED)
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
      fee_basis_points: this.feeBasisPoints,
      payment_day: this.paymentDay,
      owner_uuid: this.ownerUuid,
    })
  }
}
