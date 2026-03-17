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
<div class="${p}frame"></div>
<div class="${p}qr"><img src="${qrDataUrl}" alt="QR"></div>
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
    <div class="${p}hm">التاريخ: <strong>${disp(d.contractDate)}</strong></div>
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
    ${row("بتاريخ",disp(d.sellerIDDate))}${d.sellerPhone?row("الهاتف",disp(d.sellerPhone)):""}
  </div>
  <div class="${p}pp">
    <div class="${p}pn2 ${p}b">الفريق الثاني — المشتري</div>
    ${row("الاسم",disp(d.buyerName))}${row("ابن",disp(d.buyerFather))}${row("والدته",disp(d.buyerMother))}
    ${row("تولد",disp(d.buyerBirth))}${row("هوية",disp(d.buyerID))}${row("صادرة عن",disp(d.buyerIDPlace))}
    ${row("بتاريخ",disp(d.buyerIDDate))}${d.buyerPhone?row("الهاتف",disp(d.buyerPhone)):""}
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
    <div class="${p}ff">${row("تحريراً في",disp(d.placeDate))}${row("بتاريخ",disp(d.contractDate))}</div>
    ${d.attachments?`<div class="${p}att"><strong>المرفقات:</strong> ${esc(d.attachments)}</div>`:""}
  </div>
</div>
</div>`;

  const page2 = `
<div class="${p}page">
<div class="${p}frame"></div>
<div class="${p}qr"><img src="${qrDataUrl}" alt="QR"></div>
<div class="${p}pn">صفحة 2 من 2 · ${disp(d.contractNumber)}</div>

