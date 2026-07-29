
class BookDTO {
    constructor(title, author, genre, year, available) {
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.year = year;
        this.available = Boolean(available);
    }
}

module.exports = BookDTO;
