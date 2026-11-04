(() => {
  "use strict";
  const D = window.GUIA;
  const P = window.PREDICCIONES;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const key = "g8-defensa-assistments-v2";
  let state = { known: [], completed: [], routeIndex: 0, questionId: null, lastQuestionId: null, split: "evaluation", metric: "accuracy", codeId: D.codeCards[0].id, preset: "base", notebookBook: "prep", notebookCell: 0, notebookDone: [] };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) {}
  let toastTimer;

  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} }
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
  }
  function go(page) {
    const found = $(`[data-view="${page}"]`); if (!found) return;
    $$("[data-view]").forEach(el => { const active = el === found; el.hidden = !active; el.classList.toggle("active", active); });
    $$(".nav-item[data-go]").forEach(el => el.classList.toggle("active", el.dataset.go === page));
    state.currentPage = page; save(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$('[data-go]').forEach(el => el.addEventListener("click", event => { event.preventDefault(); go(el.dataset.go); }));
  $("#printGuide").addEventListener("click", () => window.print());

  // Inicio: cifras y lista de requisitos de la docente.
  $("#statGrid").innerHTML = D.stats.map(item => `<div class="stat-item"><span class="stat-value">${item.value}</span><span class="stat-label">${item.label}</span><span class="stat-note">${item.note}</span></div>`).join("");
  const requirements = [
    ["Tipo de modelo", "RF de práctica, RF con otros parámetros y un algoritmo ML adicional."],
    ["Datos y variables", "Conjunto usado, X, y, etiquetas y unidad de análisis."],
    ["Datos listos", "Preprocesamiento, transformación y cabeceras antes/después."],
    ["Construcción", "Parámetros exactos y dónde están en el código."],
    ["Rendimiento", "Curvas ROC de entrenamiento y prueba."],
    ["Comparación", "Métricas de las tres corridas y conclusiones propias."],
    ["Fases faltantes", "Propuesta de despliegue y monitoreo."],
    ["Anexos IEEE", "Citas, referencias, enlaces a datos, código y estudio."]
  ];
  $("#requirementList").innerHTML = requirements.map((r,i) => `<div class="requirement"><i>${String(i+1).padStart(2,"0")}</i><div><strong>${r[0]}</strong><span>${r[1]}</span></div></div>`).join("");

  // Comparación inicial de algoritmos: mismo problema, diferente mecanismo de división.
  const algorithmDetails = {
    rf: { steps:["Muestra bootstrap de filas","Elige √722 variables candidatas","Busca el mejor umbral entre candidatas","Promedia votos/probabilidades"], text:"Random Forest construye árboles sobre muestras con reemplazo. En cada nodo evalúa un subconjunto aleatorio de predictores y elige el corte que mejor separa los datos entre las opciones evaluadas." },
    et: { steps:["Muestra bootstrap de filas*","Elige √722 variables candidatas","Prueba umbrales aleatorios","Elige el mejor de esos cortes y promedia"], text:"Extra Trees agrega aleatoriedad en los umbrales de corte: genera cortes aleatorios para las variables candidatas y elige el mejor entre ellos. En esta corrida bootstrap=True, así que también usa remuestreo de filas. *Este detalle depende del parámetro fijado en el notebook." }
  };
  function renderAlgorithm(key) {
    const item=algorithmDetails[key]||algorithmDetails.rf;
    $$("[data-algorithm]").forEach(b=>b.classList.toggle("active",b.dataset.algorithm===key));
    $("#algorithmDiagram").innerHTML=item.steps.map((step,i)=>`<div class="algorithm-step"><span>0${i+1}</span><b>${step}</b></div>`).join("");
    $("#algorithmPrimerText").textContent=item.text;
  }
  $(".algorithm-toggle").addEventListener("click",e=>{const b=e.target.closest("[data-algorithm]");if(b)renderAlgorithm(b.dataset.algorithm);});
  renderAlgorithm("rf");

  // Ruta guiada.
  const stepList = $("#stepList");
  stepList.innerHTML = D.steps.map((s,i) => `<button class="step-link" type="button" data-step="${i}"><span class="step-index">${String(i+1).padStart(2,"0")}</span><span>${s.title}<small>${s.tag}</small></span></button>`).join("");
  function routeProgress() {
    const done = new Set(state.completed || []), total = D.steps.length, pct = Math.round(done.size / total * 100);
    $("#routePercent").textContent = `${pct}%`; $("#routeBar").style.width = `${pct}%`;
    $("#routeCount").textContent = `${done.size} de ${total} temas marcados`;
    $("#knownCount").textContent = (state.known || []).length;
    $$(".step-link").forEach((el,i) => el.classList.toggle("complete", done.has(i)));
  }
  function renderStep(index) {
    state.routeIndex = Math.max(0, Math.min(index, D.steps.length - 1));
    const i = state.routeIndex, item = D.steps[i];
    $$(".step-link").forEach((el,n) => el.classList.toggle("active", n === i));
    $("#stepStage").innerHTML = `<div class="step-tag">${item.tag}</div><h2>${item.title}</h2><p class="step-say">${item.say}</p><div class="step-detail-grid"><div class="step-detail"><strong>Qué mostrar</strong>${item.show}</div><div class="step-detail"><strong>Dónde apuntar en código</strong>${item.code}</div></div><details class="step-question"><summary>Pregunta probable: ${item.ask}</summary><p>${item.answer}</p></details><div class="step-controls-inline"><button type="button" class="text-link" id="markStep">Marcar tema repasado ✓</button></div>`;
    $("#stepNumber").textContent = `Paso ${i+1} de ${D.steps.length}`; $("#stepBar").style.width = `${(i+1)/D.steps.length*100}%`;
    $("#prevStep").disabled = i === 0; $("#nextStep").textContent = i === D.steps.length - 1 ? "Ir al simulacro →" : "Siguiente →";
    $("#markStep").addEventListener("click", () => { const set = new Set(state.completed || []); set.add(i); state.completed = [...set]; save(); routeProgress(); toast("Tema agregado al repaso."); });
    routeProgress();
  }
  stepList.addEventListener("click", e => { const button = e.target.closest("[data-step]"); if (button) renderStep(Number(button.dataset.step)); });
  $("#prevStep").addEventListener("click", () => renderStep(state.routeIndex - 1));
  $("#nextStep").addEventListener("click", () => { if (state.routeIndex === D.steps.length-1) go("simulacro"); else { const done = new Set(state.completed || []); done.add(state.routeIndex); state.completed = [...done]; save(); renderStep(state.routeIndex+1); } });
  renderStep(Number(state.routeIndex) || 0);

  // Vista de datos crudos/procesados.
  $("#rawFiles").innerHTML = D.rawFiles.map((f,i) => `<tr><td>${f.file}</td><td>${f.purpose}</td><td>${i===0 ? "señala las claves y score" : i===6 ? "explica por qué se lee por bloques" : "explica cómo se une"}</td></tr>`).join("");
  $("#processedColumns").innerHTML = D.processedColumns.map(c => `<span class="chip">${c}</span>`).join("");
  $$("[data-data-tab]").forEach(button => button.addEventListener("click", () => {
    const prepared = button.dataset.dataTab === "prepared";
    $$("[data-data-tab]").forEach(b => { b.classList.toggle("active", b===button); b.setAttribute("aria-selected", String(b===button)); });
    $("#rawPanel").hidden = prepared; $("#preparedPanel").hidden = !prepared;
  }));

  // Simulador de notebooks: muestra código fuente completo y explicación por rangos de líneas.
  const notebooks = window.NOTEBOOKS || [];
  const bookTabs = $("#notebookTabs"), cellList = $("#notebookCellList");
  let activeBook = null, activeCell = null, activeStep = 0;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function reviewedKey(book, cell) { return `${book.id}:${cell.sourceCell}`; }
  function updateNotebookProgress() { $("#notebookProgress").textContent = (state.notebookDone || []).length; }
  function renderCodeLines(cell, focus = null) {
    $("#notebookCode").innerHTML = cell.source.split("\n").map((line, i) => {
      const n = i + 1, blank = line.length ? esc(line) : "&nbsp;";
      const focused = focus && n >= focus.start && n <= focus.end;
      return `<div class="notebook-code-line${focused ? " focus" : ""}" data-line="${n}"><span class="line-number">${String(n).padStart(3,"0")}</span><code>${blank}</code></div>`;
    }).join("");
  }
  function selectExplainStep(index) {
    if (!activeCell) return;
    activeStep = Math.max(0, Math.min(index, activeCell.steps.length - 1));
    const step = activeCell.steps[activeStep];
    $("#selectedStepTitle").textContent = step.title;
    $("#selectedStepText").textContent = step.text;
    $("#explainStepCount").textContent = `Paso ${activeStep + 1} de ${activeCell.steps.length}`;
    $("#prevExplain").disabled = activeStep === 0;
    $("#nextExplain").disabled = activeStep === activeCell.steps.length - 1;
    $$("[data-explain-step]").forEach(button => button.classList.toggle("active", Number(button.dataset.explainStep) === activeStep));
    renderCodeLines(activeCell, step);
    const first = $(`#notebookCode [data-line="${step.start}"]`);
    if (first) first.scrollIntoView({block:"nearest"});
    applyCodeSearch();
  }
  function renderCell(index) {
    if (!activeBook) return;
    const i = Math.max(0, Math.min(index, activeBook.cells.length - 1));
    activeCell = activeBook.cells[i]; state.notebookCell = i; state.notebookBook = activeBook.id; activeStep = 0;
    $("#simCellNumber").textContent = `In [ ] · celda fuente ${activeCell.sourceCell + 1}`;
    $("#simCellTitle").textContent = activeCell.title;
    $("#simCellExplanation").textContent = activeCell.explanation;
    $("#cellPosition").textContent = `Celda ${i + 1} de ${activeBook.cells.length}`;
    $("#cellCount").textContent = `${activeBook.cells.length} celdas`;
    $("#notebookCellList").innerHTML = activeBook.cells.map((cell,n) => {
      const done = (state.notebookDone || []).includes(reviewedKey(activeBook,cell));
      return `<button type="button" class="notebook-cell-link${n===i?" active":""}" data-notebook-cell="${n}"><span class="cell-link-index">${String(n+1).padStart(2,"0")}${done?" ✓":""}</span><span><b>${esc(cell.title)}</b><small>Celda fuente ${cell.sourceCell+1} · ${cell.lineCount} líneas</small></span></button>`;
    }).join("");
    $("#explanationSteps").innerHTML = activeCell.steps.map((step,n) => `<button type="button" class="cell-step-button${n===0?" active":""}" data-explain-step="${n}"><span>${String(n+1).padStart(2,"0")}</span>${esc(step.title)}</button>`).join("");
    $("#cellSearch").value = ""; $("#simOutput").hidden = true;
    $("#prevNotebookCell").disabled = i === 0;
    $("#nextNotebookCell").textContent = i === activeBook.cells.length - 1 ? "Siguiente notebook →" : "Siguiente celda →";
    const done = (state.notebookDone || []).includes(reviewedKey(activeBook,activeCell));
    $("#markNotebookCell").classList.toggle("done", done);
    $("#markNotebookCell").textContent = done ? "Celda repasada ✓" : "Marcar repasada ✓";
    selectExplainStep(0); save();
  }
  function renderBook(id, cellIndex = 0) {
    activeBook = notebooks.find(book => book.id === id) || notebooks[0];
    if (!activeBook) return;
    state.notebookBook = activeBook.id;
    bookTabs.innerHTML = notebooks.map(book => `<button type="button" class="notebook-tab${book.id===activeBook.id?" active":""}" data-notebook="${book.id}">${esc(book.title)}</button>`).join("");
    $("#notebookFileLabel").textContent = activeBook.file;
    $("#notebookTitle").textContent = activeBook.title;
    $("#notebookPurpose").textContent = activeBook.purpose;
    $("#openNotebook").href = activeBook.source;
    renderCell(cellIndex); updateNotebookProgress();
  }
  function metricTable(splitNames, modelFilter = null) {
    const columns = [["accuracy","Accuracy"],["p0","P0"],["r0","R0"],["f10","F1 0"],["p1","P1"],["r1","R1"],["f11","F1 1"],["pm","P macro"],["rm","R macro"],["fm","F1 macro"],["auc0","AUC 0"]];
    const rows = splitNames.flatMap(split => window.GUIA.splits[split].filter(row=>!modelFilter||row.model===modelFilter).map(row => ({...row, split, count: split === "train" ? 39935 : 11107})));
    return `<div class="sim-table-scroll"><table class="sim-output-table"><thead><tr><th>Modelo</th><th>Partición</th><th>Filas</th>${columns.map(c=>`<th>${c[1]}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.model)}</td><td>${row.split}</td><td>${row.count.toLocaleString("es-ES")}</td>${columns.map(c=>`<td>${Number(row[c[0]]).toFixed(4)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function outputFor(cell) {
    if (cell.outputMode === "metrics") return metricTable(["train","evaluation"]);
    if (cell.outputMode === "rf-metrics") return `<p class="output-note">Indicadores del RF de práctica en evaluation. La corrida real también muestra el resto de métricas y parámetros en la salida del notebook.</p>${metricTable(["evaluation"],"RF práctica")}`;
    if (cell.outputMode === "gaps") {
      const metrics = [["accuracy","Accuracy"],["fm","F1 macro"],["r0","Recall score=0"],["auc0","ROC-AUC score=0"]];
      const rows = ["RF práctica","RF parámetros modificados","Extra Trees"].flatMap(name=>metrics.map(([key,label])=>{const a=window.GUIA.splits.train.find(r=>r.model===name),b=window.GUIA.splits.evaluation.find(r=>r.model===name);return `<tr><td>${name}</td><td>${label}</td><td>${a[key].toFixed(4)}</td><td>${b[key].toFixed(4)}</td><td>${(a[key]-b[key]).toFixed(4)}</td></tr>`;}));
      return `<div class="sim-table-scroll"><table class="sim-output-table"><thead><tr><th>Modelo</th><th>Métrica</th><th>Train</th><th>Evaluation</th><th>Brecha</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    }
    if (cell.outputMode === "confusions") return `<pre class="output-pre">Filas = real [score=0, score=1]; columnas = predicción [score=0, score=1]\n\n${window.GUIA.confusion.map(m=>`${m.model}\n${JSON.stringify(m.values)}\nNo éxitos omitidos: ${m.missed0}`).join("\n\n")}</pre>`;
    if (cell.outputMode === "roc") return `<p class="output-note">La imagen es la curva guardada por el grupo. Valores AUC (train → evaluation): RF práctica 0,9165 → 0,7528; RF modificado 0,8269 → 0,7489; Extra Trees 0,8246 → 0,7340.</p><img class="sim-output-figure" src="assets/curvas_roc_train_prueba.png" alt="Curvas ROC del grupo para train y evaluation">`;
    if (cell.outputMode === "rf-plots") return `<pre class="output-pre">Matriz de confusión en evaluation (filas reales; columnas predichas):\n[[2526, 2009],\n [1299, 5273]]\n\nLa misma celda dibuja la curva ROC de score=0 y un gráfico de las 15 variables con mayor importancia. El .ipynb guardado no incluye la imagen de salida; las curvas comparativas aparecen en el panel de resultados.</pre>`;
    if (cell.outputMode === "rf-inference") return `<p class="output-note">Diez predicciones reales de la demostración sobre filas reservadas; se omiten identificadores y score real. Las probabilidades se muestran con cuatro decimales.</p><div class="sim-table-scroll"><table class="sim-output-table"><thead><tr><th>Fila</th><th>score_predicho</th><th>Prob. score=0</th><th>Prob. score=1</th></tr></thead><tbody>${P.demo.map(r=>`<tr><td>${r.row}</td><td>${r.pred}</td><td>${r.p0.toFixed(4)}</td><td>${r.p1.toFixed(4)}</td></tr>`).join("")}</tbody></table></div>`;
    return `<pre class="output-pre">${esc(cell.output)}</pre>`;
  }
  function applyCodeSearch() {
    const query = $("#cellSearch").value.trim().toLocaleLowerCase("es");
    $$(".notebook-code-line").forEach(line => line.classList.toggle("search-hit", !!query && line.textContent.toLocaleLowerCase("es").includes(query)));
  }
  bookTabs.addEventListener("click", event => { const tab = event.target.closest("[data-notebook]"); if (tab) renderBook(tab.dataset.notebook,0); });
  cellList.addEventListener("click", event => { const item = event.target.closest("[data-notebook-cell]"); if (item) renderCell(Number(item.dataset.notebookCell)); });
  $("#explanationSteps").addEventListener("click", event => { const button=event.target.closest("[data-explain-step]"); if(button) selectExplainStep(Number(button.dataset.explainStep)); });
  $("#prevExplain").addEventListener("click",()=>selectExplainStep(activeStep-1));
  $("#nextExplain").addEventListener("click",()=>selectExplainStep(activeStep+1));
  $("#prevNotebookCell").addEventListener("click",()=>renderCell(activeBook.cells.indexOf(activeCell)-1));
  $("#nextNotebookCell").addEventListener("click",()=>{const i=activeBook.cells.indexOf(activeCell);if(i<activeBook.cells.length-1)renderCell(i+1);else{const n=notebooks.findIndex(book=>book.id===activeBook.id);renderBook(notebooks[(n+1)%notebooks.length].id,0);}});
  $("#simulateCell").addEventListener("click",()=>{$("#simOutputContent").innerHTML=outputFor(activeCell);$("#simOutput").hidden=false;});
  $("#closeOutput").addEventListener("click",()=>$("#simOutput").hidden=true);
  $("#markNotebookCell").addEventListener("click",()=>{const set=new Set(state.notebookDone||[]);set.add(reviewedKey(activeBook,activeCell));state.notebookDone=[...set];save();renderCell(activeBook.cells.indexOf(activeCell));updateNotebookProgress();toast("Celda agregada al repaso.");});
  $("#cellSearch").addEventListener("input",applyCodeSearch);
  $("#copyNotebookCell").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(activeCell.source);toast("Celda completa copiada.");}catch(_){const ta=document.createElement("textarea");ta.value=activeCell.source;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("Celda completa copiada.");}});
  $("#simulateCell").setAttribute("aria-label","Mostrar salida simulada o de referencia de la celda seleccionada");
  renderBook(state.notebookBook||"prep",Number(state.notebookCell)||0);

  // Resultados calculados desde probabilidades de los modelos ajustados con el CSV real.
  const fmt = x => Number(x).toFixed(4), pct = x => `${(x*100).toFixed(1)}%`;
  const metricExplain = {
    accuracy: "Fracción de filas bien clasificadas; resume ambas clases y puede ocultar errores en la clase minoritaria.",
    fm: "Promedio de F1 para score=0 y score=1 con el mismo peso por clase.",
    r0: "De todos los no éxitos reales, qué proporción detecta el modelo. Aumenta al bajar el umbral, pero pueden aumentar falsas alertas.",
    auc0: "Ordenamiento de probabilidades para score=0 a través de todos los umbrales; no cambia cuando mueves el corte."
  };
  function selectedModel() { return P.models.find(m=>m.key === $("#focusModel").value) || P.models[0]; }
  function computeMetrics(model, split, threshold) {
    const truth=P.labels[split], risk=model.p0[split];
    const predictions=Math.abs(threshold-.5)<1e-10 ? model.pred[split] : risk.map(p=>p>=threshold?0:1);
    let tn=0,fp=0,fn=0,tp=0;
    for(let i=0;i<truth.length;i++){
      if(truth[i]===0){if(predictions[i]===0)tn++;else fp++;}
      else {if(predictions[i]===0)fn++;else tp++;}
    }
    const div=(a,b)=>b?a/b:0, f1=(pr,re)=>div(2*pr*re,pr+re);
    const p0=div(tn,tn+fn),r0=div(tn,tn+fp),p1=div(tp,tp+fp),r1=div(tp,tp+fn),f10=f1(p0,r0),f11=f1(p1,r1);
    return {accuracy:div(tn+tp,truth.length),p0,r0,f10,p1,r1,f11,pm:(p0+p1)/2,rm:(r0+r1)/2,fm:(f10+f11)/2,auc0:model.metrics[split].auc0,cm:[[tn,fp],[fn,tp]],n:truth.length};
  }
  function getAllMetrics() { const t=Number($("#thresholdRange").value);return P.models.map(model=>({model:model.name,key:model.key,...computeMetrics(model,state.split,t)})); }
  function renderSplit(split) {
    state.split=split;
    $$(".split-tab").forEach(b=>{const active=b.dataset.split===split;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
    if(split==="train"){
      $("#splitTakeaway").textContent="Entrenamiento: el modelo ya vio estas filas.";
      $("#splitDescription").textContent="Sirve para explicar ajuste; la diferencia con evaluation ayuda a discutir generalización.";
    } else {
      $("#splitTakeaway").textContent="Evaluation: filas reservadas del caso.";
      $("#splitDescription").textContent="Compara registros que no participaron en fit; 31 estudiantes aparecen en ambos grupos.";
    }
    renderDynamicResults();
  }
  $$(".split-tab").forEach(b=>b.addEventListener("click",()=>renderSplit(b.dataset.split)));
  function renderBars(rows) {
    const metric=$("#metricSelect").value; state.metric=metric;
    $("#barChart").innerHTML=rows.map(r=>`<button class="bar-row ${r.model===selectedModel().name?"selected":""}" data-select-model="${P.models.find(m=>m.name===r.model).key}" type="button"><span class="bar-label">${r.model}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(0,Math.min(100,r[metric]*100))}%;background:${P.models.find(m=>m.name===r.model).color}"></span></span><span class="bar-value">${fmt(r[metric])}</span></button>`).join("");
    $("#metricExplanation").textContent=metricExplain[metric];
  }
  function renderMatrices(rows) {
    $("#confusionGrid").innerHTML=rows.map(r=>`<div class="confusion-card ${r.model===selectedModel().name?"selected":""}" data-select-model="${P.models.find(m=>m.name===r.model).key}" tabindex="0" role="button" aria-label="Seleccionar ${r.model}"><h3>${r.model}</h3><div class="matrix" role="table" aria-label="Matriz de confusión ${r.model}"><div class="matrix-head">Real ↓<br>Pred. →</div><div class="matrix-head">0</div><div class="matrix-head">1</div><div class="matrix-head">0</div><div class="diag">${r.cm[0][0].toLocaleString("es-ES")}</div><div class="error">${r.cm[0][1].toLocaleString("es-ES")}</div><div class="matrix-head">1</div><div class="error">${r.cm[1][0].toLocaleString("es-ES")}</div><div class="diag">${r.cm[1][1].toLocaleString("es-ES")}</div></div><p class="chart-caption">No éxitos omitidos: <b>${r.cm[0][1].toLocaleString("es-ES")}</b> · alertas falsas: <b>${r.cm[1][0].toLocaleString("es-ES")}</b></p></div>`).join("");
  }
  function renderRoc(rows) {
    const W=720,H=430,L=70,R=18,T=20,B=58,plotW=W-L-R,plotH=H-T-B,svg=$("#dynamicRoc");
    const sx=x=>L+x*plotW, sy=y=>T+(1-y)*plotH;
    let markup=`<rect x="${L}" y="${T}" width="${plotW}" height="${plotH}" fill="#fffdf8"/>`;
    for(let i=0;i<=4;i++){const v=i/4,x=sx(v),y=sy(v);markup+=`<line x1="${x}" y1="${T}" x2="${x}" y2="${T+plotH}" class="roc-gridline"/><line x1="${L}" y1="${y}" x2="${L+plotW}" y2="${y}" class="roc-gridline"/><text x="${x}" y="${H-34}" text-anchor="middle" class="roc-tick">${v.toFixed(2)}</text><text x="${L-10}" y="${y+4}" text-anchor="end" class="roc-tick">${v.toFixed(2)}</text>`;}
    markup+=`<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(1)}" y2="${sy(1)}" class="roc-baseline"/><line x1="${L}" y1="${T+plotH}" x2="${L+plotW}" y2="${T+plotH}" class="roc-axis"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}" class="roc-axis"/><text x="${L+plotW/2}" y="${H-8}" text-anchor="middle" class="roc-label">Tasa de falsos positivos</text><text transform="translate(17 ${T+plotH/2}) rotate(-90)" text-anchor="middle" class="roc-label">Tasa de verdaderos positivos · score=0</text>`;
    P.models.forEach(model=>{
      const roc=model.roc[state.split],active=model.key===$("#focusModel").value;
      const path=roc.fpr.map((x,i)=>`${i?"L":"M"}${sx(x).toFixed(2)},${sy(roc.tpr[i]).toFixed(2)}`).join(" ");
      const row=rows.find(r=>r.model===model.name),cm=row.cm;
      const tpr= row.r0, fpr=(cm[1][0]+cm[1][1])?cm[1][0]/(cm[1][0]+cm[1][1]):0;
      markup+=`<path d="${path}" fill="none" stroke="${model.color}" stroke-width="${active?3.4:1.8}" opacity="${active?1:.55}" class="roc-model-line"><title>${model.name} · AUC=${fmt(roc.auc)}</title></path><circle cx="${sx(fpr)}" cy="${sy(tpr)}" r="${active?6:4}" fill="${model.color}" stroke="white" stroke-width="2"><title>${model.name} · punto de corte ${Number($("#thresholdRange").value).toFixed(2)} · FPR=${fmt(fpr)} · TPR=${fmt(tpr)}</title></circle>`;
    });
    svg.innerHTML=markup;
    $("#rocSplitLabel").textContent=state.split==="train"?"TRAIN · filas vistas":"EVALUATION · filas reservadas";
    $("#dynamicRocLegend").innerHTML=P.models.map(m=>`<button type="button" class="roc-legend-item ${m.key===$("#focusModel").value?"active":""}" data-select-model="${m.key}"><i style="background:${m.color}"></i><span>${m.name}</span><b>AUC ${fmt(m.roc[state.split].auc)}</b></button>`).join("");
    const active=selectedModel(), row=rows.find(r=>r.model===active.name), cm=row.cm;
    $("#rocCoachLive").innerHTML=`<b>${active.name} ahora:</b> recall de no éxito ${fmt(row.r0)}; falsos positivos ${fmt((cm[1][0]+cm[1][1])?cm[1][0]/(cm[1][0]+cm[1][1]):0)}; AUC ${fmt(row.auc0)}. El punto cambia con el umbral.`;
  }
  function renderImportance() {
    const model=P.models.find(m=>m.key===$("#importanceModel").value)||P.models[0], items=model.importance, max=Math.max(...items.map(x=>x.value));
    $("#importanceChart").innerHTML=items.map(item=>`<div class="importance-row"><span title="${item.feature}">${item.feature}</span><span class="importance-track"><i style="width:${max?item.value/max*100:0}%;background:${model.color}"></i></span><b>${item.value.toFixed(4)}</b></div>`).join("");
  }
  function renderDynamicResults() {
    const threshold=Number($("#thresholdRange").value);$("#thresholdValue").textContent=threshold.toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2});
    const rows=getAllMetrics(), focus=selectedModel(), selected=rows.find(r=>r.model===focus.name);
    $("#metricRows").innerHTML=rows.map(r=>`<tr class="${r.model===focus.name?"selected-row":""}" data-select-model="${P.models.find(m=>m.name===r.model).key}><td>${r.model}</td><td>${fmt(r.accuracy)}</td><td>${fmt(r.p0)}</td><td>${fmt(r.r0)}</td><td>${fmt(r.f10)}</td><td>${fmt(r.p1)}</td><td>${fmt(r.r1)}</td><td>${fmt(r.f11)}</td><td>${fmt(r.pm)}</td><td>${fmt(r.rm)}</td><td>${fmt(r.fm)}</td><td>${fmt(r.auc0)}</td></tr>`).join("");
    $("#modelExplanation").textContent=focus.key==="extra_trees"?"Extra Trees aleatoriza los umbrales de división; esta corrida mantiene los demás parámetros comparables con RF base.":focus.key==="rf_modificado"?"Mismo algoritmo que la práctica; profundidad 12, split 20 y hoja 5 restringen el tamaño de los árboles.":"En cada división, RF busca el mejor corte entre las variables candidatas; usa bootstrap=True y la configuración de la práctica.";
    $("#metricCards").innerHTML=[["Accuracy",selected.accuracy,"Fracción total correcta"],["Recall 0",selected.r0,"No éxitos detectados"],["Precisión 0",selected.p0,"Alertas score=0 correctas"],["F1 macro",selected.fm,"Promedio equilibrado"],["AUC 0",selected.auc0,"Separación por probabilidades"]].map(([title,value,note])=>`<div class="metric-card"><span>${title}</span><b>${fmt(value)}</b><small>${note}</small></div>`).join("");
    $("#thresholdInsight").innerHTML=`Con el umbral <b>${threshold.toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2})}</b>, ${focus.name} detecta <b>${selected.cm[0][0].toLocaleString("es-ES")}</b> de <b>${(selected.cm[0][0]+selected.cm[0][1]).toLocaleString("es-ES")}</b> no éxitos. Omite <b>${selected.cm[0][1].toLocaleString("es-ES")}</b> y marca <b>${selected.cm[1][0].toLocaleString("es-ES")}</b> éxitos como alertas.`;
    $("#dynamicConclusionModel").textContent=`Con ${focus.name} y umbral ${threshold.toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2})}, evaluation da accuracy ${fmt(selected.accuracy)}, F1 macro ${fmt(selected.fm)} y AUC score=0 ${fmt(selected.auc0)}. Detecta ${selected.cm[0][0].toLocaleString("es-ES")} de ${(selected.cm[0][0]+selected.cm[0][1]).toLocaleString("es-ES")} no éxitos y omite ${selected.cm[0][1].toLocaleString("es-ES")}.`;
    const labels=P.labels[state.split], count0=labels.filter(x=>x===0).length, count1=labels.length-count0, maxCount=Math.max(count0,count1);
    $("#classDistribution").innerHTML=[[0,"No exitoso · score=0",count0,"#b95332"],[1,"Exitoso · score=1",count1,"#32756f"]].map((x)=>`<div class="class-distribution-row"><b>${x[1]}</b><span class="class-distribution-track"><i style="width:${x[2]/maxCount*100}%;background:${x[3]}"></i></span><span>${x[2].toLocaleString("es-ES")}</span><small>${pct(x[2]/labels.length)}</small></div>`).join("");
    $("#classDistributionNote").textContent=`${state.split==="train"?"Entrenamiento":"Evaluation"}: ${labels.length.toLocaleString("es-ES")} filas. Esta distribución ayuda a entender por qué accuracy sola no basta para valorar la detección de no éxitos.`;
    renderBars(rows);renderMatrices(rows);renderRoc(rows);renderImportance();
  }
  $("#metricSelect").addEventListener("change",()=>renderBars(getAllMetrics()));
  $("#thresholdRange").value=state.threshold||0.5;$("#thresholdRange").addEventListener("input",e=>{state.threshold=Number(e.target.value);save();renderDynamicResults();});
  $("#resetThreshold").addEventListener("click",()=>{$("#thresholdRange").value="0.50";state.threshold=.5;save();renderDynamicResults();});
  $("#focusModel").value=state.focusModel||"rf_practica";$("#focusModel").addEventListener("change",e=>{state.focusModel=e.target.value;$("#importanceModel").value=e.target.value;save();renderDynamicResults();});
  $("#importanceModel").value=state.focusModel||"rf_practica";$("#importanceModel").addEventListener("change",e=>{$("#focusModel").value=e.target.value;state.focusModel=e.target.value;save();renderDynamicResults();});
  $("#barChart").addEventListener("click",e=>{const b=e.target.closest("[data-select-model]");if(b){$("#focusModel").value=b.dataset.selectModel;state.focusModel=b.dataset.selectModel;save();renderDynamicResults();}});
  $("#confusionGrid").addEventListener("click",e=>{const b=e.target.closest("[data-select-model]");if(b){$("#focusModel").value=b.dataset.selectModel;state.focusModel=b.dataset.selectModel;save();renderDynamicResults();}});
  $("#dynamicRocLegend").addEventListener("click",e=>{const b=e.target.closest("[data-select-model]");if(b){$("#focusModel").value=b.dataset.selectModel;state.focusModel=b.dataset.selectModel;save();renderDynamicResults();}});
  $("#metricRows").addEventListener("click",e=>{const row=e.target.closest("[data-select-model]");if(row){$("#focusModel").value=row.dataset.selectModel;state.focusModel=row.dataset.selectModel;save();renderDynamicResults();}});
  renderSplit(state.split||"train");

  // Simulador conceptual de hiperparámetros conectado a los resultados medidos.
  const presetModelKey = {base:"rf_practica",variant:"rf_modificado",extra:"extra_trees"};
  function renderParameters(preset) {
    state.preset = preset; const variant = preset === "variant"; const extra = preset === "extra";
    $("#presetNote").textContent = extra ? "Extra Trees usa estos valores base y añade aleatoriedad al elegir puntos de corte." : variant ? "Se modifican max_depth, min_samples_split y min_samples_leaf respecto de la práctica." : "Configuración original de la práctica 1-2.";
    $("#parameterBoard").innerHTML = D.parameters.map((p,i) => {
      const original = variant ? p.variant : p.base;
      const selected = state.paramValues?.[p.name] ?? original;
      const control = p.type === "range"
        ? `<input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${selected}" data-param="${p.name}" aria-label="${p.label}">`
        : `<select data-param="${p.name}" aria-label="${p.label}">${p.options.map(o=>`<option value="${o}" ${String(selected)===String(o)?"selected":""}>${o}</option>`).join("")}</select>`;
      return `<article class="parameter-card"><div class="parameter-card-head"><h3>${p.label}</h3><span class="parameter-code">${p.name}</span></div><div class="parameter-value" id="value-${p.name}">${selected}</div>${control}<p id="effect-${p.name}">${effectText(p, selected)}</p><div class="parameter-direction"><b>Base:</b> ${p.base} · <b>Variante:</b> ${p.variant}</div></article>`;
    }).join("");
    const measured=P.models.find(m=>m.key===presetModelKey[preset])||P.models[0], m=measured.metrics.evaluation, base=P.models[0].metrics.evaluation;
    $("#parameterOutcome").innerHTML=`<div><span class="panel-kicker">RESULTADO MEDIDO · EVALUATION</span><h3>${measured.name}</h3><p>Accuracy <b>${fmt(m.accuracy)}</b> · recall score=0 <b>${fmt(m.r0)}</b> · F1 macro <b>${fmt(m.fm)}</b> · AUC score=0 <b>${fmt(m.auc0)}</b>.</p></div><div class="parameter-delta"><b>Frente al RF de práctica</b><span>Δ accuracy ${fmt(m.accuracy-base.accuracy)} · Δ recall 0 ${fmt(m.r0-base.r0)} · Δ F1 macro ${fmt(m.fm-base.fm)}</span><small>El resultado corresponde a la corrida ya entrenada. Mover los controles de arriba no vuelve a entrenar el modelo.</small></div>`;
    $$("[data-param]").forEach(el => el.addEventListener("input", () => {
      state.paramValues = state.paramValues || {}; state.paramValues[el.dataset.param] = el.value;
      const p = D.parameters.find(x=>x.name===el.dataset.param); $("#value-"+p.name).textContent = el.value;
      $("#effect-"+p.name).textContent = effectText(p,el.value); save();
    }));
  }
  function effectText(p, value) {
    if (p.name === "max_depth") return Number(value) > 19 ? p.high : Number(value) < 12 ? p.low : "Profundidad seleccionada: " + value + ". Compárala con 19 del RF base y 12 de la variante.";
    if (p.name === "min_samples_split") return Number(value) > 10 ? p.high : Number(value) < 10 ? p.low : "Umbral seleccionado: " + value + ". Valores mayores exigen más casos para dividir.";
    if (p.name === "min_samples_leaf") return Number(value) > 2 ? p.high : Number(value) < 2 ? p.low : "Tamaño de hoja seleccionado: " + value + ". Valores mayores suavizan hojas pequeñas.";
    if (p.name === "n_estimators") return Number(value) > 600 ? p.high : Number(value) < 600 ? p.low : "600 árboles: configuración usada en las tres corridas.";
    if (p.name === "random_state") return Number(value) === 42 ? "42 reproduce la semilla usada en el proyecto." : "Cambiar semilla cambia la aleatoriedad de la corrida; vuelve a entrenar para medir el efecto.";
    if (p.name === "n_jobs") return String(value) === "-1" ? p.high : String(value) === "1" ? "Usa un núcleo de procesamiento; puede tardar más." : `Solicita ${value} núcleos de procesamiento; no cambia la lógica predictiva.`;
    if (p.name === "bootstrap") return String(value) === "true" ? p.low : p.high;
    return String(value) === "sqrt" ? "sqrt considera la raíz del número de predictores en cada corte." : String(value) === "log2" ? "log2 considera menos predictores candidatos que sqrt en este conjunto." : "None considera todos los predictores en cada corte; puede aumentar tiempo y similitud entre árboles.";
  }
  $("#modelPreset").value = state.preset || "base"; $("#modelPreset").addEventListener("change", e => { state.paramValues = {}; const key=presetModelKey[e.target.value];$("#focusModel").value=key;$("#importanceModel").value=key;state.focusModel=key;renderParameters(e.target.value);renderDynamicResults();save(); });
  renderParameters(state.preset || "base");
  $("#showParameterResults").addEventListener("click",()=>{const key=presetModelKey[$("#modelPreset").value];$("#focusModel").value=key;$("#importanceModel").value=key;state.focusModel=key;state.split="evaluation";$("#thresholdRange").value="0.50";state.threshold=.5;save();go("resultados");renderSplit("evaluation");});

  // Simulacro oral.
  const categories = [...new Set(D.questions.map(q=>q.category))];
  $("#questionFilter").innerHTML = `<option value="all">Todos los temas</option>` + categories.map(c=>`<option value="${c}">${c}</option>`).join("");
  let currentQuestion = null;
  function candidates() {
    const cat=$("#questionFilter").value, query=$("#questionSearch").value.trim().toLocaleLowerCase("es");
    return D.questions.filter(q => (cat==="all" || q.category===cat) && (!query || `${q.q} ${q.answer} ${q.follow}`.toLocaleLowerCase("es").includes(query)));
  }
  function drawQuestion() {
    const pool=candidates(); if(!pool.length){toast("No hay preguntas con ese filtro.");return;}
    const choices=pool.filter(q=>q.q!==state.lastQuestionId); currentQuestion=choices[Math.floor(Math.random()*choices.length)] || pool[0];
    state.lastQuestionId=currentQuestion.q; state.questionId=currentQuestion.q; save();
    $("#questionCategoryLabel").textContent=currentQuestion.category;
    $("#questionCounter").textContent=`${pool.indexOf(currentQuestion)+1} de ${pool.length} posibles`;
    $("#questionText").textContent=currentQuestion.q; $("#answerText").textContent=currentQuestion.answer; $("#followupText").textContent=currentQuestion.follow;
    $("#answerBox").hidden=true; $("#showAnswer").disabled=false;
  }
  $("#drawQuestion").addEventListener("click",drawQuestion);
  $("#quickQuestion").addEventListener("click",()=>{go("simulacro");drawQuestion();});
  $("#questionFilter").addEventListener("change",()=>{ if(currentQuestion && !candidates().includes(currentQuestion)) { currentQuestion=null; $("#questionText").textContent="Pulsa “Sortear pregunta” para elegir una pregunta de este tema."; $("#answerBox").hidden=true; $("#showAnswer").disabled=true; }});
  $("#questionSearch").addEventListener("input",()=>{ if(currentQuestion && !candidates().includes(currentQuestion)){currentQuestion=null;$("#questionText").textContent="Pulsa “Sortear pregunta” para buscar entre las coincidencias.";$("#answerBox").hidden=true;$("#showAnswer").disabled=true;}});
  $("#showAnswer").addEventListener("click",()=>{if(currentQuestion)$("#answerBox").hidden=false;});
  $("#randomMember").addEventListener("click",()=>{const n=1+Math.floor(Math.random()*5);$("#memberNumber").value=String(n);toast(`Turno sorteado: integrante ${n}.`);});
  $("#markKnown").addEventListener("click",()=>{if(!currentQuestion)return;const set=new Set(state.known||[]);set.add(currentQuestion.q);state.known=[...set];save();routeProgress();$("#quizProgress").textContent=state.known.length;toast("Pregunta marcada como repasada.");});
  $("#clearProgress").addEventListener("click",()=>{state.known=[];state.completed=[];state.notebookDone=[];save();routeProgress();updateNotebookProgress();$("#quizProgress").textContent="0";renderStep(0);renderCell(activeBook.cells.indexOf(activeCell));toast("Progreso local reiniciado.");});
  $("#quizProgress").textContent=(state.known||[]).length; routeProgress();

  // Fases, enlaces y cierre.
  $("#phaseList").innerHTML=D.phases.map((p,i)=>`<div class="phase-row ${p.status.includes("Propuesta")?"proposal":""}"><span class="phase-index">0${i+1}</span><h3>${p.name}</h3><span class="phase-status">${p.status}</span><p>${p.text}</p></div>`).join("");
  $("#paperLink").href=D.originalPaper.doi; $("#repoLink").href=D.originalPaper.repo;
  $("#qualityRefs").innerHTML=D.originalPaper.qualityRefs.map(r=>`<a href="${r.url}" target="_blank" rel="noopener">${r.label} ↗</a>`).join("");
  go(state.currentPage || "inicio");
})();
