// ============================================================
//  DELADE HELPERS — används av PrintModule, App och renderPreview
//  En enda källa för varje funktion, inga dubbletter.
// ============================================================

const fmt = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("en-US").format(Number(digits)) : "";
};
const num   = (value) => String(value || "").replace(/\D/g, "");
const esc   = (value) => String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const disp  = (v, f="—") => esc(v || f);
const sigHtml = (state, name, fontSize="9px") => {
  const data = state[`sig_${name}`];
  if (!data) return `<span style="color:#c4baa8;font-size:${fontSize};">لم يُوقَّع بعد</span>`;
  return `<img src="${data}" alt="signature">`;
};

function numToArabicWords(n) {
  if (!n || Number.isNaN(n)) return "";
  n = Math.floor(+n);
  if (n === 0) return "صفر";
  const ones=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  function below1000(x) {
    let o=""; const h=Math.floor(x/100), r=x%100;
    if(h) o+=hundreds[h];
    if(r){ if(o) o+=" و"; if(r<20) o+=ones[r]; else{const t=Math.floor(r/10),u=r%10; if(u) o+=`${ones[u]} و`; o+=tens[t];} }
    return o;
  }
  const segs=[{v:1e9,s:"مليار",d:"ملياران",p:"مليارات"},{v:1e6,s:"مليون",d:"مليونان",p:"ملايين"},{v:1e3,s:"ألف",d:"ألفان",p:"آلاف"}];
  let rem=n; const parts=[];
  for(const sg of segs){
    const q=Math.floor(rem/sg.v); if(!q) continue;
    if(q===1) parts.push(sg.s); else if(q===2) parts.push(sg.d);
    else if(q<11) parts.push(`${below1000(q)} ${sg.p}`); else parts.push(`${below1000(q)} ${sg.s}`);
    rem-=q*sg.v;
  }
  if(rem) parts.push(below1000(rem));
  return parts.join(" و");
}

function calcState(state) {
  const total    = Number(num(state.priceTotal))  || 0;
  const deposit  = Number(num(state.deposit))     || 0;
  const area     = Number(num(state.propertyArea))|| 0;
  const remain   = Math.max(total - deposit, 0);
  const ppm      = area > 0 ? Math.round(total / area) : 0;
  const cur      = state.currency || "ل.س";
  const depW     = state.depositWords  || (deposit ? `${numToArabicWords(deposit)} ${cur}`  : "—");
  const remW     = state.remainingWords|| (remain  ? `${numToArabicWords(remain)} ${cur}`   : "—");
  return { total, deposit, area, remain, ppm, cur, depW, remW };
}

function formatArabicDate(iso, lang) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  if (lang === 'en') {
    const months = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function documentHash(state) {
  const fields = [
    state.contractNumber, state.contractDate, state.placeDate,
    state.sellerName, state.sellerID, state.sellerBirth,
    state.buyerName,  state.buyerID,  state.buyerBirth,
    state.propertyNumber, state.propertyZone, state.propertyArea,
    state.priceTotal, state.deposit, state.deliveryDeadline
  ].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < fields.length; i++) {
    h ^= fields.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8,"0");
}

const makeRow = (prefix) => (lbl, val) =>
  `<div class="${prefix}r"><span class="${prefix}l">${lbl}</span><span class="${prefix}v">${val}</span></div>`;


// ============================================================
//  DOKUMENT-HTML
// ============================================================

