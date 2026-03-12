const whitelistAttempts = new Map()
require('dotenv').config()

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const axios = require('axios')

const app = express()

// necesario para Railway
app.set('trust proxy', 1)

app.use(express.json())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK,
    scope: ['identify']
},
(accessToken, refreshToken, profile, done) => {
    return done(null, profile)
}))

// login discord
app.get('/auth/discord', passport.authenticate('discord'))

// callback discord
app.get('/auth/discord/callback',
passport.authenticate('discord', { failureRedirect: '/' }),
(req,res)=>{
    res.redirect('/')
})

// asegurar index
app.get('/', (req,res)=>{
    res.sendFile(__dirname + '/public/index.html')
})

// usuario logueado
app.get('/api/user',(req,res)=>{

if(!req.user){
    return res.json({logged:false})
}

res.json({
    logged:true,
    user:{
        id:req.user.id,
        username:req.user.username,
        discriminator:req.user.discriminator
    }
})

})

// enviar whitelist
app.post('/api/submit', async (req,res)=>{

try{

if(!req.user) return res.status(401).send("No login")

const userId = req.user.id
const now = Date.now()

// cooldown 24h
if(whitelistAttempts.has(userId)){

const lastAttempt = whitelistAttempts.get(userId)
const hours = (now - lastAttempt) / (1000 * 60 * 60)

if(hours < 24){
return res.json({cooldown:true})
}

}

whitelistAttempts.set(userId, now)

const score = req.body.score || 0
const wrong = Array.isArray(req.body.wrong) ? req.body.wrong : []

const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress

const embed = {

embeds:[{

title:"📋 Resultado WH",

color:3447003,

fields:[

{
name:"👤 Usuario",
value:`${req.user.username}#${req.user.discriminator}`,
inline:true
},

{
name:"🆔 Discord ID",
value:req.user.id,
inline:true
},

{
name:"🌐 IP",
value:ip,
inline:false
},

{
name:"📊 Aciertos",
value:`${score}/10`,
inline:true
},

{
name:"❌ Preguntas falladas",
value: wrong.length ? wrong.join(", ") : "Ninguna",
inline:false
}

]

}]

}

// enviar webhook
try{
await axios.post(process.env.WEBHOOK_URL, embed)
}catch(err){
console.error("Webhook error:", err.message)
}

res.json({success:true})

}catch(err){

console.error("Submit error:", err)
res.status(500).send("Error interno")

}

})

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Whitelist iniciada en puerto ${PORT}`);
});
