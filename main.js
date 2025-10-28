// ===== util =====
const $ = (q,root=document)=>root.querySelector(q);
const $$ = (q,root=document)=>Array.from(root.querySelectorAll(q));
const elNav = $('#nav'), elSidebar=$('#sidebar'), elOverlay=$('#overlay');
const elChat = $('#chat'), elComposer=$('#composer'), elForm=$('#composerForm');
const elPills=$('#pills'), elContext=$('#context');
const elCapyToggle = $('#capyPromptToggle');
const elAttach=$('#attach'), elFileInput=$('#fileInput');

// state
const state = {
  tools: [],
  context: null,    // 'img' | 'ide' | 'text' | 'imgtxt'
  // IMPORTANTE: usar id/slug de estilo
  img: { style:"cinematic", ratio:"1:1", model:"flux", seed:randSeed() },
  monaco: null, editor: null,
  sessionId: null
};

const KEYS = {
  gemini:'cu:key:gem', openai:'cu:key:oa',
  sessions:'cu:sessions' // array de {id,title,ts}
};

// sidebar
$('#openSidebar').onclick = ()=>{ elSidebar.classList.add('open'); elOverlay.classList.add('show'); };
$('#closeSidebar').onclick = ()=>{ elSidebar.classList.remove('open'); elOverlay.classList.remove('show'); };
elOverlay.onclick = ()=>{ elSidebar.classList.remove('open'); elOverlay.classList.remove('show'); $('#settings').close?.(); $('#history').close?.(); };

// settings
const dlg = $('#settings');
$('#openSettings').onclick = ()=> dlg.showModal();
$('#openSettingsHeader').onclick = ()=> dlg.showModal();
$('#saveSettings').onclick = (e)=>{ e.preventDefault();
  localStorage.setItem(KEYS.gemini, $('#keyGemini').value.trim());
  localStorage.setItem(KEYS.openai, $('#keyOpenAI').value.trim());
  dlg.close();
};

// history
$('#openHistory').onclick = ()=>{ renderHistory(); $('#history').showModal(); };
$('#histNew').onclick = ()=>{ startNewSession(); $('#history').close(); };
$('#newChat').onclick = ()=> startNewSession();
$('#histClear').onclick = ()=>{ localStorage.removeItem(KEYS.sessions); renderHistory(); };

function startNewSession(){
  state.sessionId = 's_'+Date.now();
  elChat.innerHTML = `<section class="hero"><h1>Novo chat</h1></section>`;
  saveSessionMeta({id:state.sessionId, title:'Nova conversa', ts:Date.now()});
}
function loadSession(id){
  const html = localStorage.getItem(sessionKey(id)); if(!html) return;
  state.sessionId = id; elChat.innerHTML = html; elChat.scrollTop = elChat.scrollHeight;
}
function renderHistory(){
  const list = loadSessionsMeta().sort((a,b)=> b.ts-a.ts);
  const ul = $('#histList'); ul.innerHTML='';
  list.forEach(s=>{
    const li = document.createElement('li');
    const dt = new Date(s.ts).toLocaleString();
    li.innerHTML = `<div><strong>${escapeHTML(s.title||'Sem título')}</strong><br><small>${dt}</small></div>`;
    const open = btn('Abrir', ()=>{ loadSession(s.id); $('#history').close(); });
    const del  = btn('Apagar', ()=>{ localStorage.removeItem(sessionKey(s.id)); removeSessionMeta(s.id); renderHistory(); });
    const right = document.createElement('div'); right.className='row'; right.appendChild(open); right.appendChild(del);
    li.appendChild(right); ul.appendChild(li);
  });
}
function saveSessionContent(){
  if(!state.sessionId) startNewSession();
  const html = elChat.innerHTML;
  const meta = loadSessionsMeta().find(x=>x.id===state.sessionId) || {id:state.sessionId, title:'Conversa', ts:Date.now()};
  const firstUser = elChat.querySelector('.bubble.user')?.textContent?.slice(0,60) || meta.title;
  meta.title = firstUser || meta.title; meta.ts = Date.now();
  saveSessionMeta(meta);
  localStorage.setItem(sessionKey(state.sessionId), html);
}
function sessionKey(id){ return 'cu:session:'+id; }
function loadSessionsMeta(){ try{ return JSON.parse(localStorage.getItem(KEYS.sessions)||'[]'); }catch{return[]} }
function saveSessionMeta(meta){ const arr=loadSessionsMeta().filter(x=>x.id!==meta.id); arr.push(meta); localStorage.setItem(KEYS.sessions, JSON.stringify(arr)); }
function removeSessionMeta(id){ const arr=loadSessionsMeta().filter(x=>x.id!==id); localStorage.setItem(KEYS.sessions, JSON.stringify(arr)); }

