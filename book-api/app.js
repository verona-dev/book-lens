const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const sequelize = require("./db");
const Book = require("./models/Book");
const User = require("./models/User");

const BookDTO = require("./dto/BookDTO");
const { mapDTOIntoORM } = require("./mappers/bookMapper");

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

function calculatePasswordHash(password) {
    return crypto
       .createHash("sha256")
       .update(password)
       .digest("hex");
}

function compareHashes(sentHash, storedHash) {
    const sent = Buffer.from(sentHash, "hex");
    const stored = Buffer.from(storedHash, "hex");
    
    if (sent.length !== stored.length) {
        return false;
    }
    
    return crypto.timingSafeEqual(sent, stored);
}

const activeTokens = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

function authenticate(request, response, next) {
    const authorization = request.headers.authorization;
    
    if (!authorization) {
        return response.status(401).json({
            message: "Missing Authorization header."
        });
    }
    
    const parts = authorization.split(" ");
    
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return response.status(401).json({
            message: "Invalid Authorization header."
        });
    }
    
    const token = parts[1];
    
    if (!activeTokens.has(token)) {
        return response.status(401).json({
            message: "Invalid token."
        });
    }
    
    request.user = activeTokens.get(token);
    request.token = token;
    next();
}

function allowRoles(...roles) {
    return function(request, response, next) {
        if (!roles.includes(request.user.role)) {
            return response.status(403).json({
                message: "Access denied."
            });
        }
        next();
    };
}

