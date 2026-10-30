/**
 * Integration test against YOUR running API and MongoDB.
 * Requires API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD and RUN_INTEGRATION_TESTS=1.
 * Creates only a uniquely named test blog and deletes that test record afterward.
 */
const base = (process.env.API_BASE || 'http://127.0.0.1:5050').replace(/\/$/, '');
if(process.env.RUN_INTEGRATION_TESTS!=='1'){
 console.error('Set RUN_INTEGRATION_TESTS=1 to run. This test creates and removes a single test blog record.');
 process.exit(1);
}
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD){
 console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD for a valid admin.');process.exit(1);
}
async function api(path, opts={}){
 const response=await fetch(base+path, {...opts,headers:{...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(`${opts.method||'GET'} ${path} => ${response.status} ${JSON.stringify(json)}`);
 return json;
}
const login=await api('/api/admin/auth/login',{method:'POST',body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
const auth={Authorization:`Bearer ${login.token}`};
const slug=`cms-test-${Date.now()}-${Math.floor(Math.random()*100000)}`;
let id;
try{
 const payload={title:'Temporary integration test blog',slug,excerpt:'Temporary API check',html:'<p><span style="color:#c1282a">Test color</span></p>',metaTitle:'Temporary blog test SEO title',metaDescription:'Temporary integration test for the blog publishing flow and its SEO fields.',status:'draft'};
 const created=await api('/api/admin/blogs',{method:'POST',headers:auth,body:JSON.stringify(payload)});
 id=created.data._id;
 console.log('Draft created:',id);
 const detail=await api(`/api/admin/blogs/${id}`,{headers:auth});
 if(detail.data.metaTitle!==payload.metaTitle)throw new Error('SEO meta title did not persist');
 if(!detail.data.html.includes('color'))throw new Error('Editor text color was stripped');
 const publishedBefore=await fetch(base+`/api/blog/${slug}`);
 if(publishedBefore.status!==404)throw new Error('Draft leaked into public API');
 const published=await api(`/api/admin/blogs/${id}`,{method:'PATCH',headers:auth,body:JSON.stringify({...payload,status:'published'})});
 if(!published.data.publishedAt)throw new Error('Publishing date missing');
 const publicPost=await api(`/api/blog/${slug}`);
 if(publicPost.data.metaDescription!==payload.metaDescription)throw new Error('Public blog SEO fields mismatch');
 const list=await api('/api/blog');if(!list.data.some(x=>x.slug===slug))console.log('NOTE: Recent blog may be on a later page');
 console.log('PASS: save draft / SEO / color / draft privacy / publish / public read');
}finally{if(id){await api(`/api/admin/blogs/${id}`,{method:'DELETE',headers:auth});console.log('Cleaned up temporary test record');}}