// tools.json
async function loadTools(){
  try{
    const r = await fetch('tools.json',{cache:'no-store'});
    state.tools = await r.json();
  }catch{ state.tools=[] }
  renderMenu();
}
function renderMenu(){
  elNav.innerHTML = '';
  const byCat = state.tools.reduce((a,t)=>{(a[t.category]=a[t.category]||[]).push(t);return a;}, {});
  Object.entries(byCat).forEach(([cat,items])=>{
    const g = document.createElement('div'); g.className='group'; g.innerHTML = `<h5>${escapeHTML(cat)}</h5>`;
    items.forEach(t=>{
      const it = document.createElement('div'); it.className='item';
      it.innerHTML = `<span>${escapeHTML(t.title)}</span><span>›</span>`;
      it.onclick = ()=>{
        setContext(t);
        if(t.id==='CapyIMG'){ showImagePills(); systemMsg('Descreva a imagem que deseja gerar.'); }
        else if(t.id==='CapyIDE'){ hidePills(); systemMsg('Descreva o app/site que devo criar.'); }
        else if(t.id==='CapyIMGtxt'){ hidePills(); systemMsg('Anexe uma imagem com o 📎 para eu gerar um prompt (Vision).'); }
        else { hidePills(); systemMsg('Como posso ajudar?'); }
        elSidebar.classList.remove('open'); elOverlay.classList.remove('show');
      };
      g.appendChild(it);
    });
    elNav.appendChild(g);
  });
}
function setContext(tool){
  state.context = tool.id==='CapyIMG' ? 'img' : tool.id==='CapyIDE' ? 'ide' : tool.id==='CapyIMGtxt' ? 'imgtxt' : 'text';
  $('#context').classList.remove('hidden');
  $('#context .ctx-title').textContent = tool.title;
  $('#context .ctx-desc').textContent = tool.description||'';
}

