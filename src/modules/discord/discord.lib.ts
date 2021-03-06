import superagent from 'superagent'
import { badRequest } from 'boom'

const { DISCORD_TOKEN, DISCORD_CLIENT, DISCORD_SECRET } = process.env as {
  [key: string]: string
}
const DISCORD = 'https://discordapp.com/api'
const SCOPE = 'identify email'

const T = () => true

const isError = (response: superagent.Response) =>
  !response.ok || response.error

interface IDiscordUser {
  id: string
  username: string
  discriminator: string
  email?: string
  verified?: boolean
  avatar?: string
  bot?: boolean
}

export class Discord {
  public static getAccessToken = async (
    code: string,
    redirectUri: string,
  ): Promise<string> => {
    const response = await superagent
      .post(`${DISCORD}/oauth2/token`)
      .type('form')
      .send({
        /* eslint-disable @typescript-eslint/camelcase */
        client_id: DISCORD_CLIENT,
        client_secret: DISCORD_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: SCOPE,
        /* eslint-enable @typescript-eslint/camelcase */
      })
      .ok(T)

    if (isError(response)) {
      throw badRequest(
        'Could not get access token from Discord...',
        response.body,
      )
    }

    return response.body.access_token
  }

  public static getUserFromToken = async (
    token: string,
  ): Promise<IDiscordUser> => {
    const response = await superagent
      .get(`${DISCORD}/v6/users/@me`)
      .auth(token, { type: 'bearer' })
      .ok(T)

    if (isError(response)) {
      throw badRequest('Could not get user from token...')
    }

    return response.body
  }

  public static getUserById = async (id: string): Promise<IDiscordUser> => {
    const response = await superagent
      .get(`${DISCORD}/v6/users/${id}`)
      .set('Authorization', 'Bot ' + DISCORD_TOKEN)
      .ok(T)

    if (isError(response)) {
      throw badRequest(`Could not get Discord user ${id}...`)
    }

    return response.body
  }
}
