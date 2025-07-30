# 🍽️ **MenuAuto - Restaurant Management System MVP**

## 🎯 **Glavna Svrha**
MenuAuto je web aplikacija za upravljanje restoranom koja omogućava konobarima da unose narudžbe preko mobilnih uređaja, a kuharima i barmenima da vide i obrađuju te narudžbe u realnom vremenu.

## 👥 **Korisnici i Uloge**

### **1. Konobari (Waiters)**
- **Prijava:** `waiter1` / `password123`
- **Funkcionalnosti:**
  - ✅ Pregled menija (hrana i piće)
  - ✅ Odabir stolova (Stol 1-10)
  - ✅ Kreiranje narudžbi
  - ✅ Dodavanje napomena za stavke
  - ✅ Odabir veličina i varijacija (pizza: mala/srednja/velika)
  - ✅ Real-time notifikacije kada je hrana/piće spremno
  - ✅ Pregled statusa narudžbi
  - ✅ Otkazivanje stavki (storno)
  - ✅ Označavanje narudžbi kao "posluženo"

### **2. Kuhari (Cooks)**
- **Prijava:** `cook1` / `password123`
- **Funkcionalnosti:**
  - ✅ Pregled svih hranjenih narudžbi
  - ✅ Označavanje pojedinačnih stavki kao "spremno"
  - ✅ Pregled napomena i varijacija
  - ✅ Real-time ažuriranja
  - ✅ Filtriranje po statusu (pending/preparing/ready)

### **3. Barmeni (Bartenders)**
- **Prijava:** `bartender1` / `password123`
- **Funkcionalnosti:**
  - ✅ Pregled svih pićenih narudžbi
  - ✅ Označavanje pojedinačnih stavki kao "spremno"
  - ✅ Pregled napomena i varijacija
  - ✅ Real-time ažuriranja
  - ✅ Filtriranje po statusu

### **4. Administrator (Admin)**
- **Prijava:** `admin` / `password123`
- **Funkcionalnosti:**
  - ✅ Pregled svih narudžbi
  - ✅ Generisanje izvještaja
  - ✅ Upravljanje smjenama
  - ✅ Pregled statistika

## 🍕 **Meni Kategorije**

### **Hrana (Food)**
- **Pizza:** Pizza (varijacije: Margherita, Hawaii, Pepperoni)
- **Burgers:** Classic, Cheese
- **Pasta:** Spaghetti Bolognese, Carbonara
- **Salate:** Cezar, Grčka
- **Glavna jela:** Pileći kotlet, Steak
- **Deserti:** Tiramisu, Čokoladna torta

### **Piće (Drinks)**
- **Topla pića:** Espresso, Cappuccino, Topla čokolada
- **Hladna pića:** Coca Cola, Limunada, Sok od pomorandže, Voda
- **Alkoholna pića:** Pivo, Vino, Whiskey

## 🔄 **Workflow Procesa**

### **1. Kreiranje Narudžbe**
1. Konobar se prijavi
2. Odabere stol (Stol 1-10)
3. Dodaje stavke iz menija
4. Može dodati napomene (npr. "bez luka")
5. Može odabrati veličinu/varijaciju (za pizzu: Margherita, Hawaii, Pepperoni)
6. Potvrđuje narudžbu

### **2. Obrada Narudžbe**
1. Kuhar/barmen vidi novu narudžbu
2. Označava stavke kao "preparing"
3. Kada je spremno, označava kao "ready"
4. Konobar dobija notifikaciju
5. Konobar poslužuje i označava kao "served"

## 📊 **Real-time Funkcionalnosti**

### **Socket.IO Notifikacije**
- ✅ Novi narudžbi se pojavljuju automatski
- ✅ Status promjene se ažuriraju u realnom vremenu
- ✅ Zvučne notifikacije za konobare
- ✅ Vizuelne indikatori za spremne stavke

### **Status Narudžbi**
- 🔄 **pending** - čeka na obradu
- 👨‍🍳 **preparing** - u pripremi
- ✅ **ready** - spremno za posluživanje
- 🍽️ **served** - posluženo
- ❌ **cancelled** - otkazano

## 📈 **Izvještavanje**

### **Dnevni Izvještaji**
- ✅ Prodaja po konobaru
- ✅ Najprodavanije stavke
- ✅ Vrijeme pripreme
- ✅ Otkazane stavke (storno)

### **Smjene**
- ✅ "Nova smjena" dugme
- ✅ Generisanje finalnog izvještaja
- ✅ Reset aktivnih narudžbi

## 🎨 **UI/UX Funkcionalnosti**

### **Responsive Design**
- ✅ Mobilno optimizovan
- ✅ Bootstrap 5
- ✅ Touch-friendly interface
- ✅ Intuitivna navigacija

### **Interaktivni Elementi**
- ✅ Hover efekti na stolovima
- ✅ Toast notifikacije
- ✅ Modal prozori
- ✅ Real-time ažuriranja

## 🔧 **Tehničke Funkcionalnosti**

### **Backend**
- ✅ Node.js + Express.js
- ✅ MySQL database
- ✅ JWT autentifikacija
- ✅ Socket.IO za real-time komunikaciju
- ✅ RESTful API

### **Frontend**
- ✅ HTML5 + CSS3
- ✅ JavaScript (ES6+)
- ✅ Bootstrap 5
- ✅ Socket.IO client
- ✅ Chart.js za grafikone

### **Database**
- ✅ MySQL sa 8 tabela
- ✅ Relacije između tabela
- ✅ ENUM tipovi za status
- ✅ Automatsko seedovanje podataka

## 🚀 **Deployment**
- ✅ Railway hosting
- ✅ MySQL database hosting
- ✅ Environment variables
- ✅ Docker containerization
- ✅ SSL/HTTPS

## 📱 **Mobilna Optimizacija**
- ✅ Touch gestures
- ✅ Responsive breakpoints
- ✅ Fast loading
- ✅ Offline-friendly design

---

## 🎯 **Ključne Prednosti MVP-a**

1. **Jednostavnost** - Intuitivan interface za sve korisnike
2. **Real-time** - Trenutne notifikacije i ažuriranja
3. **Fleksibilnost** - Podrška za napomene i varijacije
4. **Skalabilnost** - Može se proširiti za više restorana
5. **Pouzdanost** - Stabilan sistem sa backup-om
6. **Analitika** - Detaljni izvještaji za upravljanje 