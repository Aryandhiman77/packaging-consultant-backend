import { SiteContent } from '../models/SiteContent.js'
import { ContentPage } from '../models/ContentPage.js'
import { initialSiteContent } from '../data/initialSiteContent.js'
import seedPages from '../data/initialPages.json' with {type:'json'}
export async function getSiteContent(){return SiteContent.findOneAndUpdate({key:'site'},{$setOnInsert:initialSiteContent},{upsert:true,returnDocument:'after',setDefaultsOnInsert:true})}
let seedPromise
export function ensurePagesSeeded(){
  // Seed once per process; $setOnInsert never overwrites editor changes.
  if(!seedPromise){seedPromise=ContentPage.bulkWrite(seedPages.map(page=>({updateOne:{filter:{key:page.key},update:{$setOnInsert:page},upsert:true}})),{ordered:false}).catch(err=>{seedPromise=null;throw err})}
  return seedPromise
}
export async function getPage(key){
  await ensurePagesSeeded()
  return ContentPage.findOne({key})
}
