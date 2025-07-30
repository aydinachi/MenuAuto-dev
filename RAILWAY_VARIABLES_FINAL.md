# 🔧 **Railway Variables - Tačne vrijednosti**

## 📋 **Otvorite Railway Dashboard:**
```bash
railway open
```

## 🎯 **U Railway Dashboard-u:**

### **1. Idite na MenuAuto service**
- Kliknite na "MenuAuto" service (ne MySQL)

### **2. Kliknite "Variables" tab**

### **3. Dodajte ove variables:**

```
DB_HOST=mysql.railway.internal
DB_USER=root
DB_PASSWORD=FFDTMXoPjAaVhxwkWerNasNeKLSmfQtJ
DB_NAME=railway
DB_PORT=3306
JWT_SECRET=menuauto-super-secret-jwt-key-2024
SESSION_SECRET=menuauto-session-secret-key-2024
NODE_ENV=production
```

## ✅ **Provjera:**
Nakon što dodate variables, redeploy aplikaciju:
```bash
railway up
```

## 🔍 **Database credentials iz MySQL service:**
- **Host:** `mysql.railway.internal`
- **User:** `root`
- **Password:** `FFDTMXoPjAaVhxwkWerNasNeKLSmfQtJ`
- **Database:** `railway`
- **Port:** `3306`

## 🚀 **Nakon postavljanja:**
```bash
railway up
railway open
```

## 🆘 **Ako ne radi:**
1. Provjerite da li su svi variables dodani
2. Provjerite da li je MySQL service aktivan
3. Provjerite logs: `railway logs` 