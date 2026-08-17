// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBxVrLZ0YYaGYcEjxL2gyDXKaudDyPNvZM",
  authDomain: "predictstor.firebaseapp.com",
  projectId: "predictstor",
  storageBucket: "predictstor.firebasestorage.app",
  messagingSenderId: "984193094318",
  appId: "1:984193094318:web:5c5614bf83a431b98f133f",
  measurementId: "G-L254S3YZ5D"
};
firebase.initializeApp(firebaseConfig);
const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
const pages={dashboard:'Storage Dashboard',sensors:'Live Sensor Network',prediction:'AI Spoilage Prediction',alerts:'Alerts & Actions',storage:'Storage Batches',reports:'Reports & Analytics',settings:'Settings'};
const alerts=[
 {level:'warning',title:'Gas concentration rising',time:'2 min ago',desc:'Ethylene level reached 0.82 ppm. Consider ventilation.'},
 {level:'info',title:'Sensor calibration completed',time:'34 min ago',desc:'All six environmental sensors are reporting normally.'},
 {level:'warning',title:'Humidity approaching threshold',time:'1 hr ago',desc:'Humidity increased by 3% over the last hour.'},
 {level:'good',title:'Temperature stabilized',time:'2 hr ago',desc:'Storage temperature returned to the optimal range.'}
];
const batches=[['ON-2026-0815','Red Onion','4.8 t','15 Aug 2026','24.6°C','12%','Healthy'],['ON-2026-0812','Nashik Red','7.2 t','12 Aug 2026','25.1°C','18%','Healthy'],['ON-2026-0808','Bellary Onion','5.4 t','08 Aug 2026','27.4°C','31%','Watch'],['ON-2026-0801','White Onion','3.1 t','01 Aug 2026','26.8°C','24%','Healthy'],['ON-2026-0728','Red Onion','4.3 t','28 Jul 2026','28.2°C','46%','Watch']];
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function navigate(page){$$('.page').forEach(p=>p.classList.remove('active-page'));$('#'+page).classList.add('active-page');$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));$('#pageTitle').textContent=pages[page];window.scrollTo({top:0,behavior:'smooth'});if(page==='sensors')drawSensorChart();if(page==='prediction')drawRiskChart();if(page==='reports')drawReportChart()}
$$('.nav-item').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));$$('[data-page]').forEach(n=>{if(!n.classList.contains('nav-item'))n.addEventListener('click',()=>navigate(n.dataset.page))});
function lineChart(canvasId, datasets, labels){const c=document.getElementById(canvasId);if(!c)return;const ctx=c.getContext('2d'),w=c.width=c.clientWidth*devicePixelRatio,h=c.height=c.clientHeight*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);const W=c.clientWidth,H=c.clientHeight;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#e9eee9';ctx.lineWidth=1;for(let i=0;i<5;i++){const y=18+i*(H-40)/4;ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(W-12,y);ctx.stroke()}datasets.forEach((ds,di)=>{ctx.beginPath();ds.forEach((v,i)=>{const x=35+i*(W-50)/(ds.length-1),y=18+(H-40)*(1-v/100);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=di===0?'#3b8a56':'#8fb4ce';ctx.lineWidth=2;ctx.stroke();ds.forEach((v,i)=>{const x=35+i*(W-50)/(ds.length-1),y=18+(H-40)*(1-v/100);ctx.fillStyle=di===0?'#3b8a56':'#8fb4ce';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill()})});ctx.fillStyle='#8a958d';ctx.font='9px Inter';labels.forEach((l,i)=>ctx.fillText(l,35+i*(W-50)/(labels.length-1),H-5))}
function drawEnv(){lineChart('envChart',[[52,55,58,61,60,58,62,64,61,59,57,60,62],[64,66,67,69,68,70,71,69,67,68,69,68,67]],['00','02','04','06','08','10','12','14','16','18','20','22','Now'])}
function drawSensorChart(){lineChart('sensorChart',[[48,49,48,51,52,51,50,52,54,53,52,51,53,54,55,54,56,55],[61,62,62,63,64,63,64,65,66,65,67,66,65,66,67,68,67,68]],['-60m','-50m','-40m','-30m','-20m','-10m','Now'])}
function drawRiskChart(){lineChart('riskChart',[[12,14,16,19,24,30,37,44]],['Now','Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'])}
function drawReportChart(){lineChart('reportChart',[[30,42,39,51,57,68,76,84]],['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'])}
function renderAlerts(){const html=alerts.map(a=>`<div class="alert-row"><div class="alert-icon">${a.level==='good'?'✓':a.level==='info'?'i':'!'}</div><div><b>${a.title}</b><small>${a.desc} • ${a.time}</small></div></div>`).join('');$('#recentAlerts').innerHTML=html;$('#allAlerts').innerHTML=alerts.map((a,i)=>`<div class="alert-row"><div class="alert-icon">${a.level==='good'?'✓':a.level==='info'?'i':'!'}</div><div style="flex:1"><b>${a.title}</b><small>${a.desc} • ${a.time}</small></div><button class="secondary" onclick="resolveAlert(${i})">${a.level==='good'?'Resolved':'Resolve'}</button></div>`).join('')}
window.resolveAlert=i=>{alerts[i].level='good';alerts[i].title='Alert resolved';alerts[i].desc='Action completed successfully.';alerts[i].time='Just now';renderAlerts();showToast('Alert marked as resolved')};
function renderBatches(filter=''){const q=filter.toLowerCase();$('#batchTable').innerHTML=batches.filter(r=>r.join(' ').toLowerCase().includes(q)).map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td><span class="status ${r[6]==='Healthy'?'good':'watch'}">${r[6]}</span></td></tr>`).join('')}
function renderSensors(){const data=[['Temperature','24.6°C','Optimal','🌡'],['Humidity','68%','Optimal','💧'],['CO₂','412 ppm','Normal','◌'],['Ethylene','0.82 ppm','Watch','◉'],['Airflow','1.8 m/s','Normal','≋'],['Door status','Closed','Secure','▣']];$('#sensorCards').innerHTML=data.map(x=>`<div class="metric-card"><div class="metric-icon">${x[3]}</div><small>${x[0]}</small><strong>${x[1]}</strong><span class="${x[2]==='Watch'?'warn':'good'}">● ${x[2]}</span></div>`).join('')}
$('#ventBtn').onclick=()=>{showToast('Ventilation cycle started • 10 minutes');$('#ventBtn').textContent='Ventilation Running';$('#ventBtn').disabled=true;setTimeout(()=>{$('#ventBtn').textContent='Start Ventilation';$('#ventBtn').disabled=false;showToast('Ventilation cycle completed')},5000)};
$('#notificationBtn').onclick=()=>navigate('alerts');$('#newBatch').onclick=()=>showToast('New batch form ready for integration');$('#downloadBtn').onclick=()=>showToast('Report generation started');$('#csvBtn').onclick=()=>showToast('Sensor CSV export prepared');$('#saveSettings').onclick=()=>showToast('Settings saved successfully');$('#batchSearch').oninput=e=>renderBatches(e.target.value);$('#chartRange').onchange=e=>showToast('Chart range changed to '+e.target.value);
renderAlerts();renderBatches();renderSensors();drawEnv();window.addEventListener('resize',()=>{drawEnv();if($('#sensors').classList.contains('active-page'))drawSensorChart()});
setInterval(()=>{const t=(24+Math.random()*1.5).toFixed(1),h=Math.round(67+Math.random()*3),g=(.78+Math.random()*.12).toFixed(2);$('#tempVal').textContent=t+'°C';$('#humidVal').textContent=h+'%';$('#gasVal').textContent=g+' ppm'},5000);
