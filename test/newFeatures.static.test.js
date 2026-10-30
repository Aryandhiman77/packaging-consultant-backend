import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import seedPages from '../src/data/initialPages.json' with {type:'json'}
import {initialSiteContent} from '../src/data/initialSiteContent.js'
import {defaultTopNavigation} from '../src/data/defaultNavigation.js'
const load=file=>readFileSync(new URL(file,import.meta.url),'utf8')
test('every existing editable submenu content is seeded and project review left untouched',()=>{
 assert.equal(seedPages.filter(x=>x.key.startsWith('packaging-services/')).length,10)
 assert.equal(seedPages.filter(x=>x.key.startsWith('industries/')).length,9)
 assert.equal(seedPages.filter(x=>x.key.startsWith('projects/')).length,7)
 assert.equal(seedPages.filter(x=>x.key.startsWith('about-us/')).length,4)
 assert.ok(seedPages.every(x=>x.title && x.html && !x.key.startsWith('project-review/')))
 assert.equal(seedPages.find(x=>x.key==='resources/blog')?.title,'Blog')
})
test('default footer and navigation use real routes, not dead placeholder anchors',()=>{
 assert.ok(initialSiteContent.footer.links.some(x=>x.href==='/contact-us'))
 assert.ok(initialSiteContent.footer.links.some(x=>x.href==='https://packagingtimes.com/'))
 const times=defaultTopNavigation.find(x=>x.label==='Packaging Times')
 assert.equal(times.link,'https://packagingtimes.com/')
 assert.equal(times.children[0].link,'https://packagingtimes.com/')
 assert.ok(defaultTopNavigation.find(x=>x.label==='Contact Us').link==='/contact-us')
})
test('homepage selected sections and quotes seeded without changing hero',()=>{
 const home=initialSiteContent.home
 assert.equal(home.heading,'Packaging Decisions from the Market Backward')
 assert.match(home.quote1,/Packaging Makes That Important First Sale/)
 assert.match(home.quote2,/Think of Your Packaging As Your Key Sales Person/)
})
test('contact submission and content admin routes are present',()=>{
 const routes=load('../src/routes/contentRouter.js')
 for(const endpoint of ["'/contact'","'/contact-messages'","'/site-content'","'/content/:group/:slug'"])assert.ok(routes.includes(endpoint),endpoint)
 assert.ok(routes.includes("contactMethod==='telephone'"))
 assert.ok(routes.includes('ContactMessage.create(payload)'))
})
