import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const USERS_FILE = path.join(process.cwd(), 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Configure nodemailer (use your real email for production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  const users = readUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });
  const hashed = await bcrypt.hash(password, 10);
  const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
  users.push({ email, password: hashed, verified: false, verificationToken });
  writeUsers(users);
  // Send verification email
  const verifyUrl = `https://mangodesk.onrender.com/verify?token=${verificationToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
  });
  res.json({ message: 'Registration successful. Please check your email to verify.' });
});

// Email verification endpoint
app.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid token.');
  let email;
  try {
    email = jwt.verify(token, JWT_SECRET).email;
  } catch {
    return res.status(400).send('Invalid or expired token.');
  }
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send('User not found.');
  user.verified = true;
  user.verificationToken = null;
  writeUsers(users);
  res.send('Email verified! You can now log in.');
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials.' });
  if (!user.verified) return res.status(400).json({ error: 'Email not verified.' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials.' });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token.' });
  try {
    const { email } = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.user = { email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
}

app.post('/summarize', async (req, res) => {
  const { transcript, prompt } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required.' });
  }
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `${prompt || 'Generate summary'}\n\n${transcript}`,
    });
    res.json({ summary: text });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

// Placeholder for email sharing endpoint

// Share summary via email (requires login)
app.post('/share', requireAuth, async (req, res) => {
  const { emails, summary } = req.body;
  if (!emails || !summary) return res.status(400).json({ error: 'Missing fields.' });
  const recipients = emails.split(',').map(e => e.trim()).filter(Boolean);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: 'Shared Summary',
    text: summary
  });
  res.json({ status: 'Summary sent.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
