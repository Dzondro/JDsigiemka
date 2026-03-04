CREATE TABLE uzytkownicy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imie VARCHAR(50) NOT NULL,
    nazwisko VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    wiek INT(3) NOT NULL,
    haslo VARCHAR(50) NOT NULL
);

CREATE TABLE posty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tytul VARCHAR(100) NOT NULL,
    tresc TEXT NOT NULL,
    autor_id INT NOT NULL,
    data_utworzenia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES uzytkownicy(id)
);