import React from 'react';

export const CategoryFilter = ({
  categories = [],
  activeCategory = '',
  onSelectCategory,
}) => {
  return (
    <div className="category-filter-bar">
      <button
        className={`cat-btn ${activeCategory === '' ? 'active' : ''}`}
        onClick={() => onSelectCategory('')}
      >
        Tất cả bài viết
      </button>

      {categories.map((cat) => (
        <button
          key={cat._id || cat.slug}
          className={`cat-btn ${activeCategory === cat.slug ? 'active' : ''}`}
          onClick={() => onSelectCategory(cat.slug)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

