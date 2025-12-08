import React from 'react';
import { Book } from '../types';
import { BookOpen, Play } from 'lucide-react';

interface HeroSectionProps {
  book: Book;
}

const HeroSection: React.FC<HeroSectionProps> = ({ book }) => {
  return (
    <div className="relative w-full h-[90%] md:h-[80%] max-h-[600px] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col md:flex-row ring-1 ring-gray-100">
      
      {/* Visual Side (Image/Gradient) */}
      <div className="relative w-full md:w-5/12 h-1/2 md:h-full bg-gray-100 overflow-hidden group">
         {/* Blurry background version of cover */}
         <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-125"
            style={{ backgroundImage: `url(${book.coverUrl})` }}
         />
         <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white/90 via-transparent to-transparent opacity-100 z-10" />

         <div className="relative h-full w-full flex items-center justify-center p-8 z-20">
             <div className="relative aspect-[2/3] h-[85%] rounded-lg shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105 group-hover:-rotate-1">
                <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="h-full w-full object-cover rounded-lg"
                />
             </div>
         </div>
      </div>

      {/* Info Side */}
      <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
        <div className="space-y-6 max-w-lg mx-auto md:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full w-fit">
                <BookOpen size={14} className="animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wide">Reading Now</span>
            </div>
            
            <div>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
                {book.title}
                </h2>
                <p className="text-xl text-gray-500 font-medium">{book.author}</p>
            </div>

            {/* Interactive Player / Progress */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-semibold text-gray-900">Chapter 4</span>
                    <span className="text-sm font-medium text-gray-500">{book.progress}% Completed</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200/60 mb-4">
                    <div 
                        className="h-full bg-black rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${book.progress}%` }} 
                    />
                </div>
                
                <div className="flex items-center gap-4">
                     <button className="flex-1 bg-black text-white h-12 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/20">
                        <Play size={18} fill="currentColor" />
                        Continue
                     </button>
                     <div className="text-xs text-gray-400 font-medium px-2">
                        Updated {book.lastRead}
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;