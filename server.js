const whitelistAttempts = new Map()
require('dotenv').config()

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const axios = require('axios')

const app = express()

app.use(express.json())
app.use(express.static('public'))

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
    process.nextTick(() => done(null, profile))
}))

app.get('/auth/discord', passport.authenticate('discord'))

app.get('/auth/discord/callback',
passport.authenticate('discord', { failureRedirect: '/' }),
(req,res)=>{
    res.redirect('/')
})

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
app.post('/api/submit', async (req,res)=>{

if(!req.user) return res.status(401).send("No login")

const userId = req.user.id
const now = Date.now()

// comprobar si ya la hizo
if(whitelistAttempts.has(userId)){

const lastAttempt = whitelistAttempts.get(userId)
const hours = (now - lastAttempt) / (1000 * 60 * 60)

if(hours < 24){
return res.json({cooldown:true})
}

}

// guardar intento
whitelistAttempts.set(userId, now)

const {score, wrong} = req.body

const ip =
req.headers['x-forwarded-for'] ||
req.socket.remoteAddress

const embed = {

embeds:[{

title:"📋 Resultado WH",

color: score >=7 ? 5763719 : 15548997,

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
value:ip
},

{
name:"✅ Aciertos",
value:`${score}/10`,
inline:true
},

{
name:"❌ Preguntas falladas",
value: wrong.length ? wrong.join(", ") : "Ninguna"
}

]

}]

}

await axios.post(process.env.WEBHOOK_URL, embed)

res.json({success:true})

})

app.listen(3000,()=>{

console.log("Whitelist funcionando en puerto 3000")

})