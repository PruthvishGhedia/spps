import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-pages';
import { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('/*', cors());

// Static files from _public
app.get('/*', serveStatic({ root: './_public' }));

// GET all students
app.get('/api/students', async (c) => {
  const db = c.env.DB;
  try {
    const students = await db.prepare('SELECT * FROM students ORDER BY id DESC').all();
    return c.json(students.results || []);
  } catch (e) {
    console.error('Error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// POST single student
app.post('/api/students', async (c) => {
  const db = c.env.DB;
  const { name, attendance, midterm_1, midterm_2, previous_grade } = await c.req.json();
  
  try {
    const result = await db.prepare(`
      INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
      VALUES (?, ?, ?, ?, ?)
    `).bind(name, attendance, midterm_1, midterm_2, previous_grade).run();
    
    return c.json({ id: result.meta?.last_row_id });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// POST - Bulk insert
app.post('/api/students/bulk', async (c) => {
  const db = c.env.DB;
  const students = await c.req.json();
  
  if (!Array.isArray(students)) {
    return c.json({ error: 'Expected array' }, 400);
  }
  
  try {
    for (const s of students) {
      await db.prepare(`
        INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
        VALUES (?, ?, ?, ?, ?)
      `).bind(s.name, s.attendance, s.midterm_1, s.midterm_2, s.previous_grade).run();
    }
    
    return c.json({ success: true, count: students.length });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// PUT - Bulk update predictions
app.put('/api/students/bulk', async (c) => {
  const db = c.env.DB;
  const updates = await c.req.json();
  
  if (!Array.isArray(updates)) {
    return c.json({ error: 'Expected array' }, 400);
  }
  
  try {
    for (const u of updates) {
      await db.prepare(`
        UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?
      `).bind(u.predicted_grade, u.status, u.id).run();
    }
    
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// PUT - Single student update
app.put('/api/students/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { predicted_grade, status, final_grade } = await c.req.json();
  
  try {
    if (final_grade !== undefined) {
      await db.prepare('UPDATE students SET final_grade = ? WHERE id = ?')
        .bind(final_grade, id).run();
    } else {
      await db.prepare('UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?')
        .bind(predicted_grade, status, id).run();
    }
    
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// DELETE all students
app.delete('/api/students', async (c) => {
  const db = c.env.DB;
  
  try {
    await db.prepare('DELETE FROM students').run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// DELETE single student
app.delete('/api/students/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  try {
    await db.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

export default app;