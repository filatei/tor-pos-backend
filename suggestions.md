// Backend Express.js code
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Configure CORS to accept requests from all origins during development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Expenses endpoints
app.get('/api/expenses/list', authenticateToken, async (req, res) => {
  const { page = 1, pagesize = 30 } = req.query;
  
  try {
    // Your database query here
    const expenses = []; // Replace with actual database query
    
    res.json({
      expense: expenses,
      total: expenses.length,
      page: parseInt(page),
      pagesize: parseInt(pagesize)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Login endpoint
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Your authentication logic here
    // Generate JWT token
    const token = jwt.sign({ userId: 'user_id' }, 'your_jwt_secret', { expiresIn: '24h' });
    
    res.json({
      token,
      userId: 'user_id',
      name: 'User Name',
      email: email,
      // other user data
    });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});