# 🚀 **Railway Aplikacija - Testiranje**

## ✅ **Status: APLIKACIJA JE USPJEŠNO DEPLOYOVANA!**

### 🌐 **Railway URL:**
Otvorite Railway dashboard i kopirajte URL vaše aplikacije.

### 👥 **Login Credentials:**

#### **Konobari (Waiters):**
- **Username:** `waiter1` | **Password:** `password`
- **Username:** `waiter2` | **Password:** `password`

#### **Kuvari (Cooks):**
- **Username:** `cook1` | **Password:** `password`
- **Username:** `cook2` | **Password:** `password`

#### **Barmen (Bartenders):**
- **Username:** `bartender1` | **Password:** `password`

#### **Administrator:**
- **Username:** `admin` | **Password:** `password`

## 🧪 **Testiranje Funkcionalnosti:**

### **1. Testiranje Login-a:**
1. Otvorite Railway URL
2. Prijavite se kao `waiter1` / `password`
3. Trebali biste vidjeti waiter dashboard

### **2. Testiranje Naručivanja:**
1. Prijavite se kao konobar
2. Odaberite stol (Stol 1-10)
3. Dodajte stavke iz menija
4. Testirajte različite kategorije (hrana/piće)

### **3. Testiranje Kitchen/Bar:**
1. Otvorite novi tab
2. Prijavite se kao `cook1` / `password`
3. Trebali biste vidjeti hranu narudžbe
4. Prijavite se kao `bartender1` / `password`
5. Trebali biste vidjeti piće narudžbe

### **4. Testiranje Real-time:**
1. Konobar kreira narudžbu
2. Cook/Bartender treba da vidi novu narudžbu
3. Cook/Bartender označi kao "Ready"
4. Konobar treba da primi notifikaciju

## 🎯 **Očekivane Funkcionalnosti:**

### **Konobar Dashboard:**
- ✅ Prijava sa `waiter1` / `password`
- ✅ Odabir stola (Stol 1-10)
- ✅ Dodavanje stavki iz menija
- ✅ Odabir veličine/varijacije (za pizzu)
- ✅ Dodavanje napomena
- ✅ Real-time notifikacije

### **Kitchen Dashboard:**
- ✅ Prijava sa `cook1` / `password`
- ✅ Pregled hrane narudžbi
- ✅ Označavanje stavki kao "Ready"
- ✅ Real-time ažuriranja

### **Bar Dashboard:**
- ✅ Prijava sa `bartender1` / `password`
- ✅ Pregled pića narudžbi
- ✅ Označavanje stavki kao "Ready"
- ✅ Real-time ažuriranja

### **Admin Dashboard:**
- ✅ Prijava sa `admin` / `password`
- ✅ Pregled izvještaja
- ✅ Upravljanje korisnicima

## 🍕 **Posebne Funkcionalnosti:**

### **Pizza Varijacije:**
- Odaberite "Pizza" iz menija
- Trebate vidjeti opcije: Margherita, Hawaii, Pepperoni
- Odaberite varijaciju i potvrdite

### **Real-time Notifikacije:**
- Konobar kreira narudžbu
- Cook/Bartender označi kao "Ready"
- Konobar treba da čuji zvuk i vidi notifikaciju

## 🆘 **Ako nešto ne radi:**

### **Login Problem:**
- Provjerite da li koristite tačne credentials
- Provjerite da li je Railway URL tačan
- Provjerite Railway logs: `railway logs`

### **Database Problem:**
- Provjerite Railway logs
- Database je automatski inicijalizovan
- Sve tabele su kreirane

### **Real-time Problem:**
- Provjerite da li su oba tab-a otvorena
- Provjerite da li su različiti korisnici prijavljeni
- Socket.IO treba da radi automatski

## 🎉 **Uspješno Testiranje:**

Ako sve radi kako treba, trebali biste moći:
1. ✅ Prijaviti se kao različiti korisnici
2. ✅ Kreirati narudžbe kao konobar
3. ✅ Vidjeti narudžbe u kitchen/bar
4. ✅ Označiti stavke kao "Ready"
5. ✅ Primiti real-time notifikacije
6. ✅ Testirati sve kategorije menija

**Aplikacija je spremna za produkciju!** 🚀 