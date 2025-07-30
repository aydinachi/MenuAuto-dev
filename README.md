# MenuAuto - Restoran Sistem

Modern web aplikacija za upravljanje narudžbama u restoranu, prilagođena za korištenje na mobilnim uređajima (telefoni i tableti).

## 🚀 Funkcionalnosti

### 👨‍💼 Konobari
- **Prijava u sistem** sa korisničkim imenom i lozinkom
- **Pregled menija** - hrana i piće sa cijenama i opisima
- **Kreiranje narudžbi** za stolove
- **Pratiti status** svojih narudžbi u realnom vremenu
- **Otkazivanje narudžbi** ako je potrebno

### 👨‍🍳 Kuhari
- **Pregled aktivnih narudžbi** sa hranom
- **Ažuriranje statusa** narudžbi (priprema se → spremno)
- **Real-time obavještenja** o novim narudžbama

### 🍸 Šankeri
- **Pregled aktivnih narudžbi** sa pićem
- **Ažuriranje statusa** narudžbi (priprema se → spremno)
- **Real-time obavještenja** o novim narudžbama

### 👨‍💻 Administratori
- **Upravljanje korisnicima** (dodavanje, uređivanje, brisanje)
- **Upravljanje menijem** (dodavanje, uređivanje, brisanje stavki)
- **Pregled svih narudžbi** i statistika

## 🛠️ Tehnologije

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Relacijska baza podataka
- **Socket.IO** - Real-time komunikacija
- **JWT** - Autentifikacija
- **bcryptjs** - Hashiranje lozinki

### Frontend
- **HTML5** - Struktura
- **CSS3** - Stilizacija
- **Bootstrap 5** - Responsive UI framework
- **JavaScript (ES6+)** - Interaktivnost
- **Socket.IO Client** - Real-time komunikacija

## 📋 Preduvjeti

- **Node.js** (verzija 14 ili novija)
- **MySQL** (verzija 5.7 ili novija)
- **npm** ili **yarn** package manager

## 🔧 Instalacija

### 1. Kloniranje repozitorija
```bash
git clone <repository-url>
cd MenuAuto
```

### 2. Instalacija zavisnosti
```bash
npm install
```

### 3. Konfiguracija baze podataka
Kreirajte MySQL bazu podataka i ažurirajte `config.env` fajl:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=menuauto_db
DB_PORT=3306

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-session-secret-key-change-this-in-production

PORT=3000
NODE_ENV=development
```

### 4. Inicijalizacija baze podataka
```bash
npm run init-db
```

Ova komanda će:
- Kreirati bazu podataka ako ne postoji
- Kreirati sve potrebne tabele
- Dodati demo korisnike i meni stavke

### 5. Pokretanje aplikacije
```bash
# Development mod
npm run dev

# Production mod
npm start
```

Aplikacija će biti dostupna na `http://localhost:3000`

## 👤 Demo pristup

Nakon inicijalizacije baze podataka, možete se prijaviti sa sledećim demo nalozima:

| Korisničko ime | Lozinka | Uloga |
|----------------|---------|-------|
| `waiter1` | `password123` | Konobar |
| `waiter2` | `password123` | Konobar |
| `cook1` | `password123` | Kuhar |
| `cook2` | `password123` | Kuhar |
| `bartender1` | `password123` | Šanker |
| `bartender2` | `password123` | Šanker |
| `admin` | `password123` | Administrator |

## 📱 Korištenje

### Konobar
1. **Prijavite se** sa waiter1/password123
2. **Odaberite stol** - unesite broj stola
3. **Dodajte stavke** - kliknite na stavke iz menija
4. **Podesite količine** - koristite +/- dugmad
5. **Dodajte napomene** ako je potrebno
6. **Pošaljite narudžbu** - kliknite "Pošalji narudžbu"

### Kuhar/Šanker
1. **Prijavite se** sa odgovarajućim nalogom
2. **Pregledajte aktivne narudžbe** koje se automatski prikazuju
3. **Ažurirajte status** - kliknite "Gotovo" kada je stavka spremna
4. **Pratite real-time obavještenja** o novim narudžbama

## 🏗️ Struktura projekta

```
MenuAuto/
├── config/
│   └── database.js          # Konfiguracija baze podataka
├── middleware/
│   └── auth.js              # Autentifikacija i autorizacija
├── routes/
│   ├── auth.js              # Rute za autentifikaciju
│   ├── menu.js              # Rute za meni
│   ├── orders.js            # Rute za narudžbe
│   └── users.js             # Rute za korisnike
├── scripts/
│   └── init-database.js     # Skripta za inicijalizaciju baze
├── public/
│   ├── css/
│   │   └── style.css        # Custom CSS stilovi
│   ├── js/
│   │   └── app.js           # Frontend JavaScript
│   └── index.html           # Glavna HTML stranica
├── server.js                # Glavni server fajl
├── package.json             # NPM konfiguracija
├── config.env               # Environment varijable
└── README.md                # Dokumentacija
```

