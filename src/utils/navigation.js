export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.status = 400
  }
}

function normalizeLink(item, location) {
  if (!item || typeof item !== 'object') {
    throw new ValidationError(`${location} must be an object`)
  }

  const label = typeof item.label === 'string' ? item.label.trim() : ''
  const link = typeof item.link === 'string' ? item.link.trim() : ''

  if (!label) throw new ValidationError(`${location}.label is required`)
  if (!link) throw new ValidationError(`${location}.link is required`)
  if (label.length > 100) throw new ValidationError(`${location}.label is too long`)
  if (link.length > 2048) throw new ValidationError(`${location}.link is too long`)

  return { label, link }
}

export function normalizeTopNavigation(value) {
  if (!Array.isArray(value)) {
    throw new ValidationError('topNavigation must be an array')
  }

  if (value.length > 30) {
    throw new ValidationError('topNavigation cannot contain more than 30 items')
  }

  return value.map((item, index) => {
    const normalized = normalizeLink(item, `topNavigation[${index}]`)
    const children = item.children ?? []

    if (!Array.isArray(children)) {
      throw new ValidationError(`topNavigation[${index}].children must be an array`)
    }
    if (children.length > 40) {
      throw new ValidationError(`topNavigation[${index}].children cannot contain more than 40 items`)
    }

    return {
      ...normalized,
      children: children.map((child, childIndex) => (
        normalizeLink(child, `topNavigation[${index}].children[${childIndex}]`)
      )),
    }
  })
}