// Konverterar latinska siffror till arabiska (١٩٧٥ istf 1975)
function toArabicNums(str) {
  if (str === null || str === undefined || str === "") return str || "";
  return String(str).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// Genererar vattenmärkes-badge för kopia-typ
function copyBadgeHTML(copyType, p) {
  const labels = { original:"النسخة الأصلية", buyer:"نسخة المشتري", seller:"نسخة البائع" };
  const colors = { original:"#2c4a3e", buyer:"#9a7d45", seller:"#5a3a2e" };
  const label = labels[copyType];
  if (!label) return "";
  const col = colors[copyType] || "#2c4a3e";
  return `<div style="position:absolute;top:8mm;left:8mm;z-index:10;padding:3px 10px;font-family:'Amiri',serif;font-size:8pt;font-weight:700;color:#fff;background:${col};letter-spacing:.06em;direction:rtl;">${label}</div>`;
}


// English labels and clauses for document language switch
const EN = {
  page1of2:    "Page 1 of 2",
  page2of2:    "Page 2 of 2",
  republic:    "Syrian Arab Republic",
  title:       "Absolute Sale Contract",
  subtitle:    "For the absolute and binding transfer of real estate ownership",
  parties:     "CONTRACTING PARTIES",
  seller:      "First Party — Seller",
  buyer:       "Second Party — Buyer",
  name:        "Name",
  son:         "Son of",
  mother:      "Mother",
  born:        "Born",
  id:          "ID No.",
  issued:      "Issued by",
  date:        "Date",
  phone:       "Phone",
  email:       "Email",
  property:    "PROPERTY DETAILS",
  propNo:      "Property No.",
  zone:        "Zone",
  type:        "Type",
  area:        "Area m²",
  floor:       "Floor",
  rooms:       "Rooms",
  desc:        "Description",
  bounds:      "Boundaries",
  total:       "Total Sale Price",
  deposit:     "Deposit Paid",
  remaining:   "Remaining Balance",
  financial:   "FINANCIAL & EXECUTION TERMS",
  ppm:         "Price/m²",
  payment:     "Payment Method",
  delivery:    "Delivery Period",
  signatures:  "SIGNATURES & WITNESSES",
  party1:      "First Party — Seller",
  party2:      "Second Party — Buyer",
  witness1:    "First Witness",
  witness2:    "Second Witness",
  sigNote1:    "Signs before witnesses",
  sigNote2:    "Signs after verification",
  sigNote3:    "Attests signature",
  stamp:       "Official Stamp",
  draftedIn:   "Drafted in",
  atDate:      "Dated",
  attachments: "Attachments",
  verify:      "Verify",
  page2title:  "Absolute Sale Contract — Page Two",
  legalClauses:"LEGAL CLAUSES",
  preamble:    "Both parties, being fully legally competent, have agreed to the following:",
  special:     "SPECIAL CONDITIONS",
  verifyCode:  "Verification Code",
  issuedOn:    "Issued on",
};

const AR = {
  page1of2:    "صفحة 1 من 2",
  page2of2:    "صفحة 2 من 2",
  republic:    "الجُمهُورِيَّةُ العَرَبِيَّةُ السُّورِيَّةُ",
  title:       "عقد بيع قطعي",
  subtitle:    "خاص ببيع وانتقال ملكية عقار بصورة نهائية وملزمة",
  parties:     "بيانات الأطراف المتعاقدة",
  seller:      "الفريق الأول — البائع",
  buyer:       "الفريق الثاني — المشتري",
  name:        "الاسم",
  son:         "ابن",
  mother:      "والدته",
  born:        "تولد",
  id:          "هوية",
  issued:      "صادرة عن",
  date:        "بتاريخ",
  phone:       "الهاتف",
  email:       "البريد",
  property:    "بيانات العقار المبيع",
  propNo:      "رقم العقار",
  zone:        "المنطقة",
  type:        "نوع العقار",
  area:        "المساحة م²",
  floor:       "الطابق",
  rooms:       "عدد الغرف",
  desc:        "الوصف",
  bounds:      "الحدود",
  total:       "ثمن البيع الإجمالي",
  deposit:     "العربون المدفوع",
  remaining:   "الرصيد المتبقي",
  financial:   "الشروط المالية والتنفيذية",
  ppm:         "سعر المتر",
  payment:     "طريقة الدفع",
  delivery:    "مدة التسليم",
  signatures:  "التواقيع والشهود",
  party1:      "البائع — الفريق الأول",
  party2:      "المشتري — الفريق الثاني",
  witness1:    "الشاهد الأول",
  witness2:    "الشاهد الثاني",
  sigNote1:    "يوقع أمام الشهود",
  sigNote2:    "يوقع بعد التحقق",
  sigNote3:    "يشهد بصحة التوقيع",
  stamp:       "محل الختم الرسمي",
  draftedIn:   "تحريراً في",
  atDate:      "بتاريخ",
  attachments: "المرفقات",
  verify:      "تحقق",
  page2title:  "عقد بيع قطعي — الصفحة الثانية",
  legalClauses:"البنود القانونية",
  preamble:    "اتفق الفريقان وهما بكامل الأوصاف المطلوبة شرعاً وقانوناً على ما يلي:",
  special:     "شروط خاصة",
  verifyCode:  "كود التحقق",
  issuedOn:    "صدر بتاريخ",
};

function buildContractHTML(state, qrDataUrl, cssPrefix, copyType, lang) {
  const p     = cssPrefix;
  const d     = state;
  const _lang = lang || 'ar';
  const L     = _lang === 'en' ? EN : AR;
  const isEn  = _lang === 'en';
  const { total, deposit, remain, ppm, cur, depW, remW } = calcState(state);
  const row = makeRow(p);

  const sigS  = sigHtml(state, "seller");
  const sigB  = sigHtml(state, "buyer");
  const sigW1 = sigHtml(state, "witness1");
  const sigW2 = sigHtml(state, "witness2");

  const page1 = `
<div class="${p}page${isEn?' eng-doc':''}" dir="${isEn?'ltr':'rtl'}" style="direction:${isEn?'ltr':'rtl'}">
<div class="${p}frame"></div>
${copyType ? copyBadgeHTML(copyType, p) : ""}
<div class="${p}pn">${L.page1of2} · ${disp(d.contractNumber)}</div>

<div class="${p}hd">
  <div class="${p}hdr">
    <div class="${p}emb"><img src="./Emblem.png" alt="" onerror="this.style.display='none'"></div>
    <div class="${p}state">${L.republic}</div>
  </div>
  <div class="${p}div"></div>
  <div class="${p}hdl">
    <div class="${p}hm">${isEn?"Contract No.":"رقم العقد"}: <strong>${disp(d.contractNumber)}</strong></div>
    <div class="${p}hm">${isEn?"Place":"مكان التحرير"}: <strong>${disp(d.placeDate)}</strong></div>
    <div class="${p}hm">${isEn?"Date":"التاريخ"}: <strong>${disp(formatArabicDate(d.contractDate, _lang))}</strong></div>
  </div>
</div>

<div class="${p}tb">
  <div class="${p}orn"></div>
  <div class="${p}mt">${L.title}</div>
  <div class="${p}st">${L.subtitle}</div>
</div>

<div class="${p}sl">${L.parties}</div>
<div class="${p}pg">
  <div class="${p}pp">
    <div class="${p}pn2">${L.seller}</div>
    ${row(L.name,disp(d.sellerName))}${row(L.son,disp(d.sellerFather))}${row(L.mother,disp(d.sellerMother))}
    ${row(L.born,disp(d.sellerBirth))}${row(L.id,disp(d.sellerID))}${row(L.issued,disp(d.sellerIDPlace))}
    ${row(L.date,disp(formatArabicDate(d.sellerIDDate, _lang)))}${d.sellerPhone?row(L.phone,disp(d.sellerPhone)):""}${d.sellerEmail?row(L.email,disp(d.sellerEmail)):""}
  </div>
  <div class="${p}pp">
    <div class="${p}pn2 ${p}b">${L.buyer}</div>
    ${row(L.name,disp(d.buyerName))}${row(L.son,disp(d.buyerFather))}${row(L.mother,disp(d.buyerMother))}
    ${row(L.born,disp(d.buyerBirth))}${row(L.id,disp(d.buyerID))}${row(L.issued,disp(d.buyerIDPlace))}
    ${row(L.date,disp(formatArabicDate(d.buyerIDDate, _lang)))}${d.buyerPhone?row(L.phone,disp(d.buyerPhone)):""}${d.buyerEmail?row(L.email,disp(d.buyerEmail)):""}
  </div>
</div>

<div class="${p}sl">${L.property}</div>
<div class="${p}prop">
  <div class="${p}pc">${row(L.propNo,disp(d.propertyNumber))}</div>
  <div class="${p}pc">${row(L.zone,disp(d.propertyZone))}</div>
  <div class="${p}pc">${row(L.type,disp(d.propertyType))}</div>
  <div class="${p}pc">${row(L.area,disp(d.propertyArea))}</div>
  <div class="${p}pc">${row(L.floor,disp(d.propertyFloor))}</div>
  <div class="${p}pc ${p}nb">${row(L.rooms,disp(d.propertyRooms))}</div>
  <div class="${p}pc ${p}full">${row(L.desc,disp(d.propertyDesc))}</div>
  <div class="${p}pc ${p}full ${p}nb">${row(L.bounds,disp(d.propertyBoundaries))}</div>
</div>

<div class="${p}ps">
  <div class="${p}psc"><span class="${p}psl">${L.total}</span><span class="${p}psv">${total?`${fmt(total)} ${cur}`:"—"}</span></div>
  <div class="${p}psc"><span class="${p}psl">${L.deposit}</span><span class="${p}psv">${deposit?`${fmt(deposit)} ${cur}`:"—"}</span></div>
  <div class="${p}psc"><span class="${p}psl">${L.remaining}</span><span class="${p}psv">${remain?`${fmt(remain)} ${cur}`:"—"}</span></div>
</div>

<div class="${p}sl">${L.financial}</div>
<div class="${p}fg">
  <div class="${p}pc ${p}nb">${row(L.ppm,ppm?`${fmt(ppm)} ${cur}`:"—")}</div>
  <div class="${p}pc ${p}nb">${row(L.payment,disp(d.paymentMethod))}</div>
  <div class="${p}pc ${p}nb">${row(L.delivery,disp(d.deliveryDeadline))}</div>
</div>

<div class="${p}sl">${L.signatures}</div>
<div class="${p}sg">
  <div class="${p}sb"><div class="${p}sbt">${L.party1}</div>
    <div class="${p}sr"><span class="${p}l">${L.name}</span><span class="${p}v">${disp(d.sellerName)}</span></div>
    <div class="${p}sl2">${sigS}</div><div class="${p}sc">${L.sigNote1}</div></div>
  <div class="${p}sb"><div class="${p}sbt">${L.party2}</div>
    <div class="${p}sr"><span class="${p}l">${L.name}</span><span class="${p}v">${disp(d.buyerName)}</span></div>
    <div class="${p}sl2">${sigB}</div><div class="${p}sc">${L.sigNote2}</div></div>
  <div class="${p}sb"><div class="${p}sbt">${L.witness1}</div>
    <div class="${p}sr"><span class="${p}l">${L.name}</span><span class="${p}v">${disp(d.witness1)}</span></div>
    <div class="${p}sl2">${sigW1}</div><div class="${p}sc">${L.sigNote3}</div></div>
  <div class="${p}sb"><div class="${p}sbt">${L.witness2}</div>
    <div class="${p}sr"><span class="${p}l">${L.name}</span><span class="${p}v">${disp(d.witness2)}</span></div>
    <div class="${p}sl2">${sigW2}</div><div class="${p}sc">${L.sigNote3}</div></div>
</div>

<div class="${p}bot">
  <div class="${p}stmp"><div class="${p}stmpc" style="white-space:pre-line">${isEn ? "Official\nStamp" : "محل\nالختم\nالرسمي"}</div></div>
  <div class="${p}fa">
    <div class="${p}ff">${row(L.draftedIn,disp(d.placeDate))}${row(L.atDate,disp(formatArabicDate(d.contractDate, _lang)))}</div>
    ${d.attachments?`<div class="${p}att"><strong>${isEn?"Attachments":"المرفقات"}:</strong> ${esc(d.attachments)}</div>`:""}
  </div>
  <div class="${p}qrbox">
    <img src="${qrDataUrl}" alt="QR" class="${p}qrimg">
    <div class="${p}hash">${L.verify}: ${documentHash(d)}</div>
    <div class="${p}genstamp">${isEn ? new Date().toLocaleDateString("en-GB") : new Date().toLocaleDateString("ar-SY")}</div>
  </div>
</div>
</div>`;

  const page2 = `
<div class="${p}page${isEn?' eng-doc':''}" dir="${isEn?'ltr':'rtl'}" style="direction:${isEn?'ltr':'rtl'}">
<div class="${p}frame"></div>
${copyType ? copyBadgeHTML(copyType, p) : ""}
<div class="${p}pn">${L.page2of2} · ${disp(d.contractNumber)}</div>

<div class="${p}p2h">
  <span>${L.page2title}</span>
  <span>${disp(formatArabicDate(d.contractDate, _lang))} · ${disp(d.placeDate)}</span>
</div>

<div class="${p}sl">${L.legalClauses}</div>
<p class="${p}ci">${L.preamble}</p>

${isEn ? `
<div class="${p}cl"><span class="${p}cn">1</span><div>The First Party declares ownership of Property No. <strong>${disp(d.propertyNumber)}</strong> in the real estate zone of <strong>${disp(d.propertyZone)}</strong>, described as <strong>${disp(d.propertyType)}</strong> — ${disp(d.propertyDesc)}, with an area of <strong>${disp(d.propertyArea)} m²</strong>. The said property has been sold absolutely and irrevocably to the Second Party for a total of <strong>${total?`${fmt(total)} ${cur}`:"—"}</strong> at a unit price of <strong>${ppm?`${fmt(ppm)} ${cur}`:"—"}</strong> per m².</div></div>
<div class="${p}cl"><span class="${p}cn">2</span><div>The First Party acknowledges receipt of a deposit of <strong>${deposit?`${fmt(deposit)} ${cur}`:"—"}</strong>. The remaining balance of <strong>${remain?`${fmt(remain)} ${cur}`:"—"}</strong> shall be paid upon completing the title transfer at the land registry by <strong>${disp(d.paymentMethod)}</strong>.</div></div>
<div class="${p}cl"><span class="${p}cn">3</span><div>The First Party undertakes to deliver the property vacant of all occupants and in full condition within <strong>${disp(d.deliveryDeadline)}</strong> from the date of this contract. In case of delay, a daily penalty of <strong>${d.delayPenalty?`${fmt(d.delayPenalty)} ${cur}`:"—"}</strong> shall apply without the need for prior notice.</div></div>
<div class="${p}cl"><span class="${p}cn">4</span><div>The Second Party confirms acceptance of this purchase as final and irrevocable. Should either party withdraw, the defaulting party shall pay the other <strong>${d.breachPenalty?`${fmt(d.breachPenalty)} ${cur}`:"—"}</strong> as compensation without the need for a court ruling.</div></div>
<div class="${p}cl"><span class="${p}cn">5</span><div>The First Party declares that the property is free of all mortgages, liens, lawsuits and disputes as of the date of this contract. ${d.propertyMortgages?`Note: ${esc(d.propertyMortgages)}.`:""} All taxes and fees up to the date of title transfer shall be borne by the First Party.</div></div>
<div class="${p}cl"><span class="${p}cn">6</span><div>This contract has been executed in three identical original copies signed by both parties in the presence of the undersigned witnesses, each party retaining one copy and the intermediary office the third. It shall be effective upon signing and stamping in accordance with applicable law.</div></div>
` : `
<div class="${p}cl"><span class="${p}cn">١</span><div>يُصرّح الفريق الأول بأنه يمتلك العقار رقم <strong>${disp(d.propertyNumber)}</strong> من المنطقة العقارية <strong>${disp(d.propertyZone)}</strong>، وهو عبارة عن <strong>${disp(d.propertyType)}</strong> — ${disp(d.propertyDesc)}، والبالغة مساحته <strong>${disp(d.propertyArea)} م²</strong>. وقد باع العقار المذكور بيعاً قطعياً لا نكول فيه إلى الفريق الثاني بمبلغ إجمالي قدره <strong>${total?`${fmt(total)} ${cur}`:"—"}</strong> وبسعر المتر المربع <strong>${ppm?`${fmt(ppm)} ${cur}`:"—"}</strong>.</div></div>
<div class="${p}cl"><span class="${p}cn">٢</span><div>قبض الفريق الأول من الفريق الثاني عربوناً مقداره رقماً <strong>${deposit?`${fmt(deposit)} ${cur}`:"—"}</strong> كتابةً: <strong>${esc(depW)}</strong>. والرصيد البالغ <strong>${remain?`${fmt(remain)} ${cur}`:"—"}</strong> كتابةً: <strong>${esc(remW)}</strong> يُدفع عند إتمام إجراءات نقل الملكية في السجل العقاري بطريقة <strong>${disp(d.paymentMethod)}</strong>.</div></div>
<div class="${p}cl"><span class="${p}cn">٣</span><div>يلتزم الفريق الأول بتسليم العقار خالياً من جميع الشواغل والمستأجرين وبكامل مرافقه خلال مدة أقصاها <strong>${disp(d.deliveryDeadline)}</strong> اعتباراً من تاريخ هذا العقد. وفي حال تأخره يدفع غرامة تأخير يومية قدرها <strong>${d.delayPenalty?`${fmt(d.delayPenalty)} ${cur}`:"—"}</strong> عن كل يوم تأخير دون الحاجة لإنذار أو إدعاء.</div></div>
<div class="${p}cl"><span class="${p}cn">٤</span><div>يُصرّح الفريق الثاني بأنه قبل الشراء المذكور بشكل قطعي ونهائي وأسقط حقه من الرجوع أو النكول. وفي حال نكول أي من الفريقين يدفع الناكل للآخر كعطل وضرر مبلغ <strong>${d.breachPenalty?`${fmt(d.breachPenalty)} ${cur}`:"—"}</strong> دون الحاجة لإنذار أو قرار قضائي.</div></div>
<div class="${p}cl"><span class="${p}cn">٥</span><div>يُقرّ الفريق الأول بأن العقار المذكور خالٍ من جميع الرهون والتكاليف والدعاوى القضائية والنزاعات حتى تاريخ هذا العقد. ${d.propertyMortgages?`ملاحظة: ${esc(d.propertyMortgages)}.`:""} وأن جميع الرسوم والضرائب المترتبة على العقار حتى تاريخ الفراغ في السجل العقاري تقع على عاتق الفريق الأول.</div></div>
<div class="${p}cl"><span class="${p}cn">٦</span><div>نُظِّم هذا العقد على ثلاث نسخ أصلية متطابقة وقّعها الفريقان بحضور الشهود الموقعين ذيلاً، واحتفظ كل فريق بنسخة والمكتب الوسيط بالنسخة الثالثة. ويُعمل به بعد التوقيع والختم وفق الأصول القانونية النافذة.</div></div>
`}

${(d.special1||d.special2||d.specialConditions)?`
<div class="${p}sl" style="margin-top:3mm;">${L.special}</div>
<div class="${p}spb" style="direction:${isEn?'ltr':'rtl'};text-align:${isEn?'left':'right'}">
  ${d.special1?`<p>— ${esc(d.special1)}</p>`:""}
  ${d.special2?`<p>— ${esc(d.special2)}</p>`:""}
  ${d.specialConditions?`<p>${esc(d.specialConditions)}</p>`:""}
</div>`:""}
<div class="${p}p2footer">
  <div class="${p}p2hash">${L.verifyCode}: ${documentHash(d)} · ${L.issuedOn}: ${disp(formatArabicDate(d.contractDate, _lang))}</div>
  <img src="${qrDataUrl}" alt="QR" class="${p}qrimg2">
</div>
</div>`;

  return page1 + page2;
}


// ============================================================
//  PRINT MODULE
// ============================================================
const PrintModule = {
  execute(state, generateQRFn) {
    const qr  = generateQRFn([state.contractNumber, state.contractDate, state.sellerName, state.buyerName,
                               `${fmt(Number(num(state.priceTotal))||0)} ${state.currency||"ل.س"}`].join(" | "));
    const css = this.printCSS();
    const body = buildContractHTML(state, qr, "", state._copyType || null, state._docLang || 'ar');
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>عقد بيع قطعي — ${esc(state.contractNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${body}</body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Popup blockerades. Tillåt popups för denna sida."); return; }
    win.document.open(); win.document.write(html); win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  },
  printCSS() {
    // Returnerar tom sträng — CSS laddas via <link> i print-fönstret
    return "";
  }
};





// ============================================================
//  APP
// ============================================================
const STORAGE_KEY    = "syrian-contract-system-v2";
const CONTRACTS_KEY  = "syrian-contract-list-v1";
const SIGNATURE_NAMES = ["seller", "buyer", "witness1", "witness2"];

const REQUIRED_FIELDS = [
  "contractNumber","placeDate","contractDate",
  "sellerName","sellerBirth","sellerID",
  "buyerName","buyerBirth","buyerID",
  "propertyNumber","propertyZone","propertyType","propertyArea",
  "priceTotal","deposit","deliveryDeadline",
  "witness1","witness2"
];

const ARABIC_LABELS = {
  contractNumber:"رقم العقد", placeDate:"مكان التحرير", contractDate:"التاريخ",
  sellerName:"اسم البائع", sellerBirth:"سنة ميلاد البائع", sellerID:"رقم هوية البائع",
  buyerName:"اسم المشتري", buyerBirth:"سنة ميلاد المشتري", buyerID:"رقم هوية المشتري",
  propertyNumber:"رقم العقار", propertyZone:"المنطقة العقارية", propertyType:"نوع العقار",
  propertyArea:"مساحة العقار", priceTotal:"الثمن الإجمالي", deposit:"العربون",
  deliveryDeadline:"مدة التسليم", witness1:"الشاهد الأول", witness2:"الشاهد الثاني"
};

const DEFAULT_DATA = {
  contractNumber:"", fileNumber:"", placeDate:"", contractDate:"",
  sellerName:"", sellerFather:"", sellerMother:"", sellerBirth:"",
  sellerID:"", sellerIDPlace:"", sellerIDDate:"", sellerPhone:"", sellerEmail:"",
  buyerName:"", buyerFather:"", buyerMother:"", buyerBirth:"",
  buyerID:"", buyerIDPlace:"", buyerIDDate:"", buyerPhone:"", buyerEmail:"",
  propertyNumber:"", propertyZone:"", propertyType:"", propertyArea:"",
  propertyFloor:"", propertyRooms:"", propertyRegistry:"", propertyView:"",
  propertyDesc:"", propertyBoundaries:"", propertyMortgages:"",
  priceTotal:"", currency:"ل.س", deposit:"", paymentMethod:"نقداً",
  deliveryDeadline:"", delayPenalty:"", breachPenalty:"",
  depositWords:"", remainingWords:"",
  witness1:"", witness1ID:"", witness2:"", witness2ID:"",
  special1:"", special2:"", specialConditions:"", attachments:""
};

const TEMPLATES = {
  apartment:  { propertyType:"شقة سكنية",  propertyArea:"120", propertyFloor:"الثاني",    propertyRooms:"3", propertyView:"شارع داخلي",        propertyDesc:"شقة سكنية، تشطيب حديث، مطبخ منفصل",                  propertyMortgages:"خالٍ من أي رهن",            deliveryDeadline:"60 يوماً",  delayPenalty:"50000",  breachPenalty:"5000000",  specialConditions:"يتم تسليم الشقة خالية من المستأجرين وبكامل ملحقاتها." },
  villa:      { propertyType:"فيلا",        propertyArea:"400", propertyFloor:"أرضي وأول", propertyRooms:"6", propertyView:"شارع رئيسي",        propertyDesc:"فيلا مستقلة على طابقين مع حديقة ومسبح",               propertyMortgages:"خالٍ من أي رهن أو تكليف",  deliveryDeadline:"90 يوماً",  delayPenalty:"200000", breachPenalty:"25000000", specialConditions:"تشمل الصفقة المفروشات الثابتة والمطبخ والأجهزة الكهربائية." },
  land:       { propertyType:"أرض",         propertyArea:"500", propertyFloor:"",           propertyRooms:"0", propertyView:"شارع رئيسي",        propertyDesc:"قطعة أرض مستوية صالحة للبناء، مسوّرة",                propertyMortgages:"خالٍ من أي رهن",            deliveryDeadline:"30 يوماً",  delayPenalty:"100000", breachPenalty:"10000000", specialConditions:"تسلم الأرض بعد استكمال إجراءات نقل الملكية في السجل العقاري." },
  commercial: { propertyType:"محل تجاري",   propertyArea:"80",  propertyFloor:"أرضي",      propertyRooms:"2", propertyView:"شارع تجاري رئيسي", propertyDesc:"محل تجاري في موقع حيوي، واجهة زجاجية",                propertyMortgages:"خالٍ من أي رهن",            deliveryDeadline:"45 يوماً",  delayPenalty:"75000",  breachPenalty:"8000000",  specialConditions:"يُسلَّم المحل خالياً من البضائع والمستأجرين ومن كافة العوائق." },
  farm:       { propertyType:"مزرعة",       propertyArea:"5000",propertyFloor:"",           propertyRooms:"1", propertyView:"طريق ترابي",        propertyDesc:"مزرعة بمساحة 5000م² تضم أشجاراً مثمرة وبيتاً للحراسة", propertyMortgages:"خالٍ من أي رهن",            deliveryDeadline:"30 يوماً",  delayPenalty:"50000",  breachPenalty:"5000000",  specialConditions:"تشمل الصفقة الأشجار والمحاصيل القائمة وحق الوصول للمياه." }
};

const App = {
  state: {},
  _docLang: 'ar',
  _saveTimer: null, _debounceTimer: null,
  _sigPads: {},
  _dirty: false,
  _rates: { SYP:1, USD:1/13000, EUR:1/14200, TRY:1/390 },
  _undoStack: [], _redoStack: [],
  _UNDO_LIMIT: 20,

  init() {
    this.state = this.loadData();
    this.bindUI();
    this.populateForm();
    this.recalc();
    this.updateCNPreview();
    this.renderPreview();
    this.updateProgress();
    this.initSigPads();
    this._saveTimer   = setInterval(() => { if(this._dirty) this.autoSave(); }, 1000);
    window.addEventListener("beforeunload", () => this.autoSave());
    this.fetchRates();
  },

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { ...DEFAULT_DATA };
      const parsed = JSON.parse(raw);
      // Sanity check - måste vara ett objekt
      if(typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_DATA };
      return { ...DEFAULT_DATA, ...parsed };
    } catch {
      // Rensa korrupt data
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      return { ...DEFAULT_DATA };
    }
  },

  autoSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      if(this.state._id) {
        localStorage.setItem("contract-data-" + this.state._id, JSON.stringify(this.state));
        this.saveToHistory();
      }
      this._dirty = false;
      const time = new Date().toLocaleTimeString("ar-SY");
      const s = document.getElementById("autosave-status");
      if(s){ s.textContent="محفوظ"; s.className="badge badge-ok"; }
      const t = document.getElementById("last-save-time");
      if(t) t.textContent = time;
    } catch {}
  },

  listContracts() {
    try { return JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]"); } catch { return []; }
  },

  saveToHistory() {
    const list = this.listContracts().filter(c => c.id !== this.state._id);
    const id = this.state._id || ("contract-" + Date.now());
    this.state._id = id;
    const entry = { id, title: this.state.contractNumber || "عقد جديد", seller: this.state.sellerName || "", buyer: this.state.buyerName || "", date: this.state.contractDate || "", saved: new Date().toISOString() };
    list.unshift(entry);
    if(list.length > 20) list.length = 20;
    try { localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list)); } catch {}
  },

  newContract() {
    this._confirm("إنشاء عقد جديد؟ سيتم حفظ العقد الحالي في السجل.", () => {
      this.saveToHistory();
      this.autoSave();
      this.state = { ...DEFAULT_DATA, _id: "contract-" + Date.now() };
      SIGNATURE_NAMES.forEach(n => delete this.state[`sig_${n}`]);
      this.populateForm(); this.recalc(); this.clearSignatureCanvases();
      this.renderPreview(); this.updateProgress();
      document.getElementById("val-panel").classList.remove("show");
      this.toast("تم إنشاء عقد جديد");
    });
  },

  loadContract(id) {
    try {
      const raw = localStorage.getItem("contract-data-" + id);
      if(!raw) { this.toast("لم يتم العثور على بيانات العقد","err"); return; }
      this.autoSave();
      this.state = { ...DEFAULT_DATA, ...JSON.parse(raw) };
      this.populateForm(); this.recalc(); this.renderPreview();
      this.updateProgress(); this.initSigPads(true);
      this.closeHistoryPanel(); this.toast("تم تحميل العقد");
    } catch { this.toast("خطأ في تحميل العقد","err"); }
  },

  deleteContract(id) {
    this._confirm("حذف هذا العقد من السجل؟", () => {
      const list = this.listContracts().filter(c => c.id !== id);
      localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list));
      localStorage.removeItem("contract-data-" + id);
      this.renderHistoryPanel(); this.toast("تم حذف العقد");
    });
  },

  openHistoryPanel() {
    let panel = document.getElementById("history-panel");
    if(!panel) {
      panel = document.createElement("div");
      panel.id = "history-panel";
      panel.style.cssText = `position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;`;
      panel.innerHTML = `
        <div style="background:var(--shell);border:1px solid rgba(255,255,255,.1);width:520px;max-height:80vh;display:flex;flex-direction:column;font-family:'Amiri',serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);">
            <span style="font-size:14px;font-weight:700;color:#f0e8d4;">سجل العقود</span>
            <button id="history-new-btn" class="btn btn-gold btn-sm" type="button">+ عقد جديد</button>
            <button id="history-close-btn" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0 4px;">✕</button>
          </div>
          <div id="history-list" style="overflow-y:auto;flex:1;padding:8px 0;"></div>
        </div>`;
      document.body.appendChild(panel);
      document.getElementById("history-close-btn").onclick = () => this.closeHistoryPanel();
      document.getElementById("history-new-btn").onclick   = () => this.newContract();
      panel.addEventListener("click", e => { if(e.target===panel) this.closeHistoryPanel(); });
    }
    this.renderHistoryPanel();
    panel.style.display = "flex";
  },

  closeHistoryPanel() {
    const p = document.getElementById("history-panel");
    if(p) p.style.display = "none";
  },

  renderHistoryPanel() {
    const list = this.listContracts();
    const el = document.getElementById("history-list");
    if(!el) return;
    if(!list.length) { el.innerHTML = `<div style="padding:24px;text-align:center;color:rgba(255,255,255,.3);font-size:13px;">لا توجد عقود محفوظة</div>`; return; }
    el.innerHTML = list.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;" data-load-id="${c.id}">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#f0e8d4;">${esc(c.title)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;">${esc(c.seller)} ← ${esc(c.buyer)} · ${c.date||""}</div>
        </div>
        <button data-delete-id="${c.id}" style="background:none;border:1px solid rgba(255,0,0,.3);color:#c05050;font-size:10px;padding:3px 8px;cursor:pointer;border-radius:2px;">حذف</button>
      </div>`).join("");
    el.querySelectorAll("[data-load-id]").forEach(row => {
      row.addEventListener("click", e => { if(e.target.dataset.deleteId) return; this.loadContract(row.dataset.loadId); });
    });
    el.querySelectorAll("[data-delete-id]").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); this.deleteContract(btn.dataset.deleteId); });
    });
  },

  fetchRates() {
    const RATES_CACHE_KEY = "exchange-rates-cache-v1";
    const TTL = 6 * 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(RATES_CACHE_KEY) || "null");
      if(cached && (Date.now() - cached.ts) < TTL) {
        this._rates.USD = cached.USD; this._rates.EUR = cached.EUR; this._rates.TRY = cached.TRY;
        const note = document.querySelector(".cur-rate-note");
        if(note) note.textContent = `أسعار محدّثة · 1 USD ≈ ${Math.round(1/this._rates.USD).toLocaleString()} SYP · 1 EUR ≈ ${Math.round(1/this._rates.EUR).toLocaleString()} SYP · 1 TRY ≈ ${Math.round(1/this._rates.TRY).toLocaleString()} SYP`;
        return;
      }
    } catch {}
    fetch("https://api.exchangerate-api.com/v4/latest/SYP")
      .then(r => r.json())
      .then(data => {
        if(!data.rates) return;
        const r = data.rates;
        this._rates.USD = r.USD || this._rates.USD;
        this._rates.EUR = r.EUR || this._rates.EUR;
        this._rates.TRY = r.TRY || this._rates.TRY;
        try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({USD:this._rates.USD,EUR:this._rates.EUR,TRY:this._rates.TRY,ts:Date.now()})); } catch {}
        const cur = document.getElementById("cur-syp-input")?.value;
        if(cur) this.convertCurrency(cur);
        const note = document.querySelector(".cur-rate-note");
        if(note) note.textContent = `أسعار محدّثة · 1 USD ≈ ${Math.round(1/this._rates.USD).toLocaleString()} SYP · 1 EUR ≈ ${Math.round(1/this._rates.EUR).toLocaleString()} SYP · 1 TRY ≈ ${Math.round(1/this._rates.TRY).toLocaleString()} SYP`;
      })
      .catch(() => {});
  },

  bindUI() {
    document.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", () => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          this.pushUndo();
          this.state[el.dataset.field] = el.value;
          this._dirty = true;
          this.recalc();
          this.validateField(el.dataset.field);
          this.renderPreview();
          this.updateProgress();
            }, 280);
      });
    });
    document.querySelectorAll("[data-tab-link]").forEach((b) => b.addEventListener("click", () => this.switchTab(b.dataset.tabLink, b)));
    document.querySelectorAll("[data-scroll-target]").forEach((b) => b.addEventListener("click", () => this.scrollTo(b.dataset.scrollTarget)));
    document.querySelectorAll("[data-template]").forEach((b) => b.addEventListener("click", () => this.applyTemplate(b.dataset.template)));
    document.querySelectorAll("[data-clear-signature]").forEach((b) => b.addEventListener("click", () => this.clearSig(b.dataset.clearSignature)));
    document.querySelectorAll("[data-action]").forEach((b) => b.addEventListener("click", () => this.handleAction(b.dataset.action)));
    document.getElementById("import-input").addEventListener("change", (e) => this.handleImport(e.target));
    document.getElementById("cur-syp-input").addEventListener("input", (e) => this.convertCurrency(e.target.value));
    ["cn-prefix","cn-year","cn-seq"].forEach((id) => document.getElementById(id).addEventListener("input", () => this.updateCNPreview()));
    document.addEventListener("keydown", (e) => {
      if(e.target.tagName === "TEXTAREA") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if(ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); this.undo(); }
      if(ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); this.redo(); }
      if(ctrl && e.key === "s") { e.preventDefault(); this.autoSave(); this.toast("تم الحفظ","ok"); }
      if(ctrl && e.key === "p") { e.preventDefault(); this.print(); }
    });
  },

  handleAction(action) {
    const actions = {
      "print":                 () => this.print(),
      "export-json":           () => this.exportJSON(),
      "import-json":           () => this.importJSON(),
      "share-email":           () => this.shareEmail(),
      "validate":              () => this.validate(),
      "reset":                 () => this.resetToDefault(),
      "apply-contract-number": () => this.applyCN(),
      "undo":                  () => this.undo(),
      "redo":                  () => this.redo(),
      "save-pdf":              () => this.savePDF(),
      "export-html":           () => this.exportHTML(),
      "toggle-lang":           () => this.toggleLang(),
      "open-history":          () => this.openHistoryPanel(),
      "new-contract":          () => this.newContract(),
    };
    actions[action]?.();
  },

  pushUndo() {
    const snap = Object.fromEntries(Object.entries(this.state).filter(([k]) => !k.startsWith("sig_")));
    this._undoStack.push(JSON.stringify(snap));
    if(this._undoStack.length > this._UNDO_LIMIT) this._undoStack.shift();
    this._redoStack = [];
  },

  undo() {
    if(!this._undoStack.length) { this.toast("لا يوجد شيء للتراجع عنه","err"); return; }
    const snap = Object.fromEntries(Object.entries(this.state).filter(([k]) => !k.startsWith("sig_")));
    this._redoStack.push(JSON.stringify(snap));
    this.state = { ...this.state, ...JSON.parse(this._undoStack.pop()) };
    this.populateForm(); this.recalc(); this.renderPreview(); this.updateProgress();
    this.toast("تم التراجع ↩");
  },

  redo() {
    if(!this._redoStack.length) { this.toast("لا يوجد شيء للإعادة","err"); return; }
    const snap = Object.fromEntries(Object.entries(this.state).filter(([k]) => !k.startsWith("sig_")));
    this._undoStack.push(JSON.stringify(snap));
    this.state = { ...this.state, ...JSON.parse(this._redoStack.pop()) };
    this.populateForm(); this.recalc(); this.renderPreview(); this.updateProgress();
    this.toast("تم الإعادة ↪");
  },

  populateForm() {
    document.querySelectorAll("[data-field]").forEach((el) => {
      const v = this.state[el.dataset.field];
      if(v !== undefined) el.value = v;
    });
  },

  recalc() {
    const { total, deposit, remain, ppm, cur } = calcState(this.state);
    document.getElementById("f-remaining").value    = remain ? `${fmt(remain)} ${cur}` : "";
    document.getElementById("f-pricePerMeter").value = ppm   ? `${fmt(ppm)} ${cur}`   : "";
    this.state.depositWords  = deposit ? `${numToArabicWords(deposit)} ${cur}` : "";
    this.state.remainingWords = remain ? `${numToArabicWords(remain)} ${cur}` : "";
    document.getElementById("f-depositWords").value  = this.state.depositWords;
    document.getElementById("f-remainingWords").value = this.state.remainingWords;
  },

  updateProgress() {
    const filled = REQUIRED_FIELDS.filter((f) => { const el = document.getElementById(`f-${f}`); return el && el.value.trim() !== ""; }).length;
    const pct = Math.round((filled / REQUIRED_FIELDS.length) * 100);
    document.getElementById("progress-fill").style.width = `${pct}%`;
    document.getElementById("progress-pct").textContent  = `${pct}%`;
  },

  setError(field, msg) {
    document.getElementById(`f-${field}`)?.classList.add("err");
    const e = document.getElementById(`e-${field}`);
    if(e){ e.textContent=msg; e.classList.add("show"); }
  },

  clearErrors() {
    document.querySelectorAll(".field input,.field select,.field textarea").forEach((el) => el.classList.remove("err"));
    document.querySelectorAll(".field-error").forEach((e) => { e.textContent=""; e.classList.remove("show"); });
  },

  validateField(field) {
    const el = document.getElementById(`f-${field}`);
    if(!el) return true;
    const v = el.value.trim();
    el.classList.remove("err");
    const e = document.getElementById(`e-${field}`);
    if(e){ e.textContent=""; e.classList.remove("show"); }
    if(REQUIRED_FIELDS.includes(field) && !v) { this.setError(field,"هذا الحقل إلزامي"); return false; }
    if(["sellerBirth","buyerBirth"].includes(field) && v && !/^\d{4}$/.test(v)) { this.setError(field,"يجب أن تكون سنة الميلاد 4 أرقام"); return false; }
    if(["sellerEmail","buyerEmail"].includes(field) && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { this.setError(field,"صيغة البريد الإلكتروني غير صحيحة"); return false; }
    if(["sellerPhone","buyerPhone"].includes(field) && v && !/^[+\d\s()-]{7,}$/.test(v)) { this.setError(field,"صيغة رقم الهاتف غير صحيحة"); return false; }
    if(["priceTotal","deposit","delayPenalty","breachPenalty","sellerID","buyerID","witness1ID","witness2ID"].includes(field) && v && !/^[\d,\s]+$/.test(v)) { this.setError(field,"يجب إدخال أرقام فقط"); return false; }
    if(field==="contractDate" && v && Number.isNaN(new Date(v).getTime())) { this.setError(field,"التاريخ غير صالح"); return false; }
    return true;
  },

  validate() {
    this.clearErrors();
    const errors = [];
    const push = (f) => errors.push({ field:f, msg:document.getElementById(`e-${f}`)?.textContent||"قيمة غير صالحة" });
    REQUIRED_FIELDS.forEach((f) => { if(!this.validateField(f)) push(f); });
    ["sellerEmail","buyerEmail","sellerPhone","buyerPhone","sellerIDDate","buyerIDDate"].forEach((f) => { const el = document.getElementById(`f-${f}`); if(el?.value && !this.validateField(f)) push(f); });
    const {total,deposit} = calcState(this.state);
    if(deposit && total && deposit>total) { this.setError("deposit","يجب ألا يتجاوز العربون الثمن الإجمالي"); push("deposit"); }
    const sd=this.state.sellerIDDate?new Date(this.state.sellerIDDate):null;
    const bd=this.state.buyerIDDate?new Date(this.state.buyerIDDate):null;
    const cd=this.state.contractDate?new Date(this.state.contractDate):null;
    if(sd&&cd&&sd>cd){ this.setError("sellerIDDate","تاريخ إصدار هوية البائع يجب أن يسبق تاريخ العقد"); push("sellerIDDate"); }
    if(bd&&cd&&bd>cd){ this.setError("buyerIDDate","تاريخ إصدار هوية المشتري يجب أن يسبق تاريخ العقد"); push("buyerIDDate"); }
    const panel=document.getElementById("val-panel"), list=document.getElementById("val-list");
    if(errors.length){
      list.innerHTML=errors.map((e)=>`<li class="val-item" data-focus-field="${e.field}">${ARABIC_LABELS[e.field]||e.field}: ${e.msg}</li>`).join("");
      panel.classList.add("show"); panel.scrollIntoView({behavior:"smooth",block:"start"});
      list.querySelectorAll("[data-focus-field]").forEach((i)=>i.addEventListener("click",()=>this.focusField(i.dataset.focusField)));
      this.toast(`يوجد ${errors.length} خطأ في البيانات`,"err"); return false;
    }
    panel.classList.remove("show"); list.innerHTML="";
    this.toast("جميع البيانات صحيحة","ok"); return true;
  },

  focusField(field) {
    const el = document.getElementById(`f-${field}`);
    if(!el) return;
    this.switchTab("form", document.getElementById("tab-form-btn"));
    setTimeout(() => { el.scrollIntoView({behavior:"smooth",block:"center"}); el.focus(); }, 80);
  },

  switchTab(name, sourceButton) {
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".sidebar-link").forEach((l) => { if(l.dataset.tabLink) l.classList.toggle("active", l.dataset.tabLink===name); });
    document.getElementById(`tab-${name}`)?.classList.add("active");
    if(sourceButton?.classList.contains("tab")) sourceButton.classList.add("active");
    else document.getElementById(`tab-${name}-btn`)?.classList.add("active");
    if(name==="preview") this.renderPreview();
    if(name==="form") this.initSigPads();
    if(name==="tools"){ const b=num(this.state.priceTotal); if(b){document.getElementById("cur-syp-input").value=b; this.convertCurrency(b);} }
  },

  scrollTo(id) {
    this.switchTab("form", document.getElementById("tab-form-btn"));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({behavior:"smooth"}), 50);
  },

  applyTemplate(name) {
    const t = TEMPLATES[name]; if(!t) return;
    Object.entries(t).forEach(([k,v]) => { this.state[k]=v; const el=document.getElementById(`f-${k}`); if(el) el.value=v; });
    this.recalc(); this.renderPreview(); this.updateProgress();
    this.toast(`تم تطبيق قالب: ${{apartment:"شقة",villa:"فيلا",land:"أرض",commercial:"محل تجاري",farm:"مزرعة"}[name]}`);
  },

  resetToDefault() {
    this._confirm("هل تريد مسح جميع البيانات؟", () => {
      this.state = { ...DEFAULT_DATA };
      SIGNATURE_NAMES.forEach((n) => delete this.state[`sig_${n}`]);
      this.populateForm(); this.recalc(); this.clearSignatureCanvases();
      this.renderPreview(); this.updateProgress();
      document.getElementById("val-panel").classList.remove("show");
      this.toast("تم مسح جميع البيانات");
    });
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.state,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `عقد-بيع-${this.state.contractNumber||"جديد"}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    this.toast("تم تصدير الملف");
  },

  exportHTML() {
    const qr  = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                  this.state.sellerName, this.state.buyerName,
                                  `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
    const body = buildContractHTML(this.state, qr, "", null, this._docLang);
    const dir = this._docLang === 'en' ? 'ltr' : 'rtl';

    const html = `<!DOCTYPE html>
<html lang="${this._docLang === 'en' ? 'en' : 'ar'}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>عقد بيع قطعي — ${esc(this.state.contractNumber || "جديد")}</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./doc.css">
<style>
body { background:#d0c8b8; padding:20px; margin:0; }
.page { margin:0 auto 24px; box-shadow:0 4px 20px rgba(0,0,0,.2); }
@media print {
  body { background:#fff; padding:0; }
  .page { box-shadow:none; margin:0; page-break-after:always; }
}
</style>
</head>
<body>
<!-- عقد بيع قطعي — نسخة أرشيفية مستقلة -->
<!-- تاريخ الإنشاء: ${new Date().toLocaleString("ar-SY")} -->
<!-- كود التحقق: ${documentHash(this.state)} -->
${body}
<div style="text-align:center;padding:16px;font-size:9pt;color:#888;font-family:Arial,sans-serif;direction:ltr;">
  Generated by نظام عقود البيع القطعي · ${new Date().toISOString().split("T")[0]} · Hash: ${documentHash(this.state)}
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `عقد-${this.state.contractNumber || "جديد"}-${this.state.contractDate || "بلاتاريخ"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast("تم حفظ ملف HTML","ok");
  },

  importJSON() { document.getElementById("import-input").click(); },

  handleImport(input) {
    const file = input.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.state = { ...DEFAULT_DATA, ...JSON.parse(e.target.result) };
        this.populateForm(); this.recalc(); this.renderPreview();
        this.updateProgress(); this.initSigPads(true);
        this.toast("تم استيراد الملف بنجاح");
      } catch { this.toast("خطأ في قراءة الملف","err"); }
      finally { input.value=""; }
    };
    reader.readAsText(file);
  },

  shareEmail() {
    const {total,cur} = calcState(this.state);
    const d = this.state;
    const defaultSubject = `عقد بيع قطعي رقم ${d.contractNumber}`;
    const defaultBody =
`عقد بيع قطعي
─────────────────────────────
رقم العقد:  ${d.contractNumber}
التاريخ:    ${formatArabicDate(d.contractDate, _lang)}
مكان التحرير: ${d.placeDate || "—"}

الفريق الأول (البائع):  ${d.sellerName || "—"}
الفريق الثاني (المشتري): ${d.buyerName || "—"}

العقار: ${d.propertyType || "—"} · ${d.propertyZone || "—"}
المساحة: ${d.propertyArea || "—"} م²
الثمن الإجمالي: ${total ? fmt(total)+" "+cur : "—"}
العربون: ${d.deposit ? fmt(Number(num(d.deposit)))+" "+cur : "—"}

يرجى مراجعة العقد والتواصل لأي استفسار.`;

    let modal = document.getElementById("email-modal");
    if(modal) modal.remove();
    modal = document.createElement("div");
    modal.id = "email-modal";
    modal.style.cssText = "position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;";
    modal.innerHTML = `
      <div style="background:var(--shell);border:1px solid rgba(255,255,255,.1);width:560px;max-height:90vh;overflow-y:auto;font-family:'Amiri',serif;direction:rtl;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);">
          <span style="font-size:14px;font-weight:700;color:#f0e8d4;">📧 مشاركة العقد بالبريد الإلكتروني</span>
          <button id="email-close" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:4px;">إلى (المستلم)</label>
            <input id="email-to" type="email" value="${esc(d.buyerEmail || d.sellerEmail || "")}" placeholder="example@email.com" style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:13px;direction:ltr;">
            <div style="display:flex;gap:6px;margin-top:5px;">
              ${d.sellerEmail?`<button class="btn btn-ghost btn-xs email-preset" data-email="${esc(d.sellerEmail)}">${esc(d.sellerName||"البائع")}</button>`:""}
              ${d.buyerEmail?`<button class="btn btn-ghost btn-xs email-preset" data-email="${esc(d.buyerEmail)}">${esc(d.buyerName||"المشتري")}</button>`:""}
            </div>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:4px;">الموضوع</label>
            <input id="email-subject" type="text" value="${esc(defaultSubject)}" style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:13px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:4px;">نص الرسالة</label>
            <textarea id="email-body" rows="10" style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:12px;resize:vertical;">${esc(defaultBody)}</textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:4px;">
            <button id="email-send" class="btn btn-gold">فتح في تطبيق البريد</button>
            <button id="email-copy" class="btn btn-ghost">نسخ النص</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("email-close").onclick = () => modal.remove();
    modal.addEventListener("click", e => { if(e.target===modal) modal.remove(); });
    modal.querySelectorAll(".email-preset").forEach(btn => { btn.onclick = () => { document.getElementById("email-to").value = btn.dataset.email; }; });
    document.getElementById("email-send").onclick = () => {
      const to = document.getElementById("email-to").value.trim();
      const subject = encodeURIComponent(document.getElementById("email-subject").value);
      const body    = encodeURIComponent(document.getElementById("email-body").value);
      window.open(`mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`);
      modal.remove();
    };
    document.getElementById("email-copy").onclick = () => {
      navigator.clipboard?.writeText(document.getElementById("email-body").value)
        .then(() => this.toast("تم نسخ النص","ok"))
        .catch(() => this.toast("تعذر النسخ","err"));
    };
  },

  toggleLang() {
    this._docLang = this._docLang === 'ar' ? 'en' : 'ar';
    const btn = document.getElementById("lang-toggle-btn");
    if(btn) btn.textContent = this._docLang === 'en' ? 'عربي' : 'English';
    this.renderPreview();
    this.toast(this._docLang === 'en' ? "Document language: English" : "لغة الوثيقة: العربية", "ok");
  },



  initSigPads(force=false) {
    SIGNATURE_NAMES.forEach((name) => {
      const canvas = document.getElementById(`sig-${name}`);
      if(!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if(rect.width === 0 && !force) {
        const ro = new ResizeObserver((entries, observer) => {
          if(entries[0].contentRect.width > 0) { observer.disconnect(); this.initSigPads(true); }
        });
        ro.observe(canvas); return;
      }
      if(this._sigPads[name] && !force) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
      ctx.strokeStyle="#1c1712"; ctx.lineWidth=1.8; ctx.lineCap="round"; ctx.lineJoin="round";
      let drawing=false, lastX=0, lastY=0;
      const getPos = (e) => { const r=canvas.getBoundingClientRect(), p=e.touches?e.touches[0]:e; return [p.clientX-r.left,p.clientY-r.top]; };
      const start = (e) => { e.preventDefault(); drawing=true; [lastX,lastY]=getPos(e); ctx.beginPath(); ctx.moveTo(lastX,lastY); };
      const move  = (e) => { if(!drawing) return; e.preventDefault(); const [x,y]=getPos(e); ctx.lineTo(x,y); ctx.stroke(); lastX=x; lastY=y; };
      const end   = () => { if(!drawing) return; drawing=false; this.saveSig(name,canvas); };
      canvas.onmousedown=start; canvas.onmousemove=move; canvas.onmouseup=end; canvas.onmouseleave=end;
      canvas.ontouchstart=start; canvas.ontouchmove=move; canvas.ontouchend=end;
      this._sigPads[name]={canvas,ctx};
      this.redrawSignature(name);
    });
  },

  redrawSignature(name) {
    const pad = this._sigPads[name]; if(!pad) return;
    const {canvas,ctx} = pad;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const data = this.state[`sig_${name}`]; if(!data) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
    img.src = data;
  },

  saveSig(name, canvas) { this.state[`sig_${name}`]=canvas.toDataURL(); this._dirty=true; this.renderPreview(); },
  clearSig(name) {
    const pad=this._sigPads[name]; if(!pad) return;
    pad.ctx.clearRect(0,0,pad.canvas.width,pad.canvas.height);
    this.state[`sig_${name}`]=""; this.renderPreview();
  },
  clearSignatureCanvases() { SIGNATURE_NAMES.forEach((n) => this.clearSig(n)); },

  updateCNPreview() {
    const prefix = document.getElementById("cn-prefix")?.value || "RG";
    const year   = document.getElementById("cn-year")?.value   || new Date().getFullYear();
    const seq    = String(document.getElementById("cn-seq")?.value||1).padStart(3,"0");
    document.getElementById("cn-preview").textContent = `${prefix}-${year}-${seq}`;
  },

  applyCN() {
    const v = document.getElementById("cn-preview").textContent;
    this.state.contractNumber = v;
    document.getElementById("f-contractNumber").value = v;
    this.renderPreview(); this.toast(`تم تطبيق رقم العقد: ${v}`);
  },

  convertCurrency(value) {
    const syp = parseFloat(String(value).replace(/,/g,"")) || 0;
    const pretty = (n) => n>=1000 ? new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n) : n.toFixed(2);
    document.getElementById("cur-syp").textContent = syp ? new Intl.NumberFormat("en-US").format(syp) : "—";
    document.getElementById("cur-usd").textContent = syp ? pretty(syp*this._rates.USD) : "—";
    document.getElementById("cur-eur").textContent = syp ? pretty(syp*this._rates.EUR) : "—";
    document.getElementById("cur-try").textContent = syp ? pretty(syp*this._rates.TRY) : "—";
  },

  generateQR(text) {
    // Alltid synkront — returnerar aldrig Promise
    // Försöker QRious om tillgängligt, annars inbyggd fallback
    if (typeof QRious !== "undefined") {
      try {
        const qr = new QRious({
          value: text.slice(0, 100),
          size: 256,
          foreground: "#1c1712",
          background: "#ffffff",
          level: "M"
        });
        return qr.toDataURL();
      } catch(e) {}
    }
    return this._qrFallback(text);
  },

  _qrFallback(text) {
    const size = 21; const sc = 6;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * sc;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#1c1712";
    const dot = (r,c) => ctx.fillRect(c*sc, r*sc, sc, sc);
    const finder = (row,col) => {
      for(let r=0;r<7;r++) for(let c=0;c<7;c++) {
        if(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4)) dot(row+r,col+c);
      }
      ctx.fillStyle="#fff";
      for(let i=0;i<8;i++){dot(row+7,col+i);dot(row+i,col+7);}
      ctx.fillStyle="#1c1712";
    };
    finder(0,0); finder(0,size-7); finder(size-7,0);
    for(let i=8;i<size-8;i+=2){dot(6,i);dot(i,6);}
    let h=0; for(let i=0;i<text.length;i++) h=((h<<5)-h+text.charCodeAt(i))|0;
    let rng=Math.abs(h)|1;
    const skip=(r,c)=>(r<9&&c<9)||(r<9&&c>=size-8)||(r>=size-8&&c<9)||(r===6)||(c===6);
    for(let r=0;r<size;r++) for(let c=0;c<size;c++){
      if(skip(r,c)) continue;
      rng=(rng*1664525+1013904223)&0x7fffffff;
      if(rng&1) dot(r,c);
    }
    return canvas.toDataURL();
  },

  renderPreview() {
    // doc-preview.css laddas via <link> i index.html — ingen dynamisk injektion
    if(!document.getElementById("preview-styles-link")){
      const lnk=document.createElement("link");
      lnk.id="preview-styles-link"; lnk.rel="stylesheet"; lnk.href="./doc-preview.css";
      document.head.appendChild(lnk);
    }
    if(!document.getElementById("tooltip-styles")){
      const s=document.createElement("style"); s.id="tooltip-styles";
      s.textContent=`
.field-help{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-right:4px;font-size:9px;color:var(--mid);background:var(--field);border:1px solid var(--faint);border-radius:50%;cursor:help;position:relative;flex-shrink:0;line-height:1;transition:background .15s;}
.field-help:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
.field-help::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);right:50%;transform:translateX(50%);width:200px;padding:6px 10px;font-size:11px;line-height:1.5;color:#e8e0d0;background:var(--shell);border:1px solid rgba(255,255,255,.1);border-radius:2px;white-space:normal;text-align:right;pointer-events:none;opacity:0;transition:opacity .15s;z-index:200;}
.field-help:hover::after{opacity:1;}`;
      document.head.appendChild(s);
    }
    try {
      const qr = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                    this.state.sellerName, this.state.buyerName,
                                    `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
      const wrap = document.getElementById("doc-wrap");
      if(!wrap) return;
      wrap.innerHTML = buildContractHTML(this.state, qr, "p", null, this._docLang);
    } catch(e) {
      console.error("renderPreview fel:", e);
      // Visa felet i doc-wrap så det syns i webbläsaren
      const wrap = document.getElementById("doc-wrap");
      if(wrap) wrap.innerHTML = `<div style="padding:20px;color:red;font-family:monospace;direction:ltr;">${e.message}<br>${e.stack||""}</div>`;
    }
  },

  print() {
    // Öppna modal för att välja kopia-typ
    this._showCopyModal((type) => {
      const s = { ...this.state, _copyType: type };
      PrintModule.execute(s, (text) => this.generateQR(text));
    });
  },

  _showCopyModal(callback) {
    let m = document.getElementById("copy-modal");
    if(m) m.remove();
    m = document.createElement("div");
    m.id = "copy-modal";
    m.style.cssText = "position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;";
    m.innerHTML = `
      <div style="background:var(--shell);border:1px solid rgba(255,255,255,.12);width:360px;font-family:'Amiri',serif;direction:rtl;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;font-weight:700;color:#f0e8d4;">اختر نوع النسخة للطباعة</div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
          <button class="copy-choice" data-type="original" style="padding:12px 16px;background:#2c4a3e;color:#fff;border:none;font-family:'Amiri',serif;font-size:13px;font-weight:700;cursor:pointer;text-align:right;">النسخة الأصلية</button>
          <button class="copy-choice" data-type="seller"   style="padding:12px 16px;background:#5a3a2e;color:#fff;border:none;font-family:'Amiri',serif;font-size:13px;font-weight:700;cursor:pointer;text-align:right;">نسخة البائع</button>
          <button class="copy-choice" data-type="buyer"    style="padding:12px 16px;background:#9a7d45;color:#fff;border:none;font-family:'Amiri',serif;font-size:13px;font-weight:700;cursor:pointer;text-align:right;">نسخة المشتري</button>
          <button class="copy-choice" data-type=""         style="padding:12px 16px;background:rgba(255,255,255,.06);color:#c8bfa8;border:1px solid rgba(255,255,255,.1);font-family:'Amiri',serif;font-size:13px;cursor:pointer;text-align:right;">بدون تمييز</button>
        </div>
        <div style="padding:0 16px 16px;"><button id="copy-cancel" style="width:100%;padding:8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);font-family:'Amiri',serif;font-size:12px;cursor:pointer;">إلغاء</button></div>
      </div>`;
    document.body.appendChild(m);
    m.querySelectorAll(".copy-choice").forEach(btn => {
      btn.onclick = () => { m.remove(); callback(btn.dataset.type || null); };
    });
    document.getElementById("copy-cancel").onclick = () => m.remove();
    m.addEventListener("click", e => { if(e.target===m) m.remove(); });
  },

  savePDF() {
    this._showCopyModal((type) => {
      this._doSavePDF(type);
    });
  },

  _doSavePDF(copyType) {
    // Använder print-popup med @page CSS — identisk med print()-metoden
    // men med destination-title "Save as PDF" hint
    const qr   = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                   this.state.sellerName, this.state.buyerName,
                                   `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
    const body = buildContractHTML(this.state, qr, "", copyType || null, this._docLang);
    const dir  = this._docLang === 'en' ? 'ltr' : 'rtl';
    const filename = `عقد-بيع-${this.state.contractNumber||"جديد"}.pdf`;

    const html = `<!DOCTYPE html><html lang="${this._docLang||'ar'}" dir="${dir}"><head>
<meta charset="UTF-8">
<title>${esc(filename)}</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./doc.css">
</head><body>${body}</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if(!win){ this.toast("يرجى السماح بالنوافذ المنبثقة","err"); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // انتظر تحميل الخطوط ثم اطبع
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 800);
    };
    this.toast("اختر 'حفظ بصيغة PDF' في نافذة الطباعة","ok");
  },


  // Generell bekräftelsedialog — ersätter window.confirm
  _confirm(msg, onOk, onCancel) {
    let m = document.getElementById("confirm-modal");
    if(m) m.remove();
    m = document.createElement("div");
    m.id = "confirm-modal";
    m.style.cssText = "position:fixed;inset:0;z-index:800;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;";
    m.innerHTML = `
      <div style="background:var(--shell);border:1px solid rgba(255,255,255,.12);width:380px;font-family:'Amiri',serif;direction:rtl;overflow:hidden;">
        <div style="padding:20px 22px;font-size:13px;line-height:1.7;color:#e8e0d0;">${msg}</div>
        <div style="display:flex;gap:8px;padding:0 22px 18px;justify-content:flex-end;">
          <button id="confirm-ok"     style="padding:8px 20px;background:var(--danger);color:#fff;border:none;font-family:'Amiri',serif;font-size:13px;font-weight:700;cursor:pointer;">تأكيد</button>
          <button id="confirm-cancel" style="padding:8px 20px;background:rgba(255,255,255,.08);color:#c8bfa8;border:1px solid rgba(255,255,255,.1);font-family:'Amiri',serif;font-size:13px;cursor:pointer;">إلغاء</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    document.getElementById("confirm-ok").onclick     = () => { m.remove(); onOk?.(); };
    document.getElementById("confirm-cancel").onclick = () => { m.remove(); onCancel?.(); };
    m.addEventListener("click", e => { if(e.target===m){ m.remove(); onCancel?.(); } });
  },

  toast(msg, type="") {
    const wrap = document.getElementById("toast-wrap");
    const el   = document.createElement("div");
    el.className = "toast";
    el.style.borderRightColor = type==="err"?"var(--danger)":type==="ok"?"#2e7d52":"var(--gold)";
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("show")));
    setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(),300); },2800);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
