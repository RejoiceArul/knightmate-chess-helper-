let recoveryFen=null,recoveryAttempts=0,recoveryTimer=null;
function resetAutoplayRecovery(){
 clearTimeout(recoveryTimer);recoveryTimer=null;recoveryFen=null;recoveryAttempts=0;
}
function recoverAutoplay(fen,reason){
 if(!autoplayEnabled||!extensionEnabled||!isAnalysisEnabled||isGameOver||currentFen?.split(" ")[0]!==fen.split(" ")[0])return;
 if(recoveryFen!==fen){recoveryFen=fen;recoveryAttempts=0;}
 if(recoveryTimer)return;
 if(recoveryAttempts>=2){
  _qbus.dispatchEvent(new CustomEvent('_qe',{detail:{error:'Autoplay could not complete this move. Use Retry or check the board.',canRetry:true}}));
  return;
 }
 recoveryAttempts++;
 recoveryTimer=setTimeout(()=>{
  recoveryTimer=null;
  if(!autoplayEnabled||!extensionEnabled||!isAnalysisEnabled||isGameOver||currentFen?.split(" ")[0]!==fen.split(" ")[0])return;
  clearMoveListCache();
  const actual=extractFen();
  if(!actual||actual.split(' ')[0]!==fen.split(' ')[0])return;
  const board=findBoard();
  if(!board||actual.split(' ')[1]!==(isBoardFlipped(board)?'b':'w'))return;
  lastAutoplayedFen=null;lastApiPosition=null;autoplayExpectedTurn=null;autoplayMoveCount=null;
  currentFen=actual;
  _log('[Knightmate] Retrying autoplay:',reason,recoveryAttempts);
  requestAnalysis(actual,false);
 },450);
}
async function analyzeWithTimeout(message){
 let timer;
 try{
  return await Promise.race([
   chrome.runtime.sendMessage(message),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Local analysis response timed out')),autoplayFastMode?7000:25000);})
  ]);
 }finally{clearTimeout(timer);}
}
