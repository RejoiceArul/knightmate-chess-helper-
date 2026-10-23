let autoplayFastMode=false;
// Mouse-button hold and smooth piece dragging for local autoplay.
let autoplaySelectionMs = 3000;
let autoplayHoldMs = 700;
let autoplayDragMs = 650;
let activeAutoplayDrag = null;
function cancelAutoplayDrag() { activeAutoplayDrag?.abort(); }
function dragTiming(value) {
  return Math.round(value * (autoplayVariationEnabled ? 0.8 + Math.random() * 0.4 : 1));
}
async function fastAutoplayMove(move,board,fen){
 const controller=new AbortController();activeAutoplayDrag=controller;
 const valid=()=>!controller.signal.aborted&&autoplayEnabled&&extensionEnabled&&isAnalysisEnabled&&!isGameOver&&currentFen===fen&&board.isConnected;
 try{
  if(!valid()||!clickSquare(move.from.square,board))return false;
  await new Promise(resolve=>{
   const timer=setTimeout(done,60);
   function done(){clearTimeout(timer);controller.signal.removeEventListener('abort',done);resolve();}
   controller.signal.addEventListener('abort',done,{once:true});
  });
  return valid()&&clickSquare(move.to.square,board);
 }finally{if(activeAutoplayDrag===controller)activeAutoplayDrag=null;}
}
async function dragAutoplayMove(move, board, fen) {
  if(autoplayFastMode)return fastAutoplayMove(move,board,fen);
  const from = getSquarePixelCoords(move.from.file, move.from.rank, board);
  const to = getSquarePixelCoords(move.to.file, move.to.rank, board);
  if (!from || !to) return false;
  const overlay = document.getElementById('_qo');
  const display = overlay?.style.display;
  if (overlay) overlay.style.display = 'none';
  let target = document.elementFromPoint(from.x, from.y);
  if (overlay) overlay.style.display = display;
  if (!target || !board.contains(target)) return false;
  const controller = new AbortController();
  activeAutoplayDrag = controller;
  let held = false, position = from;
  const valid = () => !controller.signal.aborted && autoplayEnabled && extensionEnabled && isAnalysisEnabled && !isGameOver && currentFen === fen && board.isConnected;
  const emit = (type, point, buttons, element = target) => {
    const options = {bubbles:true,cancelable:true,view:window,clientX:point.x,clientY:point.y,button:0,buttons};
    const event = type.startsWith('pointer')
      ? new PointerEvent(type,{...options,pointerType:'mouse',isPrimary:true,pointerId:1})
      : new MouseEvent(type,options);
    element.dispatchEvent(event);
  };
  const wait = ms => new Promise(resolve => {
    if (controller.signal.aborted) return resolve();
    const done=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',done);resolve();};
    const timer=setTimeout(done,ms);controller.signal.addEventListener('abort',done,{once:true});
  });
  try {
    if (!valid()) return false;
    emit('pointermove',from,0);emit('mousemove',from,0);
    // A complete source click lets the board render its own selection highlights.
    emit('pointerdown',from,1);emit('mousedown',from,1);
    emit('pointerup',from,0);emit('mouseup',from,0);emit('click',from,0);
    await wait(dragTiming(autoplaySelectionMs));
    if (!valid()) return false;
    if (overlay) overlay.style.display='none';
    target=document.elementFromPoint(from.x,from.y);
    if (overlay) overlay.style.display=display;
    if (!target || !board.contains(target)) return false;
    held = true;
    emit('pointerdown',from,1);emit('mousedown',from,1);
    await wait(dragTiming(autoplayHoldMs));
    if (!valid()) return false;
    const duration=dragTiming(autoplayDragMs), start=performance.now();
    while (true) {
      if (!valid()) return false;
      const progress=Math.min(1,(performance.now()-start)/duration);
      const eased=progress*progress*(3-2*progress);
      position={x:from.x+(to.x-from.x)*eased,y:from.y+(to.y-from.y)*eased};
      emit('pointermove',position,1);emit('mousemove',position,1);
      if(progress===1) break;
      await wait(16);
    }
    if (!valid()) return false;
    const destination=document.elementFromPoint(to.x,to.y);
    const dropTarget=destination && board.contains(destination) ? destination : board;
    emit('pointerup',to,0,dropTarget);emit('mouseup',to,0,dropTarget);
    held=false;
    return true;
  } finally {
    if(held){
      // Return to the starting square before releasing a cancelled drag.
      emit('pointermove',from,1);emit('mousemove',from,1);
      emit('pointercancel',from,0);emit('pointerup',from,0);emit('mouseup',from,0);
    }
    if(activeAutoplayDrag===controller)activeAutoplayDrag=null;
  }
}
