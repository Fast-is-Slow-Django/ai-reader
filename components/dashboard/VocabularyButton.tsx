'use client'

import { useState } from 'react'
import { BookText } from 'lucide-react'
import VocabularyManager from './VocabularyManager'

export default function VocabularyButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
      >
        <BookText size={20} />
        <span className="font-medium">Vocabulary Library</span>
      </button>

      <VocabularyManager
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
