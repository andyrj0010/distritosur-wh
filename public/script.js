function login(){
window.location="/auth/discord"
}

async function check(){
const r = await fetch('/api/user')
const d = await r.json()

if(d.logged){
document.getElementById('login').innerHTML =
`✔️ Conectado como ${d.user.username}`
start()
}
}

const questions=[

{q:"¿Qué es PG (PowerGaming)?",a:["Hacer acciones irreales","Interpretar bien rol","Conducir"],c:0},
{q:"¿Qué es MG (MetaGaming)?",a:["Usar info externa","Radio IC","Correr"],c:0},
{q:"IC significa",a:["Dentro del personaje","Fuera del personaje","Admin"],c:0},
{q:"OOC significa",a:["Fuera del personaje","Dentro del personaje","Policía"],c:0},
{q:"DM es",a:["Matar sin rol","Robar banco","Nada"],c:0},
{q:"VDM es",a:["Atropellar sin rol","Conducir normal","Nada"],c:0},
{q:"CK es",a:["Muerte permanente","Cárcel","Nada"],c:0},
{q:"Si te apuntan con arma?",a:["Valorar vida","Atacar","Ignorar"],c:0},
{q:"¿Se puede usar info externa?",a:["No","Sí","A veces"],c:0},
{q:"¿Qué es FailRP?",a:["Romper rol","Robar banco","Nada"],c:0}

]

function start(){

const quiz=document.getElementById('quiz')
document.getElementById('send').style.display='block'

questions.forEach((q,i)=>{

let html=`<div class="question"><p>${i+1}. ${q.q}</p>`

q.a.forEach((a,j)=>{
html+=`
<label>
<input type="radio" name="q${i}" value="${j}" onchange="updateProgress()">
${a}
</label>`
})

html+='</div>'
quiz.innerHTML+=html

})

}

function updateProgress(){

let answered=0

questions.forEach((q,i)=>{
if(document.querySelector(`input[name=q${i}]:checked`))
answered++
})

let percent=(answered/questions.length)*100
document.getElementById('progress').style.width=percent+"%"

}

async function send(){

let score=0
let wrong=[]

questions.forEach((q,i)=>{

const a=document.querySelector(`input[name=q${i}]:checked`)

if(a && Number(a.value)===q.c)
score++
else
wrong.push(i+1)

})

await fetch('/api/submit',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({score,wrong})
})

document.getElementById('quiz').style.display="none"
document.getElementById('send').style.display="none"

document.getElementById('result').innerHTML=
score >= 7 
? "✅ Aprobado. Tu solicitud ha sido enviada."
: "❌ No has superado la whitelist."

}

check()