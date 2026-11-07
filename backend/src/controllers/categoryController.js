import Category from '../models/Category.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { slugify } from '../utils/slugify.js';
import { loadStore, saveStore, defaultStoreCategories } from '../utils/persistentStore.js';

// Danh sách danh mục mặc định dự phòng
const fallbackCategories = defaultStoreCategories;

/**
 * Lấy toàn bộ danh sách danh mục (Bao gồm danh mục mặc định & do người dùng tạo)
 */
export const getCategories = async (req, res) => {
  try {
    const store = loadStore();
    let categories = store.categories && store.categories.length > 0
      ? store.categories
      : [...fallbackCategories];

    // Đảm bảo không thiếu các chuyên mục mặc định
    const existingSlugs = new Set(categories.map((c) => c.slug));
    let hasAddedDefaults = false;
    for (const def of fallbackCategories) {
      if (!existingSlugs.has(def.slug)) {
        categories.push(def);
        existingSlugs.add(def.slug);
        hasAddedDefaults = true;
      }
    }
    if (hasAddedDefaults) {
      store.categories = categories;
      saveStore(store);
    }

    // Nếu có kết nối MongoDB thì đồng bộ thêm từ DB
    if (isDbConnected) {
      try {
        const dbCategories = await Category.find().lean();
        if (dbCategories && dbCategories.length > 0) {
          for (const dbCat of dbCategories) {
            if (!existingSlugs.has(dbCat.slug)) {
              categories.push({
                _id: dbCat._id.toString(),
                name: dbCat.name,
                slug: dbCat.slug,
                description: dbCat.description || '',
                icon: dbCat.icon || '🌍',
              });
              existingSlugs.add(dbCat.slug);
            }
          }
        }
      } catch (err) {
        // Bỏ qua lỗi DB nếu có và dùng dữ liệu từ persistent store
      }
    }

    return sendSuccess(res, {
      message: 'Lấy danh mục thành công',
      data: categories,
    });
  } catch (error) {
    return sendSuccess(res, {
      message: 'Lấy danh mục thành công (Fallback)',
      data: fallbackCategories,
    });
  }
};

/**
 * Tạo danh mục bài viết mới (Người dùng tự do tạo thể loại mong muốn)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, { message: 'Tên danh mục là bắt buộc', status: 400 });
    }

    const cleanName = name.trim();
    const cleanSlug = slugify(cleanName);
    const cleanIcon = icon ? icon.trim() : '🌍';
    const cleanDesc = description ? description.trim() : '';

    const store = loadStore();
    store.categories = store.categories || [];

    // Kiểm tra xem danh mục đã tồn tại chưa (theo slug hoặc theo tên không phân biệt hoa thường)
    const existing = store.categories.find(
      (c) => c.slug === cleanSlug || c.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return sendSuccess(res, {
        message: 'Danh mục này đã tồn tại sẵn trong hệ thống',
        data: existing,
        status: 200,
      });
    }

    // Tạo danh mục mới
    const newCategory = {
      _id: `cat_${Date.now()}`,
      name: cleanName,
      slug: cleanSlug,
      description: cleanDesc,
      icon: cleanIcon,
      createdAt: new Date().toISOString(),
    };

    store.categories.push(newCategory);
    saveStore(store);

    // Đồng bộ vào MongoDB nếu đang online
    if (isDbConnected) {
      try {
        await Category.create({
          name: cleanName,
          slug: cleanSlug,
          description: cleanDesc,
          icon: cleanIcon,
        });
      } catch (dbErr) {
        // Đã lưu an toàn trong store.json
      }
    }

    return sendSuccess(res, {
      message: 'Tạo danh mục mới thành công',
      data: newCategory,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi tạo danh mục', status: 500 });
  }
};

/**
 * Xóa danh mục
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    if (store.categories) {
      store.categories = store.categories.filter((c) => c._id !== id && c.slug !== id);
      saveStore(store);
    }

    if (isDbConnected) {
      try {
        await Category.findByIdAndDelete(id);
      } catch (err) {}
    }

    return sendSuccess(res, { message: 'Xóa danh mục thành công', data: { id } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
