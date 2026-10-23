const defaults={autoplayFastMode:false,playStyleEnabled:false,playStyle:'positional',phaseFamiliarity:'opening',fatigueEnabled:true,simulatedPressure:'none',simulatedComposure:'steady',candidateBreadth:4,extensionEnabled:true,analysisEnabled:true,depth:15,autoplayEnabled:false,autoplayVariationEnabled:true,autoplayDelay:4000,autoplayDelayMin:2500,autoplayDelayMax:6500,autoplaySelectionMs:3000,autoplayHoldMs:700,autoplayDragMs:650,strengthLimited:true,targetElo:1800,mistakesEnabled:false,mistakeChance:10,mistakeSeverity:200};
const controls={autoplayFastMode:'autoplay-fast-mode',playStyleEnabled:'play-style-enabled',playStyle:'play-style',phaseFamiliarity:'phase-familiarity',fatigueEnabled:'fatigue-enabled',simulatedPressure:'simulated-pressure',simulatedComposure:'simulated-composure',candidateBreadth:'candidate-breadth',
 extensionEnabled:'enabled-toggle',analysisEnabled:'analysis-toggle',depth:'depth-input',autoplayEnabled:'autoplay-toggle',autoplayVariationEnabled:'variation-toggle',autoplayDelay:'delay-input',autoplayDelayMin:'delay-min-input',autoplayDelayMax:'delay-max-input',autoplaySelectionMs:'autoplaySelectionMs',autoplayHoldMs:'autoplayHoldMs',autoplayDragMs:'autoplayDragMs',strengthLimited:'strength-limited',targetElo:'target-elo',mistakesEnabled:'mistakes-enabled',mistakeChance:'mistake-chance',mistakeSeverity:'mistake-severity'
};
const labels={depth:'depth-value',autoplayDelay:'delay-value',autoplayDelayMin:'delay-min-value',autoplayDelayMax:'delay-max-value',autoplaySelectionMs:'autoplaySelectionMsValue',autoplayHoldMs:'autoplayHoldMsValue',autoplayDragMs:'autoplayDragMsValue',targetElo:'target-elo-value',mistakeChance:'mistake-chance-value'};
let settings={...defaults};
function updateUI(){
 for(const [key,id] of Object.entries(controls)){
  const input=document.getElementById(id);
  if(input.type==='checkbox')input.checked=settings[key];else input.value=settings[key];
  if(labels[key])document.getElementById(labels[key]).textContent=key==='depth'?'Depth '+settings[key]:key==='mistakeChance'?settings[key]+'%':key.startsWith('autoplay')?settings[key]+'ms':settings[key];
 }
 for(const [key,id] of Object.entries(controls))document.getElementById(id).disabled=settings.autoplayFastMode&&!['autoplayFastMode','extensionEnabled'].includes(key);
 document.getElementById('bullet-note').hidden=!settings.autoplayFastMode;
 document.querySelector('.popup-container').classList.toggle('popup-disabled',!settings.extensionEnabled);
 document.getElementById('delay-min-section').style.display=settings.autoplayVariationEnabled?'block':'none';
 document.getElementById('delay-max-section').style.display=settings.autoplayVariationEnabled?'block':'none';
 document.getElementById('delay-fixed-section').style.display=settings.autoplayVariationEnabled?'none':'block';
}
async function save(key,input){
 const value=input.type==='checkbox'?input.checked:input.tagName==='SELECT'&&['playStyle','phaseFamiliarity','simulatedPressure','simulatedComposure'].includes(key)?input.value:Number(input.value);
 const changed={[key]:value};
 if(key==='autoplayDelayMin' && value>=settings.autoplayDelayMax)changed.autoplayDelayMax=Math.min(30000,value+100);
 if(key==='autoplayDelayMax' && value<=settings.autoplayDelayMin)changed.autoplayDelayMin=Math.max(100,value-100);
 Object.assign(settings,changed);updateUI();
 try{await chrome.storage.local.set(changed);document.querySelector('.status-text').textContent='Saved';}
 catch{document.querySelector('.status-text').textContent='Error saving';}
}
async function setupHistory(){
 const {localGames=[]}=await chrome.storage.local.get('localGames');
 document.getElementById('history-count').textContent=`${localGames.length} games saved on this device`;
 document.getElementById('export-history').addEventListener('click',async()=>{
  const {localGames=[]}=await chrome.storage.local.get('localGames');
  const url=URL.createObjectURL(new Blob([JSON.stringify(localGames,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='knightmate-games.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
async function init(){
 settings={...defaults,...await chrome.storage.local.get(defaults)};updateUI();
 document.getElementById('brand-link').addEventListener('click',event=>event.preventDefault());
 for(const [key,id] of Object.entries(controls)){
  const input=document.getElementById(id);
  input.addEventListener('change',()=>save(key,input));
  if(labels[key])input.addEventListener('input',()=>{
   const value=Number(input.value);
   document.getElementById(labels[key]).textContent=key==='depth'?'Depth '+value:key==='mistakeChance'?value+'%':key.startsWith('autoplay')?value+'ms':value;
  });
 }
 await setupHistory();
 try{
  const response=await chrome.runtime.sendMessage({type:'GET_SELECTOR_DIAGNOSTICS'});
  if(response?.diagnostics?.results){
   const diagnostic=response.diagnostics;
   const broken=Object.entries(diagnostic.results).filter(([,value])=>value.category==='core'&&!value.working).map(([key])=>key);
   const health=document.getElementById('dom-health');health.style.display='flex';health.classList.add(broken.length?'health-error':'health-ok');
   document.getElementById('dom-health-text').textContent=broken.length?'DOM: missing '+broken.join(', '):'DOM: core selectors OK ('+diagnostic.platform+')';
  }
 }catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
