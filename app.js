const $ = id => document.getElementById(id);
const APP_SCRIPT_URL = document.currentScript?.src || [...document.scripts].find(script=>/\/app\.js(?:\?|$)/.test(script.src))?.src || '';
const STORAGE_KEY = 'presente-aula-v2';
const OLD_STORAGE_KEY = 'presente-aula-v1';
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
let state = { roster: [], course: '', year: today.getFullYear(), modality: '', subject: '', semester: '1', date: localDate, mode: 'all', records: {}, dayRosters: {}, notes: [], averageSelections: {}, source: '', needsReimport: false, courses: [], currentCourseId: null };
let pendingSource = '';
let toastTimer;

function toast(message,duration=3500) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),duration); }
function courseId(){return `curso-${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function courseSnapshot(){return {id:state.currentCourseId,course:state.course,year:state.year,modality:state.modality,subject:state.subject,semester:state.semester,roster:state.roster,records:state.records,dayRosters:state.dayRosters,notes:state.notes,averageSelections:state.averageSelections,source:state.source,needsReimport:state.needsReimport}}
function save() { try { if(!state.currentCourseId)state.currentCourseId=courseId();const index=state.courses.findIndex(c=>c.id===state.currentCourseId);const snapshot=courseSnapshot();if(index>=0)state.courses[index]=snapshot;else state.courses.push(snapshot);localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch { toast('No se pudo guardar en este navegador.'); } }
function loadCourse(id){const course=state.courses.find(c=>c.id===id);if(!course)return;state.currentCourseId=id;state.course=course.course||'';state.year=Number(course.year)||today.getFullYear();state.modality=course.modality||'';state.subject=course.subject||'';state.semester=course.semester||'1';state.roster=Array.isArray(course.roster)?course.roster:[];state.records=course.records||{};state.dayRosters=course.dayRosters||{};state.notes=Array.isArray(course.notes)?course.notes:[];state.averageSelections=course.averageSelections||{};state.source=course.source||'';state.needsReimport=!!course.needsReimport;state.mode='all';save();render()}
function load() {
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved&&Array.isArray(saved.courses)){
      state={...state,...saved};
      const current=state.courses.find(c=>c.id===state.currentCourseId)||state.courses[0];
      if(current){state.currentCourseId=current.id;state.course=current.course||'';state.year=Number(current.year)||today.getFullYear();state.modality=current.modality||'';state.subject=current.subject||'';state.semester=current.semester||'1';state.roster=current.roster||[];state.records=current.records||{};state.dayRosters=current.dayRosters||{};state.notes=Array.isArray(current.notes)?current.notes:[];state.averageSelections=current.averageSelections||{};state.source=current.source||'';state.needsReimport=!!current.needsReimport}
      return;
    }
    const old=JSON.parse(localStorage.getItem(OLD_STORAGE_KEY)||'null');
    if(old&&Array.isArray(old.roster)){
      state.roster=namesFromLines(old.roster);state.course=old.course||'';state.date=old.date||localDate;state.mode=old.mode||'all';state.source=old.source||'';state.needsReimport=!!state.roster.length;
      for(const [key,marks] of Object.entries(old.records||{})){const date=key.match(/\d{4}-\d{2}-\d{2}$/)?.[0];if(date){state.records[`1|${date}`]=marks;state.dayRosters[`1|${date}`]=state.roster.slice()}}
      save();
    }
  } catch {}
}
function recordKey(){return `${state.semester}|${state.date}`}
function day(){return state.records[recordKey()]||{}}
function setDay(data){state.records[recordKey()]=data;state.dayRosters[recordKey()]=state.roster.slice();save()}
function cleanName(value){
  const words=String(value||'').replace(/\s+/g,' ').trim().split(/[\s,;|]+/);
  const metadata=/^(?:dni|documento|legajo|edad|sexo|genero|género|division|división|grado|curso|turno|aula|fecha|presente|ausente)$/i;
  const letters=/^\p{L}+(?:[-'’]\p{L}+)*$/u;
  const result=[];
  for(const word of words){
    if(!word)continue;
    if(/^\d+[.)-]?$/.test(word)){if(result.length)break;continue}
    if(metadata.test(word)&&result.length)break;
    if(letters.test(word))result.push(word);
    else if(result.length)break;
  }
  return result.join(' ');
}
function namesFromLines(lines){
  const seen=new Set();
  return lines.map(cleanName).filter(name=>{
    const parts=name.split(' ').filter(Boolean);
    if(parts.length<2||parts.length>6||parts.some(part=>part.length<2))return false;
    if(/^(?:apellido|apellidos|nombre|nombres|alumno|alumna|estudiante|curso|grado|lista|asistencia|total|fecha|escuela|colegio|instituto)(?:\s|$)/i.test(name))return false;
    if(/\b(?:modalidad|orientación|orientacion|naturales|economía|economia|bachiller|división|division|turno)\b/i.test(name))return false;
    if(parts.every(part=>/^(?:apellido|apellidos|nombre|nombres|alumno|alumna|estudiante)$/i.test(part)))return false;
    const key=name.toLocaleLowerCase('es');if(seen.has(key))return false;seen.add(key);return true;
  });
}
function headerText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim()}
function hasRosterHeader(rows){return rows.slice(0,12).some(row=>{const headings=row.map(headerText);return (headings.some(h=>/\bapellido(s)?\b/.test(h))&&headings.some(h=>/\bnombre(s)?\b/.test(h)))||headings.some(h=>/^(?:nombre completo|alumno|alumna|estudiante|name)$/.test(h))})}
function namesFromRows(rows){
  const headerIndex=rows.findIndex((row,i)=>i<12&&row.some(cell=>/\bapellido(s)?\b/.test(headerText(cell)))&&row.some(cell=>/\bnombre(s)?\b/.test(headerText(cell))));
  if(headerIndex>=0){
    const header=rows[headerIndex].map(headerText);
    const surname=header.findIndex(h=>/\bapellido(s)?\b/.test(h)&&!/\bnombre(s)?\b/.test(h));
    const given=header.findIndex(h=>/\bnombre(s)?\b/.test(h)&&!/\bapellido(s)?\b/.test(h));
    const combined=header.findIndex(h=>/\bapellido(s)?\b/.test(h)&&/\bnombre(s)?\b/.test(h));
    if(surname>=0&&given>=0)return namesFromLines(rows.slice(headerIndex+1).map(row=>`${row[surname]||''} ${row[given]||''}`));
    if(combined>=0)return namesFromLines(rows.slice(headerIndex+1).map(row=>row[combined]||''));
  }
  const singleHeader=rows.findIndex((row,i)=>i<12&&row.some(cell=>/^(?:nombre completo|alumno|alumna|estudiante|name)$/.test(headerText(cell))));
  if(singleHeader>=0){const column=rows[singleHeader].findIndex(cell=>/^(?:nombre completo|alumno|alumna|estudiante|name)$/.test(headerText(cell)));return namesFromLines(rows.slice(singleHeader+1).map(row=>row[column]||''))}
  return namesFromLines(rows.map(row=>{
    const textCells=row.map(v=>String(v||'').trim()).filter(v=>/\p{L}/u.test(v)&&!/^\d/.test(v));
    if(!textCells.length)return '';
    if(textCells.length>1&&cleanName(textCells[0]).split(' ').length<2)return `${textCells[0]} ${textCells[1]}`;
    return textCells[0];
  }));
}
function initials(name){return name.split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('')}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function averageStats(){
  const complete=[];
  for(const [key,marks] of Object.entries(state.records)){
    if(!key.startsWith(`${state.semester}|`))continue;
    const roster=state.dayRosters[key]||state.roster;
    if(roster.length&&roster.every(name=>marks[name]==='P'||marks[name]==='A'))complete.push({roster,marks});
  }
  const opportunities=complete.reduce((sum,entry)=>sum+entry.roster.length,0);
  const presents=complete.reduce((sum,entry)=>sum+entry.roster.filter(name=>entry.marks[name]==='P').length,0);
  return {days:complete.length,average:opportunities?Math.round(presents/opportunities*100):null,student:name=>{const enrolled=complete.filter(entry=>entry.roster.includes(name));return enrolled.length?Math.round(enrolled.filter(entry=>entry.marks[name]==='P').length/enrolled.length*100):null}};
}
function render(){
  $('workspace').classList.toggle('hidden',!state.roster.length);
  $('importCard').classList.toggle('compact',!!state.roster.length);
  $('migrationNotice').classList.toggle('hidden',!state.needsReimport);
  $('courseInput').value=state.course;$('yearInput').value=state.year;$('modalityInput').value=state.modality;$('subjectInput').value=state.subject;$('semesterSelect').value=state.semester;$('dateInput').value=state.date;
  $('currentCourseName').textContent=state.course||'Nuevo curso';
  $('currentCourseMeta').textContent=[state.year,state.modality||'Modalidad sin definir',state.subject||'Materia sin definir',state.semester==='1'?'1.º cuatrimestre':'2.º cuatrimestre'].join(' · ');
  $('fileName').textContent=state.source ? `Lista: ${state.source}` : '';
  $('allMode').classList.toggle('active',state.mode==='all');$('absentMode').classList.toggle('active',state.mode==='absent');
  const d=day(),p=state.roster.filter(n=>d[n]==='P').length,a=state.roster.filter(n=>d[n]==='A').length;
  $('totalCount').textContent=state.roster.length;$('presentCount').textContent=p;$('absentCount').textContent=a;$('pendingCount').textContent=state.roster.length-p-a;$('rosterCount').textContent=state.roster.length;
  const average=averageStats();$('averageLabel').textContent=state.semester==='1'?'1.º cuatrimestre':'2.º cuatrimestre';$('averageValue').textContent=average.average===null?'—':`${average.average}%`;$('daysCount').textContent=average.days;
  const query=$('searchInput').value.trim().toLocaleLowerCase('es');const matches=state.roster.filter(n=>n.toLocaleLowerCase('es').includes(query));
  $('studentList').innerHTML=matches.map(name=>{const studentAverage=average.student(name);return `<div class="student-row"><div class="student-ident"><span class="avatar">${escapeHTML(initials(name))}</span><div><strong title="${escapeHTML(name)}">${escapeHTML(name)}</strong><small>Alumno ${String(state.roster.indexOf(name)+1).padStart(2,'0')} · Promedio: ${studentAverage===null?'—':`${studentAverage}%`}</small></div></div><div class="attendance-buttons"><button type="button" class="mark present ${d[name]==='P'?'selected':''}" data-name="${escapeHTML(name)}" data-mark="P" aria-label="${escapeHTML(name)} presente" aria-pressed="${d[name]==='P'}">P</button><button type="button" class="mark absent ${d[name]==='A'?'selected':''}" data-name="${escapeHTML(name)}" data-mark="A" aria-label="${escapeHTML(name)} ausente" aria-pressed="${d[name]==='A'}">A</button></div></div>`}).join('');
  $('emptySearch').classList.toggle('hidden',!!matches.length||!query);
}
function replaceRoster(names,source){if(!names.length){toast('No hay nombres para importar.');return}if(state.roster.length&&!confirm('¿Reemplazar la lista actual por esta nueva lista?'))return;state.roster=names;state.records={};state.dayRosters={};state.source=source;state.needsReimport=false;state.mode='all';save();render();toast(`${names.length} alumnos cargados. Revisá el curso y empezá.`)}
function mark(name,value){const d={...day()};d[name]=d[name]===value&&state.mode==='all'?null:value;if(d[name]===null)delete d[name];setDay(d);render()}
function mode(value){state.mode=value;if(value==='absent'){const d={...day()};for(const name of state.roster)if(!d[name])d[name]='P';setDay(d);toast('Todos figuran presentes. Marcá A en los ausentes.')}save();render()}
function showCourses(){save();$('courseList').innerHTML=state.courses.map(c=>`<button type="button" class="course-choice ${c.id===state.currentCourseId?'current':''}" data-course-id="${escapeHTML(c.id)}"><strong>${escapeHTML(c.course||'Curso sin nombre')}</strong><small>${escapeHTML(String(c.year||today.getFullYear()))} · ${escapeHTML(c.modality||'Modalidad sin definir')} · ${escapeHTML(c.subject||'Materia sin definir')} · ${c.roster?.length||0} alumnos</small></button>`).join('');$('courseDialog').showModal()}
function newCourse(){if(state.roster.length||state.course.trim()||state.modality.trim()||state.subject.trim()){save();state.currentCourseId=courseId();state.course='';state.year=today.getFullYear();state.modality='';state.subject='';state.semester='1';state.roster=[];state.records={};state.dayRosters={};state.notes=[];state.averageSelections={};state.source='';state.needsReimport=false;state.mode='all';save()}$('courseDialog').close();$('searchInput').value='';render();toast('Nuevo curso listo para cargar.')}

function xml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('El archivo tiene una estructura no válida.');return doc}
function descendants(node,name){return [...node.getElementsByTagName('*')].filter(el=>el.localName===name)}
function attr(node,name){return node?.getAttribute(name)||''}
async function parseXlsx(file){
  const zip=await JSZip.loadAsync(file);const workbook=zip.file('xl/workbook.xml');if(!workbook)throw new Error('No se encontró una hoja de Excel.');
  const shared=zip.file('xl/sharedStrings.xml');const strings=shared?descendants(xml(await shared.async('string')),'si').map(si=>descendants(si,'t').map(t=>t.textContent).join('')):[];
  const book=xml(await workbook.async('string'));const relsFile=zip.file('xl/_rels/workbook.xml.rels');const rels=relsFile?xml(await relsFile.async('string')):null;const relation=new Map(rels?descendants(rels,'Relationship').map(r=>[attr(r,'Id'),attr(r,'Target')]):[]);
  const sheets=descendants(book,'sheet');let output=[];
  for(let s=0;s<sheets.length;s++){
    const target=relation.get(attr(sheets[s],'r:id'))||`worksheets/sheet${s+1}.xml`;
    const path=target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:`xl/${target.replace(/^\.\.\//,'')}`;
    const entry=zip.file(path);if(!entry)continue;
    const doc=xml(await entry.async('string'));
    const rows=[];
    for(const row of descendants(doc,'row')){
      const cells=[];
      for(const c of descendants(row,'c')){
        const ref=attr(c,'r').match(/^[A-Z]+/i)?.[0]||'';let index=0;for(const letter of ref.toUpperCase())index=index*26+letter.charCodeAt(0)-64;index=index?index-1:cells.length;
        const type=attr(c,'t'),v=descendants(c,'v')[0]?.textContent||'';
        cells[index]=type==='s'?strings[Number(v)]||'':type==='inlineStr'?descendants(c,'t').map(x=>x.textContent).join(''):v;
      }
      rows.push(cells);
    }
    const names=namesFromRows(rows);
    if(hasRosterHeader(rows)&&names.length)return names;
    if(names.length>output.length)output=names;
  }
  return output;
}
async function parseDocx(file){
  const zip=await JSZip.loadAsync(file),entry=zip.file('word/document.xml');if(!entry)throw new Error('No se pudo leer el documento Word.');const doc=xml(await entry.async('string'));
  const tables=descendants(doc,'tbl');let best=[];
  for(const table of tables){
    const rows=descendants(table,'tr').map(tr=>[...tr.children].filter(el=>el.localName==='tc').map(tc=>descendants(tc,'p').map(p=>descendants(p,'t').map(t=>t.textContent).join('')).join(' ').replace(/\s+/g,' ').trim()));
    const names=namesFromRows(rows);if(hasRosterHeader(rows)&&names.length)return names;if(names.length>best.length)best=names;
  }
  const lines=descendants(doc,'p').filter(p=>{for(let parent=p.parentElement;parent;parent=parent.parentElement)if(parent.localName==='tbl')return false;return true}).map(p=>descendants(p,'t').map(t=>t.textContent).join('').trim());
  const paragraphNames=namesFromLines(lines);return best.length>=paragraphNames.length?best:paragraphNames;
}
function parseDelimited(text){const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean);const sep=lines.some(l=>l.includes(';'))?';':lines.some(l=>l.includes('\t'))?'\t':',';return namesFromRows(lines.map(line=>line.split(sep).map(v=>v.replace(/^"|"$/g,'').trim())))}
async function parsePdf(file){
  const pdfjs=window.pdfjsLib;
  if(!pdfjs)throw new Error('No se pudo cargar el lector PDF integrado. Volvé a abrir la página.');
  const workerURL=new URL('pdf-classic.worker.min.js',APP_SCRIPT_URL||document.baseURI);
  pdfjs.GlobalWorkerOptions.workerSrc=workerURL.href;
  const bytes=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data:bytes}).promise;const lines=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p),content=await page.getTextContent();const grouped=[];
    for(const item of content.items){if(!item.str?.trim())continue;const x=item.transform[4],y=item.transform[5];let line=grouped.find(a=>Math.abs(a.y-y)<3);if(!line){line={y,parts:[]};grouped.push(line)}line.parts.push({x,text:item.str})}
    grouped.sort((a,b)=>b.y-a.y);
    for(const line of grouped){line.parts.sort((a,b)=>a.x-b.x);const text=line.parts.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim();if(text)lines.push(text)}
  }
  return namesFromLines(lines);
}
function updateReviewCount(){const count=namesFromLines($('reviewText').value.split(/\r?\n/)).length;$('reviewCount').textContent=`${count} ${count===1?'alumno detectado':'alumnos detectados'}.`}
async function importFile(file){if(!file)return;const ext=file.name.split('.').pop().toLowerCase();try{let names;if(ext==='xlsx')names=await parseXlsx(file);else if(ext==='docx')names=await parseDocx(file);else if(ext==='pdf')names=await parsePdf(file);else if(ext==='csv'||ext==='txt')names=parseDelimited(await file.text());else throw new Error('Usá un archivo .xlsx, .docx, .pdf, .csv o .txt.');if(!names.length)throw new Error(ext==='pdf'?'No se encontraron nombres en el PDF. Si es una imagen escaneada, necesita OCR.':'No se encontraron nombres. Podés pegarlos manualmente.');pendingSource=file.name;$('reviewText').value=names.join('\n');updateReviewCount();$('reviewDialog').showModal()}catch(err){toast(`No se pudo importar: ${err.message}`,7000)}finally{$('fileInput').value=''}}

