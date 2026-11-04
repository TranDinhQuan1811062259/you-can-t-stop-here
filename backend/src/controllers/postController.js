import Post from '../models/Post.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { slugify } from '../utils/slugify.js';

// Dữ liệu mẫu dự phòng khi chưa bật MongoDB (Khởi tạo số lượt đọc thực tế = 1)
const fallbackPosts = [
  {
    _id: 'post_1',
    title: '2 giờ sáng ở văn phòng và câu hỏi: Mình đang chạy đua vì điều gì?',
    slug: '2-gio-sang-o-van-phong-va-cau-hoi-minh-dang-chay-dua-vi-dieu-gi',
    summary: 'Nhìn dòng xe thưa thớt ngoài cửa sổ kính tầng 18, tôi tự hỏi liệu những đêm thức trắng triền miên này có thực sự đáng giá?',
    content: `
      <p>Đêm nay lại là một đêm deadline trước ngày ra mắt tính năng mới. Màn hình vẫn sáng quắc những dòng lỗi đỏ lòm, ly cà phê thứ tư đã nguội ngắt từ bao giờ.</p>
      <p>Tôi nhìn quanh phòng làm việc, chỉ còn vài đồng nghiệp đang gõ phím cành cạch. Đôi mắt ai cũng trũng sâu. Chúng tôi lao vào guồng quay này từ lúc nào chẳng hay, từ những đứa trẻ đầy nhiệt huyết bước chân vào ngành, đến bây giờ mỗi sáng thức dậy chỉ thấy nỗi sợ hãi kéo dài.</p>
      <h2>Khi công việc nuốt chửng cuộc sống</h2>
      <p>Có những ngày cuối tuần chỉ nằm bẹp trên giường, không buồn nấu một bữa ăn tử tế, không buồn trả lời tin nhắn của người thân. Tôi từng nghĩ đó là cái giá của sự thành công. Nhưng tối nay, khi nhìn hình ảnh phản chiếu của mình qua lớp kính mờ, tôi nhận ra mình đang kiệt sức hoàn toàn.</p>
      <blockquote>"Nếu bạn đang cảm thấy mệt mỏi đến muốn bỏ cuộc ngay lúc này, hãy nhớ rằng cho phép bản thân nghỉ ngơi không phải là thất bại."</blockquote>
      <p>Viết những dòng này không phải để than vãn, mà để nhắc chính mình và những ai đang cùng cảnh ngộ: Bạn quan trọng hơn bất kỳ bản release nào. Đêm nay, tôi sẽ tắt máy tính và đi ngủ sớm một chút.</p>
    `,
    coverImage: '/images/sun.jpg',
    category: { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout' },
    author: 'Trần Đình Quân',
    authorJob: 'System Admin & Lead Dev',
    tags: ['Burnout', 'Overtime', 'Suy ngẫm'],
    cheersCount: 42,
    views: 1,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'post_2',
    title: 'Hội chứng kẻ giả mạo (Impostor Syndrome): Khi bạn luôn sợ bị phát hiện mình kém cỏi',
    slug: 'hoi-chung-ke-gia-mao-impostor-syndrome-khi-ban-luon-so-bi-phat-hien-minh-kem-coi',
    summary: 'Dù được khen ngợi hay thăng chức, trong sâu thẳm tôi vẫn run rẩy lo sợ một ngày nào đó mọi người sẽ nhận ra tôi chẳng tài giỏi như họ nghĩ.',
    content: `
      <p>Đã bao giờ bạn bước vào phòng họp và cảm thấy mình là người thiếu hiểu biết nhất ở đó? Đó là cảm giác ám ảnh tôi suốt hai năm qua kể từ khi nhận vị trí Product Manager.</p>
      <h2>Tiếng nói chỉ trích bên trong đầu</h2>
      <p>Mỗi khi dự án thành công, tôi cho rằng đó là do may mắn hoặc đồng đội gánh. Nhưng mỗi khi có sự cố nhỏ xảy ra, tôi lại tự dằn vặt rằng đó là lỗi tại sự bất tài của mình.</p>
      <p>Một người đàn anh đã nói với tôi: <em>"Em không cần phải biết tất cả mọi thứ để trở nên có giá trị. Giá trị của em nằm ở việc em chịu học hỏi và không bỏ cuộc."</em></p>
    `,
    coverImage: '/images/statue.jpg',
    category: { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis' },
    author: 'Thành Nam',
    authorJob: 'Product Manager',
    tags: ['Impostor Syndrome', 'Tự tin', 'Tâm lý làm việc'],
    cheersCount: 68,
    views: 1,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'post_3',
    title: 'Từ bỏ công việc văn phòng 6 năm để học Lập trình ở tuổi 27: Can đảm bắt đầu lại',
    slug: 'tu-bo-cong-viec-van-phong-6-nam-de-hoc-lap-trinh-o-tuoi-27-can-dam-bat-dau-lai',
    summary: 'Bạn bè bảo tôi điên rồ khi từ bỏ mức lương ổn định để trở thành thực tập sinh. Nhưng nếu không đi, làm sao biết con đường phía trước đẹp thế nào?',
    content: `
      <p>Năm 27 tuổi, tôi nhận ra mình không thể tiếp tục công việc hiện tại thêm 30 năm nữa. Cảm giác trống rỗng mỗi sáng thứ Hai lặp đi lặp lại như một bản án vô hình.</p>
      <h2>Những ngày đầu tiên chông chênh</h2>
      <p>Học những cú pháp vòng lặp đầu tiên, tôi đã từng xấu hổ và muốn bỏ cuộc. Nhưng thông điệp của trang web này chính là điều đã giữ tôi ở lại: <strong>You Can't Stop Here</strong>.</p>
      <p>Hôm nay, tròn 1 năm tôi chính thức nhận offer làm Junior Dev. Mức lương chưa bằng ngày xưa, nhưng ánh mắt tôi đã có lại ngọn lửa đam mê.</p>
    `,
    coverImage: '/images/crop.jpg',
    category: { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart' },
    author: 'Đức Huy',
    authorJob: 'Junior Developer (Chuyển ngành)',
    tags: ['Chuyển ngành', 'Can đảm', 'Bắt đầu lại'],
    cheersCount: 95,
    views: 1,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'post_4',
    title: 'Hôm nay mình đã dũng cảm từ chối một yêu cầu vô lý và cảm giác thật nhẹ nhõm',
    slug: 'hom-nay-minh-da-dung-cam-tu-choi-mot-yeu-cau-vo-ly-va-cam-giac-that-nhe-nhom',
    summary: 'Lần đầu tiên sau nhiều năm làm việc kiểu "People Pleaser", tôi đã dám nói chữ KHÔNG với sếp vào 10 giờ tối thứ Bảy.',
    content: `
      <p>10h15 tối thứ Bảy, chuông Slack vang lên yêu cầu chỉnh gấp layout. Cả tuần đã làm việc 60 tiếng, mắt đã mờ đi vì mỏi.</p>
      <h2>Học cách thiết lập ranh giới (Boundaries)</h2>
      <p>Tôi hít một hơi thật sâu và từ chối lịch sự, hẹn sáng thứ Hai xử lý. Trời không sập xuống. Công ty không phá sản. Sếp chỉ phản hồi: "Ok em."</p>
      <p>Chiến thắng lớn nhất của một ngày đi làm đôi khi là bảo vệ được sự bình yên của tâm trí mình.</p>
    `,
    coverImage: '/images/eagle.jpg',
    category: { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins' },
    author: 'Hương Ly',
    authorJob: 'UI/UX Designer',
    tags: ['Ranh giới', 'Sức khỏe tinh thần', 'Small Win'],
    cheersCount: 120,
    views: 1,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Lấy danh sách bài viết (Hỗ trợ phân trang, tìm kiếm, lọc theo category/tag)
 */
export const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 6);
    const { category, tag, q } = req.query;

    if (isDbConnected) {
      const query = { isPublished: true };

      if (category) {
        const foundCategory = await Category.findOne({
          $or: [{ slug: category }, { _id: category.match(/^[0-9a-fA-F]{24}$/) ? category : null }],
        });
        if (foundCategory) {
          query.category = foundCategory._id;
        } else {
          return sendSuccess(res, {
            data: [],
            pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          });
        }
      }

      if (tag) {
        query.tags = { $in: [tag] };
      }

      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { summary: { $regex: q, $options: 'i' } },
          { content: { $regex: q, $options: 'i' } },
        ];
      }

      const total = await Post.countDocuments(query);
      const totalPages = Math.ceil(total / limit) || 1;
      const skip = (page - 1) * limit;

      const posts = await Post.find(query)
        .populate('category', 'name slug')
        .populate('user', 'name avatar jobTitle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return sendSuccess(res, {
        message: 'Lấy danh sách bài viết thành công',
        data: posts,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    }

    // Dự phòng Mock Data
    let filtered = [...fallbackPosts];
    if (category) {
      filtered = filtered.filter(
        (p) => p.category?.slug === category || p.category?._id === category
      );
    }
    if (tag) {
      filtered = filtered.filter((p) => p.tags.includes(tag));
    }
    if (q) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.summary.toLowerCase().includes(q.toLowerCase())
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      message: 'Lấy bài viết thành công (Dữ liệu sẵn có)',
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    return sendSuccess(res, {
      message: 'Lấy bài viết thành công (Mock Data)',
      data: fallbackPosts,
      pagination: { total: fallbackPosts.length, page: 1, limit: 6, totalPages: 1 },
    });
  }
};

/**
 * Lấy chi tiết bài viết theo Slug (Tự động tăng số lượt đọc thực tế)
 */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (isDbConnected) {
      let post = await Post.findOne({ slug, isPublished: true })
        .populate('category', 'name slug description')
        .populate('user', 'name avatar jobTitle bio');

      if (post) {
        // Tự động gán đúng tác giả Trần Đình Quân nếu là bài viết 2 giờ sáng
        if (
          slug === '2-gio-sang-o-van-phong-va-cau-hoi-minh-dang-chay-dua-vi-dieu-gi' &&
          post.author === 'Minh Anh'
        ) {
          post.author = 'Trần Đình Quân';
          post.authorJob = 'System Admin & Lead Dev';
          const adminUser = await User.findOne({ email: 'anthonyq012025@gmail.com' });
          if (adminUser) post.user = adminUser._id;
        }

        // Tăng lượt đọc thực tế
        post.views = (post.views || 0) + 1;
        await post.save();

        return sendSuccess(res, {
          message: 'Lấy thông tin bài viết thành công',
          data: post,
        });
      }
    }

    // Fallback Mock
    const post = fallbackPosts.find((p) => p.slug === slug);
    if (post) {
      post.views = (post.views || 0) + 1;
      return sendSuccess(res, {
        message: 'Lấy thông tin bài viết thành công (Mock Data)',
        data: post,
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    const post = fallbackPosts.find((p) => p.slug === req.params.slug);
    if (post) return sendSuccess(res, { data: post });
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy chi tiết bài viết theo ID
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      const post = await Post.findById(id).populate('category', 'name slug');
      if (post) return sendSuccess(res, { data: post });
    }
    const post = fallbackPosts.find((p) => p._id === id);
    if (post) return sendSuccess(res, { data: post });
    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Gửi lời động viên
 */
export const cheerPost = async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      const post = await Post.findByIdAndUpdate(
        id,
        { $inc: { cheersCount: 1 } },
        { new: true }
      );
      if (post) return sendSuccess(res, { data: { cheersCount: post.cheersCount } });
    }
    const post = fallbackPosts.find((p) => p._id === id);
    if (post) {
      post.cheersCount = (post.cheersCount || 0) + 1;
      return sendSuccess(res, { data: { cheersCount: post.cheersCount } });
    }
    return sendSuccess(res, { data: { cheersCount: 1 } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Tạo mới bài viết
 */
export const createPost = async (req, res) => {
  try {
    const { title, summary, content, category, coverImage, tags, author, authorJob } = req.body;

    if (!title || !summary || !content || !category) {
      return sendError(res, {
        message: 'Vui lòng cung cấp đầy đủ Tiêu đề, Tóm tắt, Nội dung và Danh mục',
        status: 400,
      });
    }

    let baseSlug = slugify(title);
    let uniqueSlug = baseSlug;

    const authorDisplayName = author || (req.user ? req.user.name : 'Trần Đình Quân');
    const authorDisplayJob = authorJob || (req.user ? req.user.jobTitle : 'Thành viên cộng đồng');

    if (isDbConnected) {
      let counter = 1;
      while (await Post.exists({ slug: uniqueSlug })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const newPost = await Post.create({
        title,
        slug: uniqueSlug,
        summary,
        content,
        category,
        coverImage: coverImage || '/images/sun.jpg',
        tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map((t) => t.trim()) : [],
        user: req.user ? req.user._id : null,
        author: authorDisplayName,
        authorJob: authorDisplayJob,
        views: 1, // Khởi tạo 1 lượt đọc thực tế
        cheersCount: 0,
        isPublished: true,
      });

      const populatedPost = await Post.findById(newPost._id)
        .populate('category', 'name slug')
        .populate('user', 'name avatar jobTitle');

      return sendSuccess(res, {
        message: 'Đã chia sẻ tâm sự thành công!',
        data: populatedPost,
        status: 201,
      });
    }

    // Nếu chưa bật MongoDB, lưu vào bộ nhớ tạm
    const mockPost = {
      _id: `post_${Date.now()}`,
      title,
      slug: uniqueSlug,
      summary,
      content,
      category: { _id: category, name: 'Tâm sự', slug: 'tam-su' },
      coverImage: coverImage || '/images/sun.jpg',
      tags: Array.isArray(tags) ? tags : [],
      author: authorDisplayName,
      authorJob: authorDisplayJob,
      cheersCount: 0,
      views: 1,
      createdAt: new Date().toISOString(),
    };
    fallbackPosts.unshift(mockPost);

    return sendSuccess(res, {
      message: 'Đã chia sẻ tâm sự thành công!',
      data: mockPost,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Cập nhật chi tiết bài viết (Chỉ tác giả hoặc Admin mới được phép chỉnh sửa)
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category, coverImage, tags, author, authorJob, views, isPublished } = req.body;

    if (isDbConnected) {
      const post = await Post.findById(id);
      if (!post) {
        return sendError(res, { message: 'Không tìm thấy bài viết để cập nhật', status: 404 });
      }

      // Kiểm tra quyền: Chỉ tác giả bài viết hoặc Admin mới được sửa
      const isOwner = post.user && post.user.toString() === req.user?._id?.toString();
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return sendError(res, {
          message: 'Bạn không có quyền chỉnh sửa bài viết này!',
          status: 403,
        });
      }

      if (title && title.trim()) {
        post.title = title.trim();
        let newSlug = slugify(title);
        let counter = 1;
        while (await Post.exists({ slug: newSlug, _id: { $ne: post._id } })) {
          newSlug = `${slugify(title)}-${counter}`;
          counter++;
        }
        post.slug = newSlug;
      }

      if (summary !== undefined) post.summary = summary.trim();
      if (content !== undefined) post.content = content;
      if (category) post.category = category;
      if (coverImage) post.coverImage = coverImage;
      if (tags !== undefined) {
        post.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
      }
      if (author) post.author = author.trim();
      if (authorJob !== undefined) post.authorJob = authorJob.trim();
      if (views !== undefined && !isNaN(views)) post.views = Math.max(0, parseInt(views, 10));
      if (isPublished !== undefined) post.isPublished = Boolean(isPublished);

      await post.save();

      const populated = await Post.findById(post._id)
        .populate('category', 'name slug')
        .populate('user', 'name avatar jobTitle bio');

      return sendSuccess(res, {
        message: 'Đã cập nhật bài viết thành công!',
        data: populated,
      });
    }

    // Fallback Mock update
    const idx = fallbackPosts.findIndex((p) => p._id === id || p.slug === id);
    if (idx !== -1) {
      fallbackPosts[idx] = {
        ...fallbackPosts[idx],
        ...req.body,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t) => t.trim()) : fallbackPosts[idx].tags),
      };
      return sendSuccess(res, {
        message: 'Đã cập nhật bài viết thành công!',
        data: fallbackPosts[idx],
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Xóa bài viết
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      const post = await Post.findById(id);
      if (post) {
        // Chỉ tác giả bài viết hoặc Admin mới được xóa
        if (req.user?.role !== 'admin' && post.user?.toString() !== req.user?._id?.toString()) {
          return sendError(res, {
            message: 'Bạn không có quyền xóa bài viết này!',
            status: 403,
          });
        }
        await post.deleteOne();
      }
    }
    return sendSuccess(res, { message: 'Xóa bài viết thành công', data: { id } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy các bài viết gần đây nhất (Sidebar)
 */
export const getRecentPosts = async (req, res) => {
  try {
    if (isDbConnected) {
      const recent = await Post.find({ isPublished: true })
        .select('title slug coverImage author authorJob createdAt cheersCount views')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
      if (recent.length > 0) return sendSuccess(res, { data: recent });
    }
    return sendSuccess(res, { data: fallbackPosts.slice(0, 4) });
  } catch (error) {
    return sendSuccess(res, { data: fallbackPosts.slice(0, 4) });
  }
};
