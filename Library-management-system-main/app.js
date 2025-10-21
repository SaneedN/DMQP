const express = require("express");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require("path");
const favicon = require("serve-favicon");

// Route imports
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const bookRoutes = require('./routes/books');

// Initialize app
const app = express();

// Middleware setup
app.use(favicon(path.join(__dirname, 'public', 'open-book.png')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database & session store setup
const options = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'library_db'
};

const sessionStore = new MySQLStore(options);

app.use(session({
    key: 'library_session',
    secret: 'your_secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Root redirect based on session user
app.get('/', (req, res) => {
    if (req.session.user) {
        const role = req.session.user.role;
        if (role === 'admin') res.redirect('/admin/dashboard');
        else if (role === 'faculty') res.redirect('/faculty/dashboard');
        else res.redirect('/student/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Routes
app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/admin', adminRoutes);
app.use('/', bookRoutes);

// Start server
app.listen(3000, () => {
    console.log('✅ Server running on http://localhost:3000');
});
