import _ from 'lodash'
import { headers } from './js/utils'
import pusher from './js/pusher'
import queryString from 'query-string'

export default (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  const body = queryString.parse(event.body)
  const auth = pusher.authenticate(body.socket_id, body.channel_name, {
    user_id: body.publicKey
  })

  callback(null, {
    statusCode: 200,
    headers,
    body: JSON.stringify(auth)
  })
}