load();$('dateInput').value=state.date;$('todayText').textContent=today.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});render();
$('fileInput').addEventListener('change',e=>importFile(e.target.files[0]));
$('reviewText').addEventListener('input',updateReviewCount);
$('pasteButton').addEventListener('click',()=>$('namesDialog').showModal());
$('saveNamesButton').addEventListener('click',e=>{e.preventDefault();const names=namesFromLines($('namesText').value.split(/\r?\n/));if(!names.length){toast('Escribí al menos un nombre.');return}$('namesDialog').close();replaceRoster(names,'Carga manual')});
$('confirmImportButton').addEventListener('click',e=>{e.preventDefault();const names=namesFromLines($('reviewText').value.split(/\r?\n/));if(!names.length){toast('Dejá al menos un alumno en la lista.');return}$('reviewDialog').close();replaceRoster(names,pendingSource)});
$('courseInput').addEventListener('change',e=>{state.course=e.target.value.trim();save();render()});
$('yearInput').addEventListener('change',e=>{state.year=Number(e.target.value)||today.getFullYear();save();render()});
$('modalityInput').addEventListener('change',e=>{state.modality=e.target.value.trim();save();render()});
$('subjectInput').addEventListener('change',e=>{state.subject=e.target.value.trim();save();render()});
$('semesterSelect').addEventListener('change',e=>{state.semester=e.target.value;state.mode='all';save();render()});
$('dateInput').addEventListener('change',e=>{state.date=e.target.value||localDate;save();render()});
$('searchInput').addEventListener('input',render);
$('allMode').addEventListener('click',()=>mode('all'));
$('absentMode').addEventListener('click',()=>mode('absent'));
$('studentList').addEventListener('click',e=>{const b=e.target.closest('button[data-mark]');if(b)mark(b.dataset.name,b.dataset.mark)});
$('saveSwitchButton').addEventListener('click',showCourses);
$('saveSwitchButtonBottom').addEventListener('click',showCourses);
$('closeCourseDialog').addEventListener('click',()=>$('courseDialog').close());
$('newCourseButton').addEventListener('click',newCourse);
$('courseList').addEventListener('click',e=>{const button=e.target.closest('[data-course-id]');if(!button)return;loadCourse(button.dataset.courseId);$('courseDialog').close();$('searchInput').value='';render();toast('Curso seleccionado.')});
$('resetDayButton').addEventListener('click',()=>{if(!confirm('¿Reiniciar la asistencia de esta fecha?'))return;setDay({});state.mode='all';save();render();toast('La asistencia de este día quedó sin marcar.')});
$('addStudentButton').addEventListener('click',()=>{$('newStudentInput').value='';$('addDialog').showModal();$('newStudentInput').focus()});
$('saveStudentButton').addEventListener('click',e=>{e.preventDefault();const name=namesFromLines([$('newStudentInput').value])[0];if(!name){toast('Escribí nombre y apellido del alumno.');return}if(state.roster.some(n=>n.toLocaleLowerCase('es')===name.toLocaleLowerCase('es'))){toast('Ese alumno ya está en la lista.');return}state.roster.push(name);if(state.mode==='absent'){const d={...day(),[name]:'P'};setDay(d)}save();render();$('addDialog').close();toast('Alumno agregado.')});
