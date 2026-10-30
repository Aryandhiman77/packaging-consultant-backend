// Non-destructive live API smoke checks. RUN_CONTACT_WRITE_TEST=1 inserts one test inquiry.
const base=(process.env.API_BASE_URL||'http://localhost:5050').replace(/\/$/,'')
const email=process.env.ADMIN_EMAIL
const password=process.env.ADMIN_PASSWORD
async function json(path,opts={}){const r=await fetch(base+path,opts);const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${path} => ${r.status}: ${body.message||''}`);return body}
const health=await json('/api/health');if(health.status!=='ok')throw new Error('Health failed')
const site=await json('/api/site-content');if(!site.data?.home?.quote1||!site.data?.footer?.links?.length)throw new Error('Site content missing')
const page=await json('/api/content/packaging-services/packaging-development');if(!page.data?.html)throw new Error('CMS page missing')
console.log('OK: public health, home/footer, seeded CMS page')
if(!email||!password){console.log('SKIP: admin validation (ADMIN_EMAIL/ADMIN_PASSWORD not set)');process.exit(0)}
const login=await json('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
const auth={Authorization:`Bearer ${login.token}`}
const pages=await json('/api/admin/content-pages',{headers:auth});if(pages.data.length<30)throw new Error('Editable pages missing')
const messages=await json('/api/admin/contact-messages',{headers:auth});if(!Array.isArray(messages.data))throw new Error('Inbox missing')
console.log('OK: secure admin login, content editor inventory, contact inbox')
if(process.env.RUN_CONTACT_WRITE_TEST==='1'){
 const reference=`Smoke test ${new Date().toISOString()}`
 const result=await json('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'Another question',message:reference,responses:['Initial email response'],name:'API Smoke Test',company:'',email:'smoke@example.com',telephone:'',cityState:'',contactMethod:'email',bestTime:'',consent:true,website:''})})
 if(!result.reference)throw new Error('Submission was not stored')
 const detail=await json(`/api/admin/contact-messages/${result.reference}`,{headers:auth})
 if(detail.data.message!==reference)throw new Error('Submission not retrieved from MongoDB')
 console.log('OK: contact submitted and retrieved from MongoDB',result.reference,'email:',result.notificationStatus)
}
