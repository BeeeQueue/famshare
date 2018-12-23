import { badRequest } from 'boom'
import { Router, Request } from 'express'
import uuid from 'uuid/v4'

import { getAccessToken, getUserFromToken } from '../lib/discord'
import { User } from '../lib/user'

const { DISCORD_CLIENT } = process.env
const DISCORD = 'https://discordapp.com/api'
const SCOPE = 'identify email'

const getCallbackUrl = (req: Request) =>
  `https://${req.get('host')}/discord/callback`

export const router = Router()

router.get('/login', (req, res) =>
  res.redirect(
    `${DISCORD}/oauth2/authorize` +
      `?client_id=${encodeURIComponent(DISCORD_CLIENT as string)}` +
      `&redirect_uri=${encodeURIComponent(getCallbackUrl(req))}` +
      '&response_type=code' +
      `&scope=${encodeURIComponent(SCOPE)}`,
  ),
)

interface CallbackQuery {
  code?: string
}

router.get('/callback', async (req, res) => {
  const { code } = req.query as CallbackQuery

  if (!code) {
    throw badRequest('Did not get a code back from Discord...')
  }

  const token = await getAccessToken(code, getCallbackUrl(req))

  const discordUser = await getUserFromToken(token)

  if (!discordUser.email || !discordUser.verified) {
    throw badRequest(
      'You need to have a verified email address to use this service.',
    )
  }

  let user: User | null = await User.findByDiscordId(discordUser.id)

  if (!user) {
    user = new User({
      uuid: uuid(),
      discordId: discordUser.id,
      email: discordUser.email,
    })

    await user.save()
  }

  await req.authenticate(user.uuid)

  res.redirect('/')
})
