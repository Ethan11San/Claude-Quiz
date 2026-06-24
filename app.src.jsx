const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ════════════════════════════════════════════════════════════
//  PART 61 · PRIVATE PILOT + INSTRUMENT — Pocket Checkride (standalone)
//  Runs anywhere. Persists in localStorage. Regenerate uses YOUR
//  Anthropic API key (set it via the gear icon → Settings).
// ════════════════════════════════════════════════════════════

const STORE_KEY = "part61ppl:v2";
const SETTINGS_KEY = "part61ppl:settings";
const MASTERY_BOX = 3; // Leitner box at/above which a question counts as "mastered"

const regUrl = (sec, quote) => {
  const base = `https://www.ecfr.gov/current/title-14/section-${sec}`;
  return quote ? `${base}#:~:text=${encodeURIComponent(quote)}` : base;
};

const SECTIONS = {
  ppl: { key:"ppl", label:"Private Pilot", short:"PPL", reg:"Part 61 PPL" },
  ir:  { key:"ir",  label:"Instrument Rating", short:"IR", reg:"Part 61 IR" },
};

const INSTRUMENT_BASE = [
  { id:"i01", reg:"61.65", topic:"Eligibility", q:"To be eligible for an instrument-airplane rating, you must hold at least:",
    choices:["A student pilot certificate","A private pilot certificate with an airplane category rating","A commercial pilot certificate","A sport pilot certificate"], answer:1,
    explain:"§61.65(a)(1): must hold at least a private pilot certificate with an airplane category and single-engine class rating (for instrument-airplane).", quote:"private pilot certificate" },
  { id:"i02", reg:"61.65", topic:"Knowledge", q:"Before taking the instrument rating knowledge test, the applicant must have:",
    choices:["A first-class medical","50 hours PIC time","Received and logged ground training or completed a home-study course","Passed the practical test"], answer:2,
    explain:"§61.65(a)(2): received and logged ground training from an authorized instructor or completed a home-study course.", quote:"home-study course" },
  { id:"i03", reg:"61.65", topic:"Knowledge", q:"Which is NOT a required area of aeronautical knowledge for the instrument rating under §61.65(b)?",
    choices:["IFR navigation and approaches by use of navigation systems","Use of IFR en route and instrument approach procedure charts","Formation flight procedures","IFR air traffic control system and procedures"], answer:2,
    explain:"§61.65(b) lists required knowledge areas; formation flight is not among them.", quote:"aeronautical knowledge" },
  { id:"i04", reg:"61.65", topic:"Hours · XC PIC", q:"Minimum cross-country PIC flight time required for the instrument-airplane rating?",
    choices:["25 hours","40 hours","50 hours","100 hours"], answer:2,
    explain:"§61.65(d)(1): 50 hours of cross-country flight time as pilot in command.", quote:"50 hours of cross-country flight time" },
  { id:"i05", reg:"61.65", topic:"Hours · Instrument", q:"Minimum hours of instrument training from an authorized instructor (CFII)?",
    choices:["10 hours","15 hours","20 hours","40 hours"], answer:1,
    explain:"§61.65(d)(2)(i): 15 hours of instrument flight training from an authorized instructor in the instrument-airplane area of operation.", quote:"15 hours of instrument flight training" },
  { id:"i06", reg:"61.65", topic:"Hours · Instrument", q:"Total actual or simulated instrument time required for the instrument rating?",
    choices:["20 hours","30 hours","40 hours","50 hours"], answer:2,
    explain:"§61.65(d)(2): 40 hours of actual or simulated instrument time.", quote:"40 hours of actual or simulated instrument time" },
  { id:"i07", reg:"61.65", topic:"Hours · Test Prep", q:"The instrument training in preparation for the practical test must be received within:",
    choices:["30 days before the test","2 calendar months before the test","90 days before the test","6 months before the test"], answer:1,
    explain:"§61.65(d)(2)(ii): 3 hours of instrument flight training within the 2 calendar months preceding the practical test.", quote:"2 calendar months" },
  { id:"i08", reg:"61.65", topic:"Hours · Test Prep", q:"How many hours of instrument test-prep flight training are required in the 2 months before the practical test?",
    choices:["1 hour","2 hours","3 hours","5 hours"], answer:2,
    explain:"§61.65(d)(2)(ii): 3 hours of instrument flight training appropriate to the instrument-airplane rating.", quote:"3 hours of instrument flight training" },
  { id:"i09", reg:"61.65", topic:"XC · IFR", q:"The instrument cross-country flight must total at least:",
    choices:["100 NM","150 NM","200 NM","250 NM"], answer:3,
    explain:"§61.65(d)(2)(ii)(C): one cross-country flight of at least 250 nautical miles along airways or ATC-directed routing.", quote:"250 nautical miles" },
  { id:"i10", reg:"61.65", topic:"XC · IFR", q:"On the instrument cross-country, how many different kinds of instrument approaches must be performed?",
    choices:["One","Two","Three","Four"], answer:2,
    explain:"§61.65(d)(2)(ii)(C): must include an instrument approach at each airport, with three different kinds of approaches.", quote:"three different kinds of approaches" },
  { id:"i11", reg:"61.65", topic:"XC · IFR", q:"The instrument cross-country must be filed and flown under:",
    choices:["VFR flight plan","IFR flight plan","DVFR flight plan","No flight plan required"], answer:1,
    explain:"§61.65(d)(2)(ii)(C): one cross-country flight under IFR along airways or ATC-directed routing.", quote:"IFR flight plan" },
  { id:"i12", reg:"61.65", topic:"Proficiency", q:"The areas of operation for the instrument-airplane practical test include all EXCEPT:",
    choices:["IFR en route flight","Precision and nonprecision approaches","Recovery from unusual attitudes","Formation instrument flying"], answer:3,
    explain:"§61.65(c) lists areas of operation; formation instrument flying is not among them.", quote:"areas of operation" },
  { id:"i13", reg:"61.65", topic:"Sim/ATD", q:"Instrument training time may be logged in which of the following?",
    choices:["Only actual aircraft","Aircraft, flight simulator, or flight training device","Only full-motion simulators","Only approved ATDs"], answer:1,
    explain:"§61.65(i): instrument time may be logged in an aircraft, flight simulator, or flight training device.", quote:"flight simulator" },
  { id:"i14", reg:"61.57", topic:"Currency", q:"To act as PIC under IFR, within the preceding 6 calendar months you must have performed and logged at least:",
    choices:["3 instrument approaches","6 instrument approaches, holding, and intercepting/tracking courses","10 instrument approaches","1 IFR cross-country"], answer:1,
    explain:"§61.57(c)(1): within the preceding 6 calendar months — 6 instrument approaches, holding procedures and tasks, and intercepting and tracking courses through the use of navigational electronic systems.", quote:"6 instrument approaches" },
  { id:"i15", reg:"61.57", topic:"Currency", q:"If your instrument currency lapses (beyond 6 months but within 12), you can regain it by:",
    choices:["Filing an IFR flight plan","Completing an instrument proficiency check","Performing the tasks in §61.57(c) with a safety pilot or in an approved simulator","Taking the written test again"], answer:2,
    explain:"§61.57(c)(2): if more than 6 calendar months have elapsed, you may use the preceding 6 months to meet the requirements with a safety pilot, CFII, or approved device.", quote:"safety pilot" },
  { id:"i16", reg:"61.57", topic:"Currency", q:"If your instrument currency lapses beyond 12 calendar months, you must:",
    choices:["Retake the knowledge test","Pass an instrument proficiency check (IPC)","Log 10 hours of simulated instrument","Obtain a new instrument rating"], answer:1,
    explain:"§61.57(d): if more than 12 calendar months have elapsed, must pass an instrument proficiency check in the category, class, or type of aircraft.", quote:"instrument proficiency check" },
  { id:"i17", reg:"61.65", topic:"Knowledge", q:"Which is a required knowledge area under §61.65(b) for the instrument rating?",
    choices:["Aerobatic flight techniques","Procurement and use of aviation weather reports and forecasts","Formation flight procedures","Agricultural operations"], answer:1,
    explain:"§61.65(b) requires knowledge of procurement and use of aviation weather reports and forecasts, and the elements of forecasting weather trends.", quote:"aviation weather reports and forecasts" },
  { id:"i18", reg:"61.65", topic:"Proficiency", q:"Which of the following is an area of operation required for instrument-airplane proficiency?",
    choices:["Chandelles and lazy eights","Postflight procedures","Water operations","Spin recovery"], answer:1,
    explain:"§61.65(c) includes postflight procedures among the required areas of operation for the instrument rating.", quote:"Postflight procedures" },
  { id:"i19", reg:"61.3", topic:"Certificates", q:"To act as PIC of an aircraft under IFR, the pilot must hold:",
    choices:["Only a private pilot certificate","A private pilot certificate and an instrument rating for the category of aircraft","A commercial pilot certificate","An ATP certificate"], answer:1,
    explain:"§61.3(e): no person may act as PIC under IFR unless that person holds an instrument rating on their pilot certificate for the appropriate category.", quote:"instrument rating" },
  { id:"i20", reg:"61.65", topic:"XC · PIC", q:"The 50 hours of PIC cross-country time must be in what position?",
    choices:["Safety pilot","Second in command","Pilot in command","Dual received"], answer:2,
    explain:"§61.65(d)(1): 50 hours of cross-country flight time as pilot in command, of which at least 10 hours must be in airplanes.", quote:"pilot in command" },
  { id:"i21", reg:"61.65", topic:"XC · PIC", q:"Of the 50 hours PIC cross-country, how many must be in airplanes (for instrument-airplane)?",
    choices:["5 hours","10 hours","25 hours","50 hours"], answer:1,
    explain:"§61.65(d)(1): at least 10 hours of the 50 PIC cross-country hours must be in airplanes.", quote:"10 hours must be in airplanes" },
  { id:"i22", reg:"61.57", topic:"Currency", q:"The instrument currency tasks in §61.57(c) include all of the following EXCEPT:",
    choices:["Holding procedures","Intercepting and tracking courses","Six instrument approaches","Three takeoffs and landings"], answer:3,
    explain:"§61.57(c)(1) requires 6 approaches, holding procedures, and intercepting/tracking courses — takeoffs and landings are a VFR currency item.", quote:"holding procedures and tasks" },
  { id:"i23", reg:"61.65", topic:"Knowledge", q:"The instrument knowledge test must include knowledge of the safe and efficient operation of aircraft under:",
    choices:["VFR conditions only","IFR conditions","Night VFR conditions","Day VFR conditions"], answer:1,
    explain:"§61.65(a)(2): aeronautical knowledge for the safe and efficient operation of aircraft under instrument flight rules and conditions.", quote:"instrument flight rules" },
  { id:"i24", reg:"61.65", topic:"Sim/ATD", q:"A maximum of how many hours of instrument training may be performed in an approved ATD toward the rating?",
    choices:["5 hours","10 hours","20 hours","All 40 hours"], answer:1,
    explain:"§61.65(i): credit for training in an ATD is limited — no more than 10 hours of training in an ATD may be credited.", quote:"aviation training device" },
  { id:"i25", reg:"61.65", topic:"XC · IFR", q:"On the required IFR cross-country, the flight must be along:",
    choices:["Any route chosen by the pilot","Airways or ATC-directed routing","Only victor airways","Only GPS direct routes"], answer:1,
    explain:"§61.65(d)(2)(ii)(C): along airways or by directed routing from an ATC facility.", quote:"airways or by directed routing" },
];

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

  { id:"b26", reg:"61.56", topic:"Flight Review", q:"How often must a pilot complete a flight review to act as PIC?",
    choices:["Every 12 calendar months","Every 24 calendar months","Every 36 calendar months","Only once, before the checkride"], answer:1,
    explain:"§61.56(c): no person may act as PIC unless, within the preceding 24 calendar months, they completed a flight review and received a logbook endorsement.", quote:"24 calendar months" },
  { id:"b27", reg:"61.56", topic:"Flight Review", q:"A flight review must consist of a minimum of:",
    choices:["1 hour of flight training and 1 hour of ground training","2 hours of flight training","3 takeoffs and landings","A knowledge test"], answer:0,
    explain:"§61.56(a): a minimum of 1 hour of flight training and 1 hour of ground training.", quote:"1 hour of flight training and 1 hour of ground training" },
  { id:"b28", reg:"61.31", topic:"Endorsements", q:"A high-performance airplane, requiring a one-time endorsement, is one with an engine of:",
    choices:["More than 180 horsepower","More than 200 horsepower","More than 230 horsepower","Retractable landing gear"], answer:1,
    explain:"§61.31(f): a high-performance airplane has an engine of more than 200 horsepower and requires a one-time endorsement.", quote:"more than 200 horsepower" },
  { id:"b29", reg:"61.31", topic:"Endorsements", q:"A complex airplane is defined as one having:",
    choices:["More than 200 horsepower","Retractable landing gear, flaps, and a controllable pitch propeller","A constant-speed propeller only","Two engines"], answer:1,
    explain:"§61.31(e): a complex airplane has retractable landing gear, flaps, and a controllable pitch propeller (seaplanes: flaps and a controllable pitch propeller).", quote:"retractable landing gear, flaps, and a controllable pitch propeller" },
  { id:"b30", reg:"61.23", topic:"Medical", q:"For a pilot under age 40 at the exam, a third-class medical certificate is valid for:",
    choices:["12 calendar months","24 calendar months","48 calendar months","60 calendar months"], answer:3,
    explain:"§61.23(d): a third-class medical for a person who has not reached age 40 on the date of the exam is valid for 60 calendar months.", quote:"60 calendar months" },
  { id:"b31", reg:"61.23", topic:"Medical", q:"For a pilot age 40 or older at the exam, a third-class medical certificate is valid for:",
    choices:["12 calendar months","24 calendar months","36 calendar months","60 calendar months"], answer:1,
    explain:"§61.23(d): for a person who has reached age 40, the third-class medical is valid for 24 calendar months.", quote:"24 calendar months" },
  { id:"b32", reg:"61.60", topic:"Change of Address", q:"After a permanent change of mailing address, a certificate holder may not exercise certificate privileges after how long without notifying the FAA?",
    choices:["10 days","30 days","60 days","90 days"], answer:1,
    explain:"§61.60: a certificate holder who changes permanent mailing address may not exercise certificate privileges after 30 days unless they notified the FAA in writing.", quote:"30 days" },
  { id:"b33", reg:"61.51", topic:"Logging", q:"Under §61.51, a pilot is required to log which flight time?",
    choices:["Every flight ever flown","Only time used to meet certificate, rating, or recent-experience requirements","Only night flights","Only solo flights"], answer:1,
    explain:"§61.51(a): each person must document the training and aeronautical experience used to meet requirements for a certificate, rating, or flight review, plus recent flight experience.", quote:"aeronautical experience used to meet" },
  { id:"b34", reg:"61.15", topic:"Drug & Alcohol", q:"After a motor-vehicle action for drugs or alcohol, a pilot must send a written report to the FAA within:",
    choices:["24 hours","30 days","60 days","6 months"], answer:2,
    explain:"§61.15(e): a written report of the motor vehicle action must reach the FAA Civil Aviation Registry not later than 60 days after the action.", quote:"60 days" },
];

