export const onRequestPost = async (context) => {
  const { env, request } = context;
  
  try {
    const students = await request.json();
    
    if (!Array.isArray(students)) {
      return new Response(JSON.stringify({ error: 'Expected array' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    for (const s of students) {
      await env.DB.prepare(
        'INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade) VALUES (?, ?, ?, ?, ?)'
      ).bind(s.name, s.attendance, s.midterm_1, s.midterm_2, s.previous_grade).run();
    }
    
    return new Response(JSON.stringify({ success: true, count: students.length }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestPut = async (context) => {
  const { env, request } = context;
  
  try {
    const updates = await request.json();
    
    for (const u of updates) {
      await env.DB.prepare('UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?')
        .bind(u.predicted_grade, u.status, u.id).run();
    }
    
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