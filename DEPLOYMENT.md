# 🚂 **MenuAuto - Railway Deployment**

## ✅ **Aplikacija je spremna za Railway!**

### 📋 **Šta je urađeno:**
- ✅ `railway.json` - Railway konfiguracija
- ✅ `nixpacks.toml` - Build konfiguracija  
- ✅ `package.json` - Ažuriran sa build scriptom
- ✅ `server.js` - Optimizovan za Railway
- ✅ `config/database.js` - Podrška za production environment
- ✅ Railway CLI instaliran

### 🚀 **Koraci za deployment:**

#### **1. Login na Railway**
```bash
railway login
```

#### **2. Inicijalizujte projekat**
```bash
railway init
```

#### **3. Dodajte MySQL database**
```bash
railway add
# Izaberite MySQL iz liste
```

#### **4. Postavite environment variables**
```bash
railway variables set DB_HOST=your-mysql-host
railway variables set DB_USER=your-mysql-user  
railway variables set DB_PASSWORD=your-mysql-password
railway variables set DB_NAME=your-database-name
railway variables set DB_PORT=3306
railway variables set JWT_SECRET=your-super-secret-jwt-key-here
railway variables set SESSION_SECRET=your-session-secret-key-here
railway variables set NODE_ENV=production
```

#### **5. Deploy aplikaciju**
```bash
railway up
```

#### **6. Otvorite aplikaciju**
```bash
railway open
```

### 🎯 **Prednosti Railway-a:**
- ✅ **Database hosting** - MySQL na istom mjestu
- ✅ **WebSocket podrška** - Socket.IO notifikacije
- ✅ **Automatic deployments** - iz Git-a
- ✅ **Custom domains** - sa SSL
- ✅ **$5 kredita mjesečno** - besplatno

### 🔧 **Troubleshooting:**
```bash
# Provjerite logs
railway logs

# Provjerite status
railway status

# Restart aplikaciju
railway restart
```

### 📱 **Testiranje:**
1. Otvorite Railway URL
2. Prijavite se kao konobar: `waiter1` / `password123`
3. Testirajte naručivanje
4. Provjerite Socket.IO notifikacije

**🎉 Aplikacija je spremna za production!** 