let sheetCourseId=null;
let sheetSemester='1';
let sheetQuery='';
let notesCourseId=null;
let notesSemester='1';
let notesQuery='';

function availableCourse(id){const courses=historyCourses();return courses.find(course=>course.id===id)||courses.find(course=>course.id===state.currentCourseId)||courses[0]||null}
function courseOptions(selected){return historyCourses().map(course=>`<option value="${escapeHTML(course.id)}" ${course.id===selected?'selected':''}>${escapeHTML(String(course.year||''))} · ${escapeHTML(course.course||'Curso sin nombre')} · ${escapeHTML(course.subject||'Sin materia')}</option>`).join('')}

function showSheetView(courseId=historyCourseId,semester=historySemester){
  save();const course=availableCourse(courseId);sheetCourseId=course?.id||null;sheetSemester=semester||course?.semester||'1';sheetQuery='';
  activateView('sheetView');$('sheetStudentSearch').value='';renderSheetView();
}
function renderSheetView(){
  const course=availableCourse(sheetCourseId);sheetCourseId=course?.id||null;
  $('sheetCourseSelect').innerHTML=courseOptions(sheetCourseId);$('sheetSemesterSelect').value=sheetSemester;
  if(!course){$('sheetSummary').textContent='Sin cursos cargados';$('sheetMatrix').innerHTML='<div class="history-empty-list">Cargá un curso para comenzar.</div>';return}
  const days=historyDays(course,sheetSemester),summary=historyPercent(days);
  $('sheetSummary').innerHTML=`<strong>${course.roster?.length||0}</strong> alumnos <span>·</span> <strong>${days.length}</strong> días <span>·</span> <strong>${summary.percent===null?'—':`${summary.percent}%`}</strong> promedio`;
  const allStudents=[...new Set([...(course.roster||[]),...days.flatMap(day=>day.roster)])];
  const students=allStudents.filter(name=>historyText(name).includes(historyText(sheetQuery)));
  if(!students.length){$('sheetMatrix').innerHTML='<div class="history-empty-list">No se encontraron alumnos.</div>';return}
  const header=days.map(day=>`<th scope="col" class="history-date-col"><button type="button" data-sheet-date="${escapeHTML(day.date)}" title="Abrir ${escapeHTML(historyDate(day.date))}" aria-label="Abrir asistencia del ${escapeHTML(historyDate(day.date))}"><span>${escapeHTML(day.date.slice(8))}/${escapeHTML(day.date.slice(5,7))}</span><small>${escapeHTML(day.date.slice(0,4))}</small></button></th>`).join('');
  const rows=students.map((name,index)=>{
    const relevant=days.filter(day=>day.roster.includes(name));
    const complete=relevant.filter(day=>day.complete);
    const present=relevant.filter(day=>day.marks[name]==='P').length;
    const absent=relevant.filter(day=>day.marks[name]==='A').length;
    const rate=complete.length?`${Math.round(complete.filter(day=>day.marks[name]==='P').length/complete.length*100)}%`:'—';
    const cells=days.map(day=>{const mark=day.roster.includes(name)?day.marks[name]:null;return `<td class="history-mark-cell ${mark==='P'?'is-present':mark==='A'?'is-absent':'is-pending'}" aria-label="${escapeHTML(name)}: ${escapeHTML(historyDate(day.date))}, ${mark==='P'?'presente':mark==='A'?'ausente':'sin marcar'}">${mark||'—'}</td>`}).join('');
    return `<tr><th scope="row" class="history-name-cell"><span class="history-row-number">${index+1}</span><span>${escapeHTML(name)}</span></th>${cells}<td class="history-total present-text">${present}</td><td class="history-total absent-text">${absent}</td><td class="history-total history-rate">${rate}</td></tr>`;
  }).join('');
  const totals=days.map(day=>`<td class="history-day-total"><span class="present-text">${day.present} P</span><span class="absent-text">${day.absent} A</span>${day.pending?`<small>${day.pending} sin marcar</small>`:''}</td>`).join('');
  $('sheetMatrix').innerHTML=`${days.length?'':'<p class="history-empty-days">Todavía no hay asistencias registradas en este cuatrimestre.</p>'}<div class="history-matrix-scroll" role="region" aria-label="Planilla de asistencia; desplazá horizontalmente para ver todas las fechas" tabindex="0"><table class="history-matrix"><thead><tr><th scope="col" class="history-name-cell">APELLIDO Y NOMBRE</th>${header}<th scope="col">P</th><th scope="col">A</th><th scope="col">PROM.</th></tr></thead><tbody>${rows}</tbody>${days.length?`<tfoot><tr><th scope="row" class="history-name-cell">Total por día</th>${totals}<td colspan="3" class="history-total-label">Totales del curso</td></tr></tfoot>`:''}</table></div>`;
}

