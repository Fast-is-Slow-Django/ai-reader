'use client'

import { useState } from 'react'
import { Database } from 'lucide-react'
import CacheManager from './CacheManager'

export default function CacheButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
      >
        <Database size={20} />
        <span className="font-medium">Cache</span>
      </button>

      <CacheManager
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
