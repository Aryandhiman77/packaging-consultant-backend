import mongoose from 'mongoose'
const schema = new mongoose.Schema({
 topic:{type:String,required:true,maxlength:100},message:{type:String,required:true,maxlength:10000},
 responses:{type:[String],default:[]},name:{type:String,required:true,maxlength:150},company:{type:String,default:'',maxlength:200},
 email:{type:String,required:true,lowercase:true,trim:true,maxlength:255},telephone:{type:String,default:'',maxlength:50},
 cityState:{type:String,default:'',maxlength:200},contactMethod:{type:String,enum:['email','telephone'],default:'email'},
 bestTime:{type:String,default:'',maxlength:200},consent:{type:Boolean,required:true},
 status:{type:String,enum:['new','in-progress','resolved'],default:'new'},notes:{type:String,default:'',maxlength:5000},
 notificationStatus:{type:String,enum:['pending','sent','failed'],default:'pending'},notificationError:{type:String,default:''},notifiedAt:Date,
 clientEmailStatus:{type:String,enum:['pending','sent','failed'],default:'pending'},clientEmailError:{type:String,default:''},clientEmailedAt:Date,
 adminSeenAt:{type:Date,default:null},
},{timestamps:true,versionKey:false})
schema.index({createdAt:-1});schema.index({email:1,createdAt:-1})
export const ContactMessage = mongoose.model('ContactMessage',schema)
