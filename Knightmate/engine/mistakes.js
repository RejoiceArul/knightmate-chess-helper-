// Choose a scored alternative near the requested loss, measured in centipawns.
function chooseMistake(lines, severity) {
  const candidates=lines.filter(line=>line.mate===null && Number.isFinite(line.evaluation));
  if(candidates.length<2)return null;
  candidates.sort((a,b)=>b.evaluation-a.evaluation);
  const best=candidates[0].evaluation;
  const alternatives=candidates.slice(1).filter(line=>best-line.evaluation>=30);
  if(!alternatives.length)return null;
  const target=Math.max(50,Math.min(1000,Number(severity)||200));
  const ranked=alternatives.map(line=>({line,distance:Math.abs(best-line.evaluation-target)})).sort((a,b)=>a.distance-b.distance);
  const pool=ranked.filter(item=>item.distance<=ranked[0].distance+40);
  const selected=pool[Math.floor(Math.random()*pool.length)].line;
  return {...selected,lossCp:best-selected.evaluation};
}
