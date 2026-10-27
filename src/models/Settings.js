import mongoose from 'mongoose'
import { defaultSocialLinks } from '../data/defaultSocialLinks.js'

const childNavigationSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 100 },
  link: { type: String, required: true, trim: true, maxlength: 2048 },
}, { _id: true })

const navigationSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 100 },
  link: { type: String, required: true, trim: true, maxlength: 2048 },
  children: { type: [childNavigationSchema], default: [] },
}, { _id: true })

const socialLinksSchema = new mongoose.Schema({
  x: { type: String, required: true, trim: true, maxlength: 2048, default: defaultSocialLinks.x },
  facebook: { type: String, required: true, trim: true, maxlength: 2048, default: defaultSocialLinks.facebook },
  youtube: { type: String, required: true, trim: true, maxlength: 2048, default: defaultSocialLinks.youtube },
  linkedin: { type: String, required: true, trim: true, maxlength: 2048, default: defaultSocialLinks.linkedin },
}, { _id: false })

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, default: 'site' },
  navigationPreset: { type: String, trim: true, default: null },
  topNavigation: { type: [navigationSchema], default: [] },
  socialLinks: { type: socialLinksSchema, default: () => ({}) },
}, {
  timestamps: true,
  versionKey: false,
})

export const Settings = mongoose.model('Settings', settingsSchema)
