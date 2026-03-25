const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../todo-frontend')));

// Fallback to index.html for unknown GET requests (SPA behavior, though we have multi-page)
app.use((req, res) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, '../todo-frontend/index.html'));
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend accessible at: http://localhost:${PORT}`);
});