<div class="${p}p2h">
  <span>عقد بيع قطعي — الصفحة الثانية</span>
  <span>${disp(d.contractDate)} · ${disp(d.placeDate)}</span>
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
</div>`;

  return page1 + page2;
}


// ============================================================
//  PRINT MODULE — öppnar popup och skriver ut
// ============================================================
const PrintModule = {
  execute(state, generateQRFn) {
    const qr  = generateQRFn([state.contractNumber, state.contractDate, state.sellerName, state.buyerName,
                               `${fmt(Number(num(state.priceTotal))||0)} ${state.currency||"ل.س"}`].join(" | "));
    const css = this.printCSS();
    const body = buildContractHTML(state, qr, "");
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
    return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--ink:#1c1712;--mid:#5a5042;--faint:#c4baa8;--rule:#d8cebb;--accent:#2c4a3e;--gold:#9a7d45;--danger:#6e1f1f;--page:#fffdf8;}
html,body{font-family:"Amiri","Traditional Arabic",serif;color:var(--ink);background:#fff;font-size:9.5pt;}
.page{width:210mm;min-height:297mm;padding:8mm 13mm 12mm 13mm;background:var(--page);position:relative;page-break-after:always;break-after:page;}
.page:last-child{page-break-after:auto;break-after:auto;}
.frame{position:absolute;inset:5mm;border:1px solid var(--rule);pointer-events:none;}
.qr{position:absolute;left:1.5mm;top:50%;transform:translateY(-50%);opacity:.7;}
.qr img{display:block;width:22px;height:22px;}
.pn{position:absolute;bottom:4mm;left:0;right:0;text-align:center;font-size:8pt;color:var(--mid);font-weight:700;letter-spacing:.05em;}
.hd{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;margin-bottom:3mm;padding-bottom:2.5mm;border-bottom:1px solid var(--rule);}
.hdr{display:flex;align-items:center;gap:10px;}
.emb{width:62px;height:62px;flex-shrink:0;}.emb img{width:100%;height:auto;}
.state{font-size:17pt;font-weight:700;line-height:1.2;}
.div{width:1px;height:68px;background:var(--rule);margin:0 14px;}
.hdl{display:flex;flex-direction:column;gap:3px;text-align:left;justify-self:end;}
.hm{font-size:9.5pt;font-weight:700;color:#3b3327;}.hm strong{font-size:10pt;color:var(--ink);}
.tb{text-align:center;margin:2mm 0 3mm;}
.orn{height:1.5px;background:var(--gold);margin-bottom:2mm;}
.mt{font-size:24pt;font-weight:700;}.st{font-size:9pt;color:var(--mid);margin-top:1mm;}
.sl{display:flex;align-items:center;gap:6px;font-size:8pt;font-weight:700;letter-spacing:.1em;color:var(--gold);margin-bottom:2mm;margin-top:2.5mm;}
.sl::after{content:"";flex:1;height:1px;background:var(--rule);}
.pg{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;background:#fff;}
.pp{padding:5px 10px;background:#fff;}.pp+.pp{border-right:1.2px solid #d9ccb7;}
.pn2{font-size:9.5pt;font-weight:700;color:var(--accent);border-bottom:1.2px solid #d4c6b0;padding-bottom:3px;margin-bottom:4px;}
.b{color:var(--gold);}
.r{display:flex;align-items:center;gap:5px;margin-bottom:3px;}
.l{min-width:58px;font-size:8.5pt;font-weight:700;color:var(--mid);flex-shrink:0;}
.v{flex:1;font-size:9pt;border-bottom:1px solid #cfc1ab;padding:1px 3px 2px;text-align:center;}
.prop{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.pc{padding:3px 8px;border-bottom:1.2px solid #d9ccb7;border-left:1.2px solid #d9ccb7;}
.pc:nth-child(odd){border-left:0;}.full{grid-column:1/-1;border-left:0;}.nb{border-bottom:0;}
.pc .l{min-width:64px;}.pc .v{text-align:center;}
.ps{display:grid;grid-template-columns:2fr 1fr 1fr;background:#335545;color:#fff;margin-bottom:2.5mm;}
.psc{padding:6px 10px;border-left:1px solid rgba(255,255,255,.1);}.psc:last-child{border-left:0;}
.psl{display:block;font-size:7pt;letter-spacing:.1em;color:rgba(255,255,255,.5);margin-bottom:2px;}
.psv{display:block;font-size:13pt;font-weight:700;direction:ltr;}
.psc:not(:first-child) .psv{font-size:11pt;color:rgba(255,255,255,.85);}
.fg{display:grid;grid-template-columns:1fr 1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.fg .pc{border-left:1.2px solid #d9ccb7;}.fg .pc:first-child{border-left:0;}
.sg{display:grid;grid-template-columns:repeat(4,1fr);border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.sb{padding:4px 5px;border-right:1.2px solid #d9ccb7;}.sb:last-child{border-right:0;}
.sbt{font-size:7.5pt;font-weight:700;color:var(--accent);border-bottom:1.2px solid #d4c6b0;padding-bottom:2px;margin-bottom:3px;}
.sr{display:flex;align-items:center;gap:2px;margin-bottom:2px;}
.sr .l{min-width:0;font-size:7pt;font-weight:700;}.sr .v{font-size:7pt;border-bottom:1px solid #cfc1ab;text-align:center;}
.sl2{display:flex;align-items:flex-end;height:18px;margin:3px 0;border-bottom:1px solid rgba(28,23,18,.12);}
.sl2 img{max-height:16px;margin:0 auto;}.sc{font-size:6.5pt;color:var(--mid);text-align:center;}
.bot{display:grid;grid-template-columns:78px 1fr;border:1px solid var(--rule);margin-top:2.5mm;background:#fff;}
.stmp{display:flex;align-items:center;justify-content:center;padding:8px;background:#fff;}
.stmpc{width:54px;height:54px;border-radius:50%;border:1.2px dashed var(--faint);display:flex;align-items:center;justify-content:center;font-size:7pt;text-align:center;line-height:1.4;color:var(--faint);}
.fa{padding:6px 12px;}.ff{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:4px;}
.att{font-size:7.5pt;color:var(--mid);}
.p2h{display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:var(--mid);padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid var(--rule);}
.ci{font-size:9.5pt;font-style:italic;color:var(--mid);border-right:2px solid var(--rule);padding-right:8px;margin-bottom:3mm;}
.cl{display:flex;gap:8px;font-size:9.5pt;line-height:1.85;text-align:justify;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid var(--rule);}
.cl:last-of-type{border-bottom:0;}
.cn{min-width:16px;font-size:9pt;font-weight:700;color:var(--danger);flex-shrink:0;padding-top:2px;}
.spb{border:1px solid var(--rule);padding:8px 12px;background:#fffdf8;font-size:9.5pt;line-height:1.75;margin-top:3mm;}
.spb p{margin-bottom:3px;}
@page{size:A4;margin:0;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{background:#fff;}.page{min-height:0;height:297mm;overflow:hidden;}}
@media screen{body{background:#d0c8b8;padding:16px;}.page{margin:0 auto 20px;box-shadow:0 4px 20px rgba(0,0,0,.2);}}`;
  }
};


