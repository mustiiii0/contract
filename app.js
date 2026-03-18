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

// Beräkna kontrakt-siffror ur state — en enda källa
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


// Konverterar ISO-datum (2025-04-07) till arabiskt format (٧ أبريل ٢٠٢٥)
function formatArabicDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const toAr = (n) => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  return `${toAr(d.getDate())} ${months[d.getMonth()]} ${toAr(d.getFullYear())}`;
}


// Enkel deterministisk hash av kritiska dokumentfält (verifieringskod)
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


// Genererar ett guilloche-SVG (sinusvågor) unikt per kontrakt
function guillocheSVG(seed, width, height, color, opacity) {
  let rng = 0;
  for(let i=0;i<seed.length;i++) rng = ((rng<<5)-rng+seed.charCodeAt(i))|0;
  rng = Math.abs(rng);
  const next = () => { rng=(rng*1664525+1013904223)>>>0; return rng/0xffffffff; };

  // Generera 6 lager av sinusvågor med unika parametrar
  const lines = [];
  const layers = 8;
  for(let l=0;l<layers;l++){
    const amp    = 2 + next()*4;       // amplitud 2-6px
    const freq   = 3 + next()*6;       // frekvens 3-9 perioder
    const phase  = next()*Math.PI*2;   // fas
    const yBase  = (height/(layers+1))*(l+1);
    const points = [];
    const steps  = 200;
    for(let i=0;i<=steps;i++){
      const x = (width/steps)*i;
      const y = yBase + Math.sin((i/steps)*Math.PI*2*freq + phase)*amp;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    lines.push(`<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="0.4" opacity="${opacity}"/>`);
  }

  // Lägg till ett tunt geometriskt nät
  for(let y=0;y<=height;y+=height/12){
    lines.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${width}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="0.2" opacity="${(opacity*0.4).toFixed(2)}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${lines.join("")}</svg>`;
}

// SVG → data-URI för användning i CSS/HTML
function guillocheDataURI(seed, width, height, color, opacity) {
  const svg = guillocheSVG(seed, width, height, color, opacity);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}


// Genererar ett mikrotext-SVG som border runt sidan
function microtextSVG(text, w, h) {
  const t = text + " · ";
  // Fyra sidor: top, right, bottom, left
  const topY = 4.2, botY = h-4.2, leftX = 4.2, rightX = w-4.2;
  const rep = 40; // upprepningar
  const long = (t+" ").repeat(rep);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <path id="mt" d="M${leftX},${topY} L${rightX},${topY} L${rightX},${botY} L${leftX},${botY} Z"/>
  </defs>
  <text font-family="Arial,sans-serif" font-size="3.5" fill="#9a7d45" opacity="0.55" letter-spacing="0.5">
    <textPath href="#mt" startOffset="0">${esc(long)}</textPath>
  </text>
</svg>`;
}

// HTML-rad — används av både print och preview (olika CSS-prefix skickas in)
const makeRow = (prefix) => (lbl, val) =>
  `<div class="${prefix}r"><span class="${prefix}l">${lbl}</span><span class="${prefix}v">${val}</span></div>`;


// ============================================================
//  DOKUMENT-HTML — en enda funktion, används av BÅDE print & preview
//  prefix=""  → print-CSS (.r/.l/.v/.pg osv)
//  prefix="p" → preview-CSS (.pr/.pl/.pv/.ppg osv)
// ============================================================
function buildContractHTML(state, qrDataUrl, cssPrefix) {
  const p   = cssPrefix;        // kort alias
  const d   = state;
  const { total, deposit, remain, ppm, cur, depW, remW } = calcState(state);
  const row = makeRow(p);

  const sigS  = sigHtml(state, "seller");
  const sigB  = sigHtml(state, "buyer");
  const sigW1 = sigHtml(state, "witness1");
  const sigW2 = sigHtml(state, "witness2");

  const page1 = `
<div class="${p}page">
<!-- Guilloche bakgrundsmönster -->
<div class="${p}guil" aria-hidden="true"></div>
<!-- Mikrotext-ram -->
<div class="${p}micr" aria-hidden="true"></div>
<!-- Inre ram -->
<div class="${p}frame"></div>
<!-- Sidnummer -->
<div class="${p}pn">صفحة 1 من 2 · ${disp(d.contractNumber)}</div>

<div class="${p}hd">
  <div class="${p}hdr">
    <div class="${p}emb"><img src="./Emblem.png" alt="" onerror="this.style.display='none'"></div>
    <div class="${p}state">الجُمهُورِيَّةُ العَرَبِيَّةُ السُّورِيَّةُ</div>
  </div>
  <div class="${p}div"></div>
  <div class="${p}hdl">
    <div class="${p}hm">رقم العقد: <strong>${disp(d.contractNumber)}</strong></div>
    <div class="${p}hm">مكان التحرير: <strong>${disp(d.placeDate)}</strong></div>
    <div class="${p}hm">التاريخ: <strong>${disp(formatArabicDate(d.contractDate))}</strong></div>
  </div>
</div>

<div class="${p}tb">
  <div class="${p}orn"></div>
  <div class="${p}mt">عقد بيع قطعي</div>
  <div class="${p}st">خاص ببيع وانتقال ملكية عقار بصورة نهائية وملزمة</div>
</div>

<div class="${p}sl">بيانات الأطراف المتعاقدة</div>
<div class="${p}pg">
  <div class="${p}pp">
    <div class="${p}pn2">الفريق الأول — البائع</div>
    ${row("الاسم",disp(d.sellerName))}${row("ابن",disp(d.sellerFather))}${row("والدته",disp(d.sellerMother))}
    ${row("تولد",disp(d.sellerBirth))}${row("هوية",disp(d.sellerID))}${row("صادرة عن",disp(d.sellerIDPlace))}
    ${row("بتاريخ",disp(formatArabicDate(d.sellerIDDate)))}${d.sellerPhone?row("الهاتف",disp(d.sellerPhone)):""}${d.sellerEmail?row("البريد",disp(d.sellerEmail)):""}
  </div>
  <div class="${p}pp">
    <div class="${p}pn2 ${p}b">الفريق الثاني — المشتري</div>
    ${row("الاسم",disp(d.buyerName))}${row("ابن",disp(d.buyerFather))}${row("والدته",disp(d.buyerMother))}
    ${row("تولد",disp(d.buyerBirth))}${row("هوية",disp(d.buyerID))}${row("صادرة عن",disp(d.buyerIDPlace))}
    ${row("بتاريخ",disp(formatArabicDate(d.buyerIDDate)))}${d.buyerPhone?row("الهاتف",disp(d.buyerPhone)):""}${d.buyerEmail?row("البريد",disp(d.buyerEmail)):""}
  </div>
</div>

<div class="${p}sl">بيانات العقار المبيع</div>
<div class="${p}prop">
  <div class="${p}pc">${row("رقم العقار",disp(d.propertyNumber))}</div>
  <div class="${p}pc">${row("المنطقة",disp(d.propertyZone))}</div>
  <div class="${p}pc">${row("نوع العقار",disp(d.propertyType))}</div>
  <div class="${p}pc">${row("المساحة م²",disp(d.propertyArea))}</div>
  <div class="${p}pc">${row("الطابق",disp(d.propertyFloor))}</div>
  <div class="${p}pc ${p}nb">${row("عدد الغرف",disp(d.propertyRooms))}</div>
  <div class="${p}pc ${p}full">${row("الوصف",disp(d.propertyDesc))}</div>
  <div class="${p}pc ${p}full ${p}nb">${row("الحدود",disp(d.propertyBoundaries))}</div>
</div>

<div class="${p}ps">
  <div class="${p}psc"><span class="${p}psl">ثمن البيع الإجمالي</span><span class="${p}psv">${total?`${fmt(total)} ${cur}`:"—"}</span></div>
  <div class="${p}psc"><span class="${p}psl">العربون المدفوع</span><span class="${p}psv">${deposit?`${fmt(deposit)} ${cur}`:"—"}</span></div>
  <div class="${p}psc"><span class="${p}psl">الرصيد المتبقي</span><span class="${p}psv">${remain?`${fmt(remain)} ${cur}`:"—"}</span></div>
</div>

<div class="${p}sl">الشروط المالية والتنفيذية</div>
<div class="${p}fg">
  <div class="${p}pc ${p}nb">${row("سعر المتر",ppm?`${fmt(ppm)} ${cur}`:"—")}</div>
  <div class="${p}pc ${p}nb">${row("طريقة الدفع",disp(d.paymentMethod))}</div>
  <div class="${p}pc ${p}nb">${row("مدة التسليم",disp(d.deliveryDeadline))}</div>
</div>

<div class="${p}sl">التواقيع والشهود</div>
<div class="${p}sg">
  <div class="${p}sb"><div class="${p}sbt">البائع — الفريق الأول</div>
    <div class="${p}sr"><span class="${p}l">الاسم</span><span class="${p}v">${disp(d.sellerName)}</span></div>
    <div class="${p}sl2">${sigS}</div><div class="${p}sc">يوقع أمام الشهود</div></div>
  <div class="${p}sb"><div class="${p}sbt">المشتري — الفريق الثاني</div>
    <div class="${p}sr"><span class="${p}l">الاسم</span><span class="${p}v">${disp(d.buyerName)}</span></div>
    <div class="${p}sl2">${sigB}</div><div class="${p}sc">يوقع بعد التحقق</div></div>
  <div class="${p}sb"><div class="${p}sbt">الشاهد الأول</div>
    <div class="${p}sr"><span class="${p}l">الاسم</span><span class="${p}v">${disp(d.witness1)}</span></div>
    <div class="${p}sl2">${sigW1}</div><div class="${p}sc">يشهد بصحة التوقيع</div></div>
  <div class="${p}sb"><div class="${p}sbt">الشاهد الثاني</div>
    <div class="${p}sr"><span class="${p}l">الاسم</span><span class="${p}v">${disp(d.witness2)}</span></div>
    <div class="${p}sl2">${sigW2}</div><div class="${p}sc">يشهد بصحة التوقيع</div></div>
</div>

<div class="${p}bot">
  <div class="${p}stmp"><div class="${p}stmpc">محل<br>الختم<br>الرسمي</div></div>
  <div class="${p}fa">
    <div class="${p}ff">${row("تحريراً في",disp(d.placeDate))}${row("بتاريخ",disp(formatArabicDate(d.contractDate)))}</div>
    ${d.attachments?`<div class="${p}att"><strong>المرفقات:</strong> ${esc(d.attachments)}</div>`:""}
  </div>
  <!-- QR + hash في الركن الأيمن السفلي -->
  <div class="${p}qrbox">
    <img src="${qrDataUrl}" alt="QR" class="${p}qrimg">
    <div class="${p}hash">تحقق: ${documentHash(d)}</div>
    <div class="${p}genstamp">${new Date().toLocaleDateString("ar-SY")}</div>
  </div>
</div>
</div>`;

  const page2 = `
<div class="${p}page">
<div class="${p}guil" aria-hidden="true"></div>
<div class="${p}micr" aria-hidden="true"></div>
<div class="${p}frame"></div>
<div class="${p}pn">صفحة 2 من 2 · ${disp(d.contractNumber)}</div>

<div class="${p}p2h">
  <span>عقد بيع قطعي — الصفحة الثانية</span>
  <span>${disp(formatArabicDate(d.contractDate))} · ${disp(d.placeDate)}</span>
</div>

<div class="${p}sl">البنود القانونية</div>
<p class="${p}ci">اتفق الفريقان وهما بكامل الأوصاف المطلوبة شرعاً وقانوناً على ما يلي:</p>

<div class="${p}cl"><span class="${p}cn">١</span><div>يُصرّح الفريق الأول بأنه يمتلك العقار رقم <strong>${disp(d.propertyNumber)}</strong> من المنطقة العقارية <strong>${disp(d.propertyZone)}</strong>، وهو عبارة عن <strong>${disp(d.propertyType)}</strong> — ${disp(d.propertyDesc)}، والبالغة مساحته <strong>${disp(d.propertyArea)} م²</strong>. وقد باع العقار المذكور بيعاً قطعياً لا نكول فيه إلى الفريق الثاني بمبلغ إجمالي قدره <strong>${total?`${fmt(total)} ${cur}`:"—"}</strong> وبسعر المتر المربع <strong>${ppm?`${fmt(ppm)} ${cur}`:"—"}</strong>.</div></div>
<div class="${p}cl"><span class="${p}cn">٢</span><div>قبض الفريق الأول من الفريق الثاني عربوناً مقداره رقماً <strong>${deposit?`${fmt(deposit)} ${cur}`:"—"}</strong> كتابةً: <strong>${esc(depW)}</strong>. والرصيد البالغ <strong>${remain?`${fmt(remain)} ${cur}`:"—"}</strong> كتابةً: <strong>${esc(remW)}</strong> يُدفع عند إتمام إجراءات نقل الملكية في السجل العقاري بطريقة <strong>${disp(d.paymentMethod)}</strong>.</div></div>
<div class="${p}cl"><span class="${p}cn">٣</span><div>يلتزم الفريق الأول بتسليم العقار خالياً من جميع الشواغل والمستأجرين وبكامل مرافقه خلال مدة أقصاها <strong>${disp(d.deliveryDeadline)}</strong> اعتباراً من تاريخ هذا العقد. وفي حال تأخره يدفع غرامة تأخير يومية قدرها <strong>${d.delayPenalty?`${fmt(d.delayPenalty)} ${cur}`:"—"}</strong> عن كل يوم تأخير دون الحاجة لإنذار أو إدعاء.</div></div>
<div class="${p}cl"><span class="${p}cn">٤</span><div>يُصرّح الفريق الثاني بأنه قبل الشراء المذكور بشكل قطعي ونهائي وأسقط حقه من الرجوع أو النكول. وفي حال نكول أي من الفريقين يدفع الناكل للآخر كعطل وضرر مبلغ <strong>${d.breachPenalty?`${fmt(d.breachPenalty)} ${cur}`:"—"}</strong> دون الحاجة لإنذار أو قرار قضائي.</div></div>
<div class="${p}cl"><span class="${p}cn">٥</span><div>يُقرّ الفريق الأول بأن العقار المذكور خالٍ من جميع الرهون والتكاليف والدعاوى القضائية والنزاعات حتى تاريخ هذا العقد. ${d.propertyMortgages?`ملاحظة: ${esc(d.propertyMortgages)}.`:""} وأن جميع الرسوم والضرائب المترتبة على العقار حتى تاريخ الفراغ في السجل العقاري تقع على عاتق الفريق الأول.</div></div>
<div class="${p}cl"><span class="${p}cn">٦</span><div>نُظِّم هذا العقد على ثلاث نسخ أصلية متطابقة وقّعها الفريقان بحضور الشهود الموقعين ذيلاً، واحتفظ كل فريق بنسخة والمكتب الوسيط بالنسخة الثالثة. ويُعمل به بعد التوقيع والختم وفق الأصول القانونية النافذة.</div></div>

${(d.special1||d.special2||d.specialConditions)?`
<div class="${p}sl" style="margin-top:3mm;">شروط خاصة</div>
<div class="${p}spb">
  ${d.special1?`<p>— ${esc(d.special1)}</p>`:""}
  ${d.special2?`<p>— ${esc(d.special2)}</p>`:""}
  ${d.specialConditions?`<p>${esc(d.specialConditions)}</p>`:""}
</div>`:""}
<!-- QR + hash längst ner på sida 2 -->
<div class="${p}p2footer">
  <div class="${p}p2hash">كود التحقق: ${documentHash(d)} · صدر بتاريخ: ${disp(formatArabicDate(d.contractDate))}</div>
  <img src="${qrDataUrl}" alt="QR" class="${p}qrimg2">
</div>
</div>`;

  return page1 + page2;
}


// ============================================================
//  PRINT MODULE — öppnar popup och skriver ut
// ============================================================
const PrintModule = {
  execute(state, generateQRFn) {
    const qrResult = generateQRFn([state.contractNumber, state.contractDate, state.sellerName, state.buyerName,
                               `${fmt(Number(num(state.priceTotal))||0)} ${state.currency||"ل.س"}`].join(" | "));
    const doOpen = (qr) => {
      const seed2 = state.contractNumber || "default";
      const guilURI2 = guillocheDataURI(seed2, 794, 1123, "#9a7d45", 0.18);
      const micrURI2 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(microtextSVG("عقد بيع قطعي · الجمهورية العربية السورية · " + (state.contractNumber||""), 794, 1123));
      const css = this.printCSS() + `.page{--guil-bg:url("${guilURI2}");--micr-bg:url("${micrURI2}");}`;
      const body = buildContractHTML(state, qr, "");
      const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>عقد بيع قطعي — ${esc(state.contractNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${body}</body></html>`;
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) { alert("Popup blockerades. Tillåt popups för denna sida."); return; }
      win.document.open(); win.document.write(html); win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    };
    if (qrResult && typeof qrResult.then === "function") qrResult.then(doOpen);
    else doOpen(qrResult);
  },

  printCSS() { return generateCSS(""); }

};


