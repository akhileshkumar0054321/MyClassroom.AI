
import React, { useState } from 'react';
import { TrendingUp, Users, Download, Eye } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const tests = [
      { id: 't1', title: 'Science Quiz 1', date: '2023-10-15', participants: 24, avg: '82%' },
      { id: 't2', title: 'Math Mid-Term', date: '2023-11-01', participants: 22, avg: '76%' },
  ];

  const results = [
      { uid: 'MC-1029-3847', name: 'John Doe', score: '18/20', time: '12m 30s', status: 'Completed' },
      { uid: 'MC-9283-1029', name: 'Jane Smith', score: '20/20', time: '08m 45s', status: 'Completed' },
      { uid: 'MC-8273-1928', name: 'Mike Johnson', score: '15/20', time: '14m 10s', status: 'Completed' },
      { uid: 'MC-1928-3746', name: 'Sarah Wilson', score: '0/20', time: '--', status: 'Absent' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-pink-100 rounded-full text-pink-600">
              <TrendingUp className="w-8 h-8" />
          </div>
          <div>
              <h2 className="text-3xl font-bold dark:text-white">Class Analytics</h2>
              <p className="text-gray-500">Real-time performance reports.</p>
          </div>
      </div>

      {!selectedTest ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">Test Title</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">Date</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">Participants</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">Avg Score</th>
                          <th className="p-4 font-bold text-gray-600 dark:text-gray-300">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {tests.map(t => (
                          <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="p-4 font-medium dark:text-white">{t.title}</td>
                              <td className="p-4 text-gray-500">{t.date}</td>
                              <td className="p-4 text-gray-500">{t.participants}</td>
                              <td className="p-4 text-green-600 font-bold">{t.avg}</td>
                              <td className="p-4">
                                  <button 
                                    onClick={() => setSelectedTest(t.id)}
                                    className="text-primary-600 hover:underline flex items-center gap-1 font-medium"
                                  >
                                      <Eye className="w-4 h-4" /> View Results
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedTest(null)} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
                      <h3 className="text-2xl font-bold dark:text-white">Results Sheet: Science Quiz 1</h3>
                  </div>
                  <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      <Download className="w-4 h-4" /> Export CSV
                  </button>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b-2 border-gray-200 dark:border-gray-600">
                              <th className="p-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Student ID</th>
                              <th className="p-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Student Name</th>
                              <th className="p-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Score</th>
                              <th className="p-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Time Taken</th>
                              <th className="p-3 font-bold text-gray-500 uppercase text-xs tracking-wider">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {results.map((r, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                  <td className="p-3 font-mono text-sm text-gray-600 dark:text-gray-400">{r.uid}</td>
                                  <td className="p-3 font-medium dark:text-white">{r.name}</td>
                                  <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{r.score}</td>
                                  <td className="p-3 text-gray-500">{r.time}</td>
                                  <td className="p-3">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                                          r.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                          {r.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
