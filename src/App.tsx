/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  BrainCircuit,
  BarChart3,
  Loader2,
  Plus,
  FileUp,
  FileDown,
  Download,
  Key
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Student, predictPerformance } from './services/geminiService';
import { cn } from './lib/utils';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictingId, setPredictingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    attendance: 85,
    midterm_1: 15,
    midterm_2: 14,
    previous_grade: 75
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isPredictingAll, setIsPredictingAll] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    fetchStudents();
    checkApiKey();

    // Set up polling interval for real-time updates
    const interval = setInterval(fetchStudents, 5000); // Fetch every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const inputRef = e.target;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const studentsToImport = data.map(row => ({
          name: row.name || row.Name || 'Unknown Student',
          attendance: Number(row.attendance || row.Attendance || 0),
          midterm_1: Number(row.midterm_1 || row.Midterm1 || 0),
          midterm_2: Number(row.midterm_2 || row.Midterm2 || 0),
          previous_grade: Number(row.previous_grade || row.Previous || 0)
        }));

        try {
          const res = await fetch('/api/students/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentsToImport)
          });

          if (!res.ok) throw new Error('Bulk import failed');

          alert(`Successfully imported ${studentsToImport.length} students.`);
          fetchStudents();
        } catch (err) {
          console.error('Failed to import students:', err);
          alert('Failed to import data. Please check the file format.');
        } finally {
          setIsUploading(false);
          if (inputRef) inputRef.value = '';
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Failed to parse CSV file.');
        setIsUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      { name: 'John Doe', attendance: 95, midterm_1: 18, midterm_2: 17, previous_grade: 85 },
      { name: 'Jane Smith', attendance: 70, midterm_1: 8, midterm_2: 10, previous_grade: 55 }
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'student_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportData = () => {
    const csv = Papa.unparse(students);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'student_performance_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchStudents();
        setNewStudent({
          name: '',
          attendance: 85,
          midterm_1: 15,
          midterm_2: 14,
          previous_grade: 75
        });
      }
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const handlePredict = async (student: Student) => {
    if (!student.id) return;
    setPredictingId(student.id);
    try {
      const prediction = await predictPerformance(student);
      await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predicted_grade: prediction.predicted_grade,
          status: prediction.status
        })
      });
      fetchStudents();
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setPredictingId(null);
    }
  };

  const handlePredictAll = async () => {
    console.log('handlePredictAll triggered. Total students:', students.length);
    const studentsToPredict = students.filter(s => s.predicted_grade === null || s.predicted_grade === undefined);
    console.log('Students needing prediction:', studentsToPredict.length);

    if (studentsToPredict.length === 0) {
      alert("No pending predictions found.");
      return;
    }

    setIsPredictingAll(true);
    try {
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < studentsToPredict.length; i += batchSize) {
        const batch = studentsToPredict.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}...`);
        const batchResults = await Promise.all(batch.map(async (s) => {
          const prediction = await predictPerformance(s);
          return {
            id: s.id,
            predicted_grade: prediction.predicted_grade,
            status: prediction.status
          };
        }));
        results.push(...batchResults);
      }

      console.log('Sending bulk updates to server:', results.length);
      const res = await fetch('/api/students/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      console.log('Bulk updates successful. Refreshing list...');
      await fetchStudents();
      alert(`Successfully predicted performance for ${results.length} students.`);
    } catch (error) {
      console.error('Predict all failed:', error);
      alert('Bulk prediction failed. Please check console.');
    } finally {
      setIsPredictingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      fetchStudents();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (students.length === 0) return;
    if (!confirm('Are you sure you want to delete ALL students? This action cannot be undone.')) return;

    try {
      console.log('Attempting to clear all students...');
      setLoading(true);
      const res = await fetch('/api/students', { method: 'DELETE' });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      setStudents([]);
      alert('All student data has been removed.');
      console.log('All student data successfully removed from database and UI.');
    } catch (error) {
      console.error('Failed to delete all students:', error);
      alert('Failed to clear data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: students.length,
    atRisk: students.filter(s => s.status === 'At Risk').length,
    safe: students.filter(s => s.status === 'Safe').length,
    avgAttendance: students.length ? (students.reduce((acc, s) => acc + s.attendance, 0) / students.length).toFixed(1) : 0
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">EduPredict AI</h1>
          </div>
          <div className="flex items-center gap-2">
            {!hasApiKey && (
              <button
                onClick={handleOpenKeySelector}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 transition-colors mr-2"
              >
                <Key className="w-4 h-4" />
                Set API Key
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 mr-4">
              <button
                onClick={downloadTemplate}
                className="text-slate-500 hover:text-slate-800 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                title="Download CSV Template"
              >
                <Download className="w-4 h-4" />
                Template
              </button>
              <label className="cursor-pointer text-slate-500 hover:text-slate-800 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium">
                <FileUp className="w-4 h-4" />
                Import
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={isUploading} />
              </label>
              <button
                onClick={exportData}
                className="text-slate-500 hover:text-slate-800 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <FileDown className="w-4 h-4" />
                Export
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Student</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Students"
            value={stats.total}
            icon={<Users className="w-5 h-5 text-indigo-600" />}
            color="indigo"
          />
          <StatCard
            title="At Risk"
            value={stats.atRisk}
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            color="amber"
          />
          <StatCard
            title="Safe"
            value={stats.safe}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            color="emerald"
          />
          <StatCard
            title="Avg. Attendance"
            value={`${stats.avgAttendance}%`}
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Directory
              </h2>
              <div className="flex items-center gap-2">
                {students.length > 0 && (isPredictingAll || students.some(s => s.predicted_grade === null || s.predicted_grade === undefined)) && (
                  <button
                    onClick={handlePredictAll}
                    disabled={isPredictingAll}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {isPredictingAll ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BrainCircuit className="w-3.5 h-3.5" />
                    )}
                    Predict All
                  </button>
                )}
                {students.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {loading || isUploading ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-slate-500">{isUploading ? 'Importing CSV data...' : 'Loading students...'}</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No students found. Start by adding one!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {students.map((student) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={student.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{student.name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                          <span>Att: <span className="text-slate-700 font-medium">{student.attendance}%</span></span>
                          <span>M1: <span className="text-slate-700 font-medium">{student.midterm_1}/20</span></span>
                          <span>M2: <span className="text-slate-700 font-medium">{student.midterm_2}/20</span></span>
                          <span>Avg: <span className="text-slate-700 font-medium">{((student.midterm_1 + student.midterm_2) / 2).toFixed(1)}</span></span>
                          <span>Prev: <span className="text-slate-700 font-medium">{student.previous_grade}</span></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {student.predicted_grade ? (
                          <div className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5",
                            student.status === 'Safe' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {student.status === 'Safe' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            {student.status} ({student.predicted_grade}%)
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePredict(student)}
                            disabled={predictingId === student.id}
                            className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                          >
                            {predictingId === student.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <BrainCircuit className="w-3.5 h-3.5" />
                            )}
                            Predict
                          </button>
                        )}

                        <button
                          onClick={() => student.id && handleDelete(student.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Analytics Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Overview
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={students}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="midterm_1" name="Midterm 1" radius={[4, 4, 0, 0]}>
                      {students.map((entry, index) => (
                        <Cell key={`cell-1-${index}`} fill={entry.status === 'At Risk' ? '#F59E0B' : '#6366F1'} />
                      ))}
                    </Bar>
                    <Bar dataKey="midterm_2" name="Midterm 2" radius={[4, 4, 0, 0]}>
                      {students.map((entry, index) => (
                        <Cell key={`cell-2-${index}`} fill={entry.status === 'At Risk' ? '#F59E0B' : '#818CF8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center italic">
                Showing midterm scores (out of 20). Amber indicates "At Risk" students.
              </p>
            </div>

            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">AI Insights</h3>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  Our system uses Linear Regression to predict final grades and Decision Trees to identify students who may need early intervention.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  System Active & Learning
                </div>
              </div>
              <BrainCircuit className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-800 opacity-50" />
            </div>
          </div>
        </div>
      </main>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Add New Student</h2>
                <p className="text-sm text-slate-500">Enter academic details for prediction.</p>
              </div>

              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Midterm 1 (0-20)</label>
                    <input
                      required
                      type="number"
                      min="0" max="20"
                      value={newStudent.midterm_1}
                      onChange={e => setNewStudent({ ...newStudent, midterm_1: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Midterm 2 (0-20)</label>
                    <input
                      required
                      type="number"
                      min="0" max="20"
                      value={newStudent.midterm_2}
                      onChange={e => setNewStudent({ ...newStudent, midterm_2: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Attendance (%)</label>
                    <input
                      required
                      type="number"
                      min="0" max="100"
                      value={newStudent.attendance}
                      onChange={e => setNewStudent({ ...newStudent, attendance: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Prev. Grade</label>
                    <input
                      required
                      type="number"
                      min="0" max="100"
                      value={newStudent.previous_grade}
                      onChange={e => setNewStudent({ ...newStudent, previous_grade: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    Save Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100"
  };

  return (
    <div className={cn("p-5 rounded-2xl border shadow-sm flex items-center justify-between", colors[color])}>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-800">{value}</p>
      </div>
      <div className="bg-white p-2.5 rounded-xl shadow-sm">
        {icon}
      </div>
    </div>
  );
}
