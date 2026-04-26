export const onRequestGet = async (context) => {
  const { env } = context;
  
  try {
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
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestPost = async (context) => {
  const { env, request } = context;
  
  try {
    const body = await request.json();
    const { name, attendance, midterm_1, midterm_2, previous_grade } = body;
    
    const result = await env.DB.prepare(
      'INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, attendance || 0, midterm_1 || 0, midterm_2 || 0, previous_grade || 0).run();
    
    return new Response(JSON.stringify({ id: result.meta?.last_row_id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestDelete = async (context) => {
  const { env } = context;
  
  try {
    await env.DB.prepare('DELETE FROM students').run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
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