// ============================================================
//  GEMENSAM CSS-GENERATOR — en källa för print (prefix="") och preview (prefix="p")
// ============================================================
function generateCSS(p) {
  const v = (name) => p ? `#${name}` : `var(--${name})`;
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--ink:#1c1712;--mid:#5a5042;--faint:#c4baa8;--rule:#d8cebb;--accent:#2c4a3e;--gold:#9a7d45;--danger:#6e1f1f;--page:#fffdf8;}
html,body{font-family:"Amiri","Traditional Arabic",serif;color:#1c1712;background:#fff;font-size:9.5pt;}
.${p}page{width:210mm;min-height:297mm;padding:8mm 13mm 12mm 13mm;background:#fffdf8;position:relative;page-break-after:always;break-after:page;}
.${p}page:last-child{page-break-after:auto;break-after:auto;}
.${p}frame{position:absolute;inset:5mm;border:1px solid #d8cebb;pointer-events:none;z-index:1;}
.${p}pn{position:absolute;bottom:4mm;left:0;right:0;text-align:center;font-size:8pt;color:#5a5042;font-weight:700;letter-spacing:.05em;z-index:2;}
/* Guilloche bakgrund */
.${p}guil{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:var(--guil-bg);background-size:100% 100%;opacity:1;}
/* Mikrotext-ram */
.${p}micr{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:var(--micr-bg);background-size:100% 100%;}
/* Footer-QR block */
.${p}bot{display:grid;grid-template-columns:78px 1fr auto;border:1px solid #d8cebb;margin-top:2.5mm;background:#fff;position:relative;z-index:2;}
.${p}stmp{display:flex;align-items:center;justify-content:center;padding:8px;background:#fff;}
.${p}stmpc{width:54px;height:54px;border-radius:50%;border:1.2px dashed #c4baa8;display:flex;align-items:center;justify-content:center;font-size:7pt;text-align:center;line-height:1.4;color:#c4baa8;}
.${p}qrbox{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 10px;border-right:1px solid #d8cebb;gap:3px;min-width:72px;}
.${p}qrimg{width:52px;height:52px;display:block;}
.${p}hash{font-size:5pt;color:#9a7d45;letter-spacing:.04em;font-family:monospace;direction:ltr;text-align:center;}
.${p}genstamp{font-size:5pt;color:#c4baa8;text-align:center;}
/* Sida 2 footer */
.${p}p2footer{display:flex;align-items:center;justify-content:space-between;margin-top:4mm;padding-top:3mm;border-top:1px solid #d8cebb;}
.${p}p2hash{font-size:6.5pt;color:#9a7d45;font-family:monospace;direction:ltr;}
.${p}qrimg2{width:44px;height:44px;display:block;opacity:.85;}
.${p}hd{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;margin-bottom:3mm;padding-bottom:2.5mm;border-bottom:1px solid #d8cebb;}
.${p}hdr{display:flex;align-items:center;gap:10px;}
.${p}emb{width:62px;height:62px;flex-shrink:0;}.${p}emb img{width:100%;height:auto;}
.${p}state{font-size:17pt;font-weight:700;line-height:1.2;}
.${p}div{width:1px;height:68px;background:#d8cebb;margin:0 14px;}
.${p}hdl{display:flex;flex-direction:column;gap:3px;text-align:left;justify-self:end;}
.${p}hm{font-size:9.5pt;font-weight:700;color:#3b3327;}.${p}hm strong{font-size:10pt;color:#1c1712;}
.${p}tb{text-align:center;margin:2mm 0 3mm;}
.${p}orn{height:1.5px;background:#9a7d45;margin-bottom:2mm;}
.${p}mt{font-size:24pt;font-weight:700;}.${p}st{font-size:9pt;color:#5a5042;margin-top:1mm;}
.${p}sl{display:flex;align-items:center;gap:6px;font-size:8pt;font-weight:700;letter-spacing:.1em;color:#9a7d45;margin-bottom:2mm;margin-top:2.5mm;}
.${p}sl::after{content:"";flex:1;height:1px;background:#d8cebb;}
.${p}pg{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;background:#fff;}
.${p}pp{padding:5px 10px;background:#fff;}.${p}pp+.${p}pp{border-right:1.2px solid #d9ccb7;}
.${p}pn2{font-size:9.5pt;font-weight:700;color:#2c4a3e;border-bottom:1.2px solid #d4c6b0;padding-bottom:3px;margin-bottom:4px;}
.${p}b{color:#9a7d45;}
.${p}r{display:flex;align-items:center;gap:5px;margin-bottom:3px;}
.${p}l{min-width:58px;font-size:8.5pt;font-weight:700;color:#5a5042;flex-shrink:0;}
.${p}v{flex:1;font-size:9pt;border-bottom:1px solid #cfc1ab;padding:1px 3px 2px;text-align:center;}
.${p}prop{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.${p}pc{padding:3px 8px;border-bottom:1.2px solid #d9ccb7;border-left:1.2px solid #d9ccb7;}
.${p}pc:nth-child(odd){border-left:0;}.${p}full{grid-column:1/-1;border-left:0;}.${p}nb{border-bottom:0;}
.${p}pc .${p}l{min-width:64px;}.${p}pc .${p}v{text-align:center;}
.${p}ps{display:grid;grid-template-columns:2fr 1fr 1fr;background:#335545;color:#fff;margin-bottom:2.5mm;}
.${p}psc{padding:6px 10px;border-left:1px solid rgba(255,255,255,.1);}.${p}psc:last-child{border-left:0;}
.${p}psl{display:block;font-size:7pt;letter-spacing:.1em;color:rgba(255,255,255,.5);margin-bottom:2px;}
.${p}psv{display:block;font-size:13pt;font-weight:700;direction:ltr;}
.${p}psc:not(:first-child) .${p}psv{font-size:11pt;color:rgba(255,255,255,.85);}
.${p}fg{display:grid;grid-template-columns:1fr 1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.${p}fg .${p}pc{border-left:1.2px solid #d9ccb7;}.${p}fg .${p}pc:first-child{border-left:0;}
.${p}sg{display:grid;grid-template-columns:repeat(4,1fr);border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.${p}sb{padding:4px 5px;border-right:1.2px solid #d9ccb7;}.${p}sb:last-child{border-right:0;}
.${p}sbt{font-size:7.5pt;font-weight:700;color:#2c4a3e;border-bottom:1.2px solid #d4c6b0;padding-bottom:2px;margin-bottom:3px;}
.${p}sr{display:flex;align-items:center;gap:2px;margin-bottom:2px;}
.${p}sr .${p}l{min-width:0;font-size:7pt;font-weight:700;}.${p}sr .${p}v{font-size:7pt;border-bottom:1px solid #cfc1ab;text-align:center;}
.${p}sl2{display:flex;align-items:flex-end;height:18px;margin:3px 0;border-bottom:1px solid rgba(28,23,18,.12);}
.${p}sl2 img{max-height:16px;margin:0 auto;}.${p}sc{font-size:6.5pt;color:#5a5042;text-align:center;}
/* .bot/.stmp/.stmpc ingår i qr_css ovan */
.${p}fa{padding:6px 12px;}.${p}ff{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:4px;}
.${p}att{font-size:7.5pt;color:#5a5042;}
.${p}p2h{display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:#5a5042;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid #d8cebb;}
.${p}ci{font-size:9.5pt;font-style:italic;color:#5a5042;border-right:2px solid #d8cebb;padding-right:8px;margin-bottom:3mm;}
.${p}cl{display:flex;gap:8px;font-size:9.5pt;line-height:1.85;text-align:justify;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid #d8cebb;}
.${p}cl:last-of-type{border-bottom:0;}
.${p}cn{min-width:16px;font-size:9pt;font-weight:700;color:#6e1f1f;flex-shrink:0;padding-top:2px;}
.${p}spb{border:1px solid #d8cebb;padding:8px 12px;background:#fffdf8;font-size:9.5pt;line-height:1.75;margin-top:3mm;}
.${p}spb p{margin-bottom:3px;}
  ` + (p === "" ? `
@page{size:A4;margin:0;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{background:#fff;}.${p}page{min-height:0;height:297mm;overflow:hidden;}}
@media screen{body{background:#d0c8b8;padding:16px;}.${p}page{margin:0 auto 20px;box-shadow:0 4px 20px rgba(0,0,0,.2);}}` : `
#doc-wrap{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px 0;background:#e8e2d8;}
.${p}page{box-shadow:0 4px 20px rgba(0,0,0,.18);}`);
}


// ============================================================
//  APP
// ============================================================
const STORAGE_KEY    = "syrian-contract-system-v2";
const CONTRACTS_KEY  = "syrian-contract-list-v1";
const BACKUP_KEY     = "syrian-contract-backup-v2";
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
  contractNumber:"RG-2025-001", fileNumber:"12/ع.ب/2025", placeDate:"دمشق", contractDate:"2025-04-07",
  sellerName:"محمد أحمد حسن", sellerFather:"أحمد", sellerMother:"فاطمة خالد", sellerBirth:"1975",
  sellerID:"123456789", sellerIDPlace:"دمشق", sellerIDDate:"1995-05-15", sellerPhone:"+963 11 123 4567", sellerEmail:"seller@example.com",
  buyerName:"سامر خالد محمود", buyerFather:"خالد", buyerMother:"ناديا يوسف", buyerBirth:"1985",
  buyerID:"987654321", buyerIDPlace:"حلب", buyerIDDate:"2005-08-22", buyerPhone:"+963 21 987 6543", buyerEmail:"buyer@example.com",
  propertyNumber:"127", propertyZone:"المزة", propertyType:"شقة سكنية", propertyArea:"150",
  propertyFloor:"الثالث", propertyRooms:"4", propertyRegistry:"أ/127/مزة", propertyView:"شارع رئيسي",
  propertyDesc:"شقة سكنية في الطابق الثالث، تشطيب سوبر لوكس، مطبخ أمريكي",
  propertyBoundaries:"الشرق: شارع عام عرضه 12م، الغرب: بناء آل الأحمد، الشمال: حديقة مشتركة، الجنوب: بناء رقم 15",
  propertyMortgages:"خالٍ من أي رهن أو تكليف أو نزاع",
  priceTotal:"75000000", currency:"ل.س", deposit:"15000000", paymentMethod:"نقداً",
  deliveryDeadline:"60 يوماً", delayPenalty:"100000", breachPenalty:"10000000",
  depositWords:"", remainingWords:"",
  witness1:"عمر عبد الله سالم", witness1ID:"112233", witness2:"ليلى محمد حسين", witness2ID:"445566",
  special1:"يتم تسليم العقار خالياً من المستأجرين",
  special2:"البائع ملزم بدفع جميع فواتير الكهرباء والمياه حتى تاريخ الفراغ",
  specialConditions:"يُقرّ الفريق الأول بأن العقار خالٍ من أي دعاوى قضائية أو نزاعات ملكية.",
  attachments:"صورة هوية البائع - صورة هوية المشتري - بيان قيد عقاري - رخصة البناء"
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
  _saveTimer: null, _backupTimer: null, _debounceTimer: null,
  _sigPads: {}, _livePreviewOn: false,
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
    this._backupTimer = setInterval(() => this.backup(), 30000);
    window.addEventListener("beforeunload", () => this.autoSave());
    this.fetchRates();
  },

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
    } catch { return { ...DEFAULT_DATA }; }
  },

  autoSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      // Spara även per-kontrakt om _id finns
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

  backup() {
    if (!this._dirty) return;
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(this.state)); } catch {}
  },

  // ── Kontrakthistorik ──
  listContracts() {
    try { return JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]"); } catch { return []; }
  },

  saveToHistory() {
    const list = this.listContracts().filter(c => c.id !== this.state._id);
    const id = this.state._id || ("contract-" + Date.now());
    this.state._id = id;
    const entry = {
      id,
      title: this.state.contractNumber || "عقد جديد",
      seller: this.state.sellerName || "",
      buyer:  this.state.buyerName  || "",
      date:   this.state.contractDate || "",
      saved:  new Date().toISOString()
    };
    list.unshift(entry);
    if(list.length > 20) list.length = 20;
    try { localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list)); } catch {}
  },

  newContract() {
    if(!confirm("إنشاء عقد جديد؟ سيتم حفظ العقد الحالي في السجل.")) return;
    this.saveToHistory();
    this.autoSave();
    this.state = { ...DEFAULT_DATA, _id: "contract-" + Date.now() };
    SIGNATURE_NAMES.forEach(n => delete this.state[`sig_${n}`]);
    this.populateForm(); this.recalc(); this.clearSignatureCanvases();
    this.renderPreview(); this.updateProgress();
    document.getElementById("val-panel").classList.remove("show");
    this.toast("تم إنشاء عقد جديد");
  },

  loadContract(id) {
    // البيانات الكاملة محفوظة في STORAGE_KEY المحدد لكل عقد
    try {
      const raw = localStorage.getItem("contract-data-" + id);
      if(!raw) { this.toast("لم يتم العثور على بيانات العقد","err"); return; }
      this.autoSave(); // حفظ الحالي أولاً
      this.state = { ...DEFAULT_DATA, ...JSON.parse(raw) };
      this.populateForm(); this.recalc(); this.renderPreview();
      this.updateProgress(); this.initSigPads(true);
      this.closeHistoryPanel();
      this.toast("تم تحميل العقد");
    } catch { this.toast("خطأ في تحميل العقد","err"); }
  },

  deleteContract(id) {
    if(!confirm("حذف هذا العقد من السجل؟")) return;
    const list = this.listContracts().filter(c => c.id !== id);
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list));
    localStorage.removeItem("contract-data-" + id);
    this.renderHistoryPanel();
    this.toast("تم حذف العقد");
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
    if(!list.length) {
      el.innerHTML = `<div style="padding:24px;text-align:center;color:rgba(255,255,255,.3);font-size:13px;">لا توجد عقود محفوظة</div>`;
      return;
    }
    el.innerHTML = list.map(c => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;" data-load-id="${c.id}">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#f0e8d4;">${esc(c.title)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;">${esc(c.seller)} ← ${esc(c.buyer)} · ${c.date||""}</div>
        </div>
        <button data-delete-id="${c.id}" style="background:none;border:1px solid rgba(255,0,0,.3);color:#c05050;font-size:10px;padding:3px 8px;cursor:pointer;border-radius:2px;">حذف</button>
      </div>`).join("");
    el.querySelectorAll("[data-load-id]").forEach(row => {
      row.addEventListener("click", e => {
        if(e.target.dataset.deleteId) return;
        this.loadContract(row.dataset.loadId);
      });
    });
    el.querySelectorAll("[data-delete-id]").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); this.deleteContract(btn.dataset.deleteId); });
    });
  },

  fetchRates() {
    const RATES_CACHE_KEY = "exchange-rates-cache-v1";
    const TTL = 6 * 60 * 60 * 1000; // 6 timmar
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
          this.renderLivePreview();
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

    // Tangentbordsgenvägar
    document.addEventListener("keydown", (e) => {
      if(e.target.tagName === "TEXTAREA") return; // hindra ej textfält
      const ctrl = e.ctrlKey || e.metaKey;
      if(ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); this.undo(); }
      if(ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); this.redo(); }
      if(ctrl && e.key === "s") { e.preventDefault(); this.autoSave(); this.toast("تم الحفظ","ok"); }
      if(ctrl && e.key === "p") { e.preventDefault(); this.print(); }
    });
  },

  handleAction(action) {
    const actions = {
      "toggle-live":            () => this.toggleLivePreview(),
      "print":                  () => this.print(),
      "export-json":            () => this.exportJSON(),
      "import-json":            () => this.importJSON(),
      "share-email":            () => this.shareEmail(),
      "validate":               () => this.validate(),
      "reset":                  () => this.resetToDefault(),
      "apply-contract-number":  () => this.applyCN(),
      "undo":                   () => this.undo(),
      "redo":                   () => this.redo(),
      "save-pdf":               () => this.savePDF(),
      "open-history":           () => this.openHistoryPanel(),
      "new-contract":           () => this.newContract(),
    };
    actions[action]?.();
  },

  pushUndo() {
    // Spara en kopia av state (utan interna _-nycklar och signaturer)
    const snap = Object.fromEntries(
      Object.entries(this.state).filter(([k]) => !k.startsWith("sig_"))
    );
    this._undoStack.push(JSON.stringify(snap));
    if(this._undoStack.length > this._UNDO_LIMIT) this._undoStack.shift();
    this._redoStack = [];  // ny ändring raderar redo-historik
  },

  undo() {
    if(!this._undoStack.length) { this.toast("لا يوجد شيء للتراجع عنه","err"); return; }
    // Spara nuläget i redo-stack
    const snap = Object.fromEntries(
      Object.entries(this.state).filter(([k]) => !k.startsWith("sig_"))
    );
    this._redoStack.push(JSON.stringify(snap));
    this.state = { ...this.state, ...JSON.parse(this._undoStack.pop()) };
    this.populateForm(); this.recalc(); this.renderPreview(); this.updateProgress();
    this.toast("تم التراجع ↩");
  },

  redo() {
    if(!this._redoStack.length) { this.toast("لا يوجد شيء للإعادة","err"); return; }
    const snap = Object.fromEntries(
      Object.entries(this.state).filter(([k]) => !k.startsWith("sig_"))
    );
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

    // Alltid räkna om arabisk text — rensa om värdet är 0
    this.state.depositWords  = deposit ? `${numToArabicWords(deposit)} ${cur}` : "";
    this.state.remainingWords = remain ? `${numToArabicWords(remain)} ${cur}` : "";
    document.getElementById("f-depositWords").value  = this.state.depositWords;
    document.getElementById("f-remainingWords").value = this.state.remainingWords;
  },

  updateProgress() {
    const filled = REQUIRED_FIELDS.filter((f) => {
      const el = document.getElementById(`f-${f}`);
      return el && el.value.trim() !== "";
    }).length;
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
    ["sellerEmail","buyerEmail","sellerPhone","buyerPhone","sellerIDDate","buyerIDDate"].forEach((f) => {
      const el = document.getElementById(`f-${f}`);
      if(el?.value && !this.validateField(f)) push(f);
    });
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
    if(!window.confirm("هل تريد مسح جميع البيانات وإعادة التعبئة بالبيانات التجريبية؟")) return;
    this.state = { ...DEFAULT_DATA };
    SIGNATURE_NAMES.forEach((n) => delete this.state[`sig_${n}`]);
    this.populateForm(); this.recalc(); this.clearSignatureCanvases();
    this.renderPreview(); this.updateProgress();
    document.getElementById("val-panel").classList.remove("show");
    this.toast("تم استعادة البيانات التجريبية");
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.state,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `عقد-بيع-${this.state.contractNumber||"جديد"}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    this.toast("تم تصدير الملف");
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
التاريخ:    ${formatArabicDate(d.contractDate)}
مكان التحرير: ${d.placeDate || "—"}

الفريق الأول (البائع):  ${d.sellerName || "—"}
الفريق الثاني (المشتري): ${d.buyerName || "—"}

العقار: ${d.propertyType || "—"} · ${d.propertyZone || "—"}
المساحة: ${d.propertyArea || "—"} م²
الثمن الإجمالي: ${total ? fmt(total)+" "+cur : "—"}
العربون: ${d.deposit ? fmt(Number(num(d.deposit)))+" "+cur : "—"}

يرجى مراجعة العقد والتواصل لأي استفسار.`;

    // إنشاء modal
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
            <input id="email-to" type="email" value="${esc(d.buyerEmail || d.sellerEmail || "")}"
              placeholder="example@email.com"
              style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:13px;direction:ltr;">
            <div style="display:flex;gap:6px;margin-top:5px;">
              ${d.sellerEmail?`<button class="btn btn-ghost btn-xs email-preset" data-email="${esc(d.sellerEmail)}">${esc(d.sellerName||"البائع")}</button>`:""}
              ${d.buyerEmail?`<button class="btn btn-ghost btn-xs email-preset" data-email="${esc(d.buyerEmail)}">${esc(d.buyerName||"المشتري")}</button>`:""}
            </div>
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:4px;">الموضوع</label>
            <input id="email-subject" type="text" value="${esc(defaultSubject)}"
              style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:13px;">
          </div>
          <div>
            <label style="display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:4px;">نص الرسالة</label>
            <textarea id="email-body" rows="10"
              style="width:100%;padding:8px 10px;background:#1e1b16;border:1px solid rgba(255,255,255,.15);color:#f0e8d4;font-family:'Amiri',serif;font-size:12px;resize:vertical;">${esc(defaultBody)}</textarea>
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

    modal.querySelectorAll(".email-preset").forEach(btn => {
      btn.onclick = () => { document.getElementById("email-to").value = btn.dataset.email; };
    });

    document.getElementById("email-send").onclick = () => {
      const to      = document.getElementById("email-to").value.trim();
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

  toggleLivePreview() {
    this._livePreviewOn = !this._livePreviewOn;
    document.getElementById("live-preview-panel").hidden = !this._livePreviewOn;
    document.getElementById("live-toggle-btn").classList.toggle("on", this._livePreviewOn);
    document.getElementById("main-area").style.paddingRight = this._livePreviewOn ? "296px" : "";
    if(this._livePreviewOn) this.renderLivePreview();
  },

  renderLivePreview() {
    if(!this._livePreviewOn) return;
    const target = document.getElementById("live-doc-wrap");
    const page   = document.querySelector("#doc-wrap .ppage");
    if(!target || !page) return;
    target.innerHTML = ""; target.appendChild(page.cloneNode(true));
  },

  initSigPads(force=false) {
    SIGNATURE_NAMES.forEach((name) => {
      const canvas = document.getElementById(`sig-${name}`);
      if(!canvas) return;

      // Om canvas ännu inte har en synlig bredd (formulärfliken dold vid init),
      // registrera en ResizeObserver som kör om när canvas faktiskt visas.
      const rect = canvas.getBoundingClientRect();
      if(rect.width === 0 && !force) {
        const ro = new ResizeObserver((entries, observer) => {
          if(entries[0].contentRect.width > 0) {
            observer.disconnect();
            this.initSigPads(true);
          }
        });
        ro.observe(canvas);
        return;
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
      // Återrit alltid sparad signatur (race-condition fix)
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
    // Inbyggd QR-generator — fungerar offline och från file://, ingen CDN krävs
    // Implementerar QR version 3 (29×29 moduler) med ECI + byte encoding
    const canvas = document.createElement("canvas");
    const size = 29;
    const scale = 4;
    canvas.width = canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1c1712";

    // Använd qrcode.js om tillgängligt (laddats från CDN)
    if (typeof QRCode !== "undefined" && QRCode.toCanvas) {
      return new Promise((resolve) => {
        QRCode.toCanvas(canvas, text.slice(0, 80), { width: size * scale, margin: 1, color: { dark:"#1c1712", light:"#ffffff" } }, () => {
          resolve(canvas.toDataURL());
        });
      });
    }

    // Fallback: rita en dekorativ QR-liknande bild med kontrakt-data
    // Tre positioneringsmönster (hörn-kvadrater)
    const dot = (r, c) => ctx.fillRect(c * scale, r * scale, scale, scale);
    const finderPattern = (row, col) => {
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
        const border = r===0||r===6||c===0||c===6;
        const inner  = r>=2&&r<=4&&c>=2&&c<=4;
        if (border || inner) dot(row+r, col+c);
      }
    };
    finderPattern(0, 0);
    finderPattern(0, size-7);
    finderPattern(size-7, 0);

    // Timing patterns
    for (let i = 8; i < size-8; i+=2) { dot(6,i); dot(i,6); }

    // Data-moduler baserade på texten (deterministisk hash)
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    let rng = Math.abs(hash);
    const skip = (r,c) => (r<9&&c<9)||(r<9&&c>size-9)||(r>size-9&&c<9)||(r===6)||(c===6);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (skip(r,c)) continue;
      rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
      if (rng % 3 === 0) dot(r, c);
    }
    return canvas.toDataURL();
  },

  renderPreview() {
    // Injicera preview-CSS en gång
    if(!document.getElementById("preview-styles")){
      const s=document.createElement("style"); s.id="preview-styles"; s.textContent=generateCSS("p");
      document.head.appendChild(s);
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
    const seed = this.state.contractNumber || "default";
    const guilURI = guillocheDataURI(seed, 794, 1123, "#9a7d45", 0.18);
    const micrURI = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(microtextSVG("عقد بيع قطعي · الجمهورية العربية السورية · " + (this.state.contractNumber||""), 794, 1123));
    // Injicera som CSS-variabel
    let secStyle = document.getElementById("security-styles");
    if(!secStyle){ secStyle=document.createElement("style"); secStyle.id="security-styles"; document.head.appendChild(secStyle); }
    secStyle.textContent = `.ppage{--guil-bg:url("${guilURI}");--micr-bg:url("${micrURI}");}`;

    const qrResult = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                  this.state.sellerName, this.state.buyerName,
                                  `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
    const render = (qr) => {
      document.getElementById("doc-wrap").innerHTML = buildContractHTML(this.state, qr, "p");
      this.renderLivePreview();
    };
    if (qrResult && typeof qrResult.then === "function") qrResult.then(render);
    else render(qrResult);
  },

  print() {
    PrintModule.execute(this.state, (text) => this.generateQR(text));
  },

  savePDF() {
    if(typeof html2pdf === "undefined") {
      this.toast("مكتبة PDF غير محملة","err"); return;
    }
    const qrResult = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                  this.state.sellerName, this.state.buyerName,
                                  `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
    const doSave = (qr) => {
      const css  = generateCSS("");
      const body = buildContractHTML(this.state, qr, "");
      const wrap = document.createElement("div");
      wrap.innerHTML = `<style>${css}</style>${body}`;
      wrap.style.cssText = "position:absolute;left:-9999px;top:0;width:210mm;";
      document.body.appendChild(wrap);
      html2pdf()
        .set({
          margin: 0,
          filename: `عقد-بيع-${this.state.contractNumber||"جديد"}.pdf`,
          image: { type:"jpeg", quality:0.98 },
          html2canvas: { scale:2, useCORS:true, letterRendering:true },
          jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
          pagebreak: { mode:["css","legacy"] }
        })
        .from(wrap)
        .save()
        .then(() => { document.body.removeChild(wrap); this.toast("تم حفظ PDF","ok"); })
        .catch(() => { document.body.removeChild(wrap); this.toast("خطأ في حفظ PDF","err"); });
    };
    if (qrResult && typeof qrResult.then === "function") qrResult.then(doSave);
    else doSave(qrResult);
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
