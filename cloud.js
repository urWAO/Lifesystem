import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.LIFE_CONFIG||{};
const configured=cfg.supabaseUrl?.startsWith('https://')&&cfg.publishableKey&&!cfg.publishableKey.startsWith('PASTE_');
const client=configured?createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const $=id=>document.getElementById(id);
const status=msg=>{$('cloudStatus').textContent=msg};const pushStatus=msg=>{$('pushStatus').textContent=msg};
const message=e=>e?.message||String(e);
async function session(){if(!client)throw Error('First configure config.js and publish it to GitHub Pages.');const {data:{session},error}=await client.auth.getSession();if(error)throw error;if(!session)throw Error('Sign in first.');return session}
async function invoke(name,body){await session();const {data,error}=await client.functions.invoke(name,{body});if(error)throw error;return data}
function bytes(base64){const raw=atob(base64.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function getSubscription(){if(!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('Push is unavailable. On iPhone, open the installed Home Screen app.');const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription()}
async function sync(){await session();const saved=JSON.parse(localStorage.getItem('life-system-v1')||'{}');const quests=saved.quests||[];const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;const done=saved.days?.[today]?.done||[];
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const reminders=quests.filter(q=>q.reminderTime).map(q=>({quest_id:String(q.id),quest_name:q.name,reminder_time:q.reminderTime,repeat_days:q.reminderDays||[0,1,2,3,4,5,6],enabled:true,xp:q.xp}));
  await invoke('manage-push',{action:'sync',reminders,timezone,completedQuestIds:done.map(String)});
  pushStatus('Reminders synced. Notifications are sent only for enabled, incomplete quests.');
}
window.lifeCloud={sync};
$('cloudSignup').onclick=async()=>{try{if(!client)throw Error('Configure config.js first.');const {error}=await client.auth.signUp({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value});if(error)throw error;status('Sign-up requested. Check your email for confirmation, then sign in.')}catch(e){status(message(e))}};
$('cloudLogin').onclick=async()=>{try{if(!client)throw Error('Configure config.js first.');const {error}=await client.auth.signInWithPassword({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value});if(error)throw error;status('Signed in. Enable push on your iPhone.')}catch(e){status(message(e))}};
$('cloudLogout').onclick=async()=>{try{await client.auth.signOut();status('Signed out.')}catch(e){status(message(e))}};
$('pushEnable').onclick=async()=>{try{await session();if(!cfg.vapidPublicKey||cfg.vapidPublicKey.startsWith('PASTE_'))throw Error('Set VAPID public key in config.js.');if(!('Notification'in window))throw Error('Notifications unavailable on this device.');const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted.');const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(cfg.vapidPublicKey)});await invoke('manage-push',{action:'subscribe',subscription:sub.toJSON()});await sync();pushStatus('Push enabled on this device.');}catch(e){pushStatus(message(e))}};
$('pushSync').onclick=async()=>{try{await sync()}catch(e){pushStatus(message(e))}};
$('pushDisable').onclick=async()=>{try{const sub=await getSubscription();if(sub){await invoke('manage-push',{action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe()}pushStatus('Push disabled on this device.')}catch(e){pushStatus(message(e))}};
if(!configured)status('Open config.js and enter your Supabase URL and publishable key.');else client.auth.getUser().then(({data})=>status(data.user?'Signed in as '+data.user.email:'Sign in or create an account.')).catch(e=>status(message(e)));
