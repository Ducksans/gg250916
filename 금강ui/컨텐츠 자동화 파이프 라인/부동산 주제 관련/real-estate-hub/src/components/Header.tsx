/**
 * title: Header (헤더/내비게이션)
 * purpose: 상단 브레드크럼, 브랜드, 검색, 섹션 내비게이션을 제공하며 sticky로 고정됩니다.
 * created: 2025-09-19T01:30:00+09:00
 * last_modified: 2025-09-19T01:30:00+09:00
 * maintainer: Cascade / Team GG
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    { href: '#value-proposition', label: '가치 제안' },
    { href: '#automation', label: '생성·배포 플로우' },
    { href: '#growth-loop', label: '성장 루프' },
    { href: '#monetization', label: '가격 구조' },
    { href: '#ia', label: '정보구조' },
    { href: '#phases', label: '마일스톤' },
    { href: '#apps', label: '모바일' },
    { href: '#pipeline', label: '파이프라인' },
    { href: '#compliance', label: '컴플라이언스' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 검색 로직 구현
    console.log('Search query:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      {/* Breadcrumb */}
      <div className="container">
        <nav className="py-2 text-sm text-gray-600" aria-label="breadcrumb">
          <a href="#" className="hover:text-brand-950 transition-colors">홈</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900" aria-current="page">허브</span>
        </nav>
      </div>

      {/* Main Header */}
      <div className="container">
        <div className="flex items-center justify-between py-4">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            <a href="#" className="flex items-center space-x-3 group" aria-label="홈으로 이동">
              <div className="w-10 h-10 bg-brand-950 text-white rounded-lg flex items-center justify-center font-bold text-lg group-hover:bg-brand-800 transition-colors">
                GG
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-brand-950 transition-colors">
                금강 Real Estate
              </span>
            </a>
          </motion.div>

          {/* Search Form - Desktop */}
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSearch}
            className="hidden md:flex items-center space-x-2 flex-1 max-w-md mx-8"
            role="search"
            aria-label="사이트 검색"
          >
            <div className="relative flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="주소·단지·주제 검색"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button
              type="submit"
              className="btn btn-primary px-6"
            >
              검색
            </button>
          </motion.form>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 열기"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>


      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200" aria-label="주요 섹션 내비게이션">
        <div className="container">
          <div className="hidden md:flex space-x-8 py-4 overflow-x-auto">
            {navigationItems.map((item, index) => (
              <motion.a
                key={item.href}
                href={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="whitespace-nowrap text-gray-600 hover:text-brand-950 font-medium transition-colors py-2 border-b-2 border-transparent hover:border-brand-500"
              >
                {item.label}
              </motion.a>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white border-b border-gray-200"
        >
          <div className="container py-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="주소·단지·주제 검색"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-3">
                검색
              </button>
            </form>

            {/* Mobile Navigation */}
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-3 px-4 text-gray-600 hover:text-brand-950 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