// ============================================================
//  PREVIEW CSS — injiceras en gång i <head>, prefix "p"
// ============================================================
const PREVIEW_CSS = `
#doc-wrap{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px 0;background:#e8e2d8;}
.ppage{width:210mm;min-height:297mm;padding:8mm 13mm 12mm 13mm;background:#fffdf8;position:relative;box-shadow:0 4px 20px rgba(0,0,0,.18);font-family:"Amiri","Traditional Arabic",serif;font-size:9.5pt;color:#1c1712;}
.pframe{position:absolute;inset:5mm;border:1px solid #d8cebb;pointer-events:none;}
.pqr{position:absolute;left:1.5mm;top:50%;transform:translateY(-50%);opacity:.7;}
.pqr img{display:block;width:22px;height:22px;}
.ppn{position:absolute;bottom:4mm;left:0;right:0;text-align:center;font-size:8pt;color:#5a5042;font-weight:700;letter-spacing:.05em;}
.phd{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;margin-bottom:3mm;padding-bottom:2.5mm;border-bottom:1px solid #d8cebb;}
.phdr{display:flex;align-items:center;gap:10px;}
.pemb{width:62px;height:62px;flex-shrink:0;}.pemb img{width:100%;height:auto;}
.pstate{font-size:17pt;font-weight:700;line-height:1.2;}
.pdiv{width:1px;height:68px;background:#d8cebb;margin:0 14px;}
.phdl{display:flex;flex-direction:column;gap:3px;text-align:left;justify-self:end;}
.phm{font-size:9.5pt;font-weight:700;color:#3b3327;}.phm strong{font-size:10pt;color:#1c1712;}
.ptb{text-align:center;margin:2mm 0 3mm;}
.porn{height:1.5px;background:#9a7d45;margin-bottom:2mm;}
.pmt{font-size:24pt;font-weight:700;}.pst{font-size:9pt;color:#5a5042;margin-top:1mm;}
.psl{display:flex;align-items:center;gap:6px;font-size:8pt;font-weight:700;letter-spacing:.1em;color:#9a7d45;margin-bottom:2mm;margin-top:2.5mm;}
.psl::after{content:"";flex:1;height:1px;background:#d8cebb;}
.ppg{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;background:#fff;}
.ppp{padding:5px 10px;background:#fff;}.ppp+.ppp{border-right:1.2px solid #d9ccb7;}
.ppn2{font-size:9.5pt;font-weight:700;color:#2c4a3e;border-bottom:1.2px solid #d4c6b0;padding-bottom:3px;margin-bottom:4px;}
.pb{color:#9a7d45;}
.pr{display:flex;align-items:center;gap:5px;margin-bottom:3px;}
.pl{min-width:58px;font-size:8.5pt;font-weight:700;color:#5a5042;flex-shrink:0;}
.pv{flex:1;font-size:9pt;border-bottom:1px solid #cfc1ab;padding:1px 3px 2px;text-align:center;}
.pprop{display:grid;grid-template-columns:1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.ppc{padding:3px 8px;border-bottom:1.2px solid #d9ccb7;border-left:1.2px solid #d9ccb7;}
.ppc:nth-child(odd){border-left:0;}.pfull{grid-column:1/-1;border-left:0;}.pnb{border-bottom:0;}
.ppc .pl{min-width:64px;}.ppc .pv{text-align:center;}
.pps{display:grid;grid-template-columns:2fr 1fr 1fr;background:#335545;color:#fff;margin-bottom:2.5mm;}
.ppsc{padding:6px 10px;border-left:1px solid rgba(255,255,255,.1);}.ppsc:last-child{border-left:0;}
.ppsl{display:block;font-size:7pt;letter-spacing:.1em;color:rgba(255,255,255,.5);margin-bottom:2px;}
.ppsv{display:block;font-size:13pt;font-weight:700;direction:ltr;}
.ppsc:not(:first-child) .ppsv{font-size:11pt;color:rgba(255,255,255,.85);}
.pfg{display:grid;grid-template-columns:1fr 1fr 1fr;border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.pfg .ppc{border-left:1.2px solid #d9ccb7;}.pfg .ppc:first-child{border-left:0;}
.psg{display:grid;grid-template-columns:repeat(4,1fr);border:1.2px solid #d9ccb7;margin-bottom:2.5mm;}
.psb{padding:4px 5px;border-right:1.2px solid #d9ccb7;}.psb:last-child{border-right:0;}
.psbt{font-size:7.5pt;font-weight:700;color:#2c4a3e;border-bottom:1.2px solid #d4c6b0;padding-bottom:2px;margin-bottom:3px;}
.psr{display:flex;align-items:center;gap:2px;margin-bottom:2px;}
.psr .pl{min-width:0;font-size:7pt;font-weight:700;}.psr .pv{font-size:7pt;border-bottom:1px solid #cfc1ab;text-align:center;}
.psl2{display:flex;align-items:flex-end;height:18px;margin:3px 0;border-bottom:1px solid rgba(28,23,18,.12);}
.psl2 img{max-height:16px;margin:0 auto;}.psc{font-size:6.5pt;color:#5a5042;text-align:center;}
.pbot{display:grid;grid-template-columns:78px 1fr;border:1px solid #d8cebb;margin-top:2.5mm;background:#fff;}
.pstmp{display:flex;align-items:center;justify-content:center;padding:8px;background:#fff;}
.pstmpc{width:54px;height:54px;border-radius:50%;border:1.2px dashed #c4baa8;display:flex;align-items:center;justify-content:center;font-size:7pt;text-align:center;line-height:1.4;color:#c4baa8;}
.pfa{padding:6px 12px;}.pff{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:4px;}
.patt{font-size:7.5pt;color:#5a5042;}
.pp2h{display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:#5a5042;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid #d8cebb;}
.pci{font-size:9.5pt;font-style:italic;color:#5a5042;border-right:2px solid #d8cebb;padding-right:8px;margin-bottom:3mm;}
.pcl{display:flex;gap:8px;font-size:9.5pt;line-height:1.85;text-align:justify;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px solid #d8cebb;}
.pcl:last-of-type{border-bottom:0;}
.pcn{min-width:16px;font-size:9pt;font-weight:700;color:#6e1f1f;flex-shrink:0;padding-top:2px;}
.pspb{border:1px solid #d8cebb;padding:8px 12px;background:#fffdf8;font-size:9.5pt;line-height:1.75;margin-top:3mm;}
.pspb p{margin-bottom:3px;}
`;


