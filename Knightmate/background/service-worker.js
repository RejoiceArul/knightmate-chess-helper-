const keys = ['autoplayFastMode','playStyleEnabled','playStyle','phaseFamiliarity','fatigueEnabled','simulatedPressure','simulatedComposure','candidateBreadth','mistakesEnabled','mistakeChance','mistakeSeverity','strengthLimited','targetElo','autoplaySelectionMs','autoplayHoldMs','autoplayDragMs','extensionEnabled','analysisEnabled','depth','autoplayEnabled','autoplayDelay','autoplayDelayMin','autoplayDelayMax','autoplayVariationEnabled'];
const defaults={autoplayFastMode:false,playStyleEnabled:false,playStyle:'positional',phaseFamiliarity:'opening',fatigueEnabled:true,simulatedPressure:'none',simulatedComposure:'steady',candidateBreadth:4,mistakesEnabled:false,mistakeChance:10,mistakeSeverity:200,strengthLimited:true,targetElo:1800,extensionEnabled:true,analysisEnabled:true,depth:15,autoplayEnabled:false,autoplayDelay:4000,autoplayDelayMin:2500,autoplayDelayMax:6500,autoplaySelectionMs:3000,autoplayHoldMs:700,autoplayDragMs:650,autoplayVariationEnabled:true};
let opening;
let gameWrites=Promise.resolve();
function saveGame(message){
 const task=gameWrites.then(async()=>{
  const {localGames=[]}=await chrome.storage.local.get('localGames');
  const index=localGames.findIndex(game=>game.gameId===message.gameId);
  const entry={...(index>=0?localGames[index]:{}),...message,updatedAt:Date.now()};
  if(index>=0)localGames[index]=entry;else localGames.push(entry);
  await chrome.storage.local.set({localGames});
 });
 gameWrites=task.catch(()=>{});return task;
}
async function ensureEngine() {
  if (!opening) opening = (async () => {
    const url = chrome.runtime.getURL('engine/host.html');
    const clientsList = await clients.matchAll();
    if (!clientsList.some(client => client.url === url)) {
      await chrome.offscreen.createDocument({url:'engine/host.html', reasons:['WORKERS'], justification:'Run the bundled chess engine entirely on this device.'});
    }
  })().finally(() => { opening = null; });
  return opening;
}
function effectiveSettings(saved){
 if(!saved.autoplayFastMode)return saved;
 return {...saved,analysisEnabled:true,depth:6,autoplayEnabled:true,autoplayVariationEnabled:false,autoplayDelay:120,autoplayDelayMin:120,autoplayDelayMax:120,autoplaySelectionMs:0,autoplayHoldMs:0,autoplayDragMs:0,strengthLimited:false,mistakesEnabled:false,playStyleEnabled:false,fatigueEnabled:false,simulatedPressure:'none',simulatedComposure:'steady'};
}
async function broadcast(message) {
  const tabs = await chrome.tabs.query({url:['*://*.chess.com/*','*://*.lichess.org/*']});
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id,message).catch(()=>{})));
}
async function handle(message,sender) {
  switch(message.type) {
    case 'API_ANALYZE': {
      await ensureEngine();
      const settings=effectiveSettings(await chrome.storage.local.get(defaults));
      const {autoplayFastMode,strengthLimited,targetElo,mistakesEnabled,mistakeChance,mistakeSeverity}=settings;
      const profile={playStyleEnabled:settings.playStyleEnabled,playStyle:settings.playStyle,phaseFamiliarity:settings.phaseFamiliarity,fatigueEnabled:settings.fatigueEnabled,simulatedPressure:settings.simulatedPressure,simulatedComposure:settings.simulatedComposure,candidateBreadth:settings.candidateBreadth};
      return chrome.runtime.sendMessage({...profile,target:'local-engine',type:'ANALYZE',prioritizeChecks:autoplayFastMode,fen:message.fen,depth:autoplayFastMode?6:message.depth,maxTimeMs:autoplayFastMode?150:message.maxTimeMs,strengthLimited,targetElo,mistakesEnabled,mistakeChance,mistakeSeverity});
    }
    case 'GET_SETTINGS': {
      const settings = effectiveSettings(await chrome.storage.local.get(defaults));
      if(sender.tab) await chrome.tabs.sendMessage(sender.tab.id,{type:'SETTINGS_RESPONSE',settings});
      return {success:true};
    }
    case 'GET_AUTH_STATE': return {authenticated:true,profile:{name:'Local analysis',plan:'local'},anonymousGamesCount:0};
    case 'GET_GAME_ID': {
      const key='gameId_'+(sender.tab?.id||'popup');
      const saved=await chrome.storage.session.get(key);
      if(!saved[key]) {saved[key]=crypto.randomUUID();await chrome.storage.session.set({[key]:saved[key]});}
      return {gameId:saved[key]};
    }
    case 'RESET_GAME_ID': await chrome.storage.session.remove('gameId_'+sender.tab?.id);return {success:true};
    case 'GAME_STARTED': case 'GAME_ENDED': await saveGame(message);return {success:true};
    case 'SELECTOR_DIAGNOSTICS': await chrome.storage.session.set({selectorDiagnostics:{platform:message.platform,results:message.results,timestamp:Date.now()}});return {success:true};
    case 'DOM_HEALTH_REPORT': await chrome.storage.local.set({domHealthReport:message.report});return {success:true};
    case 'GET_BASE_URL': return {baseUrl:''};
    case 'GET_SELECTOR_DIAGNOSTICS': return {diagnostics:(await chrome.storage.session.get('selectorDiagnostics')).selectorDiagnostics||null};
    default: return {success:true};
  }
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message.target === 'local-engine') return false;
  handle(message,sender).then(respond,error=>respond({success:false,error:error.message}));
  return true;
});
chrome.storage.onChanged.addListener(async (changes,area)=>{
 if(area!=='local'||!Object.keys(changes).some(key=>keys.includes(key)))return;
 const settings=effectiveSettings(await chrome.storage.local.get(defaults));
 await broadcast({type:'SETTINGS_CHANGED',settings});
});
chrome.runtime.onInstalled.addListener(async ()=>{
  await chrome.storage.local.remove(['antidetectEnabled','antidetectIntervalMin','antidetectIntervalMax']);
  const saved=await chrome.storage.local.get(defaults);
  const {autoplayTimingVersion}=await chrome.storage.local.get('autoplayTimingVersion');
  const timing=autoplayTimingVersion===2?{}:{autoplayDelay:4000,autoplayDelayMin:2500,autoplayDelayMax:6500,autoplaySelectionMs:3000,autoplayHoldMs:700,autoplayDragMs:650,autoplayTimingVersion:2};
  await chrome.storage.local.set({...defaults,...saved,...timing});
});
