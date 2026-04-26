import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

async function startServer() {
  const db = new Database("students.db");

  try {
    db.prepare("SELECT midterm_1 FROM students LIMIT 1").get();
  } catch {
    db.exec("DROP TABLE IF EXISTS students");
  }

  db.exec(`
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
  `);

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // API Routes
  app.get("/api/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students").all();
    res.json(students);
  });

  app.post("/api/students", (req, res) => {
    const { name, attendance, midterm_1, midterm_2, previous_grade } = req.body;
    const info = db.prepare(`
      INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, attendance, midterm_1, midterm_2, previous_grade);
    res.json({ id: info.lastInsertRowid });
  });

  // Bulk Insert
  app.post("/api/students/bulk", (req, res) => {
    const students = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: "Expected array" });

    const insert = db.prepare(`
      INSERT INTO students (name, attendance, midterm_1, midterm_2, previous_grade)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((data) => {
      for (const s of data) {
        insert.run(s.name, s.attendance, s.midterm_1, s.midterm_2, s.previous_grade);
      }
    });

    insertMany(students);
    res.json({ success: true, count: students.length });
  });

  app.put("/api/students/bulk", (req, res) => {
    const updates = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: "Expected array" });

    const update = db.prepare("UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?");

    const updateMany = db.transaction((data) => {
      for (const u of data) {
        update.run(u.predicted_grade, u.status, u.id);
      }
    });

    updateMany(updates);
    res.json({ success: true });
  });

  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const { predicted_grade, status, final_grade } = req.body;

    if (final_grade !== undefined) {
      db.prepare("UPDATE students SET final_grade = ? WHERE id = ?").run(final_grade, id);
    } else {
      db.prepare("UPDATE students SET predicted_grade = ?, status = ? WHERE id = ?").run(predicted_grade, status, id);
    }
    res.json({ success: true });
  });

  app.delete("/api/students", (req, res) => {
    console.log("DELETE request received for /api/students");
    db.prepare("DELETE FROM students").run();
    db.exec("VACUUM");
    res.json({ success: true });
  });

  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM students WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development only
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Server running on http://localhost:${PORT}`);
  });
}

startServer();
