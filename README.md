# book-lens

1. #### Create "library" database and "books" table
```
CREATE DATABASE library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. #### Create "books" table
```
USE library;

CREATE TABLE books (
       id INT AUTO_INCREMENT PRIMARY KEY,
       title VARCHAR(50) NOT NULL,
       author VARCHAR(50) NOT NULL,
       genre VARCHAR(50) NOT NULL,
       year INT NOT NULL,
       available BOOLEAN NOT NULL DEFAULT TRUE
);
```

3. #### Create "users" table 
```
CREATE TABLE users ( 
	id INT AUTO_INCREMENT PRIMARY KEY, 
	username VARCHAR(255) NOT NULL UNIQUE, 
	passwordHash VARCHAR(255) NOT NULL, 
	role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
	active BOOLEAN NOT NULL DEFAULT TRUE, 
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP );
)
```


4. #### Add mock data to books table
```
USE library;

INSERT INTO books (title, author, genre, year) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 1925),
('To Kill a Mockingbird', 'Harper Lee', 'Fiction', 1960),
('1984', 'George Orwell', 'Dystopian', 1949),
('Pride and Prejudice', 'Jane Austen', 'Romance', 1813),
('The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 1937);
```
