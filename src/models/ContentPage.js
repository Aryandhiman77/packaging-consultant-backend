import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  key: {type:String,required:true,unique:true,trim:true,maxlength:180},
  title: {type:String,required:true,trim:true,maxlength:200},
  heading: {type:String,trim:true,maxlength:200,default:''},
  html: {type:String,required:true,maxlength:200000},
},{timestamps:true,versionKey:false})
export const ContentPage = mongoose.model('ContentPage',schema)
