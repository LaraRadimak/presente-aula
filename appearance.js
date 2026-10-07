const COLOR_KEY='presente-colores-v1';
const DEFAULT_COLORS={background:'#f8f8f4',panel:'#ffffff',sidebar:'#18333d'};
const COLOR_FIELDS={background:'backgroundColor',panel:'panelColor',sidebar:'sidebarColor'};
document.querySelectorAll('[spellcheck="true"]').forEach(field=>field.setAttribute('autocorrect','on'));
function validColor(value,fallback){return /^#[0-9a-f]{6}$/i.test(value||'')?value:fallback}
function applyColors(colors){
  const safe={};
  for(const [key,inputId] of Object.entries(COLOR_FIELDS)){
    safe[key]=validColor(colors[key],DEFAULT_COLORS[key]);
    document.getElementById(inputId).value=safe[key];
  }
  document.documentElement.style.setProperty('--cream',safe.background);
  document.documentElement.style.setProperty('--panel-bg',safe.panel);
  document.documentElement.style.setProperty('--sidebar-bg',safe.sidebar);
  return safe;
}
try{applyColors(JSON.parse(localStorage.getItem(COLOR_KEY)||'{}'))}catch{applyColors(DEFAULT_COLORS)}
const appearancePanel=document.getElementById('appearancePanel');
const appearanceButton=document.getElementById('appearanceButton');
function closeAppearance(){appearancePanel.classList.add('hidden');appearanceButton.setAttribute('aria-expanded','false')}
appearanceButton.addEventListener('click',()=>{const willOpen=appearancePanel.classList.contains('hidden');appearancePanel.classList.toggle('hidden',!willOpen);appearanceButton.setAttribute('aria-expanded',String(willOpen))});
document.getElementById('closeAppearanceButton').addEventListener('click',closeAppearance);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAppearance()});
document.addEventListener('pointerdown',event=>{if(!appearancePanel.classList.contains('hidden')&&!appearancePanel.contains(event.target)&&!appearanceButton.contains(event.target))closeAppearance()});
for(const inputId of Object.values(COLOR_FIELDS))document.getElementById(inputId).addEventListener('input',()=>{
  const colors={};for(const [key,id] of Object.entries(COLOR_FIELDS))colors[key]=document.getElementById(id).value;
  try{localStorage.setItem(COLOR_KEY,JSON.stringify(applyColors(colors)))}catch{applyColors(colors)}
});
document.getElementById('resetColorsButton').addEventListener('click',()=>{applyColors(DEFAULT_COLORS);try{localStorage.removeItem(COLOR_KEY)}catch{}});
