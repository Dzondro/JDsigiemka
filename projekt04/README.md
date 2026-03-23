# Projekt: Mini Blog w Express
Autor: **Jakub Jedrak**

## Opis
Prosta aplikacja blogowa z dynamicznymi widokami. Umożliwia dodawanie postów, które są widoczne na stronie głównej.

## Funkcjonalności
- Strona główna `/` z dynamicznie generowaną listą postów
- Formularz dodawania posta (`POST /add`)
- Dodatkowa strona informacyjna `/about`
- Stylizacja w `public/css/style.css`
- Rejestracja i logowanie (baza danych SQLite + sesje w cookies)

## Uruchomienie
```bash
cd projekt04
npm install
npm start
```


JeĹ›li port jest zajÄ™ty, uruchom np. tak:
```bash
PORT=8001 npm start
```

## Logowanie / rejestracja
- Endpointy: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- Baza danych: `projekt04/blog.sqlite` (tworzona automatycznie przy starcie). MoĹĽesz ustawiÄ‡ Ĺ›cieĹĽkÄ™ przez `DB_PATH`.
- Dodawanie postĂłw (`POST /add`) wymaga zalogowania.
A następnie otwórz w przeglądarce: [http://localhost:8000](http://localhost:8000)
