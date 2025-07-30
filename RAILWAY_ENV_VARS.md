# 🔧 Railway Environment Variables - Tačne vrijednosti

## 📝 **Koraci za postavljanje environment variables:**

### **1. Prvo dodajte MySQL database:**
```bash
railway add
# Izaberite "MySQL" iz liste
```

### **2. Nakon što dodate MySQL, Railway će vam dati database credentials. Koristite te vrijednosti:**

```bash
# Database variables (Railway će vam dati ove vrijednosti)
railway variables set DB_HOST=containers-us-west-XX.railway.app
railway variables set DB_USER=root
railway variables set DB_PASSWORD=password-koji-vam-da-railway
railway variables set DB_NAME=railway
railway variables set DB_PORT=3306

# Security variables (možete koristiti ove vrijednosti)
railway variables set JWT_SECRET=menuauto-super-secret-jwt-key-2024
railway variables set SESSION_SECRET=menuauto-session-secret-key-2024

# Environment
railway variables set NODE_ENV=production
```

## 🔍 **Kako dobiti database credentials:**

1. Nakon `railway add` i izbora MySQL-a
2. Railway će vam dati URL poput: `mysql://root:password@containers-us-west-XX.railway.app:3306/railway`
3. Iz tog URL-a izvadite:
   - `DB_HOST` = `containers-us-west-XX.railway.app`
   - `DB_USER` = `root`
   - `DB_PASSWORD` = `password`
   - `DB_NAME` = `railway`
   - `DB_PORT` = `3306`

## ✅ **Provjera da li su postavljeni:**
```bash
railway variables
```

## 🚀 **Nakon postavljanja variables:**
```bash
railway up
railway open
```

## 🆘 **Ako ne znate database credentials:**
```bash
# Pogledajte Railway dashboard
railway dashboard

# Ili provjerite logs
railway logs
``` 