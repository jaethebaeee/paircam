import { memo, useMemo, useCallback } from 'react';
import { TriviaQuestion as TriviaQuestionType } from '../../types/games';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../constants/games';

interface TriviaQuestionProps {
  question: TriviaQuestionType;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  maxTime: number;
  onAnswerSelect: (answer: string) => void;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isLoading?: boolean;
}

function TriviaQuestion({
  question,
  questionNumber,
  totalQuestions,
  timeRemaining,
  maxTime,
  onAnswerSelect,
  selectedAnswer,
  isAnswered,
  isLoading = false,
}: TriviaQuestionProps) {
  const timePercentage = (timeRemaining / maxTime) * 100;
  const isTimeRunningOut = timeRemaining <= 5;

  // Memoize decoded text to prevent re-decoding on each render
  const decodedQuestion = useMemo(() => decodeURIComponent(question.question), [question.question]);

  // Memoize decoded answers
  const decodedAnswers = useMemo(
    () => question.all_answers.map(answer => decodeURIComponent(answer)),
    [question.all_answers]
  );

  // Create stable callback using useCallback for answer selection
  const handleAnswerClick = useCallback(
    (answer: string) => {
      if (!isAnswered && !isLoading) {
        onAnswerSelect(answer);
      }
    },
    [isAnswered, isLoading, onAnswerSelect]
  );

  return (
    <div className="space-y-4">
      {/* Progress bar and info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: DIFFICULTY_COLORS[question.difficulty] }}
            >
              {DIFFICULTY_LABELS[question.difficulty]}
            </span>
            <span className={`text-lg font-bold transition-colors ${isTimeRunningOut ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
              ⏱️ {timeRemaining}s
            </span>
          </div>
        </div>

        {/* Time remaining bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              isTimeRunningOut ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.max(0, timePercentage)}%` }}
          />
        </div>
      </div>

      {/* Question text */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
        <p className="text-lg font-semibold text-gray-800 leading-relaxed">
          {decodedQuestion}
        </p>
        <p className="text-sm text-gray-500 mt-2">Category: {question.category}</p>
      </div>

      {/* Answer options */}
      <div className="space-y-2">
        {decodedAnswers.map((answer, index) => {
          const isSelected = selectedAnswer === answer;
          const isCorrect = answer === decodeURIComponent(question.correct_answer);
          const showCheckmark = isAnswered && isCorrect;
          const showX = isAnswered && isSelected && !isCorrect;

          return (
            <button
              key={`${question.question_id}-${index}`}
              onClick={() => handleAnswerClick(answer)}
              disabled={isAnswered || isLoading}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left font-medium flex items-center gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:cursor-not-allowed ${isAnswered ? 'opacity-70' : ''}`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                {isSelected && <span className="w-3 h-3 bg-current rounded-full" />}
              </span>
              <span className="flex-grow">
                {answer}
              </span>
              {showCheckmark && <span className="text-2xl">✅</span>}
              {showX && <span className="text-2xl">❌</span>}
            </button>
          );
        })}
      </div>

      {/* Submit button */}
      {!isAnswered && selectedAnswer && (
        <button
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}

      {isAnswered && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-center">
          <p className="text-sm font-medium text-green-800">
            {selectedAnswer === decodeURIComponent(question.correct_answer)
              ? '✅ Correct! +10 points'
              : '❌ Incorrect. Moving to next question...'}
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(TriviaQuestion);
