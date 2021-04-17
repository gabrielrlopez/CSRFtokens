const express = require("express");
const handlebars = require("express-handlebars");
const session = require("express-session");
const cors = require("cors");
const flash = require("connect-flash-plus");
const fs = require("fs");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = 3000;

//Middlewares

// app.use(
//   cors({
//     origin: "https://localhost:5000",
//     credentials: true
//   })
// );

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "test",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

app.set("views", __dirname);

app.engine(
  "hbs",
  handlebars({
    defaultLayout: "main",
    layoutsDir: __dirname,
    extname: ".hbs",
  })
);

app.set("view engine", "hbs");

//Authentication middleware
const protect = (req, res, next) => {
  if (!req.session.userId) return res.redirect("/login");
  next();
};

//CSRF TOKENS
const tokens = new Map();

const csrfToken = (sessionId) => {
  const token = uuid();
  const userTokens = tokens.get(sessionId);
  userTokens.add(token);
  setTimeout(() => userTokens.delete(token), 3000);
  return token;
};

const csrf = (req, res, next) => {
  const token = req.body.csrf;
  if (!token || !tokens.get(req.sessionID).has(token))
    return res.status(422).send("CSRF Token missing or expired");
  next();
};
//Db
const users = JSON.parse(fs.readFileSync("db.json"));

//Routes
app.get("/login", (req, res) => {
  res.render("login", { message: req.flash("message") });
});

app.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    req.flash("message", "Fill all the fields");
    return res.redirect("/login");
  }
  const user = users.find((user) => user.email === req.body.email);
  if (!user || user.password !== req.body.password) {
    req.flash("message", "Invalid credentials!");
    return res.redirect("/login");
  }

  req.session.userId = user.id;
  tokens.set(req.sessionID, new Set());
  console.log(req.session);
  console.log(tokens);
  res.redirect("/home");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Logged out");
});

app.get("/home", protect, (req, res) => {
  res.send("Hello world");
});

app.get("/edit", protect, (req, res) => {
  res.render("edit", { token: csrfToken(req.sessionID) });
});

app.post("/edit", protect, csrf, (req, res) => {
  const user = users.find((user) => user.id === req.session.userId);
  user.email = req.body.email;
  console.log(`User ${user.id} email changed to ${user.email}`);
  res.send("Email successfully changed.");
});

//Server
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
