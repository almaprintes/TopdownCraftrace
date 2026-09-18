// RACE Control Online — lazy backend client.
// Importing this module performs no authentication or network request.
let clientPromise=null;
let authPromise=null;

export async function getOnlineClient(){
  if(!clientPromise){
    clientPromise=import('@supabase/supabase-js').then(({createClient})=>
      createClient(import.meta.env.VITE_TDR_BACKEND_URL,import.meta.env.VITE_TDR_BACKEND_PUBLIC,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
      })
    ).catch(err=>{clientPromise=null;throw err;});
  }
  return clientPromise;
}

export async function ensureOnlineSession(){
  if(authPromise)return authPromise;
  authPromise=(async()=>{
    const client=await getOnlineClient();
    const current=await client.auth.getSession();
    if(current.error)throw current.error;
    if(current.data?.session?.user)return current.data.session;
    const created=await client.auth.signInAnonymously();
    if(created.error)throw created.error;
    if(!created.data?.session?.user)throw new Error('Online session unavailable');
    return created.data.session;
  })();
  try{return await authPromise;}finally{authPromise=null;}
}
