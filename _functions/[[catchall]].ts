export const onRequestGet = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  
  try {
    if (url.pathname === '/api/students') {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        attendance REAL,
        midterm_1 INTEGER,
        midterm_2 INTEGER,
        previous_grade INTEGER,
        final_grade INTEGER,
        predicted_grade REAL,
        status TEXT
      )`).run();
      
      const students = await env.DB.prepare('SELECT * FROM students ORDER BY id DESC').all();
      return new Response(JSON.stringify(students.results || []), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestPost = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  
  try {
    const body = await request.json();
    
    if (url.pathname === '/api/students') {
      const { name, attendance, midterm_1, midterm_2, previous_grade } = body;
      const result = await env.DB.prepare(
        'INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade) VALUES (?, ?, ?, ?, ?)'
      ).bind(name, attendance || 0, midterm_1 || 0, midterm_2 || 0, previous_grade || 0).run();
      
      return new Response(JSON.stringify({ id: result.meta?.last_row_id }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (url.pathname === '/api/students/bulk') {
      const students = body;
      if (!Array.isArray(students)) {
        return new Response(JSON.stringify({ error: 'Expected array' }), { status: 400 });
      }
      
      for (const s of students) {
        await env.DB.prepare(
          'INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade) VALUES (?, ?, ?, ?, ?)'
        ).bind(s.name, s.attendance, s.midterm_1, s.midterm_2, s.previous_grade).run();
      }
      
      return new Response(JSON.stringify({ success: true, count: students.length }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestPut = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  
  try {
    const body = await request.json();
    
    if (url.pathname === '/api/students/bulk') {
      for (const u of body) {
        await env.DB.prepare('UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?')
          .bind(u.predicted_grade, u.status, u.id).run();
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    const match = url.pathname.match(/^\/api\/students\/(\d+)$/);
    if (match) {
      const id = match[1];
      const { predicted_grade, status, final_grade } = body;
      
      if (final_grade !== undefined) {
        await env.DB.prepare('UPDATE students SET final_grade = ? WHERE id = ?').bind(final_grade, id).run();
      } else {
        await env.DB.prepare('UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?')
          .bind(predicted_grade, status, id).run();
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestDelete = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  
  try {
    if (url.pathname === '/api/students') {
      await env.DB.prepare('DELETE FROM students').run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    const match = url.pathname.match(/^\/api\/students\/(\d+)$/);
    if (match) {
      const id = match[1];
      await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};