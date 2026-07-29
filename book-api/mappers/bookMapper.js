
function mapDTOIntoORM(bookDTO) {
    return {
        title: bookDTO.title,
        author: bookDTO.author,
        genre: bookDTO.genre,
        year: bookDTO.year,
        available: bookDTO.available,
    };
}

module.exports = {
    mapDTOIntoORM
};
