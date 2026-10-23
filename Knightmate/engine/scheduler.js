// Only the newest position from each client remains queued.
const pendingEngineJobs=new Map();
let activeEngineJob=null;
function replyEngineJob(job,result){if(!job.replied){job.replied=true;job.respond(result);}}
function cancelledResult(){return {success:false,cancelled:true,error:'Analysis superseded or cancelled'};}
function cancelEngineClient(clientId,token){
 const pending=pendingEngineJobs.get(clientId);
 if(pending&&(!token||pending.message.requestToken===token)){
  pendingEngineJobs.delete(clientId);replyEngineJob(pending,cancelledResult());
 }
 const active=activeEngineJob;
 if(active&&active.clientId===clientId&&(!token||active.message.requestToken===token)){
  active.controller.abort();discardLocalEngine(null,new Error('Analysis cancelled'));
  replyEngineJob(active,cancelledResult());
 }
}
function drainEngineJobs(){
 if(activeEngineJob||!pendingEngineJobs.size)return;
 const [key,job]=pendingEngineJobs.entries().next().value;
 pendingEngineJobs.delete(key);activeEngineJob=job;
 Promise.resolve().then(()=>analyze(job.message,job.controller.signal))
  .then(result=>replyEngineJob(job,job.controller.signal.aborted?cancelledResult():result),error=>replyEngineJob(job,job.controller.signal.aborted?cancelledResult():{success:false,error:error.message}))
  .finally(()=>{if(activeEngineJob===job)activeEngineJob=null;drainEngineJobs();});
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.target!=='local-engine')return false;
 const clientId=message.clientId||'default';
 if(message.type==='CANCEL'){
  cancelEngineClient(clientId,message.requestToken);respond({success:true});return false;
 }
 cancelEngineClient(clientId);
 pendingEngineJobs.set(clientId,{clientId,message,respond,replied:false,controller:new AbortController()});
 drainEngineJobs();return true;
});
