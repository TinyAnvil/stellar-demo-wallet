import _ from 'lodash'
import { headers, parseError, getAuth } from './js/utils'

export default (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false

  callback(null, {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Hello World' })
  })
}