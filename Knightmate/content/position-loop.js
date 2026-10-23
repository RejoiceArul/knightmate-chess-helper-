let lastIdleRecoveryFen=null,lastIdleRecoveryAt=0;
function pollChessBoard(){
 if(Date.now()-lastBoardPollTime<(autoplayFastMode?60:500))return;
 lastBoardPollTime=Date.now();
 if(activeAutoplayDrag||!extensionEnabled||!isAnalysisEnabled)return;
 if(!isGameOver&&gameTrackingSent&&Date.now()>=newGameGracePeriodUntil){
  const end=detectGameEndFromUI();
  if(end?.isOver){isGameOver=true;gameOverReason=end.reason;sendGameEnded('finished');_qbus.dispatchEvent(new CustomEvent('_qg',{detail:{reason:end.reason}}));_qbus.dispatchEvent(new CustomEvent('_qc'));cancelAutoplay();return;}
 }
 clearMoveListCache();
 const fen=extractFen();
 if(!fen||!isValidFen(fen))return;
 const position=fen.split(' ')[0];
 if(position!==lastPolledPosition){lastPolledPosition=position;_qbus.dispatchEvent(new CustomEvent('_qca'));return;}
 // extractFen has already resolved legal transitions; no move-list parity veto.
 autoplayExpectedTurn=null;autoplayMoveCount=null;
 if(fen!==currentFen){
  const fresh=!currentFen||isGameOver;currentFen=fen;
  if(fresh)resetForNewGame({source:'pollingLoop'});
  requestAnalysis(fen,fresh);return;
 }
 const board=findBoard();
 if(!board||isGameOver||!autoplayEnabled||isAnalyzing||autoplayTimer||activeAutoplayDrag)return;
 if(fen.split(' ')[1]!==(isBoardFlipped(board)?'b':'w'))return;
 if(lastAutoplayedFen===fen)return; // The existing 500ms move verifier handles this.
 if(lastBestMoveFen===fen&&lastBestMove){scheduleAutoplay(lastBestMove,fen);return;}
 if(lastIdleRecoveryFen===fen&&Date.now()-lastIdleRecoveryAt<(autoplayFastMode?300:750))return;
 lastIdleRecoveryFen=fen;lastIdleRecoveryAt=Date.now();
 recoverAutoplay(fen,'our turn without a pending move');
}
