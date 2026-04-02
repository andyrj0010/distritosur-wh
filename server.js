require('dotenv').config()

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const axios = require('axios')

const app = express()

app.set('trust proxy', 1)

app.use(express.json())
app.use(express.static('public'))

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true si usas https
    httpOnly: true,
    sameSite: "lax"
  }
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

// ================= LOGIN =================

app.get('/auth/discord', passport.authenticate('discord'))

app.get('/auth/discord/callback',
passport.authenticate('discord', { failureRedirect: '/' }),
(req,res)=> res.redirect('/')
)

// ================= USER =================

app.get('/api/user',(req,res)=>{
if(!req.user) return res.json({logged:false})

res.json({
  logged:true,
  user:{
    id:req.user.id,
    username:req.user.username,
    discriminator:req.user.discriminator,
    avatar:req.user.avatar
  }
})
})

// ================= SEGURIDAD =================

const whitelistAttempts = new Map()
const rateLimit = new Map()

// ================= SUBMIT =================

app.post('/api/submit', async (req,res)=>{

if(!req.user) return res.status(401).json({error:"No login"})

const userId = req.user.id
const now = Date.now()

// anti spam (5s)
const last = rateLimit.get(userId)
if (last && (now - last) < 5000) {
  return res.status(429).json({ error: "Espera unos segundos" })
}
rateLimit.set(userId, now)

// cooldown 24h
if(whitelistAttempts.has(userId)){
  const lastAttempt = whitelistAttempts.get(userId)
  const hours = (now - lastAttempt) / (1000 * 60 * 60)

  if(hours < 24){
    return res.json({cooldown:true})
  }
}

whitelistAttempts.set(userId, now)

// validar datos
const score = req.body.score
const wrong = req.body.wrong

if (typeof score !== "number" || score < 0 || score > 10) {
  return res.status(400).json({ error: "Score inválido" })
}

if (!Array.isArray(wrong)) {
  return res.status(400).json({ error: "Datos inválidos" })
}

// ip real
const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress

// embed PRO
const embed = {
  embeds: [{
    title: "📋 Nueva Whitelist",
    color: score >= 7 ? 5763719 : 15548997,
    thumbnail: {
      url: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`
    },
    fields: [
      {
        name: "👤 Usuario",
        value: `<@${req.user.id}>`,
        inline: true
      },
      {
        name: "🆔 ID",
        value: req.user.id,
        inline: true
      },
      {
        name: "🌐 IP",
        value: ip,
        inline: false
      },
      {
        name: "📊 Resultado",
        value: `${score}/10`,
        inline: true
      },
      {
        name: "📉 Fallos",
        value: wrong.length ? wrong.join(", ") : "Ninguno",
        inline: false
      }
    ],
    footer: {
      text: "DistritoSur RP"
    },
    timestamp: new Date()
  }]
}

// enviar webhook
try {
  await axios.post(process.env.WEBHOOK_URL, embed)
} catch (err) {
  console.error("Error webhook:", err.message)
}

res.json({success:true})

})

// ================= START =================

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en puerto ${PORT}`)
})
