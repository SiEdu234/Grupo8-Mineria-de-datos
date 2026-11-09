(() => {
  "use strict";
  const D = window.GUIA || {};
  const BOOKS = window.NOTEBOOKS || [];
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const storeKey = "g8-defensa-assistments-study-v3";
  let state = { completed: [], known: [], notebookDone: [], notebookBook: "prep", notebookCell: 0, currentPage: "inicio" };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(storeKey) || "{}") }; } catch (_) {}
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  const fmt = value => Number(value).toFixed(4).replace(".", ",");
  function save() { try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (_) {} }
  function toast(message) { const el=$("#toast"); if(!el)return; el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2000); }
  function go(page) {
    const view=$('[data-view="'+page+'"]'); if(!view)return;
    $$("[data-view]").forEach(el=>{const active=el===view;el.hidden=!active;el.classList.toggle("active",active);});
    $$(".nav-item[data-go]").forEach(el=>el.classList.toggle("active",el.dataset.go===page));
    state.currentPage=page;save();window.scrollTo({top:0,behavior:"smooth"});
  }
  $$("[data-go]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();go(el.dataset.go);}));
  $("#printGuide").addEventListener("click",()=>window.print());

  const requirements=[
    ["Tipo de modelo","RF de la práctica, RF con hiperparámetros modificados y Extra Trees."],
    ["Datos y variables","Origen, unidad de análisis, score como y y 722 predictores X."],
    ["Preparación","Archivos crudos, transformaciones, datos faltantes y cabeceras del CSV final."],
    ["Construcción","Tres notebooks, parámetros reales y función de cada bloque."],
    ["Evaluación","Dos tablas: train y prueba; accuracy, precisión macro, recall macro y F1 macro."],
    ["Gráficos","Distribución, métricas comparadas, matrices de confusión y curvas ROC."],
    ["Fases propuestas","SQA, despliegue y monitoreo sin presentarlos como funciones implementadas."],
    ["Fuentes","Caso original, estudios de calidad y archivos del proyecto."]
  ];
  $("#statGrid").innerHTML=(D.stats||[]).map(x=>'<div class="stat-card"><strong>'+esc(x.value)+'</strong><span>'+esc(x.label)+'</span><small>'+esc(x.note)+'</small></div>').join("");
  $("#requirementList").innerHTML=requirements.map((x,i)=>'<div class="requirement"><i>'+String(i+1).padStart(2,"0")+'</i><div><strong>'+esc(x[0])+'</strong><span>'+esc(x[1])+'</span></div></div>').join("");

  const algorithmDetails={
    rf:{steps:["Muestra bootstrap de filas","Elige √722 variables candidatas","Busca el mejor corte entre esas opciones","Promedia votos/probabilidades"],text:"Random Forest construye muchos árboles con muestras de entrenamiento remuestreadas. En cada nodo considera un subconjunto aleatorio de predictores y elige el corte que mejor separa las clases entre las opciones evaluadas."},
    et:{steps:["Muestra bootstrap de filas*","Elige √722 variables candidatas","Prueba cortes aleatorios","Elige entre esos cortes y combina árboles"],text:"Extra Trees añade aleatoriedad al escoger los cortes de división. En esta corrida se configuró bootstrap=True, así que también usa remuestreo de filas. El valor de bootstrap depende de cómo se configuró el clasificador en el notebook."}
  };
  function renderAlgorithm(key){const item=algorithmDetails[key]||algorithmDetails.rf;$$("[data-algorithm]").forEach(b=>b.classList.toggle("active",b.dataset.algorithm===key));$("#algorithmDiagram").innerHTML=item.steps.map((x,i)=>'<div class="algorithm-step"><span>0'+(i+1)+'</span><b>'+esc(x)+'</b></div>').join("");$("#algorithmPrimerText").textContent=item.text;}
  $(".algorithm-toggle").addEventListener("click",e=>{const b=e.target.closest("[data-algorithm]");if(b)renderAlgorithm(b.dataset.algorithm);});
  renderAlgorithm("rf");

  const stepList=$("#stepList");
  stepList.innerHTML=(D.steps||[]).map((x,i)=>'<button class="step-link" type="button" data-step="'+i+'"><span class="step-index">'+String(i+1).padStart(2,"0")+'</span><span>'+esc(x.title)+'<small>'+esc(x.tag)+'</small></span></button>').join("");
  function updateRouteProgress(){const done=new Set(state.completed||[]),total=(D.steps||[]).length,pct=total?Math.round(done.size/total*100):0;$("#routePercent").textContent=pct+"%";$("#routeBar").style.width=pct+"%";$("#routeCount").textContent=done.size+" de "+total+" temas marcados";$("#knownCount").textContent=(state.known||[]).length;$$(".step-link").forEach((el,i)=>el.classList.toggle("complete",done.has(i)));}
  function renderStep(index){
    const steps=D.steps||[];if(!steps.length)return;
    state.routeIndex=Math.max(0,Math.min(index,steps.length-1));const i=state.routeIndex,item=steps[i];
    $$(".step-link").forEach((el,n)=>el.classList.toggle("active",n===i));
    $("#stepStage").innerHTML='<div class="step-tag">'+esc(item.tag)+'</div><h2>'+esc(item.title)+'</h2><p class="step-say">'+esc(item.say)+'</p><div class="step-detail-grid"><div class="step-detail"><strong>Qué mostrar</strong><p>'+esc(item.show)+'</p></div><div class="step-detail"><strong>Dónde señalar en el código</strong><pre>'+esc(item.code)+'</pre></div></div>'+(item.detail?'<div class="step-detail step-deep"><strong>Explicación técnica</strong><p>'+esc(item.detail)+'</p></div>':'')+'<details class="step-question"><summary>Pregunta probable: '+esc(item.ask)+'</summary><p>'+esc(item.answer)+'</p></details><div class="step-controls-inline"><button type="button" class="text-link" id="markStep">Marcar tema repasado ✓</button></div>';
    $("#stepNumber").textContent="Paso "+(i+1)+" de "+steps.length;$("#stepBar").style.width=((i+1)/steps.length*100)+"%";$("#prevStep").disabled=i===0;$("#nextStep").textContent=i===steps.length-1?"Ir a preguntas →":"Siguiente →";
    $("#markStep").addEventListener("click",()=>{const set=new Set(state.completed||[]);set.add(i);state.completed=[...set];save();updateRouteProgress();toast("Tema agregado al repaso.");});updateRouteProgress();
  }
  stepList.addEventListener("click",e=>{const b=e.target.closest("[data-step]");if(b)renderStep(Number(b.dataset.step));});
  $("#prevStep").addEventListener("click",()=>renderStep(state.routeIndex-1));
  $("#nextStep").addEventListener("click",()=>{if(state.routeIndex===(D.steps||[]).length-1){go("preguntas");return;}const set=new Set(state.completed||[]);set.add(state.routeIndex);state.completed=[...set];save();renderStep(state.routeIndex+1);});
  renderStep(Number(state.routeIndex)||0);

  function fileLinks(label){return label.split(" / ").map(s=>esc(s.trim())).join(" / ");}
  $("#rawFiles").innerHTML=(D.rawFiles||[]).map((f,i)=>'<tr><td>'+fileLinks(f.file)+'</td><td>'+esc(f.purpose)+'</td><td>'+esc(i===0?"Señala las claves y score.":i===6?"Explica que el archivo grande se lee por bloques.":"Explica cómo este archivo se une al conjunto.")+'</td></tr>').join("");
  $("#processedColumns").innerHTML=(D.processedColumns||[]).map(x=>'<span class="chip">'+esc(x)+'</span>').join("");
  $("#preparedPanel").insertAdjacentHTML("beforeend",'<div class="processed-sample"><div class="panel-kicker">EJEMPLO DEL CSV PROCESADO · IDS OMITIDOS</div><div class="table-scroll"><table class="metric-table"><thead><tr><th>score</th><th>action_wrong_response</th><th>action_correct_response</th><th>action_hint_requested</th><th>notfinish_percent</th><th>problem_text_bert_pca_0</th></tr></thead><tbody><tr><td>1</td><td>86</td><td>170</td><td>0</td><td>0,375</td><td>-5,192805</td></tr></tbody></table></div><p>Valores de una fila de muestra del CSV; se omiten student_id, unit_test_assignment_log_id y problem_id para proteger el rastreo personal.</p></div>');
  $$("[data-data-tab]").forEach(button=>button.addEventListener("click",()=>{const prepared=button.dataset.dataTab==="prepared";$$("[data-data-tab]").forEach(b=>{b.classList.toggle("active",b===button);b.setAttribute("aria-selected",String(b===button));});$("#rawPanel").hidden=prepared;$("#preparedPanel").hidden=!prepared;}));

  const notebooks=BOOKS,bookTabs=$("#notebookTabs"),stageSelect=$("#notebookStageSelect"),stageDetail=$("#notebookStageDetail"),notebookStages=window.NOTEBOOK_STAGES||{};
  let activeBook=null,activeCell=null,activeStep=0,activeStageIndex=0;
  function reviewedKey(book,cell){return book.id+":"+cell.sourceCell;}
  function updateNotebookProgress(){$("#notebookProgress").textContent=(state.notebookDone||[]).length;}
  function currentStages(){return activeBook?(notebookStages[activeBook.id]||[]):[];}
  function renderStage(index){
    const stages=currentStages();if(!stages.length){stageSelect.innerHTML="";stageDetail.innerHTML="<p>No hay etapas descritas para este notebook.</p>";return;}
    activeStageIndex=Math.max(0,Math.min(index,stages.length-1));const item=stages[activeStageIndex];
    stageSelect.innerHTML=stages.map((stage,i)=>'<option value="'+i+'">'+esc(stage.title.replace(/^\d+\.\s*/,""))+' · '+esc(stage.phase)+'</option>').join("");stageSelect.value=String(activeStageIndex);
    $("#prevNotebookStage").disabled=activeStageIndex===0;$("#nextNotebookStage").disabled=activeStageIndex===stages.length-1;
    $("#notebookStageCounter").textContent="Etapa "+(activeStageIndex+1)+" de "+stages.length;$("#notebookStageHeading").textContent=item.title.replace(/^\d+\.\s*/,"");
    const fields=[["Entrada",item.input],["Procesamiento",item.process],["Transformación",item.transformation],["Modelado",item.modeling],["Salida",item.output],["Qué se forma",item.forms]];
    if(item.extra)fields.push([item.extra.title,item.extra.text]);
    const cell=activeBook.cells[item.cellIndex];
    stageDetail.innerHTML='<div class="stage-detail-top"><div><span>FASE: '+esc(item.phase.toUpperCase())+' · ETAPA '+String(activeStageIndex+1).padStart(2,"0")+' DE '+String(stages.length).padStart(2,"0")+'</span><p>'+esc(item.summary)+'</p></div><div class="stage-source-ref"><small>↓ CÓDIGO RELACIONADO</small><b>Celda '+(cell.sourceCell+1)+': '+esc(cell.title)+'</b></div></div><div class="stage-io-grid">'+fields.map((field,i)=>'<section class="stage-io-card '+(i===3?"stage-model-card":"")+(field[0].includes("etiqueta")||field[0].includes("score")?" stage-extra-card":"")+'"><b>'+esc(field[0])+'</b><p>'+esc(field[1])+'</p></section>').join("")+'</div>';
  }
  function applyCodeSearch(){const q=$("#cellSearch").value.trim().toLocaleLowerCase("es");$$(".notebook-code-line").forEach(x=>x.classList.toggle("search-hit",!!q&&x.textContent.toLocaleLowerCase("es").includes(q)));}
  function renderCodeLines(cell,focus){
    $("#notebookCode").innerHTML=cell.source.split("\n").map((line,i)=>{const n=i+1,focused=focus&&n>=focus.start&&n<=focus.end,marker=focus&&n===focus.start;return '<div class="notebook-code-line'+(focused?" focus":"")+'" data-line="'+n+'"><span class="line-number"><span class="code-line-pointer">'+(marker?"➜":"")+'</span><span>'+String(n).padStart(3,"0")+'</span></span><code>'+(line.length?esc(line):"&nbsp;")+'</code></div>';}).join("");
    applyCodeSearch();
  }
  function selectExplainStep(index){
    if(!activeCell)return;activeStep=Math.max(0,Math.min(index,activeCell.steps.length-1));const item=activeCell.steps[activeStep];
    $("#selectedStepTitle").textContent=item.title;$("#selectedStepText").textContent=item.text;$("#explainStepCount").textContent="Paso "+(activeStep+1)+" de "+activeCell.steps.length;$("#prevExplain").disabled=activeStep===0;$("#nextExplain").disabled=activeStep===activeCell.steps.length-1;
    const stage=currentStages()[activeStageIndex];$("#codePointerText").textContent="Fase: "+(stage?stage.phase:"sin clasificar")+" · subpaso: "+item.title+" · líneas "+item.start+"–"+item.end+" resaltadas. La flecha señala la primera línea.";
    $$("[data-explain-step]").forEach(b=>b.classList.toggle("active",Number(b.dataset.explainStep)===activeStep));renderCodeLines(activeCell,item);
    const line=$('#notebookCode [data-line="'+item.start+'"]');if(line)line.scrollIntoView({block:"nearest"});
  }
  function renderCell(index,stepIndex,stageIndex){
    if(!activeBook)return;const i=Math.max(0,Math.min(index,activeBook.cells.length-1));activeCell=activeBook.cells[i];activeStep=0;state.notebookCell=i;state.notebookBook=activeBook.id;
    if(Number.isInteger(stageIndex)){activeStageIndex=stageIndex;}else if(!currentStages()[activeStageIndex]||currentStages()[activeStageIndex].cellIndex!==i){const matchingStage=currentStages().findIndex(stage=>stage.cellIndex===i);if(matchingStage>=0)activeStageIndex=matchingStage;}
    $("#codeCellNumber").textContent="CÓDIGO · CELDA "+(activeCell.sourceCell+1);$("#codeCellTitle").textContent=activeCell.title;$("#codeCellExplanation").textContent=activeCell.explanation;$("#cellPosition").textContent="Celda fuente "+(activeCell.sourceCell+1)+" · "+activeCell.lineCount+" líneas";
    $("#explanationSteps").innerHTML=activeCell.steps.map((step,n)=>'<button type="button" class="cell-step-button'+(n===0?" active":"")+'" data-explain-step="'+n+'"><span>'+String(n+1).padStart(2,"0")+'</span>'+esc(step.title)+'</button>').join("");
    $("#cellSearch").value="";
    const done=(state.notebookDone||[]).includes(reviewedKey(activeBook,activeCell));$("#markNotebookCell").classList.toggle("done",done);$("#markNotebookCell").textContent=done?"Celda repasada ✓":"Marcar repasada ✓";
    renderStage(activeStageIndex);selectExplainStep(Number.isInteger(stepIndex)?stepIndex:0);save();
  }
  function renderBook(id){
    activeBook=notebooks.find(b=>b.id===id)||notebooks[0];if(!activeBook)return;state.notebookBook=activeBook.id;
    bookTabs.innerHTML=notebooks.map(b=>'<button type="button" class="notebook-tab'+(b.id===activeBook.id?" active":"")+'" data-notebook="'+esc(b.id)+'">'+esc(b.title)+'</button>').join("");
    $("#notebookFileLabel").textContent=activeBook.file;$("#notebookTitle").textContent=activeBook.title;$("#notebookPurpose").textContent=activeBook.purpose;$("#openNotebook").href=activeBook.source;$("#openNotebook").setAttribute("download",activeBook.file);
    activeStageIndex=0;const firstStage=currentStages()[0];renderCell(firstStage?firstStage.cellIndex:0,firstStage?firstStage.stepIndex:0,0);updateNotebookProgress();
  }
  function goToNotebookStage(index){const stage=currentStages()[index];if(stage)renderCell(stage.cellIndex,stage.stepIndex,index);}
  bookTabs.addEventListener("click",e=>{const b=e.target.closest("[data-notebook]");if(b)renderBook(b.dataset.notebook);});
  stageSelect.addEventListener("change",()=>goToNotebookStage(Number(stageSelect.value)));
  $("#prevNotebookStage").addEventListener("click",()=>goToNotebookStage(activeStageIndex-1));$("#nextNotebookStage").addEventListener("click",()=>goToNotebookStage(activeStageIndex+1));
  $("#explanationSteps").addEventListener("click",e=>{const b=e.target.closest("[data-explain-step]");if(b)selectExplainStep(Number(b.dataset.explainStep));});
  $("#prevExplain").addEventListener("click",()=>selectExplainStep(activeStep-1));$("#nextExplain").addEventListener("click",()=>selectExplainStep(activeStep+1));
  $("#markNotebookCell").addEventListener("click",()=>{const set=new Set(state.notebookDone||[]);set.add(reviewedKey(activeBook,activeCell));state.notebookDone=[...set];save();renderCell(activeBook.cells.indexOf(activeCell));updateNotebookProgress();toast("Celda agregada al repaso.");});
  $("#cellSearch").addEventListener("input",applyCodeSearch);
  $("#copyNotebookCell").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(activeCell.source);toast("Celda completa copiada.");}catch(_){const ta=document.createElement("textarea");ta.value=activeCell.source;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("Celda completa copiada.");}});
  renderBook(state.notebookBook||"prep");

  const metricDefs={
    accuracy:{name:"Accuracy",field:"accuracy",definition:"Proporción global de registros clasificados correctamente. Resume ambas clases, pero no indica por sí sola dónde están los errores."},
    pm:{name:"Precisión macro",field:"pm",definition:"Calcula la precisión de score=0 y score=1 por separado y promedia ambas; las clases tienen el mismo peso."},
    rm:{name:"Recall macro",field:"rm",definition:"Calcula el recall de cada clase y promedia ambos. No es el recall exclusivo de score=0."},
    fm:{name:"F1 macro",field:"fm",definition:"Promedia el F1 de las dos clases; resume el equilibrio entre precisión y recall de cada clase."}
  };
  function metricRows(split){return (D.splits[split]||[]).map(r=>'<tr><td>'+esc(r.model)+'</td><td>'+fmt(r.accuracy)+'</td><td>'+fmt(r.pm)+'</td><td>'+fmt(r.rm)+'</td><td>'+fmt(r.fm)+'</td></tr>').join("");}
  $("#trainMetricRows").innerHTML=metricRows("train");$("#evaluationMetricRows").innerHTML=metricRows("evaluation");
  function renderReportedMetric(){
    const key=$("#reportedMetricSelect").value,def=metricDefs[key],train=D.splits.train,evalRows=D.splits.evaluation;
    $("#reportedMetricChart").innerHTML=train.map((r,i)=>{const e=evalRows.find(x=>x.model===r.model);return '<div class="reported-chart-row"><div class="reported-chart-name">'+esc(r.model)+'</div><div class="reported-chart-bars"><div class="reported-bar-line"><span>Train</span><div class="reported-bar-track"><i class="reported-bar-train" style="width:'+(r[def.field]*100)+'%"></i></div><b>'+fmt(r[def.field])+'</b></div><div class="reported-bar-line"><span>Prueba</span><div class="reported-bar-track"><i class="reported-bar-eval" style="width:'+(e[def.field]*100)+'%"></i></div><b>'+fmt(e[def.field])+'</b></div></div></div>';}).join("");
    $("#reportedMetricExplanation").innerHTML='<b>'+esc(def.name)+':</b> '+esc(def.definition)+' Los dos colores comparan la misma métrica en train y evaluation.';
  }
  $("#reportedMetricSelect").addEventListener("change",renderReportedMetric);renderReportedMetric();

  const classRows=[{split:"Train",zero:16650,one:23285,total:39935},{split:"Evaluation",zero:4535,one:6572,total:11107}];
  $("#classDistributionFigure").innerHTML=classRows.map(x=>'<div class="class-dist-row"><b>'+x.split+'</b><div class="class-dist-bars"><div><span>score=0 · '+x.zero.toLocaleString("es-ES")+'</span><i class="class-zero" style="width:'+(x.zero/x.total*100)+'%"></i></div><div><span>score=1 · '+x.one.toLocaleString("es-ES")+'</span><i class="class-one" style="width:'+(x.one/x.total*100)+'%"></i></div></div><small>n = '+x.total.toLocaleString("es-ES")+'</small></div>').join("");
  const importance=[
    ["action_answer_requested",.05544],["action_wrong_response",.03038],["action_correct_response",.02871],["notfinish_percent",.02810],["available_core_tutoring_other",.02785],["action_continue_selected",.02766],["action_problem_finished",.02733],["action_problem_started",.02618],["available_core_tutoring_no_tutoring",.02481],["available_core_tutoring_answer",.02455],["available_core_tutoring_hint",.02386],["action_assignment_finished",.02364],["action_open_response",.02354],["problem_text_bert_pca_1",.02227],["action_assignment_started",.02162]
  ];
  $("#featureImportanceFigure").innerHTML=importance.map(x=>'<div class="importance-static-row"><span title="'+esc(x[0])+'">'+esc(x[0])+'</span><i style="width:'+(x[1]/importance[0][1]*100)+'%"></i><b>'+x[1].toFixed(3)+'</b></div>').join("");
  $("#reportedConfusionMatrices").innerHTML=(D.confusion||[]).map(m=>{const v=m.values;return '<article class="reported-confusion-card"><h3>'+esc(m.model)+'</h3><div class="reported-matrix"><div class="matrix-corner">Real ↓<br>Pred. →</div><div class="matrix-head">score=0</div><div class="matrix-head">score=1</div><div class="matrix-head">score=0</div><div class="matrix-hit">'+v[0][0].toLocaleString("es-ES")+'</div><div class="matrix-error">'+v[0][1].toLocaleString("es-ES")+'</div><div class="matrix-head">score=1</div><div class="matrix-error">'+v[1][0].toLocaleString("es-ES")+'</div><div class="matrix-hit">'+v[1][1].toLocaleString("es-ES")+'</div></div><p>Omisiones score=0: <b>'+v[0][1].toLocaleString("es-ES")+'</b> · falsas alertas: <b>'+v[1][0].toLocaleString("es-ES")+'</b></p></article>';}).join("");

  const questions=D.questions||[],categories=["Todos los temas",...new Set(questions.map(q=>q.category))];
  $("#questionFilter").innerHTML=categories.map((x,i)=>'<option value="'+(i===0?"all":esc(x))+'">'+esc(x)+'</option>').join("");
  function updateKnown(){const known=new Set(state.known||[]);$("#knownCount").textContent=known.size;$("#questionCount").textContent=known.size+" repasadas · "+questions.length+" preguntas disponibles";}
  function renderQuestions(){
    const category=$("#questionFilter").value,query=$("#questionSearch").value.trim().toLocaleLowerCase("es");
    const filtered=questions.filter(q=>(category==="all"||q.category===category)&&(!query||(q.q+" "+q.answer+" "+q.follow).toLocaleLowerCase("es").includes(query)));
    $("#questionCount").textContent=filtered.length+" preguntas";
    $("#questionList").innerHTML=filtered.map(q=>{const known=(state.known||[]).includes(q.q);return '<details class="study-question"><summary><span class="question-category">'+esc(q.category)+'</span>'+esc(q.q)+'</summary><div><p>'+esc(q.answer)+'</p><p class="follow-up"><b>Si repreguntan:</b> '+esc(q.follow)+'</p><button type="button" class="text-link" data-mark-question="'+esc(q.q)+'">'+(known?"Repasada ✓":"Marcar como repasada")+'</button></div></details>';}).join("")||'<p class="empty-question-state">No hay preguntas con ese filtro.</p>';
  }
  $("#questionFilter").addEventListener("change",renderQuestions);$("#questionSearch").addEventListener("input",renderQuestions);
  $("#questionList").addEventListener("click",e=>{const b=e.target.closest("[data-mark-question]");if(!b)return;const q=b.dataset.markQuestion,set=new Set(state.known||[]);if(set.has(q))set.delete(q);else set.add(q);state.known=[...set];save();renderQuestions();updateKnown();});
  $("#quickQuestion").addEventListener("click",()=>go("preguntas"));
  renderQuestions();updateKnown();

  $("#phaseList").innerHTML=(D.phases||[]).map((p,i)=>'<div class="phase-row '+(p.status.includes("Propuesta")?"proposal":"")+'"><span class="phase-index">0'+(i+1)+'</span><h3>'+esc(p.name)+'</h3><span class="phase-status">'+esc(p.status)+'</span><p>'+esc(p.text)+'</p></div>').join("");
  $("#paperLink").href=D.originalPaper.doi;$("#repoLink").href=D.originalPaper.repo;
  $("#qualityRefs").innerHTML=(D.originalPaper.qualityRefs||[]).map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.label)+' ↗</a>').join("");
  updateRouteProgress();
  const validPages=["inicio","ruta","datos","codigo","resultados","preguntas","calidad"];
  go(validPages.includes(state.currentPage)?state.currentPage:"inicio");
})();
