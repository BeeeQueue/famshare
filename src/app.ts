import 'reflect-metadata'
import Express from 'express'
import CORS from 'cors'
import BodyParser from 'body-parser'
import CookieParser from 'cookie-parser'
import Helmet from 'helmet'
import proxy from 'http-proxy-middleware'
import { transports } from 'winston'
import { logger as Logger } from 'express-winston'

import {
  assertLoggedIn,
  SessionMiddleware,
} from '@/modules/session/session.lib'
import { ErrorHandler } from '@/middleware/error-handler'
import { createGraphQLMiddleware } from '@/graphql'
import { router } from './router'

const { FRONTEND_URL } = process.env
const app = Express()

export const createApp = async () => {
  const { GraphQLMiddleware, schema } = await createGraphQLMiddleware()

  app.use(
    Logger({
      transports: [new transports.Console()],
      meta: false,
    }),
  )

  app.use(
    CORS({
      origin: true,
      credentials: true,
    }),
  )
  app.use(BodyParser.json())
  app.use(CookieParser())
  app.use(Helmet())

  app.use(SessionMiddleware())

  app.use(router)

  app.post('/graphql', assertLoggedIn(), GraphQLMiddleware())

  app.get('/graphql', assertLoggedIn(), GraphQLMiddleware(true))

  app.get('/graphql/schema.graphql', (_, res) => {
    res.contentType('text/graphql')
    res.send(schema)
  })

  app.use(
    proxy({
      target: FRONTEND_URL,
      changeOrigin: true,
      ws: true,
    }),
  )

  app.use(ErrorHandler())

  return app
}
