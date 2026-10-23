!function(t){"use strict";function e(t){const e=new Map,n=t.split("/");for(let t=0;t<n.length;t++){const o=7-t;let r=0;for(const s of n[t])s>="1"&&s<="8"?r+=parseInt(s,10):(e.set(o+","+r,s),r++)}return e}const n=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]],o=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],r=[[1,1],[1,-1],[-1,1],[-1,-1]],s=[[1,0],[-1,0],[0,1],[0,-1]];function i(t,e,i,c){const f=(e,n)=>t.get(e+","+n),l=c?"P":"p",a=c?e-1:e+1;if(f(a,i-1)===l||f(a,i+1)===l)return!0;const u=c?"N":"n";if(n.some(([t,n])=>f(e+t,i+n)===u))return!0;const p=c?"K":"k";if(o.some(([t,n])=>f(e+t,i+n)===p))return!0;const h=[[r,c?"BQ":"bq"],[s,c?"RQ":"rq"]];for(const[t,n]of h)for(const[o,r]of t){let t=e+o,s=i+r;for(;t>=0&&t<8&&s>=0&&s<8;){const e=f(t,s);if(e){if(n.includes(e))return!0;break}t+=o,s+=r}}return!1}function c(t,n){const o=[];for(const[r,s]of e(t))"w"===n==(s===s.toUpperCase())&&o.push(r+s);return o}const f=new Set(["training","analysis","practice","settings","password","features","feedback","streamer","openings","broadcast","tournament","coordinate"]),l={getPositionLegalityError:function(t){const n=String(t||"").trim().split(/\s+/);if(n.length<2)return"Malformed FEN";const o=e(n[0]),r=Array.from(o.values()),s=r.filter(t=>"K"===t).length,c=r.filter(t=>"k"===t).length;if(1!==s||1!==c)return"Each side must have exactly one king";for(const[t,e]of o){const n=Number(t.split(",")[0]);if(!("P"!==e&&"p"!==e||0!==n&&7!==n))return"Pawn on the back rank"}const f=r.filter(t=>t===t.toUpperCase()),l=r.filter(t=>t!==t.toUpperCase());if(f.length>16||l.length>16||f.filter(t=>"P"===t).length>8||l.filter(t=>"p"===t).length>8)return"Too many pieces";const a="w"===n[1]?"k":"K";for(const[t,e]of o)if(e===a){const[e,r]=t.split(",").map(Number);if(i(o,e,r,"w"===n[1]))return"Side not to move is in check"}return null},isOwnMoveOnly:function(t,e,n){if(!t||!e||t===e)return!1;const o="w"===n?"b":"w",r=new Set(c(t,o)),s=c(e,o);if(s.length<r.size-1)return!1;for(const t of s)if(!r.has(t))return!1;return!0},isAnalyzablePage:function(t,e){if("www.chess.com"===t||"chess.com"===t)return/^\/(game\/(live|daily|computer)\/|game\/\d+|play(\/|$)|live(\/|$))/.test(e);if("lichess.org"===t){const t=e.match(/^\/([A-Za-z0-9]{8}(?:[A-Za-z0-9]{4})?)(?:\/(white|black))?\/?$/);return!!t&&!f.has(t[1].toLowerCase())}return!1}};t.ChessHelperPosition=l,"undefined"!=typeof module&&module.exports&&(module.exports=l)}("undefined"!=typeof globalThis?globalThis:this);// A checked king identifies the side to move when UI turn markers lag behind.
(function(root){
 const utils=root.ChessHelperPosition;
 utils.resolveCheckedTurn=function(fen){
  if(utils.getPositionLegalityError(fen)!=='Side not to move is in check')return fen;
  const fields=String(fen).split(/\s+/);fields[1]=fields[1]==='w'?'b':'w';
  const corrected=fields.join(' ');
  return utils.getPositionLegalityError(corrected)===null?corrected:fen;
 };
})(globalThis);
// Reconstruct turn/castling/en-passant from legal observed moves rather than
// waiting for clocks or move-list elements to finish updating.
(function(root){
 const utils=root.ChessHelperPosition;
 let states=new WeakMap();
 const placement=fen=>fen.split(' ')[0];
 utils.resetObservedPositions=()=>{states=new WeakMap();};
 utils.resolveObservedFen=function(fen,board,expectedMove){
  if(!board||typeof root.Chess!=='function')return fen;
  const valid=value=>{try{return !utils.getPositionLegalityError(value)&&new root.Chess().load(value);}catch{return false;}};
  const target=placement(fen),previous=states.get(board);
  const remember=(value,trusted)=>{states.set(board,{fen:value,trusted});return value;};
  if(!previous)return valid(fen)?remember(fen,false):null;
  if(placement(previous.fen)===target){
   if(previous.trusted){delete previous.pending;delete previous.since;return previous.fen;}
   return valid(fen)?remember(fen,false):null;
  }
  const chess=new root.Chess(previous.fen);
  const legal=chess.moves({verbose:true});
  const matchMove=move=>move.from+move.to+(move.promotion||'');
  const expected=legal.find(move=>matchMove(move)===expectedMove);
  if(expected){
   chess.move(expected);
   if(placement(chess.fen())===target)return remember(chess.fen(),true);
   // An immediate opponent reply can occur before our move is polled.
   for(const reply of chess.moves({verbose:true})){
    chess.move(reply);
    if(placement(chess.fen())===target)return remember(chess.fen(),true);
    chess.undo();
   }
   chess.undo();
  }
  for(const move of legal){
   chess.move(move);
   if(placement(chess.fen())===target)return remember(chess.fen(),true);
   chess.undo();
  }
  // Don't lock onto a capture/animation halfway through a board update.
  const now=Date.now();
  if(previous.pending!==target){previous.pending=target;previous.since=now;return null;}
  if(now-previous.since<600)return null;
  return valid(fen)?remember(fen,false):null;
 };
})(globalThis);