// ── localStorage persistence ────────────────────────────────
const DEFAULT_STATE = { saved:[], deleted:[], edits:{}, generated:[], stats:{}, streak:{ last:null, count:0 } };
function loadState(){
  try { const r = localStorage.getItem(STORE_KEY); if (r) return { ...DEFAULT_STATE, ...JSON.parse(r) }; } catch(e){}
  return { ...DEFAULT_STATE };
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

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const haptic = (ok) => { try { if (navigator.vibrate) navigator.vibrate(ok ? 14 : [12,40,12]); } catch(_){} };

function updateStreak(streak){
  const s = streak || { last:null, count:0 };
  const today = ymd(new Date());
  if (s.last === today) return s;
  const yest = ymd(new Date(Date.now() - 86400000));
  return { last: today, count: s.last === yest ? (s.count||0)+1 : 1 };
}

// Spaced-repetition ordering: unseen first, then lowest Leitner box, random tiebreak.
const duePriority = (s) => (!s || !s.seen) ? -1 : (s.box||0);

function buildSession(questions, stats, { mode, topic, length }){
  let pool = (topic && topic !== "__all") ? questions.filter((q)=>q.topic===topic) : [...questions];
  if (mode === "missed") pool = pool.filter((q)=>{ const s=stats[q.id]; return s && s.wrong>0; });
  if (mode === "smart"){
    pool = shuffle(pool).map((q)=>({ q, k:duePriority(stats[q.id]) }))
                        .sort((a,b)=>a.k-b.k).map((x)=>x.q);
  } else {
    pool = shuffle(pool);
  }
  if (length && length>0 && length<pool.length) pool = pool.slice(0, length);
  return pool;
}

function computeStats(questions, stats){
  let attempted=0, correct=0, wrong=0, mastered=0, due=0;
  const byTopic = {};
  for (const q of questions){
    const s = stats[q.id];
    const t = byTopic[q.topic] || (byTopic[q.topic] = { correct:0, wrong:0, seen:0, total:0, mastered:0 });
    t.total++;
    if (s && s.seen){
      attempted++; correct+=s.correct; wrong+=s.wrong; t.correct+=s.correct; t.wrong+=s.wrong; t.seen++;
      if ((s.box||0) >= MASTERY_BOX){ mastered++; t.mastered++; } else due++;
    } else { due++; }
  }
  const ans = correct + wrong;
  return { attempted, correct, wrong, mastered, due, acc: ans>0 ? Math.round(correct/ans*100) : 0, total:questions.length, byTopic };
}

const MODES = {
  smart:  { label:"Smart Review", icon:"◎", desc:"Weak & new questions first" },
  all:    { label:"Practice",     icon:"✈", desc:"Every question, shuffled" },
  missed: { label:"Missed Only",  icon:"✕", desc:"Questions you've gotten wrong" },
  exam:   { label:"Exam",         icon:"▤", desc:"FAA-style, score at the end" },
};

function App(){
  const [tab, setTab] = useState("quiz");
  const [section, setSection] = useState("ppl");
  const [state, setState] = useState(() => loadState());
  const [settings, setSettings] = useState(() => loadSettings());
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [quizSession, setQuizSession] = useState(null);

  const persist = useCallback((updater) => {
    setState((prev) => { const next = typeof updater==="function"?updater(prev):updater; saveState(next); return next; });
  }, []);
  const persistSettings = (s) => { setSettings(s); saveSettings(s); };

  const basePool = section === "ir" ? INSTRUMENT_BASE : BASE;

  const questions = useMemo(() => {
    const all = [...basePool, ...state.generated.filter((g) => {
      if (section === "ir") return g.id.startsWith("gen-ir-");
      return !g.id.startsWith("gen-ir-");
    })];
    return all.filter((q)=>!state.deleted.includes(q.id)).map((q)=> state.edits[q.id]?{...q,...state.edits[q.id]}:q);
  }, [state, basePool, section]);

  const savedQuestions = questions.filter((q)=>state.saved.includes(q.id));
  const sec = SECTIONS[section];

  const recordAnswer = useCallback((id, correct) => {
    persist((p) => {
      const prev = p.stats[id] || { seen:0, correct:0, wrong:0, box:0, lastResult:null, lastTs:0 };
      const box = correct ? Math.min((prev.box||0)+1, 5) : 0;
      const stat = {
        seen: prev.seen+1, correct: prev.correct+(correct?1:0), wrong: prev.wrong+(correct?0:1),
        box, lastResult: correct?1:0, lastTs: Date.now(),
      };
      return { ...p, stats: { ...p.stats, [id]: stat }, streak: updateStreak(p.streak) };
    });
  }, [persist]);

  const startQuiz = useCallback((config) => {
    const pool = buildSession(questions, state.stats, config);
    setQuizSession({ config, pool, instant: config.instant !== false,
      label: `${sec.short} · ${MODES[config.mode]?.label||"Quiz"}${config.topic && config.topic!=="__all" ? " · "+config.topic : ""}` });
    setTab("quiz");
  }, [questions, state.stats, sec]);

  const restartQuiz = useCallback(() => {
    setQuizSession((s)=> s ? { ...s, pool: buildSession(questions, state.stats, s.config) } : s);
  }, [questions, state.stats]);

  const resetProgress = useCallback(() => {
    persist((p)=>({ ...p, stats:{}, streak:{ last:null, count:0 } }));
  }, [persist]);

  const importData = useCallback((obj) => {
    persist(() => ({ ...DEFAULT_STATE, ...obj }));
  }, [persist]);

  const switchSection = (key) => { setSection(key); setTab("quiz"); setQuizSession(null); };

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <header style={S.header}>
        <div style={S.brand}><span style={S.brandDot} /><span style={S.brandText}>POCKET CHECKRIDE</span></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={S.brandSub}>{sec.reg.toUpperCase()}</span>
          <button style={S.gear} onClick={()=>setShowSettings(true)} title="Settings">⚙</button>
        </div>
      </header>

      <div style={S.sectionBar}>
        {Object.values(SECTIONS).map((s) => (
          <button key={s.key} style={{...S.sectionBtn,...(section===s.key?S.sectionBtnActive:{})}}
            onClick={()=>switchSection(s.key)}>{s.label}</button>
        ))}
      </div>

      <main style={S.main}>
        {tab==="quiz" && (quizSession
          ? <Quiz pool={quizSession.pool} scopeLabel={quizSession.label} instant={quizSession.instant} preserveOrder
              onAnswer={recordAnswer} onRestart={restartQuiz} onExit={()=>setQuizSession(null)} />
          : <QuizHome questions={questions} stats={state.stats} streak={state.streak} sec={sec} onStart={startQuiz} />)}
        {tab==="saved" && (savedQuestions.length
          ? <Quiz pool={savedQuestions} scopeLabel={`${sec.short} · Saved questions`} instant onAnswer={recordAnswer} />
          : <Empty glyph="★" title="No saved questions yet" body="Tap the star on any question in the Library to build a focused study set, then drill it here." />)}
        {tab==="stats" && <Stats questions={questions} stats={state.stats} streak={state.streak} sec={sec} onDrill={startQuiz} onReset={resetProgress} />}
        {tab==="library" && <Library questions={questions} state={state} persist={persist} onEdit={setEditing} settings={settings} openSettings={()=>setShowSettings(true)} section={section} />}
      </main>

      <nav style={S.tabbar}>
        <TabBtn active={tab==="quiz"} onClick={()=>setTab("quiz")} icon="✈" label="Quiz" />
        <TabBtn active={tab==="saved"} onClick={()=>setTab("saved")} icon="★" label={`Saved${savedQuestions.length?` ${savedQuestions.length}`:""}`} />
        <TabBtn active={tab==="stats"} onClick={()=>setTab("stats")} icon="◷" label="Stats" />
        <TabBtn active={tab==="library"} onClick={()=>setTab("library")} icon="≡" label="Library" />
      </nav>

      {editing && <EditModal question={editing} onClose={()=>setEditing(null)}
        onSave={(patch)=>{ persist((p)=>({...p, edits:{...p.edits,[editing.id]:{...p.edits[editing.id],...patch}}})); setEditing(null); }} />}

      {showSettings && <SettingsModal settings={settings} state={state} onSave={(s)=>{persistSettings(s); setShowSettings(false);}} onClose={()=>setShowSettings(false)} onImport={importData} />}
    </div>
  );
}

