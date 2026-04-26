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
);