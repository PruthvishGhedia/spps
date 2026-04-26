export const onRequestPut = async (context) => {
  const { env, params, request } = context;
  const id = params.id;
  
  try {
    const body = await request.json();
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
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};

export const onRequestDelete = async (context) => {
  const { env, params } = context;
  const id = params.id;
  
  try {
    await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
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