function showNotesView(courseId=historyCourseId,semester=historySemester){
  save();const course=availableCourse(courseId);notesCourseId=course?.id||null;notesSemester=semester||course?.semester||'1';notesQuery='';
  activateView('notesView');$('notesStudentSearch').value='';renderNotesView();
}
function noteCourse(){return state.courses.find(course=>course.id===notesCourseId)||null}
function gradeDateLabel(date){return /^\d{4}-\d{2}-\d{2}$/.test(date||'')?`${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}`:'Elegir fecha'}
function persistCourseNotes(course){
  if(course.id===state.currentCourseId)state.notes=course.notes;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{toast('No se pudieron guardar las calificaciones en este dispositivo.')}
}
function renderNotesView(){
  const course=availableCourse(notesCourseId);notesCourseId=course?.id||null;
  $('notesCourseSelect').innerHTML=courseOptions(notesCourseId);$('notesSemesterSelect').value=notesSemester;
  $('addNoteColumnButton').disabled=!course?.roster?.length;
  if(!course){$('notesMatrix').innerHTML='<div class="history-empty-list">Cargá un curso y su lista de alumnos para escribir calificaciones.</div>';return}
  if(!Array.isArray(course.notes))course.notes=[];
  const notes=course.notes.filter(note=>note.semester===notesSemester);
  const students=(course.roster||[]).filter(name=>historyText(name).includes(historyText(notesQuery)));
  if(!course.roster?.length){$('notesMatrix').innerHTML='<div class="history-empty-list">Este curso todavía no tiene alumnos. Cargá la lista desde «Tomar asistencia».</div>';return}
  if(!students.length){$('notesMatrix').innerHTML='<div class="history-empty-list">No se encontraron alumnos.</div>';return}
  const headers=notes.map(note=>`<th scope="col" class="note-column"><div class="grade-header"><div class="grade-date-wrap"><span class="grade-date-text" aria-hidden="true">${escapeHTML(gradeDateLabel(note.date))}</span><input class="grade-date" type="date" data-note-id="${escapeHTML(note.id)}" data-note-field="date" value="${escapeHTML(note.date||'')}" lang="es-AR" aria-label="Fecha de la evaluación"></div><input class="grade-topic" type="text" data-note-id="${escapeHTML(note.id)}" data-note-field="topic" value="${escapeHTML(note.topic||'')}" placeholder="Examen 1 / Trabajo práctico 1" aria-label="Tema de la evaluación" spellcheck="true" lang="es-AR"><button class="delete-note" type="button" data-delete-note="${escapeHTML(note.id)}" aria-label="Eliminar columna de ${escapeHTML(note.topic||'evaluación')}" title="Eliminar columna">×</button></div></th>`).join('');
  const rows=students.map((name,index)=>`<tr><th scope="row" class="history-name-cell"><span class="history-row-number">${index+1}</span><span>${escapeHTML(name)}</span></th>${notes.map(note=>`<td class="grade-cell"><input class="grade-input" type="text" data-note-id="${escapeHTML(note.id)}" data-student="${escapeHTML(name)}" value="${escapeHTML(note.values?.[name]||'')}" placeholder="—" aria-label="Calificación de ${escapeHTML(name)}: ${escapeHTML(note.topic||historyDate(note.date))}" maxlength="30" spellcheck="true" lang="es-AR"></td>`).join('')}</tr>`).join('');
  $('notesMatrix').innerHTML=`${notes.length?'':'<p class="history-empty-days">Presioná «Agregar evaluación» para crear la primera columna de calificaciones.</p>'}<div class="history-matrix-scroll notes-scroll" role="region" aria-label="Planilla de calificaciones" tabindex="0"><table class="history-matrix notes-table"><thead><tr><th scope="col" class="history-name-cell">APELLIDO Y NOMBRE</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

$('navSheet').addEventListener('click',()=>showSheetView());
$('navNotes').addEventListener('click',()=>showNotesView());
$('sheetBackButton').addEventListener('click',showHistoryView);
$('notesBackButton').addEventListener('click',showHistoryView);
$('sheetCourseSelect').addEventListener('change',event=>{sheetCourseId=event.target.value;sheetSemester=availableCourse(sheetCourseId)?.semester||'1';renderSheetView()});
$('sheetSemesterSelect').addEventListener('change',event=>{sheetSemester=event.target.value;renderSheetView()});
$('sheetStudentSearch').addEventListener('input',event=>{sheetQuery=event.target.value;renderSheetView()});
$('sheetMatrix').addEventListener('click',event=>{const button=event.target.closest('[data-sheet-date]');if(!button)return;loadCourse(sheetCourseId);state.semester=sheetSemester;state.date=button.dataset.sheetDate;save();showAttendanceView()});
$('notesCourseSelect').addEventListener('change',event=>{notesCourseId=event.target.value;notesSemester=availableCourse(notesCourseId)?.semester||'1';renderNotesView()});
$('notesSemesterSelect').addEventListener('change',event=>{notesSemester=event.target.value;renderNotesView()});
$('notesStudentSearch').addEventListener('input',event=>{notesQuery=event.target.value;renderNotesView()});
$('addNoteColumnButton').addEventListener('click',()=>{const course=noteCourse();if(!course?.roster?.length)return;course.notes ||= [];const id=`nota-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;course.notes.push({id,semester:notesSemester,date:localDate,topic:'',values:{}});persistCourseNotes(course);renderNotesView();$('notesMatrix').querySelector(`[data-note-id="${id}"][data-note-field="topic"]`)?.focus()});
$('notesMatrix').addEventListener('input',event=>{
  const input=event.target;if(!input.dataset.noteId)return;
  const course=noteCourse(),note=course?.notes?.find(item=>item.id===input.dataset.noteId);if(!note)return;
  if(input.classList.contains('grade-input')){note.values ||= {};note.values[input.dataset.student]=input.value}
  else if(input.dataset.noteField==='topic')note.topic=input.value;
  else if(input.dataset.noteField==='date'){note.date=input.value;input.closest('.grade-date-wrap').querySelector('.grade-date-text').textContent=gradeDateLabel(input.value)}
  persistCourseNotes(course);
});
$('notesMatrix').addEventListener('change',event=>{if(event.target.dataset.noteField==='date')event.target.dispatchEvent(new Event('input',{bubbles:true}))});
$('notesMatrix').addEventListener('click',event=>{const button=event.target.closest('[data-delete-note]');if(!button)return;const course=noteCourse();if(!course||!confirm('¿Eliminar esta columna y todas sus notas?'))return;course.notes=course.notes.filter(note=>note.id!==button.dataset.deleteNote);persistCourseNotes(course);renderNotesView()});