// ===== estilos (NOVO catálogo) =====
const IMG_STYLES = [
  { id:'cinematic',    label:'Cinematic',        effect:'cinematic lighting, shallow depth of field, film grain, anamorphic bokeh, photoreal, 8k' },
  { id:'neon',         label:'Neon',             effect:'neon glow, vibrant color accents, glossy surfaces, high contrast, dramatic rim light' },
  { id:'cyberpunk',    label:'Cyberpunk',        effect:'futuristic city, neon signs, rainy reflections, moody teal-magenta palette, haze' },
  { id:'cartoon3d',    label:'3D Cartoon',       effect:'pixar-like, soft global illumination, subsurface scattering, smooth shading' },
  { id:'realistic',    label:'Realista',         effect:'ultra-detailed photo, natural lighting, realistic textures, hdr, 85mm lens' },
  { id:'flatvector',   label:'Flat Vector',      effect:'flat vector illustration, geometric shapes, crisp lines, minimal gradients, clean palette' },
  { id:'anime',        label:'Anime',            effect:'anime style, cel shading, dynamic action lines, expressive eyes, vibrant tones' },
  { id:'manga',        label:'Manga Japonês',    effect:'manga ink style, halftone shading, screentones, dynamic panels, black & white emphasis' },
  { id:'gothic',       label:'Gótico',           effect:'dark gothic, baroque ornaments, dramatic chiaroscuro, cathedral vibes' },
  { id:'isometric',    label:'Isométrico',       effect:'isometric perspective, clean edges, orthographic look, soft shadows' },
  { id:'lowpoly',      label:'Low Poly',         effect:'low poly, faceted geometry, simple materials, AO shading' },
  { id:'isoneon',      label:'Isometric Neon',   effect:'isometric neon glow, cyber grid floor, vibrant highlights, glossy surfaces' },
  { id:'portrait',     label:'Studio Portrait',  effect:'studio lighting, softbox key light, 85mm f/1.4 bokeh, skin tone fidelity' },
  { id:'analog',       label:'Analog Film',      effect:'analog film grain, Kodak Portra 400, subtle bloom, natural contrast' },
  { id:'watercolor',   label:'Aquarela',         effect:'watercolor painting, paper texture, soft bleeding, pastel palette' },
  { id:'oilpaint',     label:'Óleo',             effect:'oil painting, visible brush strokes, impasto, canvas texture' },
  { id:'lineart',      label:'Line Art',         effect:'clean line art, inked outlines, minimal shading, vector feel' },
  { id:'clay',         label:'Clay Render',      effect:'clay render, matte material, studio backdrop, soft AO' },
  { id:'blueprint',    label:'Blueprint',        effect:'blueprint technical drawing, white lines on blueprint paper, dimension marks' },
  { id:'voxel',        label:'Voxel',            effect:'voxel art, cubic pixels, isometric, crisp edges' },
  { id:'pixel',        label:'Pixel Art',        effect:'retro pixel art, 16-bit palette, dithering, sprite-like' },
  { id:'papercraft',   label:'Papercraft',       effect:'paper craft, layered cutout, paper shadows, handcrafted feel' },
  { id:'origami',      label:'Origami',          effect:'origami folded paper, creases, minimal palette, geometric folds' },
  { id:'ghibli',       label:'Ghibli',           effect:'ghibli-esque, cozy whimsical vibe, painterly backgrounds, soft light' },
  { id:'steampunk',    label:'Steampunk',        effect:'brass gears, steam pipes, victorian industrial, warm copper tones' },
  { id:'noir',         label:'Noir',             effect:'film noir, high-contrast black and white, hard shadows, dramatic angles' },
  { id:'fantasy',      label:'Fantasy Realism',  effect:'epic fantasy realism, volumetric light, detailed worldbuilding, cinematic scale' },
  { id:'minimal',      label:'Minimalista',      effect:'minimalist composition, negative space, subtle palette, strict geometry' },
  { id:'swiss',        label:'Poster Swiss',     effect:'Swiss grid poster, bold typography, primary shapes, sharp contrast' },
];

const RATIOS = ["1:1","16:9","9:16"];
const MODELS = ["flux","sdxl"];

function getStyleEffect(id){
  const s = IMG_STYLES.find(x=>x.id===id); return s ? s.effect : '';
}
function getStyleLabel(id){
  const s = IMG_STYLES.find(x=>x.id===id); return s ? s.label : id;
}

// pills (imagem)
function showImagePills(){
  elPills.innerHTML=''; elPills.classList.remove('hidden');

  elPills.appendChild(label('Estilo:'));
  IMG_STYLES.forEach(s=> elPills.appendChild(pill('style', s.id, s.label)));

  elPills.appendChild(spacer()); elPills.appendChild(label('Aspecto:'));
  RATIOS.forEach(r=> elPills.appendChild(pill('ratio', r, r)));

  elPills.appendChild(spacer()); elPills.appendChild(label('Modelo:'));
  MODELS.forEach(m=> elPills.appendChild(pill('model', m, m)));

  const seed = document.createElement('input'); seed.className='pill pill-input'; seed.type='number'; seed.style.width='96px'; seed.value=state.img.seed;
  seed.onchange = ()=> state.img.seed = Number(seed.value||0);
  elPills.appendChild(spacer()); elPills.appendChild(label('Seed:')); elPills.appendChild(seed);

  refreshPills();
}
function hidePills(){ elPills.classList.add('hidden'); }
function pill(group, value, text){
  const b=document.createElement('button'); b.className='pill'; b.textContent=text; b.dataset.group=group; b.dataset.val=value;
  b.onclick=()=>{ if(group==='style') state.img.style=value; if(group==='ratio') state.img.ratio=value; if(group==='model') state.img.model=value; refreshPills(); };
  return b;
}
function label(t){ const d=document.createElement('div'); d.className='pill'; d.style.cursor='default'; d.style.opacity='.7'; d.textContent=t; return d; }
function spacer(){ const d=document.createElement('div'); d.style.width='8px'; return d; }
function refreshPills(){
  $$('.pill[data-group="style"]').forEach(x=>x.classList.toggle('active', x.dataset.val===state.img.style));
  $$('.pill[data-group="ratio"]').forEach(x=>x.classList.toggle('active', x.dataset.val===state.img.ratio));
  $$('.pill[data-group="model"]').forEach(x=>x.classList.toggle('active', x.dataset.val===state.img.model));
}

