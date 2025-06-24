'use client'

import { useState, useRef } from 'react'

type StudyStep = 'subject' | 'material' | 'upload' | 'generating' | 'quiz-type' | 'quiz'
type QuizType = 'open' | 'multiple-choice' | null

interface StudySession {
  subject: string
  uploadedFiles: File[]
  quizType: QuizType
  currentQuestionIndex: number
  score: number
  questionsAnswered: number
}

interface QuizQuestion {
  id: number
  type: 'open' | 'multiple-choice'
  question: string
  options?: string[]
  correctAnswer?: string
  userAnswer?: string
  userExplanation?: string
  feedback?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export default function StudyQuizApp() {
  const [currentStep, setCurrentStep] = useState<StudyStep>('subject')
  const [studySession, setStudySession] = useState<StudySession>({
    subject: '',
    uploadedFiles: [],
    quizType: null,
    currentQuestionIndex: 0,
    score: 0,
    questionsAnswered: 0
  })
  
  const [subjectInput, setSubjectInput] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [userExplanation, setUserExplanation] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [waitingForExplanation, setWaitingForExplanation] = useState(false)
  const [studyMaterial, setStudyMaterial] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubjectSubmit = () => {
    if (subjectInput.trim()) {
      setStudySession(prev => ({ ...prev, subject: subjectInput.trim() }))
      setCurrentStep('material')
    }
  }

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const validTypes = ['.pdf', '.docx', '.txt', '.md']
      const fileName = file.name.toLowerCase()
      return validTypes.some(type => fileName.endsWith(type)) || file.type.includes('text') || file.type.includes('pdf')
    })
    
    if (validFiles.length !== fileArray.length) {
      alert('Sommige bestanden zijn niet ondersteund. Ondersteunde formaten: PDF, DOCX, TXT, MD')
    }
    
    // Process files to extract text content
    let combinedContent = ''
    for (const file of validFiles) {
      try {
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          const text = await file.text()
          combinedContent += `\n\n=== ${file.name} ===\n${text}`
        } else {
          // For PDF/DOCX, we'll use the existing API
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/upload-docx', {
            method: 'POST',
            body: formData,
          })
          
          if (response.ok) {
            const data = await response.json()
            combinedContent += `\n\n=== ${file.name} ===\n${data.content}`
          }
        }
      } catch (error) {
        console.error('Error processing file:', file.name, error)
      }
    }
    
    setStudyMaterial(combinedContent)
    setStudySession(prev => ({ 
      ...prev, 
      uploadedFiles: [...prev.uploadedFiles, ...validFiles] 
    }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeFile = (index: number) => {
    setStudySession(prev => ({ 
      ...prev, 
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index) 
    }))
  }

  const proceedToQuizType = () => {
    if (studySession.uploadedFiles.length > 0) {
      setCurrentStep('quiz-type')
    }
  }

  const handleQuizTypeSelection = (type: QuizType) => {
    setStudySession(prev => ({ ...prev, quizType: type }))
    setCurrentStep('generating')
    generateFirstQuestion(type!)
  }

  const generateFirstQuestion = async (quizType: QuizType) => {
    setIsGenerating(true)
    
    try {
      const prompt = `Je bent een universitaire tutor die studenten overhoor. 

CONTEXT:
- Onderwerp: ${studySession.subject}
- Quiz type: ${quizType === 'open' ? 'open vragen' : 'multiple choice vragen'}
- Studiemateriaal: ${studyMaterial}

INSTRUCTIES:
${quizType === 'open' 
  ? `Maak 1 open vraag over de stof. Begin eenvoudig. Stel NOOIT meerdere vragen tegelijk.`
  : `Maak 1 multiple choice vraag over de stof. Begin eenvoudig. Geef 4 antwoordopties (a, b, c, d). Zorg dat de foute opties plausibel en misleidend zijn. Stel NOOIT meerdere vragen tegelijk.`
}

Geef alleen de vraag terug${quizType === 'multiple-choice' ? ' met de 4 antwoordopties' : ''}, geen extra tekst.`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          aiModel: 'smart'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const questionText = data.response
        
        let question: QuizQuestion
        
        if (quizType === 'multiple-choice') {
          // Parse multiple choice question
          const lines = questionText.split('\n').filter((line: string) => line.trim())
          const questionLine = lines[0]
          const options = lines.slice(1).filter((line: string) => line.match(/^[a-d]\)/))
          
          question = {
            id: 1,
            type: 'multiple-choice',
            question: questionLine,
            options: options,
            difficulty: 'easy'
          }
        } else {
          question = {
            id: 1,
            type: 'open',
            question: questionText,
            difficulty: 'easy'
          }
        }
        
        setCurrentQuestion(question)
        setCurrentStep('quiz')
      }
    } catch (error) {
      console.error('Error generating question:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnswerSubmit = async () => {
    if (!currentQuestion || !userAnswer.trim()) return

    if (currentQuestion.type === 'multiple-choice' && !waitingForExplanation) {
      // For multiple choice, first ask for explanation
      setWaitingForExplanation(true)
      return
    }

    // Generate feedback
    setIsGenerating(true)
    
    try {
      const prompt = `Je bent een universitaire tutor. Een student heeft een vraag beantwoord.

VRAAG: ${currentQuestion.question}
${currentQuestion.options ? `OPTIES:\n${currentQuestion.options.join('\n')}` : ''}

STUDENT ANTWOORD: ${userAnswer}
${userExplanation ? `STUDENT UITLEG: ${userExplanation}` : ''}

STUDIEMATERIAAL: ${studyMaterial}

Geef feedback als een ervaren docent:
1. Beoordeel of het antwoord correct is
2. Geef uitleg waarom het goed of fout is
3. Verwijs naar de studiemateriaal waar relevant
4. Wees vriendelijk maar kritisch
5. Help de student begrijpen

Geef alleen de feedback, geen nieuwe vragen.`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          aiModel: 'smart'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentQuestion(prev => prev ? { ...prev, feedback: data.response } : null)
        setShowFeedback(true)
        
        // Update session stats
        setStudySession(prev => ({
          ...prev,
          questionsAnswered: prev.questionsAnswered + 1
        }))
      }
    } catch (error) {
      console.error('Error generating feedback:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateNextQuestion = async () => {
    setIsGenerating(true)
    setUserAnswer('')
    setUserExplanation('')
    setShowFeedback(false)
    setWaitingForExplanation(false)
    
    try {
      const difficulty = studySession.questionsAnswered < 3 ? 'easy' : 
                        studySession.questionsAnswered < 7 ? 'medium' : 'hard'
      
      const prompt = `Je bent een universitaire tutor die studenten overhoor.

CONTEXT:
- Onderwerp: ${studySession.subject}
- Quiz type: ${studySession.quizType === 'open' ? 'open vragen' : 'multiple choice vragen'}
- Vragen beantwoord: ${studySession.questionsAnswered}
- Moeilijkheidsgraad: ${difficulty}
- Studiemateriaal: ${studyMaterial}

INSTRUCTIES:
${studySession.quizType === 'open' 
  ? `Maak 1 ${difficulty} open vraag over de stof. Stel NOOIT meerdere vragen tegelijk.`
  : `Maak 1 ${difficulty} multiple choice vraag over de stof. Geef 4 antwoordopties (a, b, c, d). Zorg dat de foute opties plausibel en misleidend zijn. Stel NOOIT meerdere vragen tegelijk.`
}

Geef alleen de vraag terug${studySession.quizType === 'multiple-choice' ? ' met de 4 antwoordopties' : ''}, geen extra tekst.`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          aiModel: 'smart'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const questionText = data.response
        
        let question: QuizQuestion
        
        if (studySession.quizType === 'multiple-choice') {
          const lines = questionText.split('\n').filter(line => line.trim())
          const questionLine = lines[0]
          const options = lines.slice(1).filter(line => line.match(/^[a-d]\)/))
          
          question = {
            id: studySession.currentQuestionIndex + 1,
            type: 'multiple-choice',
            question: questionLine,
            options: options,
            difficulty: difficulty as 'easy' | 'medium' | 'hard'
          }
        } else {
          question = {
            id: studySession.currentQuestionIndex + 1,
            type: 'open',
            question: questionText,
            difficulty: difficulty as 'easy' | 'medium' | 'hard'
          }
        }
        
        setCurrentQuestion(question)
        setStudySession(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        }))
      }
    } catch (error) {
      console.error('Error generating question:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderSubjectStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📚</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welk onderwerp wil je studeren?
        </h2>
        <p className="text-gray-600">
          Vertel me over welke stof je overhoord wilt worden
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Onderwerp of vak
          </label>
          <input
            type="text"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubjectSubmit()}
            placeholder="Bijvoorbeeld: Organische Chemie, Europese Geschiedenis, Statistiek..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSubjectSubmit}
          disabled={!subjectInput.trim()}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Volgende stap →
        </button>
      </div>
    </div>
  )

  const renderMaterialStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📖</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Upload je samenvattingen en aantekeningen
        </h2>
        <p className="text-gray-600 mb-4">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        
        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Belangrijk!</h4>
              <p className="text-sm text-amber-700 mb-2">
                <strong>Upload alleen je eigen samenvattingen en aantekeningen</strong> van de stof. 
                Ik gebruik uitsluitend deze documenten om je te overhoren.
              </p>
              <p className="text-sm text-amber-700">
                <strong>Zorg ervoor dat er geen fouten in je documenten staan</strong>, 
                omdat je anders verkeerde dingen kunt aanleren tijdens het overhoren.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mb-6 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              Sleep je samenvattingen en aantekeningen hierheen
            </p>
            <p className="text-sm text-gray-500 mt-1">
              of klik om bestanden te selecteren
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Bestanden selecteren
          </button>
          
          <p className="text-xs text-gray-400">
            Ondersteunde formaten: PDF, DOCX, TXT, MD
          </p>
        </div>
      </div>

      {/* Uploaded Files */}
      {studySession.uploadedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Geüploade bestanden ({studySession.uploadedFiles.length})
          </h3>
          <div className="space-y-2">
            {studySession.uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">📄</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('subject')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Terug
        </button>
        
        <button
          onClick={proceedToQuizType}
          disabled={studySession.uploadedFiles.length === 0}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Kies quiz type →
        </button>
      </div>
    </div>
  )

  const renderQuizTypeStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❓</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Hoe wil je overhoord worden?
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        <p className="text-gray-500 text-sm">
          Kies het type vragen dat het beste bij jouw leerstijl past
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
        {/* Open Questions */}
        <div 
          onClick={() => handleQuizTypeSelection('open')}
          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Open vragen
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Beantwoord vragen in je eigen woorden. Ideaal voor dieper begrip en uitleg van concepten.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>✓ Test je begrip grondig</div>
              <div>✓ Oefen met uitleggen</div>
              <div>✓ Bereid je voor op tentamens</div>
            </div>
          </div>
        </div>

        {/* Multiple Choice */}
        <div 
          onClick={() => handleQuizTypeSelection('multiple-choice')}
          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Multiple choice
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Kies het juiste antwoord uit 4 opties. Snel en effectief voor het testen van feiten en begrippen.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>✓ Snelle kennischeck</div>
              <div>✓ Herkenning van concepten</div>
              <div>✓ Efficiënt oefenen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-2xl mx-auto">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-700">
              <strong>Privacy:</strong> Je studiemateriaal wordt veilig verwerkt. 
              Bekijk ons <a 
                href="https://docs.google.com/document/d/1ShD0lWCjerlQn4eL1H870De4zYPLxGr6AoVNzdLw7yM/edit?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                privacybeleid
              </a> voor meer informatie.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="text-center mt-8">
        <button
          onClick={() => setCurrentStep('material')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Terug naar bestanden
        </button>
      </div>
    </div>
  )

  const renderGeneratingStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="animate-spin">
            <span className="text-2xl">🧠</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Je persoonlijke tutor bereidt vragen voor...
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        <p className="text-gray-600 mb-2">
          Quiz type: <span className="font-semibold text-purple-600">
            {studySession.quizType === 'open' ? 'Open vragen' : 'Multiple choice'}
          </span>
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Ik analyseer je samenvattingen en aantekeningen om gepersonaliseerde vragen te maken
        </p>

        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Studiemateriaal geanalyseerd</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Eerste vraag genereren...</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Quiz sessie starten</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderQuizStep = () => {
    if (!currentQuestion) return null

    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {studySession.subject} - {studySession.quizType === 'open' ? 'Open vraag' : 'Multiple choice'}
            </h2>
            <p className="text-gray-600 text-sm">
              Vraag {studySession.questionsAnswered + 1} • Moeilijkheid: {currentQuestion.difficulty}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Vragen beantwoord</p>
            <p className="text-2xl font-bold text-blue-600">{studySession.questionsAnswered}</p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Vraag:</h3>
            <p className="text-blue-800">{currentQuestion.question}</p>
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => (
                <label key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={userAnswer === option}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800">{option}</span>
                </label>
              ))}
            </div>
          )}

          {/* Open Question Input */}
          {currentQuestion.type === 'open' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jouw antwoord:
              </label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Typ hier je antwoord..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>
          )}

          {/* Explanation Request for Multiple Choice */}
          {waitingForExplanation && currentQuestion.type === 'multiple-choice' && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  Kun je uitleggen waarom je voor dit antwoord hebt gekozen?
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Ik kan je antwoord niet beoordelen zonder uitleg.
                </p>
              </div>
              <textarea
                value={userExplanation}
                onChange={(e) => setUserExplanation(e.target.value)}
                placeholder="Leg uit waarom je dit antwoord hebt gekozen..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          )}

          {/* Submit Button */}
          {!showFeedback && (
            <button
              onClick={handleAnswerSubmit}
              disabled={isGenerating || !userAnswer.trim() || (waitingForExplanation && !userExplanation.trim())}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isGenerating ? 'Feedback genereren...' : 
               waitingForExplanation ? 'Verstuur uitleg' : 'Verstuur antwoord'}
            </button>
          )}
        </div>

        {/* Feedback */}
        {showFeedback && currentQuestion.feedback && (
          <div className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Feedback van je tutor:
              </h4>
              <div className="text-green-800 whitespace-pre-wrap">{currentQuestion.feedback}</div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={generateNextQuestion}
                disabled={isGenerating}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isGenerating ? 'Volgende vraag genereren...' : 'Volgende vraag →'}
              </button>
              
              {studySession.questionsAnswered >= 10 && (
                <button
                  onClick={() => {/* TODO: Show summary */}}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Sessie afronden
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render current step
  switch (currentStep) {
    case 'subject':
      return renderSubjectStep()
    case 'material':
      return renderMaterialStep()
    case 'quiz-type':
      return renderQuizTypeStep()
    case 'generating':
      return renderGeneratingStep()
    case 'quiz':
      return renderQuizStep()
    default:
      return renderSubjectStep()
  }
}