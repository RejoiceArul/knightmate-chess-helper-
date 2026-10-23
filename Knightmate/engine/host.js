async function analyze(request,signal) {
  if(typeof request.fen !== 'string' || request.fen.split(' ').length !== 6) throw new Error('Invalid position');
  const position=new Chess(request.fen);
  const preferChecks=!!request.prioritizeChecks&&!position.in_check();
  const context=request.playStyleEnabled?playContext(request):null;
  const depth=Math.max(1,Math.min(30,context?context.depth:Number(request.depth)||15));
  const time=Math.max(100,Math.min(15000,context?context.time:Number(request.maxTimeMs)||2500));
  if(signal?.aborted)throw new Error('Analysis cancelled');
  const worker=await getLocalEngine();
  if(signal?.aborted){discardLocalEngine(worker);throw new Error('Analysis cancelled');}
  return new Promise((resolve,reject)=>{
    let phase='ready', evaluation=0,mate=null,reachedDepth=0;
    let settled=false,phaseTimer,stopTimer,graceTimer;
    const mistakeRequested=!!request.mistakesEnabled && Math.random()*100<Math.max(0,Math.min(100,(Number(request.mistakeChance)||0)*(context?.mistakeMultiplier||1)));
    const variations=new Map();
    const abort=()=>finish(new Error('Analysis cancelled'));
    const finish=(error,result)=>{
      if(settled)return;settled=true;
      clearTimeout(phaseTimer);clearTimeout(stopTimer);clearTimeout(graceTimer);
      signal?.removeEventListener('abort',abort);
      worker.onmessage=null;worker.onerror=null;
      if(error){discardLocalEngine(worker,error);reject(error);}else {worker.onerror=event=>discardLocalEngine(worker,new Error(event.message||'Idle engine failed'));resolve(result);}
    };
    signal?.addEventListener('abort',abort,{once:true});
    phaseTimer=setTimeout(()=>finish(new Error('Local engine readiness timed out')),5000);
    worker.onerror=event=>finish(new Error(event.message||'Could not start local Stockfish'));
    worker.onmessage=event=>{
      try{for(const line of String(event.data).split('\n')) {
        if(line==='readyok' && phase==='ready') {
          clearTimeout(phaseTimer);phase='search';
          worker.postMessage('position fen '+request.fen);
          worker.postMessage(`go depth ${depth} movetime ${time}`);
          stopTimer=setTimeout(()=>{
            worker.postMessage('stop');
            graceTimer=setTimeout(()=>finish(new Error('Local engine stopped responding; restarted')),1000);
          },time+300);
        }
        if(line.startsWith('info ')) {
          const d=line.match(/\bdepth (\d+)/), score=line.match(/\bscore (cp|mate) (-?\d+)/);
          if(d) reachedDepth=Number(d[1]);
          const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)(?: ([a-h][1-8][a-h][1-8][qrbn]?))?/),index=line.match(/\bmultipv (\d+)/);
          if((mistakeRequested || context || preferChecks) && pv && score && d && !/\b(?:lowerbound|upperbound)\b/.test(line)){
            const level=Number(d[1]);
            if(!variations.has(level))variations.set(level,new Map());
            variations.get(level).set(Number(index?.[1]||1),{bestMove:pv[1],ponder:pv[2]||null,evaluation:score[1]==='cp'?Number(score[2]):null,mate:score[1]==='mate'?Number(score[2]):null,depth:level});
          }
          if(score){mate=score[1]==='mate'?Number(score[2]):null;evaluation=score[1]==='cp'?Number(score[2]):0;}
        }
        if(line.startsWith('bestmove ')) {
          const tokens=line.split(/\s+/);
          let bestMove=tokens[1],ponder=tokens[2]==='ponder'?tokens[3]:null,mistake=null;
          let styleMove=null;
          if(context){
            const levels=[...variations.keys()].sort((a,b)=>b-a);
            const level=levels.find(level=>variations.get(level).size>=2);
            if(level!==undefined)styleMove=chooseStyleMove([...variations.get(level).values()],request,context);
            if(styleMove){bestMove=styleMove.bestMove;ponder=styleMove.ponder;evaluation=styleMove.evaluation;mate=styleMove.mate;reachedDepth=styleMove.depth;}
          }
          if(mistakeRequested){
            // Use a single search depth with multiple scored moves.
            const levels=[...variations.keys()].sort((a,b)=>b-a);
            const level=levels.find(level=>variations.get(level).size>=2);
            if(level!==undefined)mistake=chooseMistake([...variations.get(level).values()],request.mistakeSeverity);
            if(mistake){bestMove=mistake.bestMove;ponder=mistake.ponder;evaluation=mistake.evaluation;mate=mistake.mate;reachedDepth=mistake.depth;}
          }
          let checkMove=null;
          if(preferChecks&&!mistake){
            const level=[...variations.keys()].sort((a,b)=>b-a).find(level=>variations.get(level).size>=2);
            if(level!==undefined)checkMove=chooseBulletCheck([...variations.get(level).values()],request.fen);
            if(checkMove){bestMove=checkMove.bestMove;ponder=checkMove.ponder;evaluation=checkMove.evaluation;mate=checkMove.mate;reachedDepth=checkMove.depth;}
          }
          if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestMove)) return finish(new Error('No legal move: position may be finished'));
          if(!new Chess(request.fen).move({from:bestMove.slice(0,2),to:bestMove.slice(2,4),promotion:bestMove[4]||'q'}))return finish(new Error('Engine returned an illegal move'));
          finish(null,{success:true,data:{success:true,analysis:{bestMove,ponder,evaluation,mate,depth:reachedDepth},meta:{local:true,checkPreferenceApplied:!!checkMove,playStyleApplied:!!styleMove,phase:context?.phase,familiar:context?.familiar,fatigue:context?.fatigue,simulatedPressure:context?.pressure,mistakeApplied:!!mistake,mistakeLossCp:mistake?.lossCp||0,strengthLimited:request.strengthLimited!==false,targetElo:Math.max(1320,Math.min(3190,Number(request.targetElo)||1800))}}});
        }
      }}catch(error){finish(error);}
    };
    const limited=request.strengthLimited!==false;
    const elo=Math.max(1320,Math.min(3190,Number(request.targetElo)||1800));
    worker.postMessage('setoption name UCI_LimitStrength value '+limited);
    worker.postMessage('setoption name UCI_Elo value '+elo);
    worker.postMessage('setoption name MultiPV value '+((mistakeRequested||context)?12:preferChecks?5:1));
    worker.postMessage('isready');
  });
}