function RegLink({ reg, quote, style }){
  return (<a href={regUrl(reg,quote)} target="_blank" rel="noopener noreferrer" className="reglink" style={style}
    onClick={(e)=>e.stopPropagation()} title={quote?`Jump to: "${quote}"`:`Open §${reg}`}>§{reg} ↗</a>);
}

function QuizHome({ questions, stats, streak, sec, onStart }){
  const topics = useMemo(()=>Array.from(new Set(questions.map((q)=>q.topic))).sort(), [questions]);
  const summary = useMemo(()=>computeStats(questions, stats), [questions, stats]);
  const missedCount = useMemo(()=>questions.filter((q)=>{ const s=stats[q.id]; return s && s.wrong>0; }).length, [questions, stats]);

  const [mode, setMode] = useState("smart");
  const [topic, setTopic] = useState("__all");
  const [length, setLength] = useState(10);

  const previewCount = useMemo(()=>buildSession(questions, stats, { mode, topic, length:0 }).length, [questions, stats, mode, topic]);
  const planned = length>0 ? Math.min(length, previewCount) : previewCount;

  const pickMode = (m) => { setMode(m); if (m==="exam" && length>0 && length<20) setLength(20); };

  const modeDesc = (m) => {
    if (m==="smart") return `Weak & new first · ${summary.due} to review`;
    if (m==="all") return `Every question, shuffled · ${summary.total}`;
    if (m==="missed") return missedCount ? `${missedCount} you've missed` : "Nothing missed yet";
    return "FAA-style · no feedback until the end";
  };

  return (
    <div className="fade">
      <div style={S.homeStrip}>
        <HomeStat value={`${streak.count||0}`} label={streak.count===1?"day streak":"day streak"} accent="#f0a44c" glyph="🔥" />
        <HomeStat value={`${summary.acc}%`} label="accuracy" accent="#7fd1f0" />
        <HomeStat value={`${summary.mastered}/${summary.total}`} label="mastered" accent="#5fd38a" />
      </div>

      <div style={S.homeHeading}>Start a session</div>
      <div style={S.modeGrid}>
        {Object.keys(MODES).map((m)=>{
          const disabled = m==="missed" && missedCount===0;
          const active = mode===m;
          return (
            <button key={m} disabled={disabled}
              style={{...S.modeCard,...(active?S.modeCardActive:{}),...(disabled?S.modeCardDisabled:{})}}
              onClick={()=>!disabled && pickMode(m)}>
              <span style={{...S.modeIcon,...(active?{color:"#f0a44c"}:{})}}>{MODES[m].icon}</span>
              <span style={S.modeTitle}>{MODES[m].label}</span>
              <span style={S.modeDesc}>{modeDesc(m)}</span>
            </button>
          );
        })}
      </div>

      <label style={S.lbl}>Topic</label>
      <select style={S.select} value={topic} onChange={(e)=>setTopic(e.target.value)}>
        <option value="__all">All topics</option>
        {topics.map((t)=><option key={t} value={t}>{t}</option>)}
      </select>

      <label style={S.lbl}>Length</label>
      <div style={S.segRow}>
        {[10,20,0].map((n)=>(
          <button key={n} style={{...S.segBtn,...(length===n?S.segBtnActive:{})}} onClick={()=>setLength(n)}>
            {n===0?"All":n}
          </button>
        ))}
      </div>

      <button style={{...S.primary,width:"100%",marginTop:18,padding:"14px",opacity:planned?1:0.5}}
        disabled={!planned}
        onClick={()=>onStart({ mode, topic, length, instant: mode!=="exam" })}>
        {mode==="exam"?"Begin exam":"Start"} · {planned} question{planned===1?"":"s"} →
      </button>
      <div style={S.homeHint}>
        {planned ? "Tip: on a keyboard, press 1–4 or A–D to answer, Enter for next." : "No questions match — pick another topic or mode."}
      </div>
    </div>
  );
}

