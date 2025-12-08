import React from 'react';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress: number; // 0 to 100
  totalPage: number;
  category: string;
  lastRead?: string;
}

export type Category = 'All' | 'Favorites';

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  active: boolean;
}