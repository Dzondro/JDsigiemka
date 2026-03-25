# Projekt: Mini Blog w Express
Autor: **Jakub Jędrak**

## Opis
Prosta aplikacja blogowa z dynamicznymi widokami. Umożliwia dodawanie postów, które są widoczne na stronie głównej.

## Funkcjonalności
- Strona główna `/` z listą postów
- Dodawanie postów (`POST /add`)
- Edycja i usuwanie postów (autor lub administrator)
- Dodatkowa strona informacyjna `/about`
- Rejestracja i logowanie (SQLite + sesje w cookies)

## Uruchomienie
```bash
cd projekt04
npm install
npm start
```

## Logowanie / rejestracja
- Hasło: `8-72` znaków, co najmniej 1 litera i 1 cyfra
- Baza danych: `projekt04/data/blog.sqlite` (tworzona automatycznie przy starcie). Możesz ustawić ścieżkę przez `DB_PATH`.

## Admin
- Email: `admin@localhost`
- Hasło: `admin123`

## Ograniczenia
- Post: tytuł max `120` znaków, treść max `5000` znaków
- Request body: limit `25kb`

## Seed (dane testowe)
Projekt (dla wygody deweloperskiej) pozwala wypełnić bazę danymi testowymi.


```bash
cd projekt04
npm run seed
```

Domyślnie seed **nie** dosiewa danych, jeśli tabela `posts` nie jest pusta. Wymuszenie:
```bash
SEED_FORCE=1 npm run seed
```

Otwórz w przeglądarce: [http://localhost:8000](http://localhost:8000)
