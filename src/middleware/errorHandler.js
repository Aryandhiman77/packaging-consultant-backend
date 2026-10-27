export function notFoundHandler(request, response) {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.originalUrl}` })
}

export function errorHandler(error, _request, response, _next) {
  const duplicateKey = error?.code === 11000
  const status = duplicateKey ? 409 : (error.status || 500)
  const message = duplicateKey
    ? 'A settings document with this key already exists'
    : (error.message || 'Internal server error')

  if (status >= 500) console.error(error)
  response.status(status).json({ message })
}
