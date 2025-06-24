'use client'

import { useState, useRef } from 'react'

type StudyStep = 'subject' | 'material' | 'upload' | 'link' | 'search' | 'generating' | 'quiz'
type MaterialSource = 'upload' | 'link' | 'search' | null

interface StudySession {
  subject: string
  materialSource: MaterialSource
  uploadedFiles: File[]
  links: string[]
  searchQuery: string
}

export default function StudyQuizApp() {
  const [currentStep, setCurrentStep] = useState<StudyStep>('subject')
  const [studySession, setStudySession] = useState<StudySession>({
    subject: '',
    materialSource: null,
    uploadedFiles: [],
    links: [],
    searchQuery: ''
  })
  
  const [subjectInput, setSubjectInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubjectSubmit = () => {
    if (subjectInput.trim()) {
      setStudySession(prev => ({ ...prev, subject: subjectInput.trim() }))
      setCurrentStep('material')
    }
  }

  const handleMaterialChoice = (source: MaterialSource) => {
    setStudySession(prev => ({ ...prev, materialSource: source }))
    
    switch (source) {
      case 'upload':
        setCurrentStep('upload')
        break
      case 'link':
        setCurrentStep('link')
        break
      case 'search':
        setCurrentStep('search')
        break
    }
  }

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const validTypes = ['.pdf', '.docx', '.txt', '.md']
      const fileName = file.name.toLowerCase()
      return validTypes.some(type => fileName.endsWith(type)) || file.type.includes('text') || file.type.includes('pdf')
    })
    
    if (validFiles.length !== fileArray.length) {
      alert('Sommige bestanden zijn niet ondersteund. Ondersteunde formaten: PDF, DOCX, TXT, MD')
    }
    
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

  const addLink = () => {
    if (linkInput.trim()) {
      setStudySession(prev => ({ 
        ...prev, 
        links: [...prev.links, linkInput.trim()] 
      }))
      setLinkInput('')
    }
  }

  const removeLink = (index: number) => {
    setStudySession(prev => ({ 
      ...prev, 
      links: prev.links.filter((_, i) => i !== index) 
    }))
  }

  const removeFile = (index: number) => {
    setStudySession(prev => ({ 
      ...prev, 
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index) 
    }))
  }

  const handleSearchSubmit = () => {
    if (searchInput.trim()) {
      setStudySession(prev => ({ ...prev, searchQuery: searchInput.trim() }))
      // Hier zou je naar de volgende stap gaan (quiz generatie)
      setCurrentStep('generating')
    }
  }

  const canProceedToQuiz = () => {
    switch (studySession.materialSource) {
      case 'upload':
        return studySession.uploadedFiles.length > 0
      case 'link':
        return studySession.links.length > 0
      case 'search':
        return studySession.searchQuery.length > 0
      default:
        return false
    }
  }

  const proceedToQuizGeneration = () => {
    if (canProceedToQuiz()) {
      setCurrentStep('generating')
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
          Hoe wil je je studiemateriaal aanleveren?
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        <p className="text-gray-500 text-sm">
          Kies de manier die het beste bij jouw materiaal past
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Upload Option */}
        <div 
          onClick={() => handleMaterialChoice('upload')}
          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Bestanden uploaden
            </h3>
            <p className="text-gray-600 text-sm">
              Upload PDF's, Word documenten, of tekstbestanden met je studiemateriaal
            </p>
          </div>
        </div>

        {/* Link Option */}
        <div 
          onClick={() => handleMaterialChoice('link')}
          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Links delen
            </h3>
            <p className="text-gray-600 text-sm">
              Geef links naar online artikelen, Wikipedia pagina's, of andere bronnen
            </p>
          </div>
        </div>

        {/* Search Option */}
        <div 
          onClick={() => handleMaterialChoice('search')}
          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Online zoeken
            </h3>
            <p className="text-gray-600 text-sm">
              Laat mij online zoeken naar informatie over jouw onderwerp
            </p>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={() => setCurrentStep('subject')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Terug naar onderwerp
        </button>
      </div>
    </div>
  )

  const renderUploadStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📁</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Upload je studiemateriaal
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
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
              Sleep bestanden hierheen
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
          onClick={() => setCurrentStep('material')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Terug
        </button>
        
        <button
          onClick={proceedToQuizGeneration}
          disabled={!canProceedToQuiz()}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Vragen genereren →
        </button>
      </div>
    </div>
  )

  const renderLinkStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Deel je online bronnen
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
      </div>

      {/* Add Link */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex space-x-2">
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addLink()}
            placeholder="https://example.com/artikel-over-jouw-onderwerp"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addLink}
            disabled={!linkInput.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Toevoegen
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Voeg links toe naar Wikipedia, artikelen, online cursussen, etc.
        </p>
      </div>

      {/* Added Links */}
      {studySession.links.length > 0 && (
        <div className="max-w-2xl mx-auto mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Toegevoegde links ({studySession.links.length})
          </h3>
          <div className="space-y-2">
            {studySession.links.map((link, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">🌐</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{link}</p>
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Bekijk link →
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => removeLink(index)}
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
          onClick={() => setCurrentStep('material')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Terug
        </button>
        
        <button
          onClick={proceedToQuizGeneration}
          disabled={!canProceedToQuiz()}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Vragen genereren →
        </button>
      </div>
    </div>
  )

  const renderSearchStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Laat mij online zoeken
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        <p className="text-gray-500 text-sm">
          Ik ga online zoeken naar actuele informatie over jouw onderwerp
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specifieke zoekterm (optioneel)
          </label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            placeholder={`Bijvoorbeeld: "${studySession.subject} definitie", "${studySession.subject} voorbeelden"...`}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">
            Laat leeg om automatisch te zoeken naar "{studySession.subject}"
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-800 mb-1">Wat ga ik doen?</h4>
              <p className="text-sm text-green-700">
                Ik ga Google gebruiken om actuele en betrouwbare informatie te vinden over jouw onderwerp. 
                Vervolgens maak ik op basis van deze informatie gepersonaliseerde quiz vragen voor je.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSearchSubmit}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Start online zoeken en maak vragen →
        </button>
      </div>

      {/* Navigation */}
      <div className="text-center mt-8">
        <button
          onClick={() => setCurrentStep('material')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Terug naar materiaal opties
        </button>
      </div>
    </div>
  )

  const renderGeneratingStep = () => (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="animate-spin">
            <span className="text-2xl">⚡</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Vragen worden gegenereerd...
        </h2>
        <p className="text-gray-600 mb-2">
          Onderwerp: <span className="font-semibold text-blue-600">{studySession.subject}</span>
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Ik analyseer je materiaal en maak gepersonaliseerde quiz vragen
        </p>

        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Materiaal geanalyseerd</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Vragen genereren...</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Quiz voorbereiden</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render current step
  switch (currentStep) {
    case 'subject':
      return renderSubjectStep()
    case 'material':
      return renderMaterialStep()
    case 'upload':
      return renderUploadStep()
    case 'link':
      return renderLinkStep()
    case 'search':
      return renderSearchStep()
    case 'generating':
      return renderGeneratingStep()
    default:
      return renderSubjectStep()
  }
}