
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ISSUER = 'packaging-consultants-api'
const AUDIENCE = 'packaging-consultants-admin'
const VALIDITY_SECONDS = 24 * 60 * 60

function signingKey() {
  const hex = process.env.JWT_SECRET || ''

  if (!/^(?:[0-9a-f]{2}){32,}$/i.test(hex)) {
    throw new Error(
      'JWT_SECRET must be at least 32 random bytes encoded as hex'
    )
  }

  return Buffer.from(hex, 'hex')
}

// Issue the JWT once.
export function issueAdminToken(admin = {}) {
  const subject = String(admin._id || admin.id || 'packaging-admin')

  return jwt.sign(
    {
      role: 'admin',
      email: admin.email || undefined,
    },
    signingKey(),
    {
      algorithm: 'HS256',
      subject,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: VALIDITY_SECONDS,
      jwtid: randomUUID(),
    }
  )
}

// Verify the same token on every admin request.
export function verifyAdminToken(token) {
  const claims = jwt.verify(
    token,
    signingKey(),
    {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
      maxAge: VALIDITY_SECONDS,
    }
  )

  if (
    !claims ||
    typeof claims !== 'object' ||
    claims.role !== 'admin' ||
    typeof claims.sub !== 'string' ||
    typeof claims.jti !== 'string' ||
    typeof claims.iat !== 'number' ||
    typeof claims.exp !== 'number' ||
    claims.exp - claims.iat !== VALIDITY_SECONDS
  ) {
    throw new Error('Invalid admin token claims')
  }

  return claims
}
