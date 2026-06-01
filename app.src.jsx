const { useState, useEffect, useCallback, useMemo } = React;

// ════════════════════════════════════════════════════════════
//  PART 61 · PRIVATE PILOT — Pocket Checkride (standalone)
//  Runs anywhere. Persists in localStorage. Regenerate uses YOUR
//  Anthropic API key (set it via the gear icon → Settings).
// ════════════════════════════════════════════════════════════

const STORE_KEY = "part61ppl:v2";
const SETTINGS_KEY = "part61ppl:settings";

const regUrl = (sec, quote) => {
  const base = `https://www.ecfr.gov/current/title-14/section-${sec}`;
  return quote ? `${base}#:~:text=${encodeURIComponent(quote)}` : base;
};

const BASE = [
  { id:"b01", reg:"61.103", topic:"Eligibility", q:"Minimum age to be eligible for a private pilot certificate in an airplane?",
    choices:["16","17","18","21"], answer:1,
    explain:"§61.103(a): at least 17 years old for a rating other than glider or balloon.", quote:"17 years of age" },
  { id:"b02", reg:"61.103", topic:"Eligibility", q:"Which is an eligibility requirement under §61.103?",
    choices:["U.S. citizenship","Read, speak, write & understand English","A college degree","Aircraft ownership"], answer:1,
    explain:"§61.103(c): must be able to read, speak, write, and understand English.", quote:"read, speak, write, and understand" },
  { id:"b03", reg:"61.3", topic:"Certificates", q:"While acting as PIC, a private pilot must have in their physical possession:",
    choices:["Only a photo ID","Pilot certificate, medical/BasicMed, and photo ID","Logbook and certificate","Only the pilot certificate"], answer:1,
    explain:"§61.3(a) & (c): a valid pilot certificate, appropriate medical (or BasicMed), and government-issued photo ID.", quote:"physical possession" },
  { id:"b04", reg:"61.23", topic:"Medical", q:"Minimum medical certificate to exercise private pilot privileges (without BasicMed)?",
    choices:["First-class","Second-class","Third-class","None required"], answer:2,
    explain:"§61.23(a)(3): a third-class medical is the minimum; BasicMed is an alternative path.", quote:"third-class medical certificate" },
  { id:"b05", reg:"61.105", topic:"Knowledge", q:"Before the knowledge test, §61.105 requires the applicant to have:",
    choices:["50 hours of ground school","Received and logged ground training or completed a home-study course","A bachelor's degree","Passed a medical exam"], answer:1,
    explain:"§61.105(a): logged ground training from an authorized instructor OR completed a home-study course.", quote:"home-study course" },
  { id:"b06", reg:"61.107", topic:"Proficiency", q:"§61.107 requires flight training in the areas of operation for the rating. For ASEL these include all EXCEPT:",
    choices:["Navigation","Night operations","Formation flying","Emergency operations"], answer:2,
    explain:"§61.107(b)(1) lists areas of operation; formation flying is not among them.", quote:"Areas of operation" },

  { id:"b07", reg:"61.109", topic:"Hours · Total", q:"Minimum TOTAL flight time for a private pilot certificate (ASEL)?",
    choices:["30 hours","35 hours","40 hours","45 hours"], answer:2,
    explain:"§61.109(a): at least 40 hours total flight time (Part 141 allows fewer).", quote:"40 hours of flight time" },
  { id:"b08", reg:"61.109", topic:"Hours · Dual", q:"Minimum flight training received from an authorized instructor?",
    choices:["10 hours","15 hours","20 hours","25 hours"], answer:2,
    explain:"§61.109(a): at least 20 hours of flight training from an authorized instructor.", quote:"20 hours of flight training from an authorized instructor" },
  { id:"b09", reg:"61.109", topic:"Hours · Solo", q:"Minimum solo flight training required?",
    choices:["5 hours","10 hours","15 hours","20 hours"], answer:1,
    explain:"§61.109(a): at least 10 hours of solo flight training.", quote:"10 hours of solo flight training" },
  { id:"b10", reg:"61.109", topic:"Hours · XC dual", q:"How many hours of cross-country flight training (dual) are required?",
    choices:["2 hours","3 hours","5 hours","10 hours"], answer:1,
    explain:"§61.109(a)(1): 3 hours of cross-country flight training in a single-engine airplane.", quote:"3 hours of cross-country flight training in a single-engine airplane" },
  { id:"b11", reg:"61.109", topic:"Hours · Night", q:"How many hours of night flight training (dual) are required?",
    choices:["2 hours","3 hours","5 hours","No night required"], answer:1,
    explain:"§61.109(a)(2): 3 hours of night flight training in a single-engine airplane (see §61.110 exception).", quote:"3 hours of night flight training in a single-engine airplane" },
  { id:"b12", reg:"61.109", topic:"Hours · Night", q:"The night training must include one cross-country of what minimum total distance?",
    choices:["Over 50 NM","Over 100 NM","Over 150 NM","Over 250 NM"], answer:1,
    explain:"§61.109(a)(2)(i): one night cross-country flight of over 100 NM total distance.", quote:"over 100 nautical miles total distance" },
  { id:"b13", reg:"61.109", topic:"Hours · Night", q:"Night training also requires how many takeoffs/landings, under what condition?",
    choices:["5, at any airport","10 takeoffs & 10 full-stop landings, each in the traffic pattern","3 to a full stop","10 touch-and-goes at a tower"], answer:1,
    explain:"§61.109(a)(2)(ii): 10 takeoffs and 10 landings to a full stop, each involving a flight in the traffic pattern, at an airport.", quote:"10 takeoffs and 10 landings to a full stop" },
  { id:"b14", reg:"61.109", topic:"Hours · Instrument", q:"How many hours of instrument flight training (dual) are required?",
    choices:["3 hours","5 hours","10 hours","15 hours"], answer:0,
    explain:"§61.109(a)(3): 3 hours of flight training by reference to instruments.", quote:"solely by reference to instruments" },
  { id:"b15", reg:"61.109", topic:"Hours · Test prep", q:"The 3 hours of test-prep flight training must occur within what window before the practical test?",
    choices:["30 days","60 days / 2 calendar months","90 days","6 months"], answer:1,
    explain:"§61.109(a)(4): 3 hours of test preparation within the 2 calendar months preceding the practical test.", quote:"2 calendar months" },
  { id:"b16", reg:"61.109", topic:"Hours · Solo XC", q:"Of the 10 solo hours, how many must be solo cross-country time?",
    choices:["3 hours","5 hours","8 hours","10 hours"], answer:1,
    explain:"§61.109(a)(5): 5 hours of solo cross-country flight time.", quote:"5 hours of solo cross" },
  { id:"b17", reg:"61.109", topic:"Hours · Solo XC", q:"The long solo cross-country must total at least:",
    choices:["100 NM","150 NM","200 NM","250 NM"], answer:1,
    explain:"§61.109(a)(5)(ii): one solo XC of 150 NM total distance.", quote:"150 nautical miles total distance" },
  { id:"b18", reg:"61.109", topic:"Hours · Solo XC", q:"The long solo cross-country requires full-stop landings at how many points?",
    choices:["2 points","3 points","4 points","1 point"], answer:1,
    explain:"§61.109(a)(5)(ii): full-stop landings at a minimum of three points.", quote:"minimum of three points" },
  { id:"b19", reg:"61.109", topic:"Hours · Solo XC", q:"On the long solo XC, one segment must be a straight-line distance of at least:",
    choices:["25 NM","50 NM","75 NM","100 NM"], answer:1,
    explain:"§61.109(a)(5)(ii): one segment with a straight-line distance of more than 50 NM between takeoff and landing.", quote:"more than 50 nautical miles" },
  { id:"b20", reg:"61.109", topic:"Hours · Solo", q:"Solo requirements include how many takeoffs/landings at a towered airport?",
    choices:["3 takeoffs & 3 landings to a full stop","5 takeoffs & landings","10 to a full stop","1 of each"], answer:0,
    explain:"§61.109(a)(5)(i): 3 takeoffs and 3 landings to a full stop at an airport with an operating control tower.", quote:"operating control tower" },

  { id:"b21", reg:"61.113", topic:"Privileges", q:"General rule for a private pilot regarding compensation/hire?",
    choices:["May fly for hire in day VFR","May not act as PIC carrying passengers/property for compensation or hire","May be paid under $250","May be paid by an air carrier only"], answer:1,
    explain:"§61.113(a): may not act as PIC for compensation or hire, nor carry persons/property for compensation or hire — subject to exceptions.", quote:"for compensation or hire" },
  { id:"b22", reg:"61.113", topic:"Privileges", q:"Permitted expense-sharing with passengers requires the pilot to pay:",
    choices:["Nothing","At least a pro rata share of fuel, oil, airport expenses, or rental","Half the total trip cost flat","Only the landing fees"], answer:1,
    explain:"§61.113(c): may share operating expenses if the pilot pays at least a pro rata share of fuel, oil, airport expenditures, or rental fees.", quote:"pro rata share of the operating expenses" },
  { id:"b23", reg:"61.113", topic:"Privileges", q:"Which is a valid exception letting a private pilot receive limited compensation?",
    choices:["Sightseeing tours for hire","Flight incidental to a business or employment","Paid flight instruction","Carrying cargo for a fee"], answer:1,
    explain:"§61.113(b): PIC in connection with a business/employment is allowed if the flight is only incidental and carries no persons/property for compensation or hire.", quote:"incidental to that business or employment" },

  { id:"b24", reg:"61.57", topic:"Recency", q:"To carry passengers (day), takeoffs/landings required in the preceding 90 days?",
    choices:["1","2","3","6"], answer:2,
    explain:"§61.57(a): 3 takeoffs and 3 landings within the preceding 90 days, same category/class.", quote:"preceding 90 days" },
  { id:"b25", reg:"61.57", topic:"Recency", q:"To carry passengers at NIGHT, the 90-day takeoffs/landings must be:",
    choices:["Touch-and-go","To a full stop, 1 hr after sunset to 1 hr before sunrise","At a tower","With a CFI aboard"], answer:1,
    explain:"§61.57(b): for night passenger carriage, 3 takeoffs and 3 landings to a full stop during the period 1 hour after sunset to 1 hour before sunrise.", quote:"1 hour after sunset" },
];

