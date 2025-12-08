import React from 'react';
import { Book } from '../types';
import { PlayCircle } from 'lucide-react';

interface BookCardProps {
  book: Book;
  compact?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className="group relative flex flex-col h-full w-full justify-start items-center cursor-pointer">
      
      {/* Cover Image */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-105 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] group-hover:-translate-y-1">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 bg-white/30 backdrop-blur-md rounded-full p-3">
                 <PlayCircle className="text-white drop-shadow-md" size={32} fill="rgba(0,0,0,0.5)" />
            </div>
        </div>
        
        {/* Progress Bar Overlay (Mini) */}
        {book.progress > 0 && book.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30">
             <div className="h-full bg-blue-500" style={{ width: `${book.progress}%` }} />
          </div>
        )}
      </div>

      {/* Book Metadata */}
      <div className="mt-3 w-full text-center px-1">
        <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-gray-900 group-hover:text-black">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs text-gray-500 mt-0.5">
          {book.author}
        </p>
      </div>
    </div>
  );
};

export default BookCard;