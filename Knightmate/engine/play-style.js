// Transparent heuristics for a configurable practice style, not a model of cognition.
function playContext(request) {
 const chess=new Chess(request.fen),moves=chess.moves({verbose:true});
 const fields=request.fen.split(' '),fullmove=Number(fields[5])||1;
 const material=(fields[0].match(/[qrbnQRBN]/g)||[]).length;
 const phase=fullmove<=12&&material>8?'opening':material<=5?'endgame':'middlegame';
 const familiar=request.phaseFamiliarity==='all'||request.phaseFamiliarity===phase;
 const fatigue=request.fatigueEnabled?Math.max(0,Math.min(1,(fullmove-20)/50)):0;
 const pressure={none:0,moderate:0.5,high:1}[request.simulatedPressure]||0;
 const composure={steady:1,overconfident:0.9,frustrated:0.8}[request.simulatedComposure]||1;
 const breadth=Math.max(2,Math.min(8,Number(request.candidateBreadth)||4));
 const complexity=Math.min(1,moves.length/45);
 const effort=composure*(familiar?0.85:1.15)*(1-0.3*fatigue)*(1-0.65*pressure)*(0.65+0.55*complexity);
 return {chess,moves,phase,familiar,fatigue,pressure,breadth,effort,
  time:Math.max(100,Math.round((Number(request.maxTimeMs)||2500)*effort)),
  depth:Math.max(1,Math.round((Number(request.depth)||15)-(familiar?0:2)-2*fatigue-3*pressure)),
  mistakeMultiplier:(1+(familiar?0:0.5)+fatigue+pressure)/composure};
}
function chooseStyleMove(lines,request,context) {
 if(lines.some(line=>line.mate!==null))return null;
 const candidates=lines.filter(line=>Number.isFinite(line.evaluation)).sort((a,b)=>b.evaluation-a.evaluation);
 if(candidates.length<2)return null;
 const best=candidates[0].evaluation;
 // Style changes are confined to closely scored alternatives. Larger errors
 // remain controlled by the single Mistakes toggle/frequency/severity section.
 const shortlist=candidates.filter(line=>best-line.evaluation<=45).slice(0,context.breadth);
 let selected=null,highest=-Infinity;
 for(const line of shortlist){
  const move=context.moves.find(move=>move.from+move.to+(move.promotion||'')===line.bestMove);
  if(!move)continue;
  const after=new Chess(request.fen);after.move(move);
  const check=after.in_check(),capture=!!move.captured;
  const center=['d4','e4','d5','e5','c4','f4','c5','f5'].includes(move.to);
  let bias=0;
  if(request.playStyle==='attacking')bias=(check?30:0)+(capture?12:0);
  if(request.playStyle==='simplifying')bias=(capture?30:0)+(move.piece==='q'&&capture?10:0);
  if(request.playStyle==='positional')bias=(center?22:0)+('nb'.includes(move.piece)?8:0);
  if(request.playStyle==='cautious')bias=(move.flags.includes('k')||move.flags.includes('q')?30:0)-(move.piece==='k'&&!move.flags.includes('k')&&!move.flags.includes('q')?20:0);
  const score=line.evaluation+bias;
  if(score>highest){highest=score;selected=line;}
 }
 return selected?{...selected,lossCp:best-selected.evaluation}:null;
}
