let historyCourseId=null;
let historySemester='1';

function historyText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es')}
function historyCourses(){return state.courses.filter(course=>course.roster?.length||course.course?.trim()||course.modality?.trim()||course.subject?.trim())}
function historyDays(course,semester){
  return Object.entries(course.records||{}).filter(([key,marks])=>key.startsWith(`${semester}|`)&&Object.values(marks||{}).some(mark=>mark==='P'||mark==='A')).map(([key,marks])=>{
    const roster=course.dayRosters?.[key]?.length?course.dayRosters[key]:course.roster||[];
    const present=roster.filter(name=>marks[name]==='P').length;
    const absent=roster.filter(name=>marks[name]==='A').length;
    return {key,date:key.split('|')[1],marks,roster,present,absent,pending:roster.length-present-absent,complete:roster.length>0&&roster.every(name=>marks[name]==='P'||marks[name]==='A')};
  }).sort((a,b)=>a.date.localeCompare(b.date));
}
function historyDate(date){const parsed=new Date(`${date}T12:00:00`);return Number.isNaN(parsed.getTime())?date:parsed.toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}
function historyPercent(days){const complete=days.filter(day=>day.complete);const total=complete.reduce((sum,day)=>sum+day.roster.length,0);const present=complete.reduce((sum,day)=>sum+day.present,0);return {complete:complete.length,percent:total?Math.round(present/total*100):null}}
function activateView(view){
  for(const id of ['attendanceView','historyView','sheetView','notesView'])$(id).classList.toggle('hidden',id!==view);
  for(const [id,section] of [['navAttendance','attendanceView'],['navHistory','historyView'],['navSheet','sheetView'],['navNotes','notesView']])$(id).classList.toggle('active',section===view);
  document.body.classList.toggle('sheet-mode',view==='sheetView');
  document.body.classList.toggle('notes-mode',view==='notesView');
  $('sectionTitle').textContent=({attendanceView:'Asistencia',historyView:'Cursos guardados',sheetView:'Planilla',notesView:'Calificaciones'})[view];
  window.scrollTo(0,0);
}
function showAttendanceView(){activateView('attendanceView');render()}
function showHistoryView(){
  save();activateView('historyView');
  const courses=historyCourses();
  if(!courses.some(course=>course.id===historyCourseId)){historyCourseId=courses.find(course=>course.id===state.currentCourseId)?.id||courses[0]?.id||null;historySemester=courses.find(course=>course.id===historyCourseId)?.semester||'1'}
  renderHistoryCourses();renderHistoryDetail();
}
function renderHistoryCourses(){
  const query=historyText($('historyCourseSearch').value.trim());
  const courses=historyCourses().filter(course=>historyText([course.year,course.course,course.modality,course.subject].join(' ')).includes(query));
  $('historyCourseList').innerHTML=courses.length?courses.map(course=>{
    const days=historyDays(course,'1').length+historyDays(course,'2').length;
    return `<button class="history-course ${course.id===historyCourseId?'active':''}" type="button" data-history-course="${escapeHTML(course.id)}"><strong>${escapeHTML(course.course||'Curso sin nombre')}</strong><span>${escapeHTML(String(course.year||''))} · ${escapeHTML(course.modality||'Sin modalidad')}</span><span>${escapeHTML(course.subject||'Sin materia')}</span><small>${course.roster?.length||0} alumnos · ${days} ${days===1?'día registrado':'días registrados'}</small></button>`;
  }).join(''):'<div class="history-empty-list">No hay cursos que coincidan con la búsqueda.</div>';
}
function renderHistoryDetail(){
  const course=state.courses.find(item=>item.id===historyCourseId);
  if(!course){$('historyDetail').innerHTML='<div class="history-empty"><span>▤</span><h2>Todavía no hay cursos guardados</h2><p>Cargá un curso y tomá asistencia para ver aquí sus registros.</p><button id="historyStartButton" class="primary-button" type="button">Tomar asistencia</button></div>';return}
  const days=historyDays(course,historySemester),summary=historyPercent(days);
  $('historyDetail').innerHTML=`<div class="history-detail-head"><div><span class="panel-kicker">REGISTRO DEL CURSO</span><h2>${escapeHTML(course.course||'Curso sin nombre')}</h2><p>${escapeHTML(String(course.year||''))} · ${escapeHTML(course.modality||'Sin modalidad')} · ${escapeHTML(course.subject||'Sin materia')}</p></div><button id="historyReturnButton" class="outline-button" type="button">Tomar lista aquí</button></div><div class="history-period"><label class="field"><span>CUATRIMESTRE</span><select id="historySemester"><option value="1" ${historySemester==='1'?'selected':''}>1.º cuatrimestre</option><option value="2" ${historySemester==='2'?'selected':''}>2.º cuatrimestre</option></select></label><div class="history-metrics"><div><strong>${days.length}</strong><small>DÍAS REGISTRADOS</small></div><div><strong>${summary.complete}</strong><small>DÍAS COMPLETOS</small></div><div><strong>${summary.percent===null?'—':`${summary.percent}%`}</strong><small>PROMEDIO</small></div></div></div><div class="history-launch"><div><span class="panel-kicker">VISTA COMPLETA</span><h3>Planilla de asistencia</h3><p>Abrí la planilla grande para ver todos los alumnos, las fechas y los promedios.</p></div><button id="historyOpenSheet" class="primary-button" type="button">Abrir planilla →</button></div><div class="history-launch"><div><span class="panel-kicker">SEGUIMIENTO</span><h3>Calificaciones</h3><p>Registrá cada evaluación con su fecha, tema y calificación.</p></div><button id="historyOpenNotes" class="outline-button" type="button">Abrir calificaciones →</button></div>`;
}
$('navAttendance').addEventListener('click',showAttendanceView);
$('navHistory').addEventListener('click',showHistoryView);
$('historyCourseSearch').addEventListener('input',renderHistoryCourses);
$('historyCourseList').addEventListener('click',event=>{const button=event.target.closest('[data-history-course]');if(!button)return;historyCourseId=button.dataset.historyCourse;historySemester=state.courses.find(course=>course.id===historyCourseId)?.semester||'1';renderHistoryCourses();renderHistoryDetail()});
$('historyDetail').addEventListener('click',event=>{
  if(event.target.closest('#historyStartButton'))showAttendanceView();
  if(event.target.closest('#historyReturnButton')){loadCourse(historyCourseId);showAttendanceView()}
  if(event.target.closest('#historyOpenSheet'))showSheetView(historyCourseId,historySemester);
  if(event.target.closest('#historyOpenNotes'))showNotesView(historyCourseId,historySemester);
});
$('historyDetail').addEventListener('change',event=>{if(event.target.id==='historySemester'){historySemester=event.target.value;renderHistoryDetail()}});