// ============================================================
//  APP
// ============================================================
const STORAGE_KEY    = "syrian-contract-system-v2";
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
      this._dirty = false;
      const time = new Date().toLocaleTimeString("ar-SY");
      const s = document.getElementById("autosave-status");
      if(s){ s.textContent="محفوظ"; s.className="badge badge-ok"; }
      const t = document.getElementById("last-save-time");
      if(t) t.textContent = time;
    } catch {}
  },

  backup() {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(this.state)); } catch {}
  },

  bindUI() {
    document.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("input", () => {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
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
    };
    actions[action]?.();
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

    // Alltid räkna om arabisk text när belopp ändras
    if(deposit) {
      this.state.depositWords  = `${numToArabicWords(deposit)} ${cur}`;
      document.getElementById("f-depositWords").value = this.state.depositWords;
    }
    if(remain) {
      this.state.remainingWords = `${numToArabicWords(remain)} ${cur}`;
      document.getElementById("f-remainingWords").value = this.state.remainingWords;
    }
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
    const subject = encodeURIComponent(`عقد بيع قطعي رقم ${this.state.contractNumber}`);
    const body = encodeURIComponent(`عقد بيع قطعي\nرقم العقد: ${this.state.contractNumber}\nالتاريخ: ${this.state.contractDate}\n\nالبائع: ${this.state.sellerName}\nالمشتري: ${this.state.buyerName}\n\nالعقار: ${this.state.propertyType} - ${this.state.propertyZone}\nالمساحة: ${this.state.propertyArea} م²\nالثمن: ${fmt(total)} ${cur}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
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
      if(!canvas || (this._sigPads[name] && !force)) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
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
    const canvas = document.createElement("canvas");
    canvas.width=120; canvas.height=120;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,120,120);
    ctx.fillStyle="#1c1712";
    const seed = text.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const size=6; let rng=seed;
    [[0,0],[0,13],[13,0]].forEach(([r,c])=>{
      ctx.fillRect(c*size,r*size,7*size,7*size);
      ctx.fillStyle="#fff"; ctx.fillRect((c+1)*size,(r+1)*size,5*size,5*size);
      ctx.fillStyle="#1c1712"; ctx.fillRect((c+2)*size,(r+2)*size,3*size,3*size);
    });
    for(let r=0;r<20;r++) for(let c=0;c<20;c++){
      rng=(rng*1664525+1013904223)&0xffffffff;
      const skip=(r<8&&c<8)||(r<8&&c>11)||(r>11&&c<8);
      if(!skip&&((rng>>>16)&1)) ctx.fillRect(c*size,r*size,size,size);
    }
    return canvas.toDataURL();
  },

  renderPreview() {
    // Injicera preview-CSS en gång
    if(!document.getElementById("preview-styles")){
      const s=document.createElement("style"); s.id="preview-styles"; s.textContent=PREVIEW_CSS;
      document.head.appendChild(s);
    }
    const qr = this.generateQR([this.state.contractNumber, this.state.contractDate,
                                  this.state.sellerName, this.state.buyerName,
                                  `${fmt(calcState(this.state).total)} ${this.state.currency||"ل.س"}`].join(" | "));
    document.getElementById("doc-wrap").innerHTML = buildContractHTML(this.state, qr, "p");
    this.renderLivePreview();
  },

  print() {
    PrintModule.execute(this.state, (text) => this.generateQR(text));
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