## 🔌 API Endpoints

### Autentifikacija
- `POST /api/auth/login` - Prijava
- `GET /api/auth/profile` - Profil korisnika
- `POST /api/auth/logout` - Odjava
- `PUT /api/auth/change-password` - Promjena lozinke

### Meni
- `GET /api/menu` - Lista svih stavki
- `GET /api/menu/:id` - Stavka po ID-u
- `GET /api/menu/categories/list` - Kategorije
- `POST /api/menu` - Dodavanje stavke (admin)
- `PUT /api/menu/:id` - Ažuriranje stavke (admin)
- `DELETE /api/menu/:id` - Brisanje stavke (admin)

### Narudžbe
- `GET /api/orders` - Lista narudžbi (filtrirano po ulozi)
- `GET /api/orders/:id` - Narudžba po ID-u
- `POST /api/orders` - Kreiranje narudžbe (konobar)
- `PATCH /api/orders/:id/status` - Ažuriranje statusa
- `PATCH /api/orders/:id/cancel` - Otkazivanje (konobar)

### Korisnici
- `GET /api/users` - Lista korisnika (admin)
- `POST /api/users` - Dodavanje korisnika (admin)
- `PUT /api/users/:id` - Ažuriranje korisnika (admin)
- `DELETE /api/users/:id` - Brisanje korisnika (admin)

## 🔒 Sigurnost

- **JWT tokeni** za autentifikaciju
- **Hashirane lozinke** sa bcrypt
- **Role-based autorizacija** (RBAC)
- **SQL injection zaštita** sa prepared statements
- **CORS konfiguracija** za sigurnost

## 📊 Baza podataka

### Tabele
- **users** - Korisnici sistema
- **menu_items** - Stavke menija
- **orders** - Narudžbe
- **order_items** - Stavke narudžbi

### Relacije
- Narudžba pripada konobaru (waiter_id)
- Stavka narudžbe pripada narudžbi (order_id)
- Stavka narudžbe referencira meni stavku (menu_item_id)

## 🚀 Real-time funkcionalnosti

- **Socket.IO** za real-time komunikaciju
- **Automatsko ažuriranje** narudžbi bez reloadanja
- **Obavještenja** o novim narudžbama
- **Status ažuriranja** u realnom vremenu

## 📱 Responsive dizajn

- **Mobile-first** pristup
- **Bootstrap 5** za responsive layout
- **Touch-friendly** interfejs
- **Optimizovano** za tablete i telefone

## 🔧 Razvoj

### Pokretanje u development modu
```bash
npm run dev
```

### Kreiranje nove verzije baze
```bash
npm run init-db
```

### Logovi
Aplikacija koristi console.log za debugging. Pratite terminal za informacije o:
- Povezivanju sa bazom podataka
- Socket.IO konekcijama
- API pozivima
- Greškama

## 🐛 Troubleshooting

### Problem sa bazom podataka
1. Provjerite da li je MySQL pokrenut
2. Provjerite konfiguraciju u `config.env`
3. Pokrenite `npm run init-db`

### Problem sa Socket.IO
1. Provjerite da li je server pokrenut
2. Provjerite konzolu browsera za greške
3. Provjerite da li firewall blokira port 3000

### Problem sa autentifikacijom
1. Provjerite da li je JWT_SECRET postavljen
2. Provjerite da li su demo korisnici kreirani
3. Provjerite da li je token validan

## 📈 Buduće funkcionalnosti

- [ ] **QR kodovi** za stolove
- [ ] **Sistem plaćanja** integracija
- [ ] **Statistike i izvještaji**
- [ ] **Push notifikacije**
- [ ] **Offline mod** rada
- [ ] **Multi-language** podrška
- [ ] **Dark mode** tema
- [ ] **Print** funkcionalnost
- [ ] **Backup** sistema
- [ ] **API dokumentacija** (Swagger)

## 📄 Licenca

MIT License - slobodno korištenje za komercijalne i nekomercijalne projekte.

## 👥 Autor

MenuAuto Team - Modern restaurant management system

---

**Napomena:** Ova aplikacija je dizajnirana za brzo i efikasno korištenje u realnim restoranskim uslovima. Fokus je na jednostavnosti korištenja i brzini rada. 