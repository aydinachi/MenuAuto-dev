# 🔧 **Database Connection Problem - Rješenje**

## 🚨 **Problem:**
```
Database connection failed
```

## ✅ **Rješenje korak po korak:**

### **1. Otvorite Railway Dashboard**
```bash
railway open
```
Ili idite na: https://railway.com/dashboard

### **2. Dodajte MySQL Database**
1. U Railway dashboard-u kliknite na vaš projekat "MenuAuto"
2. Kliknite "New Service"
3. Izaberite "Database" → "MySQL"
4. Sačekajte da se kreira

### **3. Postavite Environment Variables**
U Railway dashboard-u:

1. **Idite na vaš MenuAuto service**
2. **Kliknite "Variables" tab**
3. **Dodajte ove variables:**

```
DB_HOST=your-mysql-host.railway.app
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=railway
DB_PORT=3306
JWT_SECRET=menuauto-super-secret-jwt-key-2024
SESSION_SECRET=menuauto-session-secret-key-2024
NODE_ENV=production
```

### **4. Kako dobiti database credentials:**
1. U Railway dashboard-u idite na **MySQL service**
2. Kliknite **"Connect"** tab
3. Kopirajte **"Railway MySQL URL"**
4. Iz URL-a izvadite:
   - `DB_HOST` = hostname iz URL-a
   - `DB_PASSWORD` = password iz URL-a

### **5. Redeploy aplikaciju**
```bash
railway up
```

### **6. Provjerite logs**
```bash
railway logs
```

## 🆘 **Ako i dalje ne radi:**

1. **Provjerite da li su svi variables postavljeni**
2. **Provjerite da li je MySQL service aktivan**
3. **Provjerite da li su credentials tačni**

## 📞 **Alternative:**
Ako Railway ne radi, možemo:
- Koristiti **PlanetScale** (besplatno)
- Koristiti **Supabase** (besplatno)
- Koristiti **Railway** sa drugim pristupom 