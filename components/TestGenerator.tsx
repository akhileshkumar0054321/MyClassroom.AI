import React, { useState } from 'react';
import { generateTest } from '../services/gemini';
import { TestData, QuestionType } from '../types';
import { CheckCircle, XCircle, AlertCircle, Award, Loader2 } from 'lucide-react';

const TestGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setTestData(null);
    setAnswers({});
    setShowResults(false);
    try {
      const data = await generateTest(topic, difficulty, 5);
      setTestData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!testData) return 0;
    let correct = 0;
    testData.questions.forEach(q => {
      if (q.type === QuestionType.MCQ && answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / testData.questions.length) * 100);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <Award className="w-8 h-8 text-primary-500" />
        AI Test Generator
      </h2>

      {!testData ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Subject/Topic</label>
              <input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="e.g. Organic Chemistry, World War II"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Difficulty</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={loading || !topic}
              className="bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Test'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold dark:text-white">{testData.title}</h3>
            {showResults && (
              <span className="text-2xl font-bold text-primary-600">
                Score: {calculateScore()}%
              </span>
            )}
          </div>

          {testData.questions.map((q, idx) => (
            <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="flex gap-3 mb-4">
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">{q.text}</p>
                  
                  {q.type === QuestionType.MCQ && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                         const isSelected = answers[q.id] === opt;
                         const isCorrect = showResults && opt === q.correctAnswer;
                         const isWrong = showResults && isSelected && opt !== q.correctAnswer;
                         
                         let btnClass = "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700";
                         if (isSelected) btnClass = "border-primary-500 bg-primary-50 dark:bg-primary-900/20";
                         if (isCorrect) btnClass = "border-green-500 bg-green-50 dark:bg-green-900/20";
                         if (isWrong) btnClass = "border-red-500 bg-red-50 dark:bg-red-900/20";

                         return (
                          <button
                            key={opt}
                            disabled={showResults}
                            onClick={() => setAnswers({...answers, [q.id]: opt})}
                            className={`w-full text-left p-3 rounded-lg border ${btnClass} transition-colors flex justify-between items-center`}
                          >
                            <span className="dark:text-gray-200">{opt}</span>
                            {isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {isWrong && <XCircle className="w-5 h-5 text-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type !== QuestionType.MCQ && (
                     <textarea 
                        className="w-full p-3 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        placeholder="Type your answer here..."
                        disabled={showResults}
                     />
                  )}

                  {showResults && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200 flex gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <strong>Explanation: </strong> {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!showResults && (
            <button 
              onClick={handleSubmit}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg"
            >
              Submit Test
            </button>
          )}
           {showResults && (
            <button 
              onClick={() => setTestData(null)}
              className="w-full py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold shadow-lg"
            >
              Create New Test
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TestGenerator;