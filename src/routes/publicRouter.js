import { Router } from 'express'
import { getPublicNavigation } from '../controllers/settingsController.js'

export const publicRouter = Router()

publicRouter.get('/settings/navigation', getPublicNavigation)
