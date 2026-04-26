import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('/*', cors());

// Initialize database schema
const initDB = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attendance REAL,
      midterm_1 INTEGER,
      midterm_2 INTEGER,
      previous_grade INTEGER,
      final_grade INTEGER,
      predicted_grade REAL,
      status TEXT
    )
  `).run();
};

// Get all students
app.get('/api/students', async (c) => {
  const db = c.env.DB;
  await initDB(db);
  const students = await db.prepare('SELECT * FROM students').all();
  return c.json(students.results || []);
});

// Add single student
app.post('/api/students', async (c) => {
  const db = c.env.DB;
  const { name, attendance, midterm_1, midterm_2, previous_grade } = await c.req.json();
  
  const result = await db.prepare(`
    INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
    VALUES (?, ?, ?, ?, ?)
  `).bind(name, attendance, midterm_1, midterm_2, previous_grade).run();
  
  return c.json({ id: result.meta?.last_rowid });
});

// Bulk insert students
app.post('/api/students/bulk', async (c) => {
  const db = c.env.DB;
  const students = await c.req.json();
  
  if (!Array.isArray(students)) {
    return c.json({ error: 'Expected array' }, 400);
  }
  
  for (const s of students) {
    await db.prepare(`
      INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
      VALUES (?, ?, ?, ?, ?)
    `).bind(s.name, s.attendance, s.midterm_1, s.midterm_2, s.previous_grade).run();
  }
  
  return c.json({ success: true, count: students.length });
});

// Bulk update predictions
app.put('/api/students/bulk', async (c) => {
  const db = c.env.DB;
  const updates = await c.req.json();
  
  if (!Array.isArray(updates)) {
    return c.json({ error: 'Expected array' }, 400);
  }
  
  for (const u of updates) {
    await db.prepare(`
      UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?
    `).bind(u.predicted_grade, u.status, u.id).run();
  }
  
  return c.json({ success: true });
});

// Update single student
app.put('/api/students/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { predicted_grade, status, final_grade } = await c.req.json();
  
  if (final_grade !== undefined) {
    await db.prepare('UPDATE students SET final_grade = ? WHERE id = ?').bind(final_grade, id).run();
  } else {
    await db.prepare('UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?')
      .bind(predicted_grade, status, id).run();
  }
  
  return c.json({ success: true });
});

// Delete all students
app.delete('/api/students', async (c) => {
  const db = c.env.DB;
  await db.prepare('DELETE FROM students').run();
  return c.json({ success: true });
});

// Delete single student
app.delete('/api/students/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Serve static files from dist folder
app.get('/*', serveStatic({ root: './dist' }));

export default app;