// composer submit
elForm.addEventListener('submit', async (e)=>{
  e.preventDefault();

  let raw = elComposer.value.trim();
  if (!raw) return;
  let cmd = '';
  let body = raw;
  const cmdMatch = raw.match(/^\/\*(img|ide|resumo)\s*/i);
  if (cmdMatch){
    cmd  = cmdMatch[0];
    body = raw.slice(cmdMatch[0].length);
  }

  if (elCapyToggle && elCapyToggle.classList.contains('active')){
    try {
      const refined = await capyPromptRefine(body);
      raw = (cmd ? cmd + ' ' : '') + refined;
    } catch(err){
      console.warn('CapyPrompt refine falhou:', err);
      raw = (cmd ? cmd + ' ' : '') + body; // segue mesmo assim
    }
  }
  addUser(raw);
  saveSessionContent();
  const intent = decideIntent(raw);
  if (intent === 'image'){
    showImagePills();
    await flowImage(raw);
  } else if (intent === 'code'){
    hidePills();
    await flowCode(raw);
  } else {
    hidePills();
    await flowText(raw);
  }
  elComposer.value = '';
  saveSessionContent();
});

function decideIntent(t){
  const s=t.toLowerCase();
  if(s.startsWith('/*img')) return 'image';
  if(s.startsWith('/*ide')) return 'code';
  if(s.startsWith('/*resumo')) return 'text';
  if(state.context==='img') return 'image';
  if(state.context==='ide') return 'code';
  if(/\b(gerar|criar|fazer|produzir)\b.*\b(imagem|ilustração|arte|render)\b/.test(s)) return 'image';
  if(/\b(ilustre|desenhe|pinte)\b/.test(s)) return 'image';
  if(/\b(gerar|criar|construir|montar)\b.*\b(app|aplicativo|site|webapp|html|react|javascript|css)\b/.test(s)) return 'code';
  if(/\b(código|code|componentes?)\b/.test(s)) return 'code';
  return 'text';
}

// quick buttons
$$('[data-quick]').forEach(b=> b.onclick=()=>{
  const id=b.dataset.quick;
  if(id==='CapyIMG'){ setContext({id, title:'CapyIMG', description:'Geração de imagens por prompt.'}); showImagePills(); systemMsg('Descreva sua imagem.'); }
  if(id==='CapyIDE'){ setContext({id, title:'CapyIDE', description:'Gere e edite código.'}); hidePills(); systemMsg('Descreva o app/site.'); }
  if(id==='CapyResumo'){ setContext({id:'CapyResumo', title:'CapyResumo', description:'Resuma textos.'}); hidePills(); systemMsg('Cole o texto a resumir.'); }
});