// ── localStorage persistence ────────────────────────────────
function loadState(){
  try { const r = localStorage.getItem(STORE_KEY); if (r) return JSON.parse(r); } catch(e){}
  return { saved:[], deleted:[], edits:{}, generated:[] };
}
function saveState(s){ try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch(e){} }
function loadSettings(){
  try { const r = localStorage.getItem(SETTINGS_KEY); if (r) return JSON.parse(r); } catch(e){}
  return { apiKey:"", model:"claude-haiku-4-5-20251001" };
}
function saveSettings(s){ try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch(e){} }

const shuffle = (arr) => {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
};

function App(){
  const [tab, setTab] = useState("quiz");
  const [state, setState] = useState(() => loadState());
  const [settings, setSettings] = useState(() => loadSettings());
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const persist = useCallback((updater) => {
    setState((prev) => { const next = typeof updater==="function"?updater(prev):updater; saveState(next); return next; });
  }, []);
  const persistSettings = (s) => { setSettings(s); saveSettings(s); };

  const questions = useMemo(() => {
    const all = [...BASE, ...state.generated];
    return all.filter((q)=>!state.deleted.includes(q.id)).map((q)=> state.edits[q.id]?{...q,...state.edits[q.id]}:q);
  }, [state]);

  const savedQuestions = questions.filter((q)=>state.saved.includes(q.id));

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <header style={S.header}>
        <div style={S.brand}><span style={S.brandDot} /><span style={S.brandText}>POCKET CHECKRIDE</span></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={S.brandSub}>PART 61 PPL</span>
          <button style={S.gear} onClick={()=>setShowSettings(true)} title="Settings">⚙</button>
        </div>
      </header>

      <main style={S.main}>
        {tab==="quiz" && <Quiz pool={questions} scopeLabel="All questions" />}
        {tab==="saved" && (savedQuestions.length
          ? <Quiz pool={savedQuestions} scopeLabel="Saved questions" />
          : <Empty glyph="★" title="No saved questions yet" body="Tap the star on any question in the Library to build a focused study set, then drill it here." />)}
        {tab==="library" && <Library questions={questions} state={state} persist={persist} onEdit={setEditing} settings={settings} openSettings={()=>setShowSettings(true)} />}
      </main>

      <nav style={S.tabbar}>
        <TabBtn active={tab==="quiz"} onClick={()=>setTab("quiz")} icon="✈" label="Quiz" />
        <TabBtn active={tab==="saved"} onClick={()=>setTab("saved")} icon="★" label={`Saved${state.saved.length?` ${state.saved.length}`:""}`} />
        <TabBtn active={tab==="library"} onClick={()=>setTab("library")} icon="≡" label="Library" />
      </nav>

      {editing && <EditModal question={editing} onClose={()=>setEditing(null)}
        onSave={(patch)=>{ persist((p)=>({...p, edits:{...p.edits,[editing.id]:{...p.edits[editing.id],...patch}}})); setEditing(null); }} />}

      {showSettings && <SettingsModal settings={settings} onSave={(s)=>{persistSettings(s); setShowSettings(false);}} onClose={()=>setShowSettings(false)} />}
    </div>
  );
}

