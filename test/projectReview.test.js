import assert from 'node:assert/strict'
import test from 'node:test'
import { requireAdmin } from '../src/middleware/requireAdmin.js'
import { checkAdminAuth } from '../src/routes/adminRouter.js'
import { issueAdminToken, verifyAdminToken } from '../src/utils/adminJwt.js'
import { normalizeReviewAnswers } from '../src/controllers/projectReviewController.js'
import { hashPassword, verifyPassword } from '../src/utils/password.js'
import {
  isAllowedReviewFile,
  MAX_REVIEW_FILES,
  MAX_REVIEW_FILE_SIZE,
} from '../src/middleware/uploadProjectReview.js'
import {
  contactKeys,
  legacyProductFormKey,
  legacyNewsletterKey,
  newsletterKey,
  projectReviewSubmissionSchema,
} from '../src/validations/projectReviewSchema.js'

const testSecret = '11'.repeat(32)

test('hashes admin passwords and rejects a different password', async () => {
  const password = 'admin@example-password'
  const hash = await hashPassword(password)

  assert.notEqual(hash, password)
  assert.equal(await verifyPassword(password, hash), true)
  assert.equal(await verifyPassword(`${password}-wrong`, hash), false)
})

test('issues a strict 24-hour admin JWT and verifies the auth endpoint contract', () => {
  const previousSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = testSecret

  const token = issueAdminToken()
  const claims = verifyAdminToken(token)
  assert.equal(claims.role, 'admin')
  assert.equal(claims.exp - claims.iat, 24 * 60 * 60)

  try {
    const request = {
      get: (header) => header === 'authorization' ? `Bearer ${token}` : '',
    }
    let middlewareStatus = 200
    let middlewareBody
    let nextCalled = false
    const middlewareResponse = {
      status(code) { middlewareStatus = code; return this },
      json(body) { middlewareBody = body; return this },
    }

    requireAdmin(request, middlewareResponse, () => { nextCalled = true })
    assert.equal(middlewareStatus, 200)
    assert.equal(middlewareBody, undefined)
    assert.equal(nextCalled, true)

    let authBody
    checkAdminAuth(request, { json(body) { authBody = body } })
    assert.equal(authBody.authenticated, true)
    assert.equal(authBody.role, 'admin')
    assert.equal(authBody.expiresAt, claims.exp)
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = previousSecret
  }
})

test('accepts a valid Project Review payload and requires all acknowledgements', () => {
  const review = {
    [contactKeys.name]: 'Test Customer',
    [contactKeys.email]: 'customer@example.com',
  }

  const acknowledgementLabels = [
    'I confirm that the information provided is accurate to the best of my knowledge.',
    'Packaging Consultants USA may contact me regarding this Project Review.',
    'I understand that submitting a Project Review does not create a contract or require either party to proceed.',
    'I acknowledge the Privacy Policy and Terms of Use.',
  ]

  acknowledgementLabels.forEach((label) => {
    review[`contact-submission:acknowledgements:${label}`] = true
  })

  const accepted = projectReviewSubmissionSchema.validate({ review }, { abortEarly: false })
  assert.equal(accepted.error, undefined)

  review['contact-submission:acknowledgements:I acknowledge the Privacy Policy and Terms of Use.'] = false
  const rejected = projectReviewSubmissionSchema.validate({ review }, { abortEarly: false })
  assert.ok(rejected.error)
})

test('accepts and migrates the legacy newsletter acknowledgement key', () => {
  const review = {
    [contactKeys.name]: 'Legacy Draft',
    [contactKeys.email]: 'legacy@example.com',
    [legacyNewsletterKey]: true,
  }

  const acknowledgementLabels = [
    'I confirm that the information provided is accurate to the best of my knowledge.',
    'Packaging Consultants USA may contact me regarding this Project Review.',
    'I understand that submitting a Project Review does not create a contract or require either party to proceed.',
    'I acknowledge the Privacy Policy and Terms of Use.',
  ]
  acknowledgementLabels.forEach((label) => {
    review[`contact-submission:acknowledgements:${label}`] = true
  })

  const accepted = projectReviewSubmissionSchema.validate({ review }, { abortEarly: false })
  assert.equal(accepted.error, undefined)

  const normalized = normalizeReviewAnswers(accepted.value.review)
  assert.equal(normalized[legacyNewsletterKey], undefined)
  assert.equal(normalized[newsletterKey], true)
})

test('Project Review uploads allow 30 files at 20 MB each', () => {
  assert.equal(MAX_REVIEW_FILES, 30)
  assert.equal(MAX_REVIEW_FILE_SIZE, 20 * 1024 * 1024)
})

test('Project Review uploads accept common images and videos', () => {
  const allowed = [
    ['photo.jpg', 'image/jpeg'],
    ['photo.heif', 'image/heif'],
    ['clip.mp4', 'video/mp4'],
    ['clip.mov', 'video/quicktime'],
    ['clip.webm', 'video/webm'],
  ]

  allowed.forEach(([originalname, mimetype]) => {
    assert.equal(isAllowedReviewFile({ originalname, mimetype }), true)
  })

  assert.equal(
    isAllowedReviewFile({ originalname: 'script.exe', mimetype: 'application/octet-stream' }),
    false,
  )
})

test('requires a specified product form when Other is selected', () => {
  const review = {
    [contactKeys.name]: 'Other Product',
    [contactKeys.email]: 'other-product@example.com',
    productForm: 'Other',
  }

  const acknowledgementLabels = [
    'I confirm that the information provided is accurate to the best of my knowledge.',
    'Packaging Consultants USA may contact me regarding this Project Review.',
    'I understand that submitting a Project Review does not create a contract or require either party to proceed.',
    'I acknowledge the Privacy Policy and Terms of Use.',
  ]
  acknowledgementLabels.forEach((label) => {
    review[`contact-submission:acknowledgements:${label}`] = true
  })

  const missingSpecification = projectReviewSubmissionSchema.validate(
    { review },
    { abortEarly: false },
  )
  assert.ok(missingSpecification.error)

  review.productFormOther = 'Gel'
  const specified = projectReviewSubmissionSchema.validate(
    { review },
    { abortEarly: false },
  )
  assert.equal(specified.error, undefined)
})

test('accepts and normalizes the legacy Product form field', () => {
  const review = {
    [contactKeys.name]: 'Legacy Product',
    [contactKeys.email]: 'legacy-product@example.com',
    [legacyProductFormKey]: 'Other: Software',
  }

  const acknowledgementLabels = [
    'I confirm that the information provided is accurate to the best of my knowledge.',
    'Packaging Consultants USA may contact me regarding this Project Review.',
    'I understand that submitting a Project Review does not create a contract or require either party to proceed.',
    'I acknowledge the Privacy Policy and Terms of Use.',
  ]
  acknowledgementLabels.forEach((label) => {
    review[`contact-submission:acknowledgements:${label}`] = true
  })

  const accepted = projectReviewSubmissionSchema.validate(
    { review },
    { abortEarly: false },
  )
  assert.equal(accepted.error, undefined)

  const normalized = normalizeReviewAnswers(accepted.value.review)
  assert.equal(normalized[legacyProductFormKey], undefined)
  assert.equal(normalized.productForm, 'Other')
  assert.equal(normalized.productFormOther, 'Software')
})