function HomeStat({ value, label, accent, glyph }){
  return (
    <div style={S.homeStat}>
      <div style={{...S.homeStatValue,color:accent}}>{glyph?<span style={{fontSize:14,marginRight:4}}>{glyph}</span>:null}{value}</div>
      <div style={S.homeStatLabel}>{label}</div>
    </div>
  );
}

function Quiz({ pool, scopeLabel, instant=true, preserveOrder=false, onAnswer, onRestart, onExit }){
  const [order, setOrder] = useState(()=> preserveOrder ? [...pool] : shuffle(pool));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(()=>{ setOrder(preserveOrder?[...pool]:shuffle(pool)); setIdx(0); setPicked(null); setLocked(false); setScore(0); setLog([]); setDone(false); }, [pool]);

  const q = order[idx];

  const commit = useCallback((pick) => {
    const correct = pick===q.answer;
    if (correct) setScore((s)=>s+1);
    setLog((l)=>[...l, { q, picked:pick, correct }]);
    if (onAnswer) onAnswer(q.id, correct);
    haptic(correct);
    return correct;
  }, [q, onAnswer]);

  const choose = (i) => {
    if (instant){
      if (locked) return;
      setPicked(i); setLocked(true); commit(i);
    } else {
      setPicked(i); // exam: selectable until Next
    }
  };

  const next = () => {
    if (!instant){ if (picked==null) return; commit(picked); }
    if (idx+1>=order.length) setDone(true);
    else { setIdx((n)=>n+1); setPicked(null); setLocked(false); }
  };

  const restart = () => {
    if (onRestart){ onRestart(); return; }
    setOrder(shuffle(pool)); setIdx(0); setPicked(null); setLocked(false); setScore(0); setLog([]); setDone(false);
  };

  // Keyboard support
  useEffect(()=>{
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (done){ if (e.key==="Enter" || e.key.toLowerCase()==="r") restart(); return; }
      if (!q) return;
      const num = "123456".indexOf(e.key);
      if (num>=0 && num<q.choices.length){ choose(num); return; }
      const alpha = "abcdef".indexOf(e.key.toLowerCase());
      if (alpha>=0 && alpha<q.choices.length){ choose(alpha); return; }
      if (e.key==="Enter" || e.key==="ArrowRight"){
        if ((instant && locked) || (!instant && picked!=null)){ e.preventDefault(); next(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, [q, idx, order, locked, picked, done, instant]);

  if (!order.length) return null;

  if (done){
    const pct = Math.round((score/order.length)*100); const pass = pct>=80;
    return (
      <div className="fade" style={S.results}>
        <Ring pct={pct} pass={pass} score={score} total={order.length} />
        <h2 style={S.resultTitle}>{pass?"Checkride Ready":"Keep Studying"}</h2>
        <p style={S.resultSub}>{pass?"Strong command of Part 61. Tap any reg below to jump to the highlighted source text.":"Close the gaps below — each link highlights the exact regulation."}</p>
        {instant ? (
          <div style={S.reviewList}>
            {log.map((a,i)=>(
              <div key={i} style={S.reviewRow}>
                <span style={{...S.reviewMark,color:a.correct?"#5fd38a":"#f0775c"}}>{a.correct?"✓":"✕"}</span>
                <RegLink reg={a.q.reg} quote={a.q.quote} style={S.reviewReg} />
                <span style={S.reviewTopic}>{a.q.topic}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={S.examReview}>
            {log.map((a,i)=>(
              <div key={i} style={S.examItem}>
                <div style={S.examItemHead}>
                  <span style={{...S.reviewMark,color:a.correct?"#5fd38a":"#f0775c"}}>{a.correct?"✓":"✕"}</span>
                  <RegLink reg={a.q.reg} quote={a.q.quote} style={S.regTagSm} />
                  <span style={S.examItemTopic}>{a.q.topic}</span>
                </div>
                <div style={S.examItemQ}>{a.q.q}</div>
                {a.q.choices.map((c,ci)=>{
                  const isAns=ci===a.q.answer, isPick=ci===a.picked;
                  const st = isAns ? S.examChoiceCorrect : (isPick ? S.examChoiceWrong : null);
                  return (<div key={ci} style={{...S.examChoice,...(st||{})}}>
                    <span style={S.examChoiceKey}>{String.fromCharCode(65+ci)}</span>{c}
                    {isAns&&<span style={{marginLeft:"auto",color:"#5fd38a"}}>✓</span>}
                    {isPick&&!isAns&&<span style={{marginLeft:"auto",color:"#f0775c"}}>✕</span>}
                  </div>);
                })}
                {a.q.explain && <div style={S.examItemExplain}>{a.q.explain}</div>}
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={S.primary} onClick={restart}>↻ Run It Again</button>
          {onExit && <button style={S.cancelBtn} onClick={onExit}>⟵ Change setup</button>}
        </div>
      </div>
    );
  }

  const progress = ((instant && locked ? idx+1 : idx) / order.length) * 100;

  return (
    <div>
      <div style={S.quizTop}>
        <span style={S.scope}>
          {onExit && <button style={S.backBtn} onClick={onExit} title="Back to setup">‹</button>}
          {scopeLabel}
        </span>
        <span style={S.counter}>{idx+1} / {order.length}</span>
      </div>
      <div style={S.track}><div style={{...S.fill,width:`${progress}%`}} /></div>
      <div className="fade" key={q.id} style={S.card}>
        <div style={S.cardHead}><span style={S.topicTag}>{q.topic}</span>{instant && <RegLink reg={q.reg} quote={q.quote} style={S.regTag} />}</div>
        <h2 style={S.question}>{q.q}</h2>
        <div style={S.choices}>
          {q.choices.map((c,i)=>{
            const isAns=i===q.answer, isPick=i===picked; let cls="choice";
            if (instant){
              if (locked&&isAns) cls+=" correct"; else if (locked&&isPick) cls+=" wrong"; else if (locked) cls+=" dim";
            } else if (isPick){ cls+=" sel"; }
            return (<button key={i} className={cls} disabled={instant&&locked} onClick={()=>choose(i)}>
              <span className="ckey">{String.fromCharCode(65+i)}</span><span style={{flex:1}}>{c}</span>
              {instant&&locked&&isAns&&<span className="cmark">✓</span>}{instant&&locked&&isPick&&!isAns&&<span className="cmark">✕</span>}
            </button>);
          })}
        </div>
        {!instant && (
          <button style={{...S.primary,marginTop:18,opacity:picked==null?0.5:1}} disabled={picked==null} onClick={next}>
            {idx+1>=order.length?"Finish exam →":"Next →"}
          </button>
        )}
        {instant && locked && (
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

function Stats({ questions, stats, streak, sec, onDrill, onReset }){
  const data = useMemo(()=>computeStats(questions, stats), [questions, stats]);
  const [confirmReset, setConfirmReset] = useState(false);
  const topics = useMemo(()=>{
    return Object.keys(data.byTopic).map((t)=>{
      const d = data.byTopic[t]; const ans = d.correct+d.wrong;
      return { topic:t, ...d, ans, acc: ans>0 ? Math.round(d.correct/ans*100) : null };
    }).sort((a,b)=>{
      if (a.acc==null && b.acc==null) return a.topic.localeCompare(b.topic);
      if (a.acc==null) return 1; if (b.acc==null) return -1;
      return a.acc - b.acc; // weakest first
    });
  }, [data]);

  const barColor = (acc) => acc==null ? "rgba(255,255,255,0.15)" : acc>=80 ? "#5fd38a" : acc>=60 ? "#f0a44c" : "#f0775c";

  if (data.attempted===0){
    return <Empty glyph="◷" title="No progress yet" body="Run a quiz and your accuracy, mastery, and weakest topics will show up here to guide your studying." />;
  }

  return (
    <div className="fade">
      <div style={S.statsHead}>Your Progress · {sec.short}</div>

      <div style={S.statCardRow}>
        <Ring pct={Math.round((data.mastered/data.total)*100)} pass={data.mastered/data.total>=0.8} score={data.mastered} total={data.total} small />
        <div style={S.statCol}>
          <StatLine value={`🔥 ${streak.count||0}`} label="day study streak" />
          <StatLine value={`${data.acc}%`} label={`overall accuracy · ${data.correct+data.wrong} answered`} />
          <StatLine value={`${data.attempted}/${data.total}`} label="questions attempted" />
        </div>
      </div>

      <div style={S.statsSubhead}>By topic — weakest first</div>
      {topics.map((t)=>(
        <div key={t.topic} style={S.topicRow}>
          <div style={S.topicTop}>
            <span style={S.topicName}>{t.topic}</span>
            <span style={{...S.topicAcc,color:barColor(t.acc)}}>{t.acc==null?"new":`${t.acc}%`}</span>
            <button style={S.drillBtn} onClick={()=>onDrill({ mode:"all", topic:t.topic, length:0, instant:true })}>Drill →</button>
          </div>
          <div style={S.topicBar}><div style={{...S.topicBarFill,width:`${t.acc==null?0:t.acc}%`,background:barColor(t.acc)}} /></div>
          <div style={S.topicMeta}>{t.seen}/{t.total} seen · {t.mastered} mastered</div>
        </div>
      ))}

      <div style={{marginTop:22,textAlign:"center"}}>
        {confirmReset ? (
          <div style={S.resetConfirm}>
            <span style={{fontSize:12.5,color:"#ffb8a8"}}>Erase all progress, mastery & streak?</span>
            <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"center"}}>
              <button style={{...S.actBtn,...S.actDanger,flex:"0 0 auto"}} onClick={()=>{ onReset(); setConfirmReset(false); }}>Yes, reset</button>
              <button style={{...S.actBtn,flex:"0 0 auto"}} onClick={()=>setConfirmReset(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button style={S.resetLink} onClick={()=>setConfirmReset(true)}>Reset progress</button>
        )}
      </div>
    </div>
  );
}

function StatLine({ value, label }){
  return (<div style={S.statLine}><span style={S.statLineValue}>{value}</span><span style={S.statLineLabel}>{label}</span></div>);
}

function Library({ questions, state, persist, onEdit, settings, openSettings, section }){
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
      const certLabel = section === "ir" ? "Instrument Rating — Airplane" : "Private Pilot — Airplane Single-Engine Land";
      const prompt =
        `Write ONE multiple-choice question testing knowledge of 14 CFR ${q.reg} (topic: ${q.topic}) `+
        `for the FAA ${certLabel} certificate. It must be factually accurate to the current regulation `+
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
    const prefix = section === "ir" ? "gen-ir-" : "gen-";
    const defaultReg = section === "ir" ? "61.65" : "61.109";
    const blank = { id:prefix+Date.now(), reg:defaultReg, topic:"Custom", q:"New question — tap edit to write it.",
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
        const st=state.stats[q.id]; const mastered = st && (st.box||0)>=MASTERY_BOX;
        return (
          <div key={q.id} style={S.libCard}>
            <div style={S.libCardTop}><RegLink reg={q.reg} quote={q.quote} style={S.regTagSm} />
              <span style={S.libTopic}>{q.topic}</span>
              {mastered&&<span style={S.masteredBadge}>mastered</span>}
              {edited&&<span style={S.editedBadge}>edited</span>}</div>
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
            const q=[...BASE,...INSTRUMENT_BASE,...state.generated].find((x)=>x.id===id); const merged=q&&state.edits[id]?{...q,...state.edits[id]}:q;
            return (<div key={id} style={S.deletedRow}><span style={S.deletedText}>{merged?merged.q:id}</span>
              <button style={S.restoreBtn} onClick={()=>restore(id)}>Restore</button></div>);
          })}
        </div>
      )}

      <div style={S.disclaimer}>
        Study aid only — verify against the current eCFR. Part 141 minimums differ.
        Reg links highlight exact text in Chrome, Edge &amp; Safari. Regenerated questions are AI-written; spot-check them.
        {section === "ir" && " Instrument section covers §61.65 requirements for ASEL instrument add-on."}
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

function SettingsModal({ settings, state, onSave, onClose, onImport }){
  const [apiKey,setApiKey]=useState(settings.apiKey||"");
  const [model,setModel]=useState(settings.model||"claude-haiku-4-5-20251001");
  const [msg,setMsg]=useState(null);
  const fileRef = useRef(null);

  const doExport = () => {
    try {
      const blob = new Blob([JSON.stringify(state,null,2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url; a.download="pocket-checkride-backup.json";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url); setMsg("Backup downloaded ✓");
    } catch(e){ setMsg("Export failed."); }
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || typeof obj!=="object" || !Array.isArray(obj.generated)) throw new Error("bad");
        onImport(obj); setMsg("Backup imported ✓ — your questions & progress are restored.");
      } catch(_){ setMsg("That file isn't a valid Pocket Checkride backup."); }
    };
    reader.readAsText(f); e.target.value="";
  };

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
          Get a key at console.anthropic.com → API Keys. Use any model your account has access to (e.g. claude-haiku-4-5).
          Don't publish this file with your key embedded — anyone could use it.
        </p>

        <label style={S.lbl}>Backup &amp; restore</label>
        <p style={{fontSize:11.5,lineHeight:1.55,color:"rgba(255,255,255,0.5)",margin:"0 0 8px"}}>
          Save your custom questions, edits, saved set, and study progress to a file — or move them to another device.
        </p>
        <div style={{display:"flex",gap:10}}>
          <button style={{...S.actBtn,flex:1}} onClick={doExport}>⭳ Export backup</button>
          <button style={{...S.actBtn,flex:1}} onClick={()=>fileRef.current&&fileRef.current.click()}>⭱ Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{display:"none"}} onChange={onFile} />
        </div>
        {msg && <div style={{...S.errBox,color:"#bfe6c8",background:"rgba(95,211,138,0.08)",borderColor:"rgba(95,211,138,0.3)",marginTop:10}}>{msg}</div>}

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
function Ring({ pct, pass, score, total, small }){
  const size = small ? 104 : 150; const r=68, c=2*Math.PI*r;
  return (<svg width={size} height={size} viewBox="0 0 160 160" style={{margin:small?"0":"0 auto 4px",display:"block",flexShrink:0}}>
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
.choice.sel{background:rgba(240,164,76,0.13);border-color:#f0a44c;color:#ffe9cf;}
.choice.dim{opacity:.42;}
.ckey{flex-shrink:0;width:25px;height:25px;border-radius:6px;display:grid;place-items:center;font-weight:700;font-size:12px;background:rgba(255,255,255,0.07);color:#f0a44c;}
.correct .ckey{background:#5fd38a;color:#08130c;} .wrong .ckey{background:#f0775c;color:#1a0805;} .sel .ckey{background:#f0a44c;color:#1a0e02;}
.cmark{font-weight:700;font-size:15px;}
textarea,input,button,select{font-family:'JetBrains Mono',monospace;}
select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f0a44c' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 12px center;}
::-webkit-scrollbar{width:8px;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:8px;}
`;

const accent = "#f0a44c";
const cardBg = "linear-gradient(180deg,#161c24,#11161d)";
const S = {
  app:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"radial-gradient(1000px 500px at 50% -10%, #1c2530 0%, #0d1117 55%, #080a0e 100%)",fontFamily:"'JetBrains Mono', monospace",color:"#e9e6df"},
  header:{position:"sticky",top:0,zIndex:5,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(13,17,23,0.85)",backdropFilter:"blur(10px)"},
  brand:{display:"flex",alignItems:"center",gap:9},
  brandDot:{width:8,height:8,borderRadius:"50%",background:"#5fd38a",boxShadow:"0 0 10px #5fd38a"},
  brandText:{fontWeight:700,fontSize:13,letterSpacing:1.5},
  brandSub:{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.35)"},
  gear:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e9e6df",width:32,height:32,borderRadius:8,fontSize:15,cursor:"pointer"},
  sectionBar:{display:"flex",justifyContent:"center",gap:6,padding:"10px 16px 0",maxWidth:600,width:"100%",margin:"0 auto"},
  sectionBtn:{flex:"1 1 auto",maxWidth:180,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:600,letterSpacing:0.5,color:"rgba(255,255,255,0.5)",cursor:"pointer",transition:"all .15s ease"},
  sectionBtnActive:{background:"rgba(240,164,76,0.15)",borderColor:accent,color:accent},
  main:{flex:1,maxWidth:600,width:"100%",margin:"0 auto",padding:"18px 16px 96px"},

  quizTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:10},
  scope:{fontSize:11,letterSpacing:1,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",display:"flex",alignItems:"center",gap:8,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  backBtn:{flexShrink:0,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e9e6df",width:24,height:24,borderRadius:7,fontSize:16,lineHeight:1,cursor:"pointer",display:"grid",placeItems:"center",padding:0},
  counter:{fontSize:12,color:"rgba(255,255,255,0.45)",flexShrink:0},
  track:{height:4,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden",marginBottom:20},
  fill:{height:"100%",background:`linear-gradient(90deg,#e08a2e,${accent})`,borderRadius:4,transition:"width .4s ease"},
  card:{background:cardBg,border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.4)"},
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
  reviewMark:{fontWeight:700,width:14,flexShrink:0}, reviewReg:{minWidth:74,fontSize:12}, reviewTopic:{fontSize:12,color:"rgba(255,255,255,0.55)"},

  examReview:{display:"flex",flexDirection:"column",gap:12,textAlign:"left",margin:"0 auto 20px",maxWidth:520},
  examItem:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:14},
  examItemHead:{display:"flex",alignItems:"center",gap:9,marginBottom:8},
  examItemTopic:{fontSize:10.5,letterSpacing:1,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginLeft:"auto"},
  examItemQ:{fontSize:14,lineHeight:1.45,color:"#fff",marginBottom:10,fontWeight:500},
  examChoice:{display:"flex",alignItems:"center",gap:9,fontSize:12.5,padding:"7px 10px",background:"rgba(255,255,255,0.02)",borderRadius:7,border:"1px solid transparent",color:"rgba(255,255,255,0.65)",marginBottom:5},
  examChoiceCorrect:{background:"rgba(95,211,138,0.1)",border:"1px solid rgba(95,211,138,0.35)",color:"#d8f5e3"},
  examChoiceWrong:{background:"rgba(240,119,92,0.1)",border:"1px solid rgba(240,119,92,0.35)",color:"#ffded5"},
  examChoiceKey:{width:18,height:18,borderRadius:5,display:"grid",placeItems:"center",fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.07)",color:accent,flexShrink:0},
  examItemExplain:{fontSize:12,lineHeight:1.6,color:"rgba(255,255,255,0.65)",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)"},

  homeStrip:{display:"flex",gap:10,marginBottom:20},
  homeStat:{flex:1,background:cardBg,border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 10px",textAlign:"center"},
  homeStatValue:{fontSize:21,fontWeight:700,fontFamily:"'Playfair Display',Georgia,serif"},
  homeStatLabel:{fontSize:10,letterSpacing:1,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginTop:3},
  homeHeading:{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#fff",marginBottom:12},
  modeGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:6},
  modeCard:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,textAlign:"left",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:14,padding:"13px 14px",cursor:"pointer",color:"#e9e6df",transition:"all .15s ease"},
  modeCardActive:{background:"rgba(240,164,76,0.12)",borderColor:accent,boxShadow:"0 6px 18px rgba(240,164,76,0.15)"},
  modeCardDisabled:{opacity:0.4,cursor:"default"},
  modeIcon:{fontSize:17,color:"rgba(255,255,255,0.7)"},
  modeTitle:{fontSize:13.5,fontWeight:700},
  modeDesc:{fontSize:10.5,lineHeight:1.4,color:"rgba(255,255,255,0.5)"},
  select:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:"11px 12px",color:"#fff",fontSize:13.5,outline:"none",cursor:"pointer"},
  segRow:{display:"flex",gap:8},
  segBtn:{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"10px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.55)",cursor:"pointer"},
  segBtnActive:{background:"rgba(240,164,76,0.15)",borderColor:accent,color:accent},
  homeHint:{fontSize:11,lineHeight:1.5,color:"rgba(255,255,255,0.35)",textAlign:"center",marginTop:12},

  statsHead:{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#fff",marginBottom:16},
  statCardRow:{display:"flex",alignItems:"center",gap:16,background:cardBg,border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:18},
  statCol:{flex:1,display:"flex",flexDirection:"column",gap:10,minWidth:0},
  statLine:{display:"flex",flexDirection:"column"},
  statLineValue:{fontSize:19,fontWeight:700,color:"#fff",fontFamily:"'Playfair Display',Georgia,serif"},
  statLineLabel:{fontSize:10.5,letterSpacing:0.5,color:"rgba(255,255,255,0.45)",marginTop:1},
  statsSubhead:{fontSize:11,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",margin:"4px 0 12px"},
  topicRow:{background:cardBg,border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",marginBottom:9},
  topicTop:{display:"flex",alignItems:"center",gap:10,marginBottom:8},
  topicName:{flex:1,fontSize:13,color:"#fff",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  topicAcc:{fontSize:13,fontWeight:700,flexShrink:0},
  drillBtn:{flexShrink:0,background:"rgba(240,164,76,0.12)",color:accent,border:"1px solid rgba(240,164,76,0.35)",borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer"},
  topicBar:{height:6,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden"},
  topicBarFill:{height:"100%",borderRadius:4,transition:"width .5s ease"},
  topicMeta:{fontSize:10.5,color:"rgba(255,255,255,0.4)",marginTop:7},
  resetConfirm:{background:"rgba(240,119,92,0.07)",border:"1px solid rgba(240,119,92,0.25)",borderRadius:12,padding:14,display:"inline-block"},
  resetLink:{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:12,cursor:"pointer",textDecoration:"underline",padding:"6px"},

  libHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},
  libTitle:{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#fff"},
  libCount:{fontSize:11.5,color:"rgba(255,255,255,0.4)",marginTop:2},
  ghostBtn:{background:"rgba(240,164,76,0.12)",color:accent,border:`1px solid rgba(240,164,76,0.4)`,borderRadius:9,padding:"9px 16px",fontWeight:700,fontSize:13,cursor:"pointer"},
  libCard:{background:cardBg,border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:13},
  libCardTop:{display:"flex",alignItems:"center",gap:10,marginBottom:9},
  libTopic:{fontSize:10.5,letterSpacing:1,color:"rgba(255,255,255,0.45)",textTransform:"uppercase"},
  editedBadge:{marginLeft:"auto",fontSize:9.5,letterSpacing:1,color:"#7fd1f0",border:"1px solid rgba(127,209,240,0.4)",borderRadius:5,padding:"2px 6px"},
  masteredBadge:{marginLeft:"auto",fontSize:9.5,letterSpacing:1,color:"#5fd38a",border:"1px solid rgba(95,211,138,0.4)",borderRadius:5,padding:"2px 6px"},
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
