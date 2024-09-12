const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();

// Database connection
const sequelize = new Sequelize('appdb', 'appuser', 'apppassword', {
  host: 'app-postgresql',
  dialect: 'postgres',
});

// Test DB connection
sequelize.authenticate().then(() => {
  console.log('Connection to DB established');
}).catch(err => {
  console.error('Unable to connect to the DB:', err);
});

// Define user model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  }
});

// Keycloak setup
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore });

app.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

app.use(keycloak.middleware());

// Route that requires authentication
app.get('/profile', keycloak.protect(), async (req, res) => {
  const username = req.kauth.grant.access_token.content.preferred_username;
  const email = req.kauth.grant.access_token.content.email;

  // Save or update user in the database
  let user = await User.findOne({ where: { username } });
  if (!user) {
    user = await User.create({ username, email });
  }

  res.json({
    message: `Hello, ${username}`,
    user
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
