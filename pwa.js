let installPrompt=null;
const installButton=document.getElementById('installButton');
const installDialog=document.getElementById('installDialog');
const instructions=document.getElementById('installInstructions');
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const connectionStatus=document.getElementById('connectionStatus');
let offlineReady=false;
function updateConnectionStatus(){
  if(!navigator.onLine){connectionStatus.textContent='Sin conexión';connectionStatus.classList.add('offline')}
  else{connectionStatus.textContent=offlineReady?'Lista sin conexión':'';connectionStatus.classList.remove('offline')}
}
window.addEventListener('online',updateConnectionStatus);
window.addEventListener('offline',updateConnectionStatus);
updateConnectionStatus();
if(standalone)installButton.hidden=true;
if('serviceWorker' in navigator&&(['https:','http:'].includes(location.protocol))){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
  navigator.serviceWorker.ready.then(()=>{offlineReady=true;updateConnectionStatus()}).catch(()=>{});
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installButton.hidden=false});
window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.hidden=true});
installButton.addEventListener('click',async()=>{
  if(installPrompt){await installPrompt.prompt();installPrompt=null;return}
  if(ios){instructions.textContent='En Safari, tocá Compartir y luego “Agregar a pantalla de inicio”. Activá “Abrir como app” si aparece esa opción. Una vez instalada y abierta, vas a poder usarla sin internet.'}
  else if(location.protocol==='file:'||location.protocol==='about:'){instructions.textContent='Para instalarla en el celular, abrí la dirección segura de Registro Docente una vez con internet. Después funcionará sin conexión.'}
  else{instructions.textContent='En el menú de tu navegador elegí “Instalar aplicación” o “Agregar a pantalla de inicio”. Abrila una vez y después podrás usarla sin internet.'}
  installDialog.showModal();
});
document.getElementById('closeInstallDialog').addEventListener('click',()=>installDialog.close());
document.getElementById('doneInstallButton').addEventListener('click',()=>installDialog.close());
