import _ from 'lodash'

export const isDev = process.env.NODE_ENV !== 'production'

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true
}

export function parseError(err) {
  const error = 
  typeof err === 'string' 
  ? { message: err } 
  : err.response && err.response.data 
  ? err.response.data 
  : err.response 
  ? err.response
  : err.message 
  ? { message: err.message }
  : err

  console.error(error)
  // console.error(err)

  return {
    statusCode: error.status || err.status || 400,
    headers,
    body: JSON.stringify(error)
  }
}

export function getAuth(event) {
  let h_auth = _.get(event, 'headers.Authorization', _.get(event, 'headers.authorization'))

  if (
    h_auth
    && h_auth.substring(0, 7) === 'Bearer '
  ) h_auth = h_auth.replace('Bearer ', '')

  else
    throw 'Authorization header malformed'

  return h_auth
}