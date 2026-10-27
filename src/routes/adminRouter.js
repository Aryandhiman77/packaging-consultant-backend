import { Router } from 'express'
import {
  createSettings,
  deleteSettingsById,
  getCurrentSettings,
  getSettingsById,
  listSettings,
  updateCurrentSettings,
  updateSettingsById,
} from '../controllers/settingsController.js'

export const adminRouter = Router()

export function checkAdminAuth(request, response) {
  response.json({
    authenticated: true,
    role: request.admin.role,
    email: request.admin.email,
    expiresAt: request.admin.expiresAt,
  })
}

adminRouter.get('/auth/check', checkAdminAuth)

adminRouter.get('/settings/current', getCurrentSettings)
adminRouter.put('/settings/current', updateCurrentSettings)
adminRouter.get('/settings', listSettings)
adminRouter.post('/settings', createSettings)
adminRouter.get('/settings/:id', getSettingsById)
adminRouter.put('/settings/:id', updateSettingsById)
adminRouter.patch('/settings/:id', updateSettingsById)
adminRouter.delete('/settings/:id', deleteSettingsById)
