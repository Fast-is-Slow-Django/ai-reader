import React, { useState, useMemo, useEffect } from 'react';
import { Search, Bell, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import BookCard from './components/BookCard';
import { Book, Category } from './types';

// --- Mock Data ---
const MOCK_BOOKS: Book[] = [
  { id: '1', title: 'The Art of Design', author: 'Dieter Rams', coverUrl: 'https://picsum.photos/seed/design/400/600', progress: 64, totalPage: 320, category: 'Favorites', lastRead: '2h ago' },
  { id: '2', title: 'Silent Spring', author: 'Rachel Carson', coverUrl: 'https://picsum.photos/seed/spring/400/600', progress: 100, totalPage: 250, category: 'Science' },
  { id: '3', title: 'Thinking Fast', author: 'Daniel Kahneman', coverUrl: 'https://picsum.photos/seed/think/400/600', progress: 12, totalPage: 480, category: 'Psychology' },
  { id: '4', title: 'Dune', author: 'Frank Herbert', coverUrl: 'https://picsum.photos/seed/dune/400/600', progress: 0, totalPage: 600, category: 'Favorites' },
  { id: '5', title: 'Steve Jobs', author: 'Walter Isaacson', coverUrl: 'https://picsum.photos/seed/jobs/400/600', progress: 45, totalPage: 630, category: 'Biography' },
  { id: '6', title: 'Zero to One', author: 'Peter Thiel', coverUrl: 'https://picsum.photos/seed/zero/400/600', progress: 100, totalPage: 220, category: 'Business' },
  { id: '7', title: 'Sapiens', author: 'Yuval Harari', coverUrl: 'https://picsum.photos/seed/sapiens/400/600', progress: 5, totalPage: 450, category: 'Favorites' },
  { id: '8', title: 'Atomic Habits', author: 'James Clear', coverUrl: 'https://picsum.photos/seed/atomic/400/600', progress: 0, totalPage: 300, category: 'Favorites' },
  { id: '9', title: 'Deep Work', author: 'Cal Newport', coverUrl: 'https://picsum.photos/seed/deep/400/600', progress: 20, totalPage: 300, category: 'Productivity' },
  { id: '10', title: 'Snow Crash', author: 'Neal Stephenson', coverUrl: 'https://picsum.photos/seed/snow/400/600', progress: 0, totalPage: 500, category: 'Sci-Fi' },
];

// Number of items per grid page based on device (simplified approximation)
const ITEMS_PER_PAGE = 8; 

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Touch handling state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Filter Logic
  const filteredBooks = useMemo(() => {
    return MOCK_BOOKS.filter(book => {
      const matchesCategory = activeCategory === 'All' 
        ? true 
        : book.category === activeCategory;
      
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            book.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Generate "Pages" - Grid chunks only
  const pages = useMemo(() => {
    const pageList = [];
    
    // Chunk the books for Grid Pages
    for (let i = 0; i < filteredBooks.length; i += ITEMS_PER_PAGE) {
      pageList.push({ 
        type: 'grid', 
        content: filteredBooks.slice(i, i + ITEMS_PER_PAGE) 
      });
    }

    // If no books, add an empty state page
    if (pageList.length === 0) {
        pageList.push({ type: 'empty', content: [] });
    }

    return pageList;
  }, [filteredBooks]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory, searchQuery]);

  const totalPages = pages.length;

  // Navigation Handlers
  const nextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(c => c + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(c => c - 1);
  };

  // Touch/Swipe Logic
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) nextPage();
    if (isRightSwipe) prevPage();
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden select-none">
      
      {/* Header - Fixed & Floating */}
      <header className="flex-none px-6 py-4 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
               <Grid size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Zenith</h1>
          </div>

          <div className="flex-1 mx-4 md:mx-12 max-w-sm">
             <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Find a book..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border-none bg-white/80 py-2 pl-9 pr-4 text-sm shadow-sm ring-1 ring-gray-900/5 focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="hidden md:flex p-2 text-gray-500 hover:bg-white rounded-full transition-all">
                <Bell size={20} />
             </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-white shadow-md cursor-pointer" />
          </div>
        </div>
        
        {/* Category Filters (Pills) */}
        <div className="mt-4 flex justify-center items-center space-x-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">分类</span>
            {(['All', 'Favorites'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300
                  ${activeCategory === cat 
                    ? 'bg-black text-white shadow-lg shadow-black/10' 
                    : 'bg-white/50 text-gray-500 hover:bg-white hover:text-gray-900'}
                `}
              >
                {cat}
              </button>
            ))}
        </div>
      </header>

      {/* Main Content - Horizontal Slider (Instant Switching) */}
      <main 
        className="flex-1 relative w-full h-full overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
            className="absolute top-0 left-0 h-full w-full flex"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
            {pages.map((page, index) => (
                <div key={index} className="w-full h-full flex-shrink-0 p-4 md:p-8 flex flex-col justify-center items-center">
                    <div className="w-full max-w-6xl h-full flex flex-col">
                        
                        {/* Page Type: GRID */}
                        {page.type === 'grid' && (
                             <div className="h-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 content-center pb-12">
                                {page.content.map((book) => (
                                    <BookCard key={book.id} book={book} />
                                ))}
                            </div>
                        )}

                        {/* Page Type: EMPTY */}
                        {page.type === 'empty' && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Search size={48} className="mb-4 opacity-50"/>
                                <p>No books found.</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop Navigation Arrows (Hover to show) */}
        <div className="hidden md:block">
            <button 
                onClick={prevPage}
                disabled={currentPage === 0}
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 backdrop-blur shadow-lg text-gray-800 hover:scale-110 transition-all ${currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <ChevronLeft size={24} />
            </button>
            <button 
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 backdrop-blur shadow-lg text-gray-800 hover:scale-110 transition-all ${currentPage === totalPages - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <ChevronRight size={24} />
            </button>
        </div>
      </main>

      {/* Pagination Indicators (Footer) */}
      <footer className="flex-none pb-safe h-12 flex justify-center items-start z-50">
        <div className="flex space-x-2 bg-white/40 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/20">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentPage ? 'w-6 bg-black' : 'w-2 bg-gray-400/50 hover:bg-gray-400'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      </footer>

    </div>
  );
};

export default App;