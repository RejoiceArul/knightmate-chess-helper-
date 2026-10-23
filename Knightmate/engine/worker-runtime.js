// Keep a ready worker between searches. Failed or cancelled searches discard it.
let localEngineSlot=null;
function discardLocalEngine(worker,reason=new Error('Engine restarted')){
 const slot=localEngineSlot;
 if(!slot || (worker&&slot.worker!==worker))return;
 localEngineSlot=null;slot.fail(reason);slot.worker.terminate();
}
function getLocalEngine(){
 if(localEngineSlot)return localEngineSlot.promise;
 const worker=new Worker('stockfish-19-lite-single.js');
 const slot={worker};localEngineSlot=slot;
 slot.promise=new Promise((resolve,reject)=>{
  let settled=false;
  const timer=setTimeout(()=>discardLocalEngine(worker,new Error('Local engine startup timed out')),5000);
  slot.fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
  worker.onerror=event=>discardLocalEngine(worker,new Error(event.message||'Local engine failed to load'));
  worker.onmessage=event=>{
   for(const line of String(event.data).split('\n')){
    if(line==='uciok')worker.postMessage('isready');
    if(line==='readyok'&&!settled){settled=true;clearTimeout(timer);worker.onmessage=null;worker.onerror=null;resolve(worker);}
   }
  };
  worker.postMessage('uci');
 });
 return slot.promise;
}
