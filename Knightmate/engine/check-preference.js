// Prefer a checking move only within half a pawn of the best scored candidate.
function chooseBulletCheck(lines,fen){
 if(new Chess(fen).in_check())return null;
 if(lines.some(line=>line.mate!==null))return null;
 const candidates=lines.filter(line=>Number.isFinite(line.evaluation)).sort((a,b)=>b.evaluation-a.evaluation);
 if(candidates.length<2)return null;
 const chess=new Chess(fen),legal=chess.moves({verbose:true}),best=candidates[0].evaluation;
 for(const line of candidates){
  if(best-line.evaluation>50)continue;
  const move=legal.find(move=>move.from+move.to+(move.promotion||'')===line.bestMove);
  if(!move)continue;
  const after=new Chess(fen);after.move(move);
  if(after.in_check())return {...line,lossCp:best-line.evaluation};
 }
 return null;
}
