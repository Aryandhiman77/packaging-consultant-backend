import {Router} from 'express'
import Joi from 'joi'
import mongoose from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import { rateLimit } from 'express-rate-limit'
import {ContentPage} from '../models/ContentPage.js'
import {ContactMessage} from '../models/ContactMessage.js'
import {getSiteContent,getPage,ensurePagesSeeded} from '../services/siteContentService.js'
import {sendContactNotification} from '../services/submissionEmail.js'
const validKey=/^(packaging-services|industries|projects|about-us|resources)\/[a-z0-9-]{1,90}$/
const topicList=['A new product or package','An existing package','Package design or artwork','Manufacturing or sourcing','A quality or packaging problem','Shipping, receiving or supply','Packaging Times','Advertising or sponsorship','Another question']
const responseList=['Initial email response','Telephone conversation','Request to begin a Project Review','Information about Packaging Services','Information about Packaging Times','Advertising or sponsorship information']
const contactSchema=Joi.object({topic:Joi.string().valid(...topicList).required(),message:Joi.string().trim().min(5).max(10000).required(),responses:Joi.array().items(Joi.string().valid(...responseList)).unique().max(6).default([]),name:Joi.string().trim().min(2).max(150).required(),company:Joi.string().allow('').max(200).default(''),email:Joi.string().email({tlds:{allow:false}}).max(255).required(),telephone:Joi.string().allow('').max(50).default(''),cityState:Joi.string().allow('').max(200).default(''),contactMethod:Joi.string().valid('email','telephone').required(),bestTime:Joi.string().allow('').max(200).default(''),consent:Joi.boolean().valid(true).required(),website:Joi.string().allow('').default('')}).options({abortEarly:false,stripUnknown:true})
const htmlRules={allowedTags:['h1','h2','h3','h4','p','br','strong','b','em','i','u','s','blockquote','ul','ol','li','a','table','thead','tbody','tr','th','td','hr','span','figure','figcaption','img'],allowedAttributes:{a:['href','target','rel'],th:['colspan','rowspan'],td:['colspan','rowspan'],img:['src','alt','width','height'],figure:['class'],span:['style']},allowedStyles:{span:{color:[/^#[a-fA-F0-9]{3,8}$/,/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,/^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%(?:\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?))?\s*\)$/], 'background-color':[/^#[a-fA-F0-9]{3,8}$/,/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,/^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%(?:\s*,\s*(?:0(?:\.\d+)?|1(?:\.0+)?))?\s*\)$/]}},allowedSchemes:['http','https','mailto'],allowProtocolRelative:false,transformTags:{a:(tag,attrs)=>({tagName:'a',attribs:{href:attrs.href||'#',...(attrs.target==='_blank'?{target:'_blank',rel:'noopener noreferrer'}:{})}})}}
export function sanitizeRichHtml(input){return sanitizeHtml(input,htmlRules)}
const sanitize=sanitizeRichHtml
const linkSchema=Joi.object({label:Joi.string().trim().min(1).max(110).required(),href:Joi.string().trim().min(1).max(2048).pattern(/^(\/(?!\/)|https:\/\/|mailto:)/).required(),column:Joi.number().valid(1,2).required()})
const homeSchema=Joi.object(Object.fromEntries(['heading','lead','paragraph1','paragraph2','saying','quote1','quote2'].map(k=>[k,Joi.string().trim().min(1).max(15000).required()])))
const contactCopySchema=Joi.object(Object.fromEntries(['title','subtitle','intro','moreHeading','moreText'].map(k=>[k,Joi.string().trim().min(1).max(5000).required()])))
const siteSchema=Joi.object({home:homeSchema.required(),contact:contactCopySchema.required(),footer:Joi.object({address:Joi.string().max(3000).required(),email:Joi.string().email({tlds:{allow:false}}).required(),links:Joi.array().items(linkSchema).max(40).required()}).required()})
const pageSchema=Joi.object({title:Joi.string().trim().min(1).max(200).required(),heading:Joi.string().allow('').trim().max(200).default(''),html:Joi.string().max(200000).required()})
function validate(schema,data){const {error,value}=schema.validate(data);if(error){const err=new Error(error.details.map(d=>d.message).join('; '));err.status=400;throw err}return value}
function errorWrap(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next)}
function keyFrom(req){const key=`${req.params.group}/${req.params.slug}`;if(!validKey.test(key)){const err=new Error('Invalid content page URL');err.status=400;throw err}return key}
export const publicContentRouter=Router()
publicContentRouter.get('/site-content',errorWrap(async(_req,res)=>{res.json({data:await getSiteContent()})}))
publicContentRouter.get('/content/:group/:slug',errorWrap(async(req,res)=>{res.setHeader('Cache-Control','no-store');const page=await getPage(keyFrom(req));if(!page)return res.status(404).json({message:'Page not found'});res.json({data:page})}))
publicContentRouter.post('/contact',rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-8',legacyHeaders:false}),errorWrap(async(req,res)=>{
 const payload=validate(contactSchema,req.body)
 if(payload.website) return res.status(200).json({message:'Thank you',received:true}) // spam honeypot
 delete payload.website
 if(payload.contactMethod==='telephone' && !payload.telephone.trim()) return res.status(400).json({message:'Telephone number is required when you request a telephone response'})
 const doc=await ContactMessage.create(payload)
 let notify={admin:{status:'pending'},client:{status:'pending'}}
 try{notify=await sendContactNotification(doc)}catch(err){console.error('Contact saved, email delivery exception:',err.message)}
 res.status(201).json({message:'Your message was received',reference:doc.id,emailDelivery:{admin:notify.admin.status,client:notify.client.status}})
}))
export const adminContentRouter=Router()
adminContentRouter.get('/content-pages',errorWrap(async(_req,res)=>{await ensurePagesSeeded();res.json({data:await ContentPage.find({key:/^(packaging-services|industries|projects|about-us)\//}).sort({key:1}).select('key title updatedAt')})}))
adminContentRouter.get('/content/:group/:slug',errorWrap(async(req,res)=>{const page=await getPage(keyFrom(req));if(!page)return res.status(404).json({message:'Page not found'});res.json({data:page})}))
adminContentRouter.put('/content/:group/:slug',errorWrap(async(req,res)=>{const key=keyFrom(req);await ensurePagesSeeded();const data=validate(pageSchema,req.body);data.html=sanitize(data.html);const existing=await ContentPage.findOne({key});if(!existing)return res.status(404).json({message:'Page does not exist. New content pages are disabled.'});const page=await ContentPage.findOneAndUpdate({key},{$set:data},{returnDocument:'after',runValidators:true});res.json({data:page})}))
adminContentRouter.get('/site-content',errorWrap(async(_req,res)=>{res.json({data:await getSiteContent()})}))
adminContentRouter.put('/site-content',errorWrap(async(req,res)=>{const data=validate(siteSchema,req.body);const settings=await getSiteContent();settings.home=data.home;settings.contact=data.contact;settings.footer=data.footer;await settings.save();res.json({data:settings})}))
adminContentRouter.get('/contact-messages',errorWrap(async(req,res)=>{const page=Math.max(1,Math.min(1000,Number(req.query.page)||1));const [data,total]=await Promise.all([ContactMessage.find().sort({createdAt:-1}).skip((page-1)*25).limit(25),ContactMessage.countDocuments()]);res.json({data,total,page})}))
adminContentRouter.get('/contact-messages/:id',errorWrap(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid id'});const data=await ContactMessage.findById(req.params.id);if(!data)return res.status(404).json({message:'Not found'});res.json({data})}))
adminContentRouter.patch('/contact-messages/:id',errorWrap(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid id'});const data=validate(Joi.object({status:Joi.string().valid('new','in-progress','resolved').required(),notes:Joi.string().allow('').max(5000).required()}),req.body);const doc=await ContactMessage.findByIdAndUpdate(req.params.id,{$set:data},{returnDocument:'after',runValidators:true});if(!doc)return res.status(404).json({message:'Not found'});res.json({data:doc})}))
adminContentRouter.post('/contact-messages/:id/resend',errorWrap(async(req,res)=>{if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:'Invalid id'});const doc=await ContactMessage.findById(req.params.id);if(!doc)return res.status(404).json({message:'Not found'});const result=await sendContactNotification(doc);res.json({data:result})}))