// attach (Vision)
elAttach.onclick = ()=> elFileInput.click();
elFileInput.onchange = async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  const holder = addAI('<div style="opacity:.8;margin-bottom:6px">Imagem anexada</div>');
  const url = URL.createObjectURL(f);
  const img = new Image(); img.style.maxWidth='50%'; img.style.borderRadius='12px'; img.style.display='block'; img.src=url;
  img.onload = ()=> URL.revokeObjectURL(url);
  holder.appendChild(img);

  // Ações
  const actions = document.createElement('div'); actions.className='row'; actions.style.marginTop='8px';
  const bMakePrompt = btn('Gerar prompt (Vision)', async ()=>{
    const p = await generatePromptFromImage(f);
    const block = renderPromptBlock(p, [{label:'Melhorar com CapyPrompt', action: async (val)=>{ const better = await capyPromptRefine(val); const upgraded = renderPromptBlock(better, [ {label:'Gerar com CapyIMG', action:(v)=>{ showImagePills(); flowImage(v); }}, {label:'Copiar', action:(v)=> navigator.clipboard.writeText(v) } ]); addAI(upgraded); }},
      {label:'Gerar com CapyIMG', action:(val)=>{ showImagePills(); flowImage(val); }},
      {label:'Copiar', action:(val)=> navigator.clipboard.writeText(val) }
    ]);
    addAI(block); saveSessionContent();
  });
  actions.appendChild(bMakePrompt);
  holder.appendChild(actions);
};

// ===== flows =====
async function flowImage(userText){
  const {style, ratio, model, seed} = state.img;
  const styleLabel = getStyleLabel(style);
  const effect     = getStyleEffect(style);
  const negatives  = 'low quality, blurry, oversaturated, extra fingers, watermark, text artifact';

  const base = typeof userText==='string' ? userText : String(userText||'');
  const core = cleanPrompt(base.replace(/^\/\*img\s*/, ''));

  const prompt = `${core}, style: ${styleLabel}, ${effect}, high detail, crisp focus, ${ratio}, --negatives: ${negatives}`.trim();
  const [w,h] = ratioToSize(ratio);
  const holder = addAI(`Gerando imagem…<br><small>${styleLabel} • ${ratio} • ${model} • seed ${seed}</small>`);
  await renderPollinations(prompt, w, h, model, seed, holder);
  saveSessionContent();
}
async function flowCode(userText){
  const holder = addAI(`<b>Escrevendo código…</b><div id="editor" class="editor"></div><div class="actions" style="margin-top:8px"></div>`);
  const ed = await ensureMonaco('#editor','html');
  const raw = await codeGenerator(userText);
  const {code, notes} = extractCodeAndNotes(raw);
  await typeInto(ed, code);
  const actions = holder.querySelector('.actions');
  if(notes){ addAI('<small><em>Notas</em></small><div class="bubble">'+escapeHTML(notes)+'</div>'); }
  const prev = btn('Preview', ()=> preview(ed.getValue()));
  const down = btn('Download', ()=> download('index.html', ed.getValue()));
  actions.appendChild(prev); actions.appendChild(down);
  saveSessionContent();
}
async function flowText(userText){
  const holder = addAI('<em>Escrevendo…</em>');
  const txt = await textGenerator(userText);
  holder.textContent = txt; saveSessionContent();
}

// ===== Vision (CapyIMGtxt) =====
async function generatePromptFromImage(file){
  const dataUrl = await fileToDataURL(file);
  const base64 = dataUrl.split(',')[1];
  const gem = localStorage.getItem(KEYS.gemini);
  const oa  = localStorage.getItem(KEYS.openai);
  const instr = "Transforme esta imagem em um PROMPT de geração de imagens descritivo e objetivo, em português. Inclua composição, iluminação, estilo, lente e qualidade.";

  if(gem){
    try{
      const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gem}`;
      const body={ contents:[{ role:"user", parts:[ {text: instr}, {inline_data:{mime_type:file.type, data: base64}} ] }], generationConfig:{temperature:0.6}};
      const r = await fetch(url,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
      const j = await r.json(); const txt = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
      if(txt) return txt;
    }catch(e){ console.warn('Gemini Vision falhou', e); }
  }
  if(oa){
    try{
      const r = await fetch("https://api.openai.com/v1/chat/completions",{
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${oa}`},
        body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:[{type:"text", text: instr},{type:"image_url", image_url:{url:dataUrl}}]}] })
      });
      const j = await r.json(); const txt = j?.choices?.[0]?.message?.content || '';
      if(txt) return txt;
    }catch(e){ console.warn('OpenAI Vision falhou', e); }
  }
  return "Uma fotografia/ilustração de [assunto], composição [detalhes], iluminação [detalhes], estilo [detalhes], lente/qualidade [detalhes].";
}

