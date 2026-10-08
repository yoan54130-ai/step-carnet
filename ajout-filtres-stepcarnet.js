
// ────────────────────────────────────────────────────────
// FILTRES MODÉRATEUR (classe + recherche par nom)
// Ces deux fonctions remplacent renderModStudents et renderHistoTeacher
// définies plus haut (la dernière définition l'emporte). Affichage seulement :
// aucune donnée n'est modifiée.
// ────────────────────────────────────────────────────────
(function(){
  var st=document.createElement('style');
  st.textContent=
    '.mod-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}'+
    '.mod-filters input,.mod-filters select{background:var(--ink);border:1.5px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px;color:var(--txt);font-size:.85rem;min-width:0}'+
    '.mod-filters input{flex:1 1 150px}.mod-filters select{flex:0 1 170px}'+
    '.mod-filters input:focus,.mod-filters select:focus{outline:none;border-color:var(--a)}'+
    '.mod-filters select option{background:var(--ink3)}'+
    '.mod-count{font-size:.72rem;color:var(--txt3);width:100%}';
  document.head.appendChild(st);
})();

var FILT={mod:{q:'',classe:''},histo:{q:'',classe:''}};
function normStr(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
// "Term GA", "term ga" et "TERM.GA" comptent pour la même classe
function classKey(c){return normStr(c).replace(/[^a-z0-9]/g,'')}
function filteredKeys(students,scope){
  var f=FILT[scope], q=normStr(f.q);
  return Object.keys(students).filter(function(k){
    var s=students[k]; if(!s) return false;
    if(f.classe && classKey(s.classe)!==f.classe) return false;
    if(q){
      var a=normStr((s.prenom||'')+' '+(s.nom||'')), b=normStr((s.nom||'')+' '+(s.prenom||''));
      if(a.indexOf(q)<0 && b.indexOf(q)<0) return false;
    }
    return true;
  }).sort(function(x,y){
    var a=students[x], b=students[y];
    return (a.classe||'').localeCompare(b.classe||'','fr',{numeric:true}) ||
           (a.nom||'').localeCompare(b.nom||'','fr') || (a.prenom||'').localeCompare(b.prenom||'','fr');
  });
}
function buildFilters(scope,box,redraw){
  var f=FILT[scope], students=S.students(), label={}, order=[];
  Object.keys(students).forEach(function(k){
    var c=String(students[k].classe||'').trim(), ck=classKey(c);
    if(c && ck && !label[ck]){label[ck]=c; order.push(ck);}
  });
  order.sort(function(a,b){return label[a].localeCompare(label[b],'fr',{numeric:true})});
  if(f.classe && !label[f.classe]) f.classe='';
  var total=Object.keys(students).length;
  var cnt;
  var updCount=function(){
    var n=filteredKeys(students,scope).length;
    if(cnt) cnt.textContent = n===total ? total+' élève(s)' : n+' élève(s) sur '+total;
  };
  // ne reconstruit pas la barre pendant que le prof est en train d'y taper
  if(box.firstChild && box.contains(document.activeElement)){
    cnt=box.querySelector('.mod-count'); updCount(); return;
  }
  box.innerHTML='';
  var inp=document.createElement('input');
  inp.type='search'; inp.placeholder='🔍 Rechercher un élève (nom ou prénom)'; inp.value=f.q;
  var sel=document.createElement('select');
  var o0=document.createElement('option'); o0.value=''; o0.textContent='Toutes les classes'; sel.appendChild(o0);
  order.forEach(function(ck){var o=document.createElement('option'); o.value=ck; o.textContent=label[ck]; sel.appendChild(o);});
  sel.value=f.classe;
  var rst=document.createElement('button');
  rst.className='btn btn-secondary btn-sm'; rst.textContent='✕ Réinitialiser';
  cnt=document.createElement('div'); cnt.className='mod-count';
  var onChange=function(){f.q=inp.value; f.classe=sel.value; updCount(); redraw();};
  inp.addEventListener('input',onChange);
  sel.addEventListener('change',onChange);
  rst.addEventListener('click',function(){inp.value=''; sel.value=''; onChange();});
  box.appendChild(inp); box.appendChild(sel); box.appendChild(rst); box.appendChild(cnt);
  updCount();
}

// ── Liste « Élèves inscrits » (page Modérateur)
function renderModStudents(){
  var el=$('mod-students'), box=$('mod-filters');
  if(!box){
    box=document.createElement('div'); box.id='mod-filters'; box.className='mod-filters';
    el.parentNode.insertBefore(box,el);
  }
  if(!Object.keys(S.students()).length){
    box.style.display='none';
    el.innerHTML='<p style="font-size:.78rem;color:var(--txt3)">Aucun élève sur cet appareil.</p>';
    return;
  }
  box.style.display='';
  buildFilters('mod',box,drawModStudents);
  drawModStudents();
}
function drawModStudents(){
  var students=S.students(), el=$('mod-students'), keys=filteredKeys(students,'mod');
  if(!keys.length){el.innerHTML='<p style="font-size:.78rem;color:var(--txt3)">Aucun élève ne correspond aux filtres.</p>';return}
  el.innerHTML=keys.map(function(k){
    var s=students[k];
    return '<div class="stu-item">'+
      '<div><div class="stu-name">'+esc(s.prenom+' '+s.nom)+'</div>'+
        '<div class="stu-meta">'+esc(s.classe||'—')+' · <span class="code-chip">'+esc(s.code)+'</span> · '+(s.sessions||[]).length+' séance(s)'+'</div></div>'+
      '<button class="btn btn-danger btn-sm" data-k="'+esc(k)+'" onclick="delTeacherStudent(this.dataset.k)">🗑️</button>'+
    '</div>';
  }).join('');
}

// ── Historique en mode professeur (les carnets)
function renderHistoTeacher(el){
  var students=S.students();
  var cloudBtn = S.cloudReady() ? '<button class="btn btn-teal btn-sm" style="margin-bottom:12px" onclick="pullAllFromCloud()">☁️ Récupérer depuis le cloud</button>' : '';
  if(!Object.keys(students).length){el.innerHTML=cloudBtn+'<div class="empty"><div class="empty-icon">👥</div><h3>Aucun élève</h3><p>Aucun profil sur cet appareil.</p></div>';return}
  el.innerHTML=cloudBtn+'<div id="histo-filters" class="mod-filters"></div><div id="histo-te-list"></div>';
  buildFilters('histo',$('histo-filters'),drawHistoTeacher);
  drawHistoTeacher();
}
function drawHistoTeacher(){
  var students=S.students(), el=$('histo-te-list');
  if(!el) return;
  STATE.detailList=[];
  var keys=filteredKeys(students,'histo');
  if(!keys.length){el.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><h3>Aucun résultat</h3><p>Aucun élève ne correspond aux filtres.</p></div>';return}
  el.innerHTML=keys.map(function(k,ki){
    var stu=students[k];
    var nb=(stu.sessions||[]).length;
    var saved=stu.savedAt?new Date(stu.savedAt).toLocaleDateString('fr-FR'):'jamais';
    var nom=stu.prenom+' '+stu.nom;
    var sessHtml=(stu.sessions||[]).map(function(s){
      var di=pushDetail(s,nom);
      return '<div class="te-sess-row" onclick="showDetail('+di+')">'+
        '<div><div style="font-size:.82rem;font-weight:700;color:'+(s.absent?'var(--r)':'var(--b)')+'">Séance '+esc(s.num)+(s.absent?' · 🚫 Absent(e)':'')+'</div>'+
          '<div style="font-size:.72rem;color:var(--txt3)">'+esc(s.date||'sans date')+(s.absent?'':' — '+esc(s.theme||'—'))+'</div></div>'+
        '<button class="btn btn-danger btn-sm" style="font-size:.7rem;padding:5px 10px" data-k="'+esc(k)+'" data-num="'+esc(s.num)+'" onclick="event.stopPropagation();delTeacherSess(this.dataset.k,this.dataset.num)">✕ Suppr.</button>'+
      '</div>';
    }).join('');
    return '<div class="te-block">'+
      '<div class="te-hdr" onclick="toggleTe('+ki+')">'+
        '<div>'+
          '<div class="te-name">'+esc(nom)+'</div>'+
          '<div class="te-meta">'+esc(stu.classe||'—')+' · '+nb+' séance(s) · sauvegardé '+saved+' · <span class="te-code">'+esc(stu.code)+'</span></div>'+
        '</div>'+
        '<div style="display:flex;gap:7px;align-items:center">'+
          '<button class="btn btn-danger btn-sm" style="font-size:.7rem;padding:5px 10px" data-k="'+esc(k)+'" onclick="event.stopPropagation();delTeacherStudent(this.dataset.k)">🗑️</button>'+
          '<span id="te-arr-'+ki+'" style="color:var(--txt3)">›</span></div>'+
      '</div>'+
      '<div class="te-sessions" id="te-s-'+ki+'">'+
        (sessHtml||'<p style="font-size:.78rem;color:var(--txt3);padding:4px 0">Aucune séance.</p>')+
      '</div></div>';
  }).join('');
}
