import nodemailer from 'nodemailer'
import { ContactMessage } from '../models/ContactMessage.js'
function configured(){return !!(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.CONTACT_NOTIFY_TO)}
const clean=value=>String(value??'').replace(/[\r\n]+/g,' ').slice(0,5000)
export async function sendContactNotification(doc){
  if(!configured()) return {status:'pending',message:'SMTP is not configured; submission saved in database'}
  const transport=nodemailer.createTransport({
    host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    secure:process.env.SMTP_SECURE==='true',
    ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}:{})
  })
  const text=['New Packaging Consultants USA Contact Message',`Reference: ${doc.id}`,`Name: ${clean(doc.name)}`,`Email: ${clean(doc.email)}`,`Company: ${clean(doc.company)}`,`Phone: ${clean(doc.telephone)}`,`City/State: ${clean(doc.cityState)}`,`Topic: ${clean(doc.topic)}`,`Response preferences: ${doc.responses.join(', ')}`,`Contact method: ${doc.contactMethod}`,`Best time: ${clean(doc.bestTime)}`,'Message:',String(doc.message)].join('\n')
  try{
    await transport.sendMail({from:process.env.SMTP_FROM,to:process.env.CONTACT_NOTIFY_TO,replyTo:doc.email,subject:`Packaging Consultants contact: ${clean(doc.topic)}`,text})
    await ContactMessage.updateOne({_id:doc._id},{$set:{notificationStatus:'sent',notificationError:'',notifiedAt:new Date()}})
    return {status:'sent'}
  }catch(err){
    await ContactMessage.updateOne({_id:doc._id},{$set:{notificationStatus:'failed',notificationError:clean(err.message)}})
    return {status:'failed',message:'Email notification failed; submission remains saved'}
  }finally{transport.close()}
}
