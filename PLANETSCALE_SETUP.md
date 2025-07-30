# 🌍 **PlanetScale Setup - Besplatna MySQL alternativa**

## 🎯 **Zašto PlanetScale?**
- ✅ **Besplatno** - 1 database, 1 billion reads/month
- ✅ **MySQL kompatibilan**
- ✅ **Lakše setup** od Railway MySQL-a
- ✅ **Web interface** za upravljanje

## 🚀 **Koraci za PlanetScale:**

### **1. Kreirajte PlanetScale account**
Idite na: https://planetscale.com/
- Kliknite "Start for free"
- Registrujte se sa GitHub-om

### **2. Kreirajte database**
1. Kliknite "New database"
2. Nazovite ga: `menuauto-db`
3. Izaberite region: `US East (N. Virginia)`
4. Kliknite "Create database"

### **3. Dobijte connection string**
1. Kliknite na vašu database
2. Idite na "Connect" tab
3. Kopirajte "Connection string"

### **4. Postavite Railway variables**
```bash
railway variables set DB_HOST=aws.connect.psdb.cloud
railway variables set DB_USER=your-planetscale-user
railway variables set DB_PASSWORD=your-planetscale-password
railway variables set DB_NAME=menuauto-db
railway variables set DB_PORT=3306
railway variables set JWT_SECRET=menuauto-super-secret-jwt-key-2024
railway variables set SESSION_SECRET=menuauto-session-secret-key-2024
railway variables set NODE_ENV=production
```

### **5. Inicijalizujte database**
```bash
# Lokalno testiranje
npm run init-db
```

### **6. Deploy na Railway**
```bash
railway up
```

## 🔗 **PlanetScale Connection String format:**
```
mysql://username:password@aws.connect.psdb.cloud:3306/database_name?sslaccept=strict
```

## ✅ **Prednosti PlanetScale:**
- **Besplatno** - 1 database
- **MySQL kompatibilan**
- **Web interface**
- **Lakše setup**
- **SSL automatski**

## 🆘 **Ako ne radi:**
1. Provjerite da li je connection string tačan
2. Provjerite da li su svi variables postavljeni
3. Provjerite da li je database kreiran 