function RegLink({ reg, quote, style }){
  return (<a href={regUrl(reg,quote)} target="_blank" rel="noopener noreferrer" className="reglink" style={style}
    onClick={(e)=>e.stopPropagation()} title={quote?`Jump to: "${quote}"`:`Open §${reg}`}>§{reg} ↗</a>);
}

function Quiz({ pool, scopeLabel }){
  const [order, setOrder] = useState(()=>shuffle(pool));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(()=>{ setOrder(shuffle(pool)); setIdx(0); setPicked(null); setLocked(false); setScore(0); setLog([]); setDone(false); }, [pool]);
  if (!order.length) return null;
  const q = order[idx];

  const choose = (i) => {
    if (locked) return;
    setPicked(i); setLocked(true);
    const correct = i===q.answer; if (correct) setScore((s)=>s+1);
    setLog((l)=>[...l,{reg:q.reg,topic:q.topic,correct,quote:q.quote}]);
  };
  const next = () => { if (idx+1>=order.length) setDone(true); else { setIdx((n)=>n+1); setPicked(null); setLocked(false); } };
  const restart = () => { setOrder(shuffle(pool)); setIdx(0); setPicked(null); setLocked(false); setScore(0); setLog([]); setDone(false); };

  if (done){
    const pct = Math.round((score/order.length)*100); const pass = pct>=80;
    return (
      <div className="fade" style={S.results}>
        <Ring pct={pct} pass={pass} score={score} total={order.length} />
        <h2 style={S.resultTitle}>{pass?"Checkride Ready":"Keep Studying"}</h2>
        <p style={S.resultSub}>{pass?"Strong command of Part 61. Tap any reg below to jump to the highlighted source text.":"Close the gaps below — each link highlights the exact regulation."}</p>
        <div style={S.reviewList}>
          {log.map((a,i)=>(
            <div key={i} style={S.reviewRow}>
              <span style={{...S.reviewMark,color:a.correct?"#5fd38a":"#f0775c"}}>{a.correct?"✓":"✕"}</span>
              <RegLink reg={a.reg} quote={a.quote} style={S.reviewReg} />
              <span style={S.reviewTopic}>{a.topic}</span>
            </div>
          ))}
        </div>
        <button style={S.primary} onClick={restart}>↻ Run It Again</button>
      </div>
    );
  }

  return (
    <div>
      <div style={S.quizTop}><span style={S.scope}>{scopeLabel}</span><span style={S.counter}>{idx+1} / {order.length}</span></div>
      <div style={S.track}><div style={{...S.fill,width:`${(idx/order.length)*100}%`}} /></div>
      <div className="fade" key={q.id} style={S.card}>
        <div style={S.cardHead}><span style={S.topicTag}>{q.topic}</span><RegLink reg={q.reg} quote={q.quote} style={S.regTag} /></div>
        <h2 style={S.question}>{q.q}</h2>
        <div style={S.choices}>
          {q.choices.map((c,i)=>{
            const isAns=i===q.answer, isPick=i===picked; let cls="choice";
            if (locked&&isAns) cls+=" correct"; else if (locked&&isPick) cls+=" wrong"; else if (locked) cls+=" dim";
            return (<button key={i} className={cls} disabled={locked} onClick={()=>choose(i)}>
              <span className="ckey">{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{c}</span>
              {locked&&isAns&&<span className="cmark">✓</span>}{locked&&isPick&&!isAns&&<span className="cmark">✕</span>}
            </button>);
          })}
        </div>
        {locked && (
          <div className="reveal" style={S.explain}>
            <div style={S.explainHead}>
              <span style={{color:picked===q.answer?"#5fd38a":"#f0a44c",fontWeight:700,letterSpacing:1}}>{picked===q.answer?"CORRECT":"REVIEW"}</span>
              <RegLink reg={q.reg} quote={q.quote} style={S.regTagSm} />
            </div>
            <p style={S.explainText}>{q.explain}</p>
            <button style={S.primary} onClick={next}>{idx+1>=order.length?"See Results →":"Next →"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Library({ questions, state, persist, onEdit, settings, openSettings }){
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const toggleSave = (id)=>persist((p)=>({...p, saved:p.saved.includes(id)?p.saved.filter((x)=>x!==id):[...p.saved,id]}));
  const del = (id)=>persist((p)=>({...p, deleted:[...p.deleted,id], saved:p.saved.filter((x)=>x!==id)}));
  const restore = (id)=>persist((p)=>({...p, deleted:p.deleted.filter((x)=>x!==id)}));

  const regenerate = async (q) => {
    setErr(null);
    if (!settings.apiKey){ setErr({id:q.id, msg:"No API key set. Tap the ⚙ gear (top-right) and paste your Anthropic API key to enable Regenerate."}); return; }
    setBusy(q.id);
    try {
      const prompt =
        `Write ONE multiple-choice question testing knowledge of 14 CFR ${q.reg} (topic: ${q.topic}) `+
        `for the FAA Private Pilot — Airplane Single-Engine Land certificate. It must be factually accurate to the current regulation `+
        `and different from this one: "${q.q}". Return ONLY valid minified JSON, no markdown, with exactly these keys: `+
        `"q" (string), "choices" (array of exactly 4 short strings), "answer" (integer 0-3 = index of the correct choice), `+
        `"explain" (string, one sentence, citing the specific paragraph), `+
        `"quote" (a SHORT verbatim phrase, 3-8 words, copied exactly from the text of ${q.reg}).`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{
          "content-type":"application/json",
          "x-api-key":settings.apiKey,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body: JSON.stringify({ model:settings.model||"claude-haiku-4-5-20251001", max_tokens:1024, messages:[{role:"user",content:prompt}] }),
      });
      if (!res.ok){
        let detail=""; try { const e=await res.json(); detail=e.error?.message||JSON.stringify(e); } catch(_){}
        throw new Error(`${res.status} ${res.statusText}${detail?` — ${detail}`:""}`);
      }
      const data = await res.json();
      const text = (data.content||[]).filter((b)=>b.type==="text").map((b)=>b.text).join("").trim();
      const clean = text.replace(/```json/gi,"").replace(/```/g,"").trim();
      const obj = JSON.parse(clean);
      if (!obj.q || !Array.isArray(obj.choices) || obj.choices.length!==4 || typeof obj.answer!=="number") throw new Error("Unexpected response shape.");
      persist((p)=>({...p, edits:{...p.edits,[q.id]:{ q:obj.q, choices:obj.choices, answer:Math.max(0,Math.min(3,obj.answer)), explain:obj.explain||"", quote:obj.quote||"" }}}));
    } catch(e){
      setErr({id:q.id, msg: (""+e.message).includes("Failed to fetch")
        ? "Couldn't reach the API. Check your internet connection and that your API key is valid."
        : `Generation failed: ${e.message}` });
    } finally { setBusy(null); }
  };

  const addBlank = () => {
    const blank = { id:"gen-"+Date.now(), reg:"61.109", topic:"Custom", q:"New question — tap edit to write it.",
      choices:["Option A","Option B","Option C","Option D"], answer:0, explain:"", quote:"" };
    persist((p)=>({...p, generated:[...p.generated, blank]}));
    setTimeout(()=>onEdit(blank),0);
  };

  return (
    <div>
      <div style={S.libHead}>
        <div><div style={S.libTitle}>Question Library</div>
          <div style={S.libCount}>{questions.length} active · {state.saved.length} saved · key {settings.apiKey?"set ✓":"not set"}</div></div>
        <button style={S.ghostBtn} onClick={addBlank}>+ New</button>
      </div>

      {questions.map((q)=>{
        const saved=state.saved.includes(q.id); const edited=!!state.edits[q.id];
        return (
          <div key={q.id} style={S.libCard}>
            <div style={S.libCardTop}><RegLink reg={q.reg} quote={q.quote} style={S.regTagSm} />
              <span style={S.libTopic}>{q.topic}</span>{edited&&<span style={S.editedBadge}>edited</span>}</div>
            <div style={S.libQ}>{q.q}</div>
            <div style={S.libChoices}>
              {q.choices.map((c,i)=>(
                <div key={i} style={{...S.libChoice,...(i===q.answer?S.libChoiceCorrect:{})}}>
                  <span style={S.libKey}>{String.fromCharCode(65+i)}</span>{c}
                  {i===q.answer&&<span style={{marginLeft:"auto",color:"#5fd38a"}}>✓</span>}
                </div>
              ))}
            </div>
            {err&&err.id===q.id && <div style={S.errBox}>{err.msg} {(""+err.msg).includes("API key")&&<button style={S.errLink} onClick={openSettings}>Open Settings</button>}</div>}
            <div style={S.actions}>
              <button style={{...S.actBtn,...(saved?S.actSaved:{})}} onClick={()=>toggleSave(q.id)}>{saved?"★ Saved":"☆ Save"}</button>
              <button style={S.actBtn} onClick={()=>onEdit(q)}>✎ Edit</button>
              <button style={S.actBtn} disabled={busy===q.id} onClick={()=>regenerate(q)}>{busy===q.id?"✺ Generating…":"↻ Regenerate"}</button>
              <button style={{...S.actBtn,...S.actDanger}} onClick={()=>del(q.id)}>🗑 Delete</button>
            </div>
          </div>
        );
      })}

      {state.deleted.length>0 && (
        <div style={{marginTop:8,marginBottom:12}}>
          <button style={S.deletedToggle} onClick={()=>setShowDeleted((v)=>!v)}>{showDeleted?"▾":"▸"} Deleted ({state.deleted.length})</button>
          {showDeleted && state.deleted.map((id)=>{
            const q=[...BASE,...state.generated].find((x)=>x.id===id); const merged=q&&state.edits[id]?{...q,...state.edits[id]}:q;
            return (<div key={id} style={S.deletedRow}><span style={S.deletedText}>{merged?merged.q:id}</span>
              <button style={S.restoreBtn} onClick={()=>restore(id)}>Restore</button></div>);
          })}
        </div>
      )}

      <div style={S.disclaimer}>
        Study aid only — verify against the current eCFR. Part 141 minimums differ.
        Reg links highlight exact text in Chrome, Edge &amp; Safari. Regenerated questions are AI-written; spot-check them.
      </div>
    </div>
  );
}

function EditModal({ question, onClose, onSave }){
  const [q,setQ]=useState(question.q); const [reg,setReg]=useState(question.reg); const [topic,setTopic]=useState(question.topic);
  const [choices,setChoices]=useState([...question.choices]); const [answer,setAnswer]=useState(question.answer);
  const [explain,setExplain]=useState(question.explain||""); const [quote,setQuote]=useState(question.quote||"");
  const setChoice=(i,v)=>setChoices((c)=>c.map((x,j)=>j===i?v:x));
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e)=>e.stopPropagation()}>
        <div style={S.modalHead}><span style={S.modalTitle}>Edit Question</span><button style={S.closeBtn} onClick={onClose}>✕</button></div>
        <label style={S.lbl}>Question</label>
        <textarea style={S.textarea} value={q} onChange={(e)=>setQ(e.target.value)} rows={2} />
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={S.lbl}>Reg § (e.g. 61.109)</label>
            <input style={S.input} value={reg} onChange={(e)=>setReg(e.target.value.replace(/[^0-9.]/g,""))} /></div>
          <div style={{flex:1}}><label style={S.lbl}>Topic</label>
            <input style={S.input} value={topic} onChange={(e)=>setTopic(e.target.value)} /></div>
        </div>
        <label style={S.lbl}>Choices — tap the circle to mark the correct one</label>
        {choices.map((c,i)=>(
          <div key={i} style={S.choiceEditRow}>
            <button onClick={()=>setAnswer(i)} style={{...S.radio,...(answer===i?S.radioOn:{})}}>{answer===i?"✓":String.fromCharCode(65+i)}</button>
            <input style={S.input} value={c} onChange={(e)=>setChoice(i,e.target.value)} />
          </div>
        ))}
        <label style={S.lbl}>Explanation</label>
        <textarea style={S.textarea} value={explain} onChange={(e)=>setExplain(e.target.value)} rows={2} />
        <label style={S.lbl}>Highlight phrase — verbatim text from the reg to highlight on click</label>
        <input style={S.input} value={quote} onChange={(e)=>setQuote(e.target.value)} placeholder="e.g. 150 nautical miles total distance" />
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button style={{...S.primary,flex:1}} onClick={()=>onSave({q,reg,topic,choices,answer,explain,quote})}>Save Changes</button>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }){
  const [apiKey,setApiKey]=useState(settings.apiKey||"");
  const [model,setModel]=useState(settings.model||"claude-haiku-4-5-20251001");
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e)=>e.stopPropagation()}>
        <div style={S.modalHead}><span style={S.modalTitle}>Settings</span><button style={S.closeBtn} onClick={onClose}>✕</button></div>
        <p style={{fontSize:12.5,lineHeight:1.6,color:"rgba(255,255,255,0.6)",margin:"0 0 6px"}}>
          The <b>Regenerate</b> feature calls Anthropic's API. Paste your own API key to enable it. The key is stored only in this browser (localStorage) and sent directly to Anthropic.
        </p>
        <label style={S.lbl}>Anthropic API key</label>
        <input style={S.input} type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value.trim())} placeholder="sk-ant-…" autoComplete="off" />
        <label style={S.lbl}>Model</label>
        <input style={S.input} value={model} onChange={(e)=>setModel(e.target.value.trim())} placeholder="claude-haiku-4-5-20251001" />
        <p style={{fontSize:11,lineHeight:1.55,color:"rgba(255,255,255,0.4)",margin:"10px 0 0"}}>
          Get a key at console.anthropic.com → API Keys. Use any model your account has access to (e.g. claude-opus-4-6).
          Don't publish this file with your key embedded — anyone could use it.
        </p>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button style={{...S.primary,flex:1}} onClick={()=>onSave({apiKey,model})}>Save</button>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }){
  return (<button onClick={onClick} style={{...S.tab,...(active?S.tabActive:{})}}>
    <span style={{fontSize:18,lineHeight:1}}>{icon}</span><span style={S.tabLabel}>{label}</span></button>);
}
function Empty({ glyph, title, body }){
  return (<div style={S.empty}><div style={S.emptyGlyph}>{glyph}</div><div style={S.emptyTitle}>{title}</div><div style={S.emptyBody}>{body}</div></div>);
}
function Ring({ pct, pass, score, total }){
  const r=68, c=2*Math.PI*r;
  return (<svg width="150" height="150" viewBox="0 0 160 160" style={{margin:"0 auto 4px",display:"block"}}>
    <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
    <circle cx="80" cy="80" r={r} fill="none" stroke={pass?"#5fd38a":"#f0a44c"} strokeWidth="10" strokeLinecap="round"
      strokeDasharray={c} strokeDashoffset={c*(1-pct/100)} transform="rotate(-90 80 80)" style={{transition:"stroke-dashoffset 1s ease"}} />
    <text x="80" y="74" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="700" fontFamily="Georgia, serif">{pct}%</text>
    <text x="80" y="98" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">{score}/{total}</text>
  </svg>);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.fade{animation:fade .4s ease both;} @keyframes fade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.reveal{animation:reveal .35s ease both;} @keyframes reveal{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.reglink{color:#f0a44c;text-decoration:none;font-weight:700;border-bottom:1px dotted rgba(240,164,76,0.5);}
.reglink:hover{color:#ffc078;}
.choice{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:15px 16px;background:rgba(255,255,255,0.025);
  border:1px solid rgba(255,255,255,0.09);border-radius:13px;color:#e9e6df;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:14px;line-height:1.4;transition:all .16s ease;}
.choice:hover:not(:disabled){background:rgba(240,164,76,0.08);border-color:rgba(240,164,76,0.4);}
.choice:active:not(:disabled){transform:scale(0.99);} .choice:disabled{cursor:default;}
.choice.correct{background:rgba(95,211,138,0.13);border-color:#5fd38a;color:#d8f5e3;}
.choice.wrong{background:rgba(240,119,92,0.13);border-color:#f0775c;color:#ffded5;}
.choice.dim{opacity:.42;}
.ckey{flex-shrink:0;width:25px;height:25px;border-radius:6px;display:grid;place-items:center;font-weight:700;font-size:12px;background:rgba(255,255,255,0.07);color:#f0a44c;}
.correct .ckey{background:#5fd38a;color:#08130c;} .wrong .ckey{background:#f0775c;color:#1a0805;}
.cmark{font-weight:700;font-size:15px;}
textarea,input,button{font-family:'JetBrains Mono',monospace;}
::-webkit-scrollbar{width:8px;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:8px;}
`;

const accent = "#f0a44c";
const S = {
  app:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"radial-gradient(1000px 500px at 50% -10%, #1c2530 0%, #0d1117 55%, #080a0e 100%)",fontFamily:"'JetBrains Mono', monospace",color:"#e9e6df"},
  header:{position:"sticky",top:0,zIndex:5,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(13,17,23,0.85)",backdropFilter:"blur(10px)"},
  brand:{display:"flex",alignItems:"center",gap:9},
  brandDot:{width:8,height:8,borderRadius:"50%",background:"#5fd38a",boxShadow:"0 0 10px #5fd38a"},
  brandText:{fontWeight:700,fontSize:13,letterSpacing:1.5},
  brandSub:{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.35)"},
  gear:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e9e6df",width:32,height:32,borderRadius:8,fontSize:15,cursor:"pointer"},
  main:{flex:1,maxWidth:600,width:"100%",margin:"0 auto",padding:"18px 16px 96px"},
  quizTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},
  scope:{fontSize:11,letterSpacing:1,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"},
  counter:{fontSize:12,color:"rgba(255,255,255,0.45)"},
  track:{height:4,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden",marginBottom:20},
  fill:{height:"100%",background:`linear-gradient(90deg,#e08a2e,${accent})`,borderRadius:4,transition:"width .4s ease"},
  card:{background:"linear-gradient(180deg,#161c24,#11161d)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.4)"},
  cardHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  topicTag:{fontSize:10.5,letterSpacing:1.5,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"},
  regTag:{fontSize:12}, regTagSm:{fontSize:11.5},
  question:{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,lineHeight:1.4,margin:"0 0 18px",color:"#fff",fontWeight:600},
  choices:{display:"flex",flexDirection:"column",gap:10},
  explain:{marginTop:18,padding:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12},
  explainHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,fontSize:11},
  explainText:{fontSize:13,lineHeight:1.65,color:"rgba(255,255,255,0.8)",margin:"0 0 14px"},
  primary:{background:`linear-gradient(180deg,${accent},#e08a2e)`,color:"#1a0e02",border:"none",borderRadius:10,padding:"12px 22px",fontWeight:700,fontSize:13,letterSpacing:0.5,cursor:"pointer",boxShadow:"0 8px 22px rgba(240,164,76,0.28)"},
  results:{textAlign:"center",paddingTop:14},
  resultTitle:{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",margin:"8px 0 4px"},
  resultSub:{color:"rgba(255,255,255,0.6)",fontSize:13,lineHeight:1.6,maxWidth:420,margin:"0 auto 18px"},
  reviewList:{display:"flex",flexDirection:"column",gap:7,maxWidth:440,margin:"0 auto 20px",textAlign:"left"},
  reviewRow:{display:"flex",alignItems:"center",gap:12,padding:"9px 13px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8},
  reviewMark:{fontWeight:700,width:14}, reviewReg:{minWidth:74,fontSize:12}, reviewTopic:{fontSize:12,color:"rgba(255,255,255,0.55)"},
  libHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},
  libTitle:{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#fff"},
  libCount:{fontSize:11.5,color:"rgba(255,255,255,0.4)",marginTop:2},
  ghostBtn:{background:"rgba(240,164,76,0.12)",color:accent,border:`1px solid rgba(240,164,76,0.4)`,borderRadius:9,padding:"9px 16px",fontWeight:700,fontSize:13,cursor:"pointer"},
  libCard:{background:"linear-gradient(180deg,#161c24,#11161d)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:13},
  libCardTop:{display:"flex",alignItems:"center",gap:10,marginBottom:9},
  libTopic:{fontSize:10.5,letterSpacing:1,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"},
  editedBadge:{marginLeft:"auto",fontSize:9.5,letterSpacing:1,color:"#7fd1f0",border:"1px solid rgba(127,209,240,0.4)",borderRadius:5,padding:"2px 6px"},
  libQ:{fontSize:14.5,lineHeight:1.45,color:"#fff",marginBottom:12,fontWeight:500},
  libChoices:{display:"flex",flexDirection:"column",gap:6,marginBottom:14},
  libChoice:{display:"flex",alignItems:"center",gap:9,fontSize:12.5,padding:"8px 11px",background:"rgba(255,255,255,0.025)",borderRadius:8,border:"1px solid transparent",color:"rgba(255,255,255,0.7)"},
  libChoiceCorrect:{background:"rgba(95,211,138,0.1)",border:"1px solid rgba(95,211,138,0.35)",color:"#d8f5e3"},
  libKey:{width:20,height:20,borderRadius:5,display:"grid",placeItems:"center",fontSize:10.5,fontWeight:700,background:"rgba(255,255,255,0.07)",color:accent,flexShrink:0},
  actions:{display:"flex",flexWrap:"wrap",gap:7},
  actBtn:{flex:"1 1 auto",background:"rgba(255,255,255,0.04)",color:"#e9e6df",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 10px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"},
  actSaved:{background:"rgba(240,164,76,0.15)",borderColor:accent,color:accent},
  actDanger:{color:"#f0917c",borderColor:"rgba(240,119,92,0.3)"},
  errBox:{fontSize:11.5,lineHeight:1.5,color:"#ffb8a8",background:"rgba(240,119,92,0.1)",border:"1px solid rgba(240,119,92,0.3)",borderRadius:8,padding:"8px 11px",marginBottom:10},
  errLink:{marginLeft:6,background:"none",border:"none",color:"#ffd9a8",textDecoration:"underline",cursor:"pointer",fontSize:11.5,padding:0},
  deletedToggle:{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:12.5,cursor:"pointer",padding:"6px 0"},
  deletedRow:{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",background:"rgba(255,255,255,0.02)",borderRadius:8,marginTop:6},
  deletedText:{flex:1,fontSize:12,color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  restoreBtn:{background:"none",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.7)",borderRadius:7,padding:"5px 12px",fontSize:11.5,cursor:"pointer"},
  disclaimer:{marginTop:18,fontSize:11,lineHeight:1.6,color:"rgba(255,255,255,0.3)",textAlign:"center"},
  tabbar:{position:"fixed",bottom:0,left:0,right:0,zIndex:10,display:"flex",justifyContent:"space-around",padding:"8px 8px max(8px, env(safe-area-inset-bottom))",background:"rgba(13,17,23,0.92)",backdropFilter:"blur(12px)",borderTop:"1px solid rgba(255,255,255,0.08)"},
  tab:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",padding:"6px 0"},
  tabActive:{color:accent}, tabLabel:{fontSize:10.5,letterSpacing:0.5,fontWeight:600},
  empty:{textAlign:"center",padding:"60px 20px"}, emptyGlyph:{fontSize:40,color:accent,marginBottom:12},
  emptyTitle:{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginBottom:8},
  emptyBody:{fontSize:13,lineHeight:1.6,color:"rgba(255,255,255,0.55)",maxWidth:360,margin:"0 auto"},
  overlay:{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"},
  modal:{width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",background:"linear-gradient(180deg,#1a212b,#11161d)",borderTop:"1px solid rgba(255,255,255,0.1)",borderRadius:"20px 20px 0 0",padding:20,boxShadow:"0 -20px 60px rgba(0,0,0,0.6)"},
  modalHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},
  modalTitle:{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff"},
  closeBtn:{background:"rgba(255,255,255,0.06)",border:"none",color:"#fff",width:32,height:32,borderRadius:8,fontSize:14,cursor:"pointer"},
  lbl:{display:"block",fontSize:10.5,letterSpacing:1,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",margin:"12px 0 6px"},
  input:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:"10px 12px",color:"#fff",fontSize:13.5,outline:"none"},
  textarea:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:"10px 12px",color:"#fff",fontSize:13.5,outline:"none",resize:"vertical",lineHeight:1.5},
  choiceEditRow:{display:"flex",alignItems:"center",gap:9,marginBottom:8},
  radio:{flexShrink:0,width:30,height:30,borderRadius:8,border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.6)",fontWeight:700,fontSize:12,cursor:"pointer"},
  radioOn:{background:"#5fd38a",borderColor:"#5fd38a",color:"#08130c"},
  cancelBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",color:"#e9e6df",borderRadius:10,padding:"12px 20px",fontSize:13,cursor:"pointer"},
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
