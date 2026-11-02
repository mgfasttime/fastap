const express = require('express');
const session = require('express-session');
const db = require('./database');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'super_secret_key', resave: false, saveUninitialized: true }));

// --- РЕГИСТРАЦИЯ ---
app.get('/register', (req, res) => res.render('register', { error: null }));

app.post('/register', (req, res) => {
    const { name, login, password } = req.body;
    db.get("SELECT * FROM users WHERE login = ?", [login], (err, user) => {
        if (user) {
            return res.render('register', { error: 'Такой логин уже занят' });
        }
        db.run("INSERT INTO users (name, login, password, role) VALUES (?, ?, ?, 'client')", [name, login, password], (err) => {
            if (err) return res.render('register', { error: 'Ошибка базы данных' });
            res.redirect('/login');
        });
    });
});

// --- ЛОГИКА КРАСИВОЙ СТРАНИЦЫ ---
app.get('/go/:cardId', (req, res) => {
    const cardId = req.params.cardId;
    db.get("SELECT target_url FROM cards WHERE id = ?", [cardId], (err, row) => {
        if (row && row.target_url) {
            res.render('review', { targetUrl: row.target_url });
        } else {
            res.send("<h2 style='text-align:center; margin-top:50px;'>Спасибо! Но заведение пока не настроило ссылку.</h2>");
        }
    });
});

// --- АВТОРИЗАЦИЯ ---
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { login, password } = req.body;
    db.get("SELECT * FROM users WHERE login = ? AND password = ?", [login, password], (err, user) => {
        if (user) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Неверный логин или пароль' });
        }
    });
});

// --- КАБИНЕТ ЗАВЕДЕНИЯ ---
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const user = req.session.user;
    db.all("SELECT * FROM cards WHERE user_id = ?", [user.id], (err, cards) => {
        res.render('dashboard', { user, cards, error: null, success: null });
    });
});

app.post('/update-card', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { cardId, targetUrl } = req.body;
    const user = req.session.user;
    db.get("SELECT * FROM cards WHERE id = ? AND user_id = ?", [cardId, user.id], (err, card) => {
        if (!card) return res.send("Ошибка прав");
        db.run("UPDATE cards SET target_url = ? WHERE id = ?", [targetUrl, cardId], (err) => {
            db.all("SELECT * FROM cards WHERE user_id = ?", [user.id], (err, cards) => {
                res.render('dashboard', { user, cards, error: null, success: 'Ссылка обновлена!' });
            });
        });
    });
});

// --- АДМИНКА ---
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
    db.all("SELECT c.id as card_id, c.target_url, u.name as user_name FROM cards c LEFT JOIN users u ON c.user_id = u.id", (err, cards) => {
        db.all("SELECT * FROM users WHERE role = 'client'", (err, clients) => {
            res.render('admin', { cards, clients });
        });
    });
});

app.post('/admin/create-card', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
    const { cardId, userId } = req.body;
    const finalUserId = userId === "" ? null : userId;
    db.run("INSERT INTO cards (id, user_id) VALUES (?, ?)", [cardId, finalUserId], (err) => {
        res.redirect('/admin');
    });
});

app.listen(3000, () => console.log('Сервер запущен: http://localhost:3000'));
