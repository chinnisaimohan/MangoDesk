import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

// Vercel's Node.js serverless functions expect a single exported handler.
// We'll adapt the existing express app from backend/server.js by importing it
// as a module. To avoid duplicating code, we re-implement the express app
// here by reading the backend/server.js file and evaluating the app creation.

// Simpler approach: require the backend server file which exports an express app.
// But existing backend/server.js doesn't export app; so we'll reconstruct minimal
// Express app that mirrors the original endpoints. This keeps serverless function
// self-contained and avoids relying on runtime file I/O for users.json path.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const USERS_FILE = path.join(process.cwd(), 'backend', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  const users = readUsers();
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });
  const hashed = await bcrypt.hash(password, 10);
  const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
  users.push({ email, password: hashed, verified: false, verificationToken });
  writeUsers(users);
  const verifyUrl = `${process.env.APP_URL || 'https://your-deployment.vercel.app'}/verify?token=${verificationToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
  });
  res.json({ message: 'Registration successful. Please check your email to verify.' });
});

app.get('/api/verify', (req, res) => {
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

app.post('/api/login', async (req, res) => {
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

app.post('/api/summarize', async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

app.post('/api/share', requireAuth, async (req, res) => {
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

// Fallback for root and static files under /frontend
app.get('/', (req, res) => {
  const indexPath = path.join(process.cwd(), 'frontend', 'index.html');
  res.setHeader('Content-Type', 'text/html');
  res.send(fs.readFileSync(indexPath, 'utf8'));
});

// Export handler for Vercel serverless
export default function handler(req, res) {
  app(req, res);
}
