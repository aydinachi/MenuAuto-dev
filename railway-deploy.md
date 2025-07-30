# 🚂 Railway Deployment Guide

## Koraci za deployment na Railway:

### 1. Instalirajte Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login na Railway
```bash
railway login
```

### 3. Inicijalizujte projekat
```bash
railway init
```

### 4. Dodajte MySQL database
```bash
railway add
# Izaberite MySQL
```

### 5. Postavite environment variables
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

### 6. Deploy aplikaciju
```bash
railway up
```

### 7. Otvorite aplikaciju
```bash
railway open
```

## Važne napomene:

- Railway će automatski postaviti `PORT` environment varijablu
- Database će biti dostupan preko Railway-a
- WebSocket podrška je uključena
- Aplikacija će biti dostupna na Railway URL-u

## Troubleshooting:

Ako imate problema sa deployment-om:
1. Provjerite da li su svi environment variables postavljeni
2. Provjerite Railway logs: `railway logs`
3. Provjerite da li je database povezan 