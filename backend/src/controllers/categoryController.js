import Category from '../models/Category.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { slugify } from '../utils/slugify.js';

// Dữ liệu mẫu dự phòng khi chưa bật MongoDB
const fallbackCategories = [
  { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout', description: 'OT, deadline và cạn kiệt năng lượng' },
  { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis', description: 'Chênh vênh giữa tiếp tục hay từ bỏ' },
  { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart', description: 'Can đảm làm lại từ con số 0' },
  { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins', description: 'Thành tựu nhỏ bé nuôi dưỡng hi vọng' },
];

export const getCategories = async (req, res) => {
  try {
    if (isDbConnected) {
      const categories = await Category.find().sort({ name: 1 });
      if (categories.length > 0) {
        return sendSuccess(res, {
          message: 'Lấy danh mục thành công',
          data: categories,
        });
      }
    }

    // Dự phòng khi MongoDB chưa có dữ liệu hoặc chưa bật
    return sendSuccess(res, {
      message: 'Lấy danh mục thành công (Mock Data)',
      data: fallbackCategories,
    });
  } catch (error) {
    return sendSuccess(res, {
      message: 'Lấy danh mục thành công (Mock Data)',
      data: fallbackCategories,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return sendError(res, { message: 'Tên danh mục là bắt buộc', status: 400 });
    }

    const slug = slugify(name);
    const category = await Category.create({ name, slug, description });
    return sendSuccess(res, {
      message: 'Tạo danh mục thành công',
      data: category,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    return sendSuccess(res, { message: 'Xóa danh mục thành công', data: deleted });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