// ===== CapyPrompt (refino de prompt) =====
async function capyPromptRefine(baseText, opts={}){
  const text = (baseText||'').trim();
  if(!text) return text;
  const action = opts.action||'refine';
  const extra  = opts.extra||'';

  const gem = localStorage.getItem(KEYS.gemini);
  const oa  = localStorage.getItem(KEYS.openai);

  const system = "Aja como CapyPrompt, um engenheiro de prompts. Reescreva para ficar claro, específico e focado no objetivo do usuário. Responda APENAS com o prompt resultante, em uma única peça de texto.";
  let user = `Prompt Base: "${text}"\nAção: ${action}.`;
  if(extra) user += `\nInformação adicional: ${extra}`;

  if(gem){
    try{
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gem}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[ {role:'user', parts:[{text: system + "\n\n" + user}] } ], generationConfig:{temperature:0.5} })
      });
      const j = await r.json();
      const t = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')?.trim();
      if(t) return cleanPrompt(t);
    }catch(e){ console.warn('CapyPrompt Gemini falhou', e); }
  }
  if(oa){
    try{
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${oa}`},
        body: JSON.stringify({ model:'gpt-4o-mini', messages:[
          {role:'system', content: system},
          {role:'user', content: user}
        ]})
      });
      const j = await r.json(); const t = j?.choices?.[0]?.message?.content?.trim();
      if(t) return cleanPrompt(t);
    }catch(e){ console.warn('CapyPrompt OpenAI falhou', e); }
  }
  return cleanPrompt(text + ", composição clara, iluminação coerente, alta qualidade, detalhes nítidos");
}
// ===== AI (texto/código) =====
async function textGenerator(userText){
  const gem = localStorage.getItem(KEYS.gemini);
  const oa  = localStorage.getItem(KEYS.openai);
  if(gem){
    try{
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gem}`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents:[{role:'user',parts:[{text:userText}]}]})});
      const j = await r.json(); const t = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||''; if(t) return t;
    }catch{}
  }
  if(oa){
    try{
      const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${oa}`}, body: JSON.stringify({model:'gpt-4o-mini', messages:[{role:'user',content:userText}]})});
      const j = await r.json(); const t = j?.choices?.[0]?.message?.content || ''; if(t) return t;
    }catch{}
  }
  // fallback simples
  return 'Resumo: ' + userText;
}

async function codeGenerator(userText){
  const gem = localStorage.getItem(KEYS.gemini);
  const oa  = localStorage.getItem(KEYS.openai);
  if(gem){
    try{
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gem}`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents:[{role:'user',parts:[{text:"Gere APENAS um arquivo HTML completo, auto-contido, com CSS e JS inline, para: "+userText}]}]})});
      const j = await r.json(); const t = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||''; if(t) return t;
    }catch{}
  }
  if(oa){
    try{
      const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${oa}`}, body: JSON.stringify({model:'gpt-4o-mini', messages:[{role:'system',content:'Responda **apenas** com um arquivo HTML completo, auto-contido (CSS e JS inline), sem comentários fora das tags e sem explicações. Não use markdown.'},{role:'user',content:userText}]})});
      const j = await r.json(); const t = j?.choices?.[0]?.message?.content || ''; if(t) return t;
    }catch{}
  }
  // fallback local
  return `<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>App</title>
  <style>body{font-family:Inter,system-ui;background:#f5f7fb;margin:0} header{background:#111;color:#fff;padding:14px} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:12px} .card{background:#fff;border:1px solid #e5e8f0;border-radius:12px;padding:10px} .price{color:#0d6efd;font-weight:800}</style>
  <header><h1>Exemplo</h1></header>
  <main class="grid"><div class="card"><b>Bloco A</b></div><div class="card"><b>Bloco B</b></div></main>
  <script>console.log('ok')</script></html>`;
}


// --- Code extraction: keep ONLY HTML in the editor ---
function extractCodeAndNotes(raw){
  let code = '';
  let notes = '';

  // Prefer fenced blocks ```html ... ``` or ``` ... ```
  const fences = [];
  const reFence = /```(?:html|htm|xml)?\s*([\s\S]*?)```/gi;
  let m;
  while((m = reFence.exec(raw))){ fences.push(m[1]); }
  if(fences.length){
    // choose the largest block
    code = fences.sort((a,b)=>b.length-a.length)[0];
  }

  // If no fenced block, try grab from <!DOCTYPE> ... </html> or <html> ... </html>
  if(!code){
    let m2 = raw.match(/<!DOCTYPE[\s\S]*?<\/html>/i) || raw.match(/<html[\s\S]*?<\/html>/i);
    if(m2) code = m2[0];
  }

  // If still empty, assume everything is code but strip leading markdown lines
  if(!code){
    code = raw.replace(/^.*?<\/?html[^>]*>/is, raw); // naive fallback
  }

  // Clean common markdown remnants
  code = code.replace(/^```[\s\S]*?$/gm,'').trim();

  // Notes = remainder if we found a fenced block
  if(fences.length){
    // remove the chosen fence from the raw to get notes
    const chosen = fences.sort((a,b)=>b.length-a.length)[0];
    const chosenBlock = "```" + chosen + "```";
    notes = raw.replace(/```(?:html|htm|xml)?\s*[\s\S]*?```/gi, '').trim();
  } else {
    // rough notes: text before <!DOCTYPE or <html> plus trailing explanations after </html>
    const start = raw.search(/<!DOCTYPE|<html/i);
    const endMatch = raw.match(/<\/html>/i);
    const end = endMatch ? raw.indexOf(endMatch[0]) + endMatch[0].length : raw.length;
    if(start > 0 || end < raw.length){
      notes = (start>0? raw.slice(0,start):'') + (end<raw.length ? raw.slice(end):'');
      notes = notes.trim();
    }
  }

  return { code: code.trim(), notes: notes };
}

// ===== Monaco / helpers =====
async function ensureMonaco(sel, language='html'){
  if(!state.monaco){
    window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    state.monaco = await new Promise(res=> window.require(['vs/editor/editor.main'], ()=> res(window.monaco)));
  }
  const n = $(sel);
  if(state.editor) state.editor.dispose();
  state.editor = state.monaco.editor.create(n,{value:'<!-- aguardando código -->',language,theme:'vs-dark',automaticLayout:true,minimap:{enabled:false}});
  return state.editor;
}
async function typeInto(ed, text){
  ed.setValue(''); let i=0;
  const step = Math.max(1, Math.floor(text.length/200));
  while(i<text.length){ i += step; ed.setValue(text.slice(0,i)); ed.revealLine(ed.getModel().getLineCount()); await sleep(8); }
}
function preview(code){
  const blob = new Blob([code],{type:'text/html'}); const url = URL.createObjectURL(blob);
  addAI('<b>Preview</b>'); const iframe = document.createElement('iframe'); iframe.className='preview'; iframe.src=url; iframe.onload=()=> setTimeout(()=>URL.revokeObjectURL(url),1000);
  elChat.appendChild(iframe); elChat.scrollTop = elChat.scrollHeight;
}
function download(name, text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

// ===== Pollinations =====
function ratioToSize(r){ return r==='16:9'?[1280,720]: r==='9:16'?[1080,1920]:[1024,1024]; }

async function renderPollinations(prompt, w, h, model, seed, holder){
  const qs = new URLSearchParams({width:String(Math.min(w,1024)), height:String(Math.min(h,1024)), model, seed:String(seed), n:'1'});
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}.png?${qs.toString()}&noCache=${Date.now()}`;
  try{
    const blob = await withTimeout(fetch(url,{mode:'cors', cache:'no-store'}).then(r=>r.blob()), 60000);
    const obj = URL.createObjectURL(blob);
    const img = new Image(); img.loading='lazy'; img.style.maxWidth='100%'; img.style.borderRadius='12px'; img.alt=prompt; img.src=obj;
    img.onload = ()=> URL.revokeObjectURL(obj);
    holder.innerHTML=''; holder.appendChild(img);
    const row = document.createElement('div'); row.style.marginTop='8px';
    row.appendChild(btn('Regenerar', ()=>{ state.img.seed=randSeed(); renderPollinations(prompt, w, h, model, state.img.seed, holder);} ));
    row.appendChild(btn('Abrir', ()=> window.open(url,'_blank')));
    row.appendChild(btn('Baixar', ()=> { const a=document.createElement('a'); a.href=url; a.download=`capyimg_${seed}.png`; a.click(); }));
    holder.appendChild(row);
  }catch(e){
    const img = new Image(); img.loading='lazy'; img.style.maxWidth='100%'; img.style.borderRadius='12px'; img.alt=prompt; img.src=url;
    img.onload=()=>{ holder.innerHTML=''; holder.appendChild(img); };
    img.onerror=()=>{ holder.innerHTML = `Falha ao gerar imagem. <a href="${url}" target="_blank">Abrir em nova aba</a>`; };
  }
}

// ===== UI helpers =====
function cleanPrompt(s){
  // remove markdown bullets/asterisks and headings
  s = s.replace(/\*\*?/g,'').replace(/^#+\s*/gm,'');
  // turn line breaks into commas where appropriate
  s = s.replace(/\n\s*\n/g, '\n').replace(/[\r\n]+/g, ', ').replace(/\s+,/g, ',').replace(/,,+/g, ',').replace(/\s{2,}/g,' ').trim();
  // keep it concise but descriptive
  return s;
}

function btn(label, onclick){
  const b = document.createElement('button');
  b.className = 'pill';
  b.type = 'button';
  b.textContent = label;
  b.onclick = onclick;
  return b;
}
function addUser(t){ const b=document.createElement('div'); b.className='bubble user'; b.textContent=t; elChat.appendChild(b); elChat.scrollTop=elChat.scrollHeight; return b; }
function addAI(content){ const b=document.createElement('div'); b.className='bubble'; if(typeof content==='string'){ b.innerHTML=content; } else if(content instanceof Element){ b.appendChild(content); } elChat.appendChild(b); elChat.scrollTop=elChat.scrollHeight; return b; }
function systemMsg(t){ addAI('<em>'+escapeHTML(t)+'</em>'); }
function escapeHTML(s){ return s.replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function randSeed(){ return Math.floor(Math.random()*1e9); }
function withTimeout(p, ms=45000){ return new Promise((res,rej)=>{ const id=setTimeout(()=>rej(new Error('timeout')),ms); p.then(v=>{clearTimeout(id);res(v)}).catch(e=>{clearTimeout(id);rej(e)}) }) }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function fileToDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }
function renderPromptBlock(text, actions=[]){
  const cleaned = cleanPrompt(text);
  const id = 'ta'+Math.random().toString(36).slice(2);
  const wrapper = document.createElement('div');
  const title = document.createElement('div'); title.textContent='Prompt gerado'; title.style.opacity='.7'; title.style.marginBottom='6px';
  const ta = document.createElement('textarea');
  ta.id = id; ta.rows = 8; ta.className='composer__input'; ta.style.height='170px'; ta.value = cleaned;
  const row = document.createElement('div'); row.className='row'; row.style.marginTop='8px';
  const copyBtn = btn('Copiar', ()=> navigator.clipboard.writeText(ta.value));
  row.appendChild(copyBtn);
  actions.forEach(a=>{ const b=btn(a.label, ()=>a.action(ta.value)); row.appendChild(b); });
  wrapper.appendChild(title); wrapper.appendChild(ta); wrapper.appendChild(row);
  return wrapper;
}

// CapyPrompt toggle
function initCapyPromptToggle(){
  if(!elCapyToggle) return;
  elCapyToggle.style.display = 'inline-flex';
  elCapyToggle.onclick = ()=> elCapyToggle.classList.toggle('active');
}
// init
if(!state.sessionId) startNewSession();
initCapyPromptToggle();
loadTools();