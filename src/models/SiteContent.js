import mongoose from 'mongoose'
const footerLink = new mongoose.Schema({label:{type:String,required:true,maxlength:110},href:{type:String,required:true,maxlength:2048},column:{type:Number,enum:[1,2],default:1}}, {_id:true})
const schema = new mongoose.Schema({
 key:{type:String,unique:true,default:'site'},
 home:{heading:{type:String,required:true},lead:{type:String,required:true},paragraph1:{type:String,required:true},paragraph2:{type:String,required:true},saying:{type:String,required:true},quote1:{type:String,required:true},quote2:{type:String,required:true}},
 contact:{title:{type:String,default:'Contact Us'},subtitle:{type:String,default:'Let’s Begin With Your Question'},intro:{type:String,default:''},moreHeading:{type:String,default:'Have More Project Information Available?'},moreText:{type:String,default:''}},
 footer:{address:{type:String,default:''},email:{type:String,default:''},links:{type:[footerLink],default:[]}},
},{timestamps:true,versionKey:false})
export const SiteContent=mongoose.model('SiteContent',schema)
