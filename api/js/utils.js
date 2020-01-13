import _ from 'lodash'

export const isDev = process.env.NODE_ENV !== 'production'

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = isDev ? 0 : 1

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
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