function prepareUserForResponse(user) {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

// ------------------------------------------------------------
// GET
// ------------------------------------------------------------

app.get("/", (request, response) => {
    response.send("Node.js ORM API works. Books project.");
});

// ------------------------------------------------------------
// LOGIN + LOGOUT
// ------------------------------------------------------------

app.post("/admin/login", async (request, response) => {
    try {
        const { username, password } = request.body;
        
        if (!username || !password) {
            return response.status(400).json({
                message: "Username and password are required."
            });
        }
        
        const user = await User.findOne({
            where: {
                username,
                active: true,
                role: "admin" // Only allow admin users
            }
        });
        
        if (!user) {
            return response.status(401).json({
                message: "Invalid username or password."
            });
        }
        
        const hash = calculatePasswordHash(password);
        
        if (!compareHashes(hash, user.passwordHash)) {
            return response.status(401).json({
                message: "Invalid username or password."
            });
        }
        
        const token = generateToken();
        
        activeTokens.set(token, {
            id: user.id,
            username: user.username,
            role: user.role
        });
        
        response.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    }
    catch(error) {
        console.log(error);
        response.status(500).json({
            message: "Login failed."
        });
    }
});

app.post("/login", async (request, response) => {
    try {
        const { username, password } = request.body;
        
        if (!username || !password) {
            return response.status(400).json({
                message: "Username and password are required."
            });
        }
        
        const user = await User.findOne({
            where: {
                username,
                active: true
            }
        });
        
        if (!user) {
            return response.status(401).json({
                message: "Invalid username or password."
            });
        }
        
        const hash = calculatePasswordHash(password);
        
        if (!compareHashes(hash, user.passwordHash)) {
            return response.status(401).json({
                message: "Invalid username or password."
            });
        }
        
        const token = generateToken();
        
        activeTokens.set(token, {
            id: user.id,
            username: user.username,
            role: user.role
        });
        
        response.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    }
    catch(error) {
        console.log(error);
        
        response.status(500).json({
            message: "Login failed."
        });
    }
});

app.post("/logout", authenticate, (request, response) => {
    activeTokens.delete(request.token);
    
    response.json({
        message: "Logged out."
    });
});

// ------------------------------------------------------------
// ADMIN GET /users
// ------------------------------------------------------------

app.get(
   "/users",
   authenticate,
   allowRoles("admin"),
   async (request, response) => {
       try {
           const users = await User.findAll({
               order: [[ "id", "ASC"]]
           });
           
           const safeUsers = users.map(prepareUserForResponse);
           
           response.json(safeUsers);
       } catch(error) {
           console.error(error);
           
           response.status(500).json({
               message: "Error getting users."
           });
       }
   }
);

// ------------------------------------------------------------
// ADMIN POST /users
// ------------------------------------------------------------

app.post(
   "/users",
   authenticate,
   allowRoles("admin"),
   async (request, response) => {
       try {
           const { username, password, role } = request.body;
           
           if(!username || !password || !role) {
               return response.status(401).json({
                   message: "Username and password are required."
               });
           }
           
           if(!["admin", "user"].includes(role)) {
               return response.status(401).json({
                   message: "Role must be an admin or user."
               });
           }
           
           if(password.length < 6) {
               return response.status(401).json({
                   message: "Password must be at least 6 characters."
               });
           }
           
           const existingUser = await User.findOne({
               where: { username }
           });
           
           if(existingUser) {
               return response.status(409).json({
                   message: "User already exists."
               })
           }
           
           const newUser = await User.create({
               username,
               passwordHash: calculatePasswordHash(password),
               role,
               active: true,
           });
           
           response.status(201).json({
               user: prepareUserForResponse(newUser),
               message: "User created successfully."
           });
       } catch(error) {
           console.error(error);
           
           response.status(500).json({
               message: "Error getting users."
           })
       }
   }
);

// ------------------------------------------------------------
// READ GET /books
// ------------------------------------------------------------

app.get(
   "/books",
   authenticate,
   allowRoles("admin", "user"),
   async (request, response) => {
    try {
        // ORM method findAll() fetches all rows from the table.
        const books = await Book.findAll({
            order: [["id", "ASC"]]
        });
        
        response.json(books);
        
    } catch (error) {
        console.error(error);
        
        response.status(500).json({
            message: "Error fetching books."
        });
    }
});

// ------------------------------------------------------------
// READ GET /books/:id
// ------------------------------------------------------------

app.get(
   "/books/:id",
   authenticate,
   allowRoles("admin", "user"),
   async (request, response) => {
    try {
        const bookId = Number(request.params.id);
        
        // Simple ID validation.
        if (!Number.isInteger(bookId)) {
            return response.status(400).json({
                message: "Book ID must be an integer."
            });
        }
        
        // ORM method findByPk() fetches a row by primary key value.
        const book = await Book.findByPk(bookId);
        
        if (!book) {
            return response.status(404).json({
                message: "Book not found."
            });
        }
        
        response.json(book);
        
    } catch (error) {
        console.error(error);
        
        response.status(500).json({
            message: "Error fetching book."
        });
    }
});

// ------------------------------------------------------------
// CREATE POST /books
// ------------------------------------------------------------

app.post(
   "/books",
   authenticate,
   allowRoles("admin"),
   async (request, response) => {
    try {
        // 1. Receive data from the client via request.body.
        const title = request.body.title;
        const author = request.body.author;
        const genre = request.body.genre;
        const year = request.body.year;
        const available = request.body.available;
        
        if (!title || !author || !genre || year === undefined || available === undefined) {
            return response.status(400).json({
                message: "Missing data for book creation."
            });
        }
        
        // 2. Create a DTO object from the data sent by the client.
        const bookDTO = new BookDTO(
           title,
           author,
           genre,
           Number(year),
           available,
        );
        
        // 3. Map DTO to data suitable for the ORM model.
        const ormData = mapDTOIntoORM(bookDTO);
        
        // 4. ORM method create() saves a new row to the database.
        const newBook = await Book.create(ormData);
        
        // 5. Return the created ORM object as JSON.
        // Status 201 means "Created".
        response.status(201).json(newBook);
        
    } catch (error) {
        console.error(error);
        
        response.status(500).json({
            message: "Error adding book."
        });
    }
});

// ------------------------------------------------------------
// UPDATE PUT /books/:id
// ------------------------------------------------------------

app.put(
   "/books/:id",
   authenticate,
   allowRoles("admin"),
   async (request, response) => {
    try {
        const bookId = Number(request.params.id);
        
        if (!Number.isInteger(bookId)) {
            return response.status(400).json({
                message: "Book ID must be an integer."
            });
        }
        
        const title = request.body.title;
        const author = request.body.author;
        const genre = request.body.genre;
        const year = request.body.year;
        const available = request.body.available;
        
        if (!title || !author || !genre || year === undefined || available === undefined) {
            return response.status(400).json({
                message: "Missing data for book update."
            });
        }
        
        // 1. Find ORM object by ID.
        const book = await Book.findByPk(bookId);
        
        if (!book) {
            return response.status(404).json({
                message: "Book not found."
            });
        }
        
        // 2. Create a DTO object from the data sent by the client.
        const bookDTO = new BookDTO(
           title,
           author,
           genre,
           Number(year),
           available,
        );
        
        // 3. Map DTO to ORM data.
        const ormData = mapDTOIntoORM(bookDTO);
        
        // 4. Update ORM object with new data.
        await book.update(ormData);
        
        // 5. Return the updated object.
        response.json(book);
        
    } catch (error) {
        console.error(error);
        
        response.status(500).json({
            message: "Error updating book."
        });
    }
});

// ------------------------------------------------------------
// DELETE /books/:id
// ------------------------------------------------------------

app.delete(
   "/books/:id",
   authenticate,
   allowRoles("admin"),
   async (request, response) => {
    try {
        const bookId = Number(request.params.id);
        
        if (!Number.isInteger(bookId)) {
            return response.status(400).json({
                message: "Book ID must be an integer."
            });
        }
        
        // ORM method destroy() deletes a row based on the condition.
        const deleteNumber = await Book.destroy({
            where: {
                id: bookId
            }
        });
        
        if (deleteNumber === 0) {
            return response.status(404).json({
                message: "Book not found."
            });
        }
        
        response.json({
            message: "Book deleted successfully."
        });
        
    } catch (error) {
        console.error(error);
        
        response.status(500).json({
            message: "Error deleting book."
        });
    }
});

// ------------------------------------------------------------
// INIT USERS and START SERVER
// ------------------------------------------------------------

async function createInitialUsers() {
    const count = await User.count();
    
    if (count > 0) {
        return;
    }
    
    await User.bulkCreate([
        {
            username: "admin",
            passwordHash: calculatePasswordHash("admin123"),
            role: "admin",
            active: true
        },
        {
            username: "user",
            passwordHash: calculatePasswordHash("user123"),
            role: "user",
            active: true
        }
    ]);
}

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log("Database connection successful.");
        
        await sequelize.sync();
        console.log("ORM models are synchronized.");
        
        await createInitialUsers();
        
        app.listen(3000, () => {
            console.log("Server works on http://localhost:3000");
        });
        
    } catch (error) {
        console.error("Database connection error:", error);
    }
}

startServer();
