require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/session',   require('./routes/session'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/recommend', require('./routes/recommend'));
app.use('/api/booking',   require('./routes/booking'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Backend running on port ${PORT}`)))
  .catch(err => { console.error('DB connection failed:', err); process.exit(1); });
