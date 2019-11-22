import _ from 'lodash-es'

export default ({params, route, redirect}) => {
  if (route.name === 'index')
    redirect(302, `/${_.random(100000, 999999)}`)
}