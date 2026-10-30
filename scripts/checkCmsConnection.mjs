// Run against YOUR own running Express + MongoDB instance; read-only checks.
// Usage: CMS_ADMIN_TOKEN='your-jwt' API_BASE_URL='http://localhost:5050' node scripts/checkCmsConnection.mjs
const api=(process.env.API_BASE_URL||'http://localhost:5050').replace(/\/$/,'')
const token=process.env.CMS_ADMIN_TOKEN
if(!token){console.error('Set CMS_ADMIN_TOKEN to a valid admin JWT first. This test never changes data.');process.exit(2)}
async function get(path,asAdmin=false){const response=await fetch(`${api}${path}`,{headers:asAdmin?{Authorization:`Bearer ${token}`}:{},cache:'no-store'});const json=await response.json();if(!response.ok)throw new Error(`${path}: HTTP ${response.status} ${json.message||''}`);return json.data??json}
const pages=await get('/api/admin/content-pages',true)
if(!Array.isArray(pages) || pages.length<30)throw new Error(`Expected seeded CMS pages, got ${pages?.length??'none'}`)
const groups=['packaging-services','industries','projects','about-us']
let count=0
for(const p of pages){if(!groups.some(g=>p.key.startsWith(g+'/')))continue
 const [group,slug]=p.key.split('/')
 const [admin,live]=await Promise.all([get(`/api/admin/content/${group}/${slug}`,true),get(`/api/content/${group}/${slug}`)])
 if(typeof admin.html!=='string'||!admin.html.trim()||live.html!==admin.html)throw new Error(`Mismatch on /${p.key}`)
 count++
}
console.log(`PASS: ${count} dropdown content pages returned matching admin/public HTML from Express + MongoDB.`)
console.log('This is a READ-ONLY API connectivity test; open the browser and save a test edit in staging to verify CKEditor visually.')
