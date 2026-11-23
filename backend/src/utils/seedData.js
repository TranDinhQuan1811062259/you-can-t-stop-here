import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { slugify } from './slugify.js';

// Đặt DNS Google và Cloudflare giải quyết SRV record
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

// Danh sách tài khoản Admin & User (TẤT CẢ MẬT KHẨU MẶC ĐỊNH LÀ: 123456)
const sampleUsers = [
  {
    name: 'Trần Đình Quân',
    email: 'anthonyq012025@gmail.com',
    password: '123456',
    role: 'admin',
    chatStatus: 'online',
    jobTitle: 'System Admin & Lead Dev',
    avatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
    bio: 'Chủ sở hữu & Quản trị viên You Can\'t Stop Here. Đam mê lập trình và chia sẻ góc nhìn nghề nghiệp chân thành. #Burnout #Overtime #LeadDev #KeepMoving',
    socialLinks: {
      facebook: 'https://facebook.com/anthony.quan',
      instagram: 'https://instagram.com/anthony_quan',
      tiktok: 'https://tiktok.com/@anthonyquan',
      x: 'https://x.com/anthony_quan',
      linkedin: 'https://linkedin.com/in/anthonyquan',
      website: 'https://cantstophere.com',
    },
  },
  {
    name: 'Quản Trị Viên Freedom',
    email: 'admin@cantstophere.com',
    password: '123456',
    role: 'admin',
    chatStatus: 'online',
    jobTitle: 'Community Administrator',
    avatar: '/images/1.jpg',
    bio: 'Hỗ trợ giải đáp và giữ gìn không gian chia sẻ an toàn, tích cực cho mọi người. #Community #Freedom #SmallWins',
    socialLinks: {
      facebook: 'https://facebook.com/cantstophere',
      website: 'https://cantstophere.com',
    },
  },
  {
    name: 'Minh Anh',
    email: 'minhanh@cantstophere.com',
    password: '123456',
    role: 'user',
    chatStatus: 'busy',
    jobTitle: 'Frontend Dev 3 năm kinh nghiệm',
    avatar: '',
    bio: 'Đang vật lộn với deadlines và tìm lại niềm vui code ngày đầu. #Burnout #Frontend',
    socialLinks: {
      x: 'https://x.com/minhanh_fe',
      linkedin: 'https://linkedin.com/in/minhanh-dev',
    },
  },
  {
    name: 'Thành Nam',
    email: 'nam.pm@cantstophere.com',
    password: '123456',
    role: 'user',
    chatStatus: 'online',
    jobTitle: 'Product Manager',
    avatar: '/images/2.jpg',
    bio: 'Cầu nối giữa team Tech và Kinh doanh. Thích lắng nghe câu chuyện của mọi người. #Product #LifeBalance #ImpostorSyndrome',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/nam-pm',
      facebook: 'https://facebook.com/nam.product',
    },
  },
  {
    name: 'Hương Ly',
    email: 'huongly@cantstophere.com',
    password: '123456',
    role: 'user',
    chatStatus: 'busy',
    jobTitle: 'UI/UX Designer',
    avatar: '/images/img2.jpg',
    bio: 'Tìm kiếm sự cân bằng giữa sáng tạo nghệ thuật và cơm áo gạo tiền. #UIUX #Designer #SmallWins #Creativity',
    socialLinks: {
      instagram: 'https://instagram.com/huongly.designs',
      tiktok: 'https://tiktok.com/@huongly_uiux',
    },
  },
  {
    name: 'Đức Huy',
    email: 'duchuy@cantstophere.com',
    password: '123456',
    role: 'user',
    chatStatus: 'offline',
    jobTitle: 'Junior Developer (Chuyển ngành)',
    avatar: '/images/3.jpg',
    bio: 'Bắt đầu học code từ con số 0 ở tuổi 27. Tin rằng không bao giờ là quá muộn. #ChuyenNganh #CanDam #Developer',
  },
];

const sampleCategories = [
  {
    name: 'Áp lực & Kiệt sức (Burnout)',
    description: 'Nơi trút bầu tâm sự về OT, deadlines dồn dập và những ngày cạn kiệt năng lượng.',
  },
  {
    name: 'Khủng hoảng nghề nghiệp (Career Crisis)',
    description: 'Chênh vênh giữa tiếp tục hay từ bỏ, mất định hướng và tìm lại bản thân.',
  },
  {
    name: 'Chuyển ngành & Bắt đầu lại (Restart)',
    description: 'Những câu chuyện can đảm làm lại từ đầu khi không còn thấy niềm vui ở việc cũ.',
  },
  {
    name: 'Những tia sáng & Động lực (Small Wins)',
    description: 'Những thành tựu nhỏ bé mỗi ngày giúp chúng ta có thêm sức mạnh bước tiếp.',
  },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('Chưa cấu hình MONGO_URI trong file .env');
    }

    console.log(`[Seed] Đang kết nối đến MongoDB Atlas: ${mongoUri.split('@')[1] || mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, family: 4 });
    console.log('[Seed] ✅ Đã kết nối MongoDB thành công');

    // Xóa sạch dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Post.deleteMany({}),
      Comment.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
    ]);
    console.log('[Seed] 🧹 Đã làm sạch dữ liệu cũ trên MongoDB Atlas');

    // Tạo Users (có Admin và User, mật khẩu 123456)
    const createdUsers = [];
    for (const u of sampleUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`[Seed] 👥 Đã tạo ${createdUsers.length} tài khoản người dùng & Admin mẫu (Mật khẩu: 123456)`);

    // Map email sang User ID
    const userMap = {};
    createdUsers.forEach((u) => {
      userMap[u.email] = u;
    });

    // Tạo Categories
    const createdCategories = await Category.insertMany(
      sampleCategories.map((c) => ({
        ...c,
        slug: slugify(c.name),
      }))
    );
    console.log(`[Seed] 📂 Đã tạo ${createdCategories.length} chuyên mục`);

    const catMap = {};
    createdCategories.forEach((c) => {
      catMap[c.name] = c._id;
    });

    // Tạo Posts với liên kết tài khoản thật
    const samplePosts = [
      {
        title: '2 giờ sáng ở văn phòng và câu hỏi: Mình đang chạy đua vì điều gì?',
        summary:
          'Nhìn dòng xe thưa thớt ngoài cửa sổ kính tầng 18, tôi tự hỏi liệu những đêm thức trắng triền miên này có thực sự đáng giá?',
        content: `
          <p>Đêm nay lại là một đêm deadline trước ngày ra mắt tính năng mới. Màn hình vẫn sáng quắc những dòng lỗi đỏ lòm, ly cà phê thứ tư đã nguội ngắt từ bao giờ.</p>
          <p>Tôi nhìn quanh phòng làm việc, chỉ còn vài đồng nghiệp đang gõ phím cành cạch. Đôi mắt ai cũng trũng sâu. Chúng tôi lao vào guồng quay này từ lúc nào chẳng hay, từ những đứa trẻ đầy nhiệt huyết bước chân vào ngành, đến bây giờ mỗi sáng thức dậy chỉ thấy nỗi sợ hãi kéo dài.</p>
          <h2>Khi công việc nuốt chửng cuộc sống</h2>
          <p>Có những ngày cuối tuần chỉ nằm bẹp trên giường, không buồn nấu một bữa ăn tử tế, không buồn trả lời tin nhắn của người thân. Tôi từng nghĩ đó là cái giá của sự thành công. Nhưng tối nay, khi nhìn hình ảnh phản chiếu của mình qua lớp kính mờ, tôi nhận ra mình đang kiệt sức hoàn toàn.</p>
          <blockquote>"Nếu bạn đang cảm thấy mệt mỏi đến muốn bỏ cuộc ngay lúc này, hãy nhớ rằng cho phép bản thân nghỉ ngơi không phải là thất bại."</blockquote>
          <p>Viết những dòng này không phải để than vãn, mà để nhắc chính mình và những ai đang cùng cảnh ngộ: Bạn quan trọng hơn bất kỳ bản release nào. Đêm nay, tôi sẽ tắt máy tính và đi ngủ sớm một chút.</p>
        `,
        coverImage: '/images/office-night.jpg',
        category: catMap['Áp lực & Kiệt sức (Burnout)'],
        user: userMap['anthonyq012025@gmail.com']._id,
        author: 'Trần Đình Quân',
        authorJob: 'System Admin & Lead Dev',
        tags: ['Burnout', 'Overtime', 'Suy ngẫm'],
        cheersCount: 42,
        reactionCounts: {
          sympathy: 18,
          stop: 4,
          love: 12,
          encourage: 8,
          total: 42,
        },
        reactions: [
          {
            user: userMap['nam.pm@cantstophere.com']._id,
            userName: 'Thành Nam',
            userAvatar: '/images/2.jpg',
            types: ['sympathy', 'encourage'],
          },
          {
            user: userMap['huongly@cantstophere.com']._id,
            userName: 'Hương Ly',
            userAvatar: '/images/img2.jpg',
            types: ['love', 'encourage'],
          },
          {
            user: userMap['duchuy@cantstophere.com']._id,
            userName: 'Đức Huy',
            userAvatar: '/images/3.jpg',
            types: ['sympathy', 'stop'],
          },
        ],
        showReactionCount: true,
        sharesCount: 6,
        views: 1,
      },
      {
        title: 'Hội chứng kẻ giả mạo (Impostor Syndrome): Khi bạn luôn sợ bị phát hiện mình kém cỏi',
        summary:
          'Dù được khen ngợi hay thăng chức, trong sâu thẳm tôi vẫn run rẩy lo sợ một ngày nào đó mọi người sẽ nhận ra tôi chẳng tài giỏi như họ nghĩ.',
        content: `
          <p>Đã bao giờ bạn bước vào phòng họp và cảm thấy mình là người thiếu hiểu biết nhất ở đó? Đó là cảm giác ám ảnh tôi suốt hai năm qua kể từ khi nhận vị trí Product Manager.</p>
          <h2>Tiếng nói chỉ trích bên trong đầu</h2>
          <p>Mỗi khi dự án thành công, tôi cho rằng đó là do may mắn hoặc đồng đội gánh. Nhưng mỗi khi có sự cố nhỏ xảy ra, tôi lại tự dằn vặt rằng đó là lỗi tại sự bất tài của mình. Cảm giác này giống như bạn đang đeo một chiếc mặt nạ và luôn nơm nớp sợ ai đó giật nó xuống.</p>
          <p>Nhưng một người đàn anh đã nói với tôi một câu thay đổi suy nghĩ: <em>"Em không cần phải biết tất cả mọi thứ để trở nên có giá trị. Giá trị của em nằm ở việc em chịu học hỏi và không bỏ cuộc."</em></p>
          <p>Nếu bạn cũng đang nghi ngờ năng lực của mình, hãy thở một hơi thật sâu. Bạn đứng được ở vị trí hiện tại là nhờ những nỗ lực có thật của bạn, không phải sự ngẫu nhiên.</p>
        `,
        coverImage: '/images/impostor-calm.jpg',
        category: catMap['Khủng hoảng nghề nghiệp (Career Crisis)'],
        user: userMap['nam.pm@cantstophere.com']._id,
        author: userMap['nam.pm@cantstophere.com'].name,
        authorJob: userMap['nam.pm@cantstophere.com'].jobTitle,
        tags: ['Impostor Syndrome', 'Tự tin', 'Tâm lý làm việc'],
        cheersCount: 68,
        reactionCounts: { sympathy: 25, stop: 0, love: 20, encourage: 23, total: 68 },
        reactions: [
          {
            user: userMap['anthonyq012025@gmail.com']._id,
            userName: 'Trần Đình Quân',
            userAvatar: '',
            types: ['sympathy', 'encourage'],
          },
          {
            user: userMap['huongly@cantstophere.com']._id,
            userName: 'Hương Ly',
            userAvatar: '/images/img2.jpg',
            types: ['love', 'encourage'],
          },
        ],
        showReactionCount: true,
        sharesCount: 11,
        views: 1,
      },
      {
        title: 'Từ bỏ công việc văn phòng 6 năm để học Lập trình ở tuổi 27: Can đảm bắt đầu lại',
        summary:
          'Bạn bè bảo tôi điên rồ khi từ bỏ mức lương ổn định để trở thành thực tập sinh nhận lương hỗ trợ. Nhưng nếu không đi, làm sao biết con đường phía trước đẹp thế nào?',
        content: `
          <p>Năm 27 tuổi, tôi nhận ra mình không thể tiếp tục công việc hiện tại thêm 30 năm nữa. Cảm giác trống rỗng mỗi sáng thứ Hai lặp đi lặp lại như một bản án vô hình.</p>
          <h2>Những ngày đầu tiên chông chênh</h2>
          <p>Ngồi cùng lớp với các bạn sinh viên kém mình 6-7 tuổi, học những cú pháp vòng lặp đầu tiên, tôi đã từng xấu hổ. Đã có những đêm muốn quay đầu lại vì bài toán thuật toán quá hóc búa.</p>
          <p>Nhưng thông điệp của trang web này chính là điều đã giữ tôi ở lại: <strong>You Can't Stop Here</strong>. Bạn không thể dừng lại khi mới chỉ bước được nửa chặng đường khó khăn nhất.</p>
          <p>Hôm nay, tròn 1 năm tôi chính thức nhận offer làm Junior Dev. Mức lương chưa bằng ngày xưa, nhưng ánh mắt tôi đã có lại ngọn lửa đam mê.</p>
        `,
        coverImage: '/images/restart-coding.jpg',
        category: catMap['Chuyển ngành & Bắt đầu lại (Restart)'],
        user: userMap['duchuy@cantstophere.com']._id,
        author: userMap['duchuy@cantstophere.com'].name,
        authorJob: userMap['duchuy@cantstophere.com'].jobTitle,
        tags: ['Chuyển ngành', 'Can đảm', 'Bắt đầu lại'],
        cheersCount: 95,
        reactionCounts: { sympathy: 15, stop: 0, love: 35, encourage: 45, total: 95 },
        reactions: [
          {
            user: userMap['anthonyq012025@gmail.com']._id,
            userName: 'Trần Đình Quân',
            userAvatar: '',
            types: ['love', 'encourage'],
          },
        ],
        showReactionCount: true,
        sharesCount: 18,
        views: 1,
      },
      {
        title: 'Hôm nay mình đã dũng cảm từ chối một yêu cầu vô lý và cảm giác thật nhẹ nhõm',
        summary:
          'Lần đầu tiên sau nhiều năm làm việc kiểu "People Pleaser", tôi đã dám nói chữ KHÔNG với sếp vào 10 giờ tối thứ Bảy.',
        content: `
          <p>10h15 tối thứ Bảy, chuông Slack vang lên với dòng tin: <em>"Em chỉnh gấp layout này cho anh nhé, sáng thứ Hai khách hàng duyệt."</em></p>
          <p>Như một thói quen, tay tôi đã định gõ <em>"Vâng ạ"</em>. Tim đập thình thịch, cổ họng nghẹn lại. Nhưng tôi nhìn lại bản thân: cả tuần đã làm việc 60 tiếng, mắt đã mờ đi vì mỏi.</p>
          <h2>Học cách thiết lập ranh giới (Boundaries)</h2>
          <p>Tôi hít một hơi thật sâu và soạn tin nhắn: <em>"Chào anh, tối nay em có lịch cá nhân và hiện không có máy tính. Sáng thứ Hai đúng 8h em sẽ ưu tiên xử lý việc này đầu tiên để kịp gửi khách hàng ạ."</em></p>
          <p>Trời không sập xuống. Công ty không phá sản. Sếp chỉ phản hồi: <em>"Ok em."</em></p>
          <p>Đôi khi, chiến thắng lớn nhất của một ngày đi làm không phải là hoàn thành thêm một task, mà là bảo vệ được sự bình yên của tâm trí mình.</p>
        `,
        coverImage: '/images/peaceful-boundary.jpg',
        category: catMap['Những tia sáng & Động lực (Small Wins)'],
        user: userMap['huongly@cantstophere.com']._id,
        author: userMap['huongly@cantstophere.com'].name,
        authorJob: userMap['huongly@cantstophere.com'].jobTitle,
        tags: ['Ranh giới', 'Sức khỏe tinh thần', 'Small Win'],
        cheersCount: 120,
        reactionCounts: { sympathy: 30, stop: 5, love: 45, encourage: 40, total: 120 },
        reactions: [
          {
            user: userMap['anthonyq012025@gmail.com']._id,
            userName: 'Trần Đình Quân',
            userAvatar: '',
            types: ['love', 'encourage'],
          },
          {
            user: userMap['nam.pm@cantstophere.com']._id,
            userName: 'Thành Nam',
            userAvatar: '/images/2.jpg',
            types: ['sympathy', 'love'],
          },
        ],
        showReactionCount: false, // Thử nghiệm 1 bài tác giả chọn ẨN số lượng để kiểm tra giao diện!
        sharesCount: 22,
        views: 1,
      },
      {
        title: 'Giving Some Efforts: Khi bạn cảm thấy muốn bỏ cuộc, hãy thử cố thêm 5 phút nữa',
        summary:
          'Sự kiên trì không phải là những bước nhảy vọt phi thường, mà đôi khi chỉ là quyết định không buông tay trong 5 phút khó khăn nhất.',
        content: `
          <p>Có những ngày ngồi trước màn hình máy tính hay đối diện với một bài toán hóc búa, năng lượng của bạn cạn kiệt đến mức chỉ muốn tắt ngúm mọi thứ và từ bỏ. Cảm giác đó rất thật, và nó xảy ra với tất cả chúng ta.</p>
          <h2>Quy tắc "5 phút nữa thôi"</h2>
          <p>Mỗi khi thấy mình chạm đến giới hạn chịu đựng, thay vì dẹp bỏ tất cả, tôi thường tự đặt một chiếc đồng hồ bấm giờ 5 phút. Tự nhủ rằng: <em>"Mình chỉ cần cố gắng thêm đúng 5 phút nữa thôi. Sau 5 phút, nếu vẫn thấy không thể tiếp tục, mình sẽ nghỉ."</em></p>
          <p>Điều kỳ diệu là trong 90% trường hợp, qua được 5 phút ngột ngạt ấy, nhịp thở của bạn sẽ dần ổn định trở lại, sự tập trung quay về và bạn nhận ra chướng ngại vật kia thực ra không đáng sợ như mình tưởng.</p>
          <blockquote>"Chiến thắng lớn nhất không phải là không bao giờ gục ngã, mà là biết đứng lên thêm một lần nữa sau mỗi lần gục ngã."</blockquote>
          <div class="effort-song-recommendation" style="margin: 20px 0; padding: 16px; border-radius: 12px; background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #f59e0b;">🎵 Giai Điệu Đồng Hành: Song 1E (Bền Bỉ &amp; Vươn Lên)</p>
            <p style="margin: 0; font-size: 0.95rem; opacity: 0.9;">Bản thu âm Studio WAV mộc mạc mang nhịp điệu kiên trì, tiếp thêm nguồn năng lượng để bạn vững bước qua những giờ làm việc căng thẳng.</p>
            <div style="margin-top: 10px;">
              <audio controls preload="metadata" style="width: 100%; max-width: 480px; height: 36px;" src="/audio/giving-some-efforts/Song1E.wav"></audio>
            </div>
          </div>
          <p>Nếu bạn đang đọc những dòng này vào một ngày mệt mỏi: Hãy hít một hơi thật sâu, thả lỏng vai, nghe một bản nhạc nhẹ nhàng và cho bản thân thêm 5 phút nữa nhé. You Can't Stop Here!</p>
        `,
        coverImage: '/images/restart-coding.jpg',
        category: catMap['Những tia sáng & Động lực (Small Wins)'],
        user: userMap['anthonyq012025@gmail.com']._id,
        author: userMap['anthonyq012025@gmail.com'].name,
        authorJob: userMap['anthonyq012025@gmail.com'].jobTitle,
        tags: ['Giving Some Efforts', 'Động lực', 'Kiên trì', 'Small Wins'],
        audioMood: 'uplifting',
        cheersCount: 89,
        reactionCounts: { sympathy: 14, stop: 0, love: 45, encourage: 30, total: 89 },
        reactions: [
          {
            user: userMap['huongly@cantstophere.com']._id,
            userName: 'Hương Ly',
            userAvatar: '/images/img2.jpg',
            types: ['love', 'encourage'],
          },
        ],
        showReactionCount: true,
        sharesCount: 16,
        views: 48,
      },
      {
        title: 'Mỗi nỗ lực nhỏ bé đều để lại dấu ấn: Đừng đánh giá thấp bước chân hôm nay của bạn',
        summary:
          'Chúng ta thường chỉ tôn vinh những đích đến hoành tráng mà quên mất rằng chính những nỗ lực thầm lặng mỗi ngày mới là thứ tạc nên bản lĩnh.',
        content: `
          <p>Trong một thế giới luôn hối hả và tôn vinh những thành công chớp nhoáng, rất dễ để chúng ta cảm thấy bản thân mình chậm chạp và tầm thường. Bạn nhìn thấy người khác khoe giải thưởng, khoe thăng tiến, trong khi bản thân vẫn đang loay hoay với những dòng code dở dang hay những trang sách chưa đọc hết.</p>
          <h2>Sức mạnh của những bước tiến nhỏ bé (Small Wins)</h2>
          <p>Nhưng sự thật là: Không có cái cây đại thụ nào lớn lên sau một đêm. Mỗi dòng code bạn viết hôm nay, mỗi email bạn trả lời tử tế, mỗi buổi tối bạn chọn ngồi vào bàn làm việc thay vì lướt mạng vô định — tất cả đều đang tích lũy từng chút một.</p>
          <p>Đó là tinh thần cốt lõi của <strong>Giving Some Efforts</strong>. Đôi khi nỗ lực hôm nay chỉ là thức dậy đúng giờ, ăn một bữa ấm nóng và mỉm cười với đồng nghiệp. Bạn không cần phải hoàn hảo, bạn chỉ cần không dừng lại.</p>
          <div class="effort-song-recommendation" style="margin: 20px 0; padding: 16px; border-radius: 12px; background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #f59e0b;">🎵 Giai Điệu Đồng Hành: Song 2E (Ánh Sáng Cuối Con Đường)</p>
            <p style="margin: 0; font-size: 0.95rem; opacity: 0.9;">Giai điệu tươi sáng và lạc quan, là liều thuốc tinh thần sưởi ấm tâm hồn bạn sau những giờ nỗ lực miệt mài.</p>
            <div style="margin-top: 10px;">
              <audio controls preload="metadata" style="width: 100%; max-width: 480px; height: 36px;" src="/audio/giving-some-efforts/Song2E.wav"></audio>
            </div>
          </div>
          <p>Hãy tự vỗ vai khen ngợi chính mình vì những cố gắng của ngày hôm nay. Dù kết quả ra sao, bạn đã dũng cảm đối diện và không bỏ cuộc. Đó đã là một chiến thắng rực rỡ rồi!</p>
        `,
        coverImage: '/images/sun.jpg',
        category: catMap['Những tia sáng & Động lực (Small Wins)'],
        user: userMap['minhanh@cantstophere.com']._id,
        author: userMap['minhanh@cantstophere.com'].name,
        authorJob: userMap['minhanh@cantstophere.com'].jobTitle,
        tags: ['Giving Some Efforts', 'Nỗ lực', 'Tập trung', 'Vươn lên', 'Small Wins'],
        audioMood: 'uplifting',
        cheersCount: 112,
        reactionCounts: { sympathy: 20, stop: 0, love: 52, encourage: 40, total: 112 },
        reactions: [
          {
            user: userMap['anthonyq012025@gmail.com']._id,
            userName: 'Trần Đình Quân',
            userAvatar: '',
            types: ['love', 'encourage'],
          },
        ],
        showReactionCount: true,
        sharesCount: 24,
        views: 62,
      },
    ];

    const insertedPosts = [];
    for (const p of samplePosts) {
      const authorUser = Object.values(userMap).find(
        (u) => u._id.toString() === p.user.toString()
      );
      const socialLinksObj = authorUser?.socialLinks?.toObject
        ? authorUser.socialLinks.toObject()
        : (authorUser?.socialLinks || {});
      const createdPost = await Post.create({
        ...p,
        slug: slugify(p.title),
        isPublished: true,
        authorSocialLinks: socialLinksObj,
      });
      insertedPosts.push(createdPost);
    }
    console.log(`[Seed] 📝 Đã tạo ${insertedPosts.length} bài viết tâm sự mẫu liên kết tác giả thật`);

    // Tạo các bình luận mẫu liên kết tài khoản
    const sampleComments = [
      {
        post: insertedPosts[0]._id,
        user: userMap['nam.pm@cantstophere.com']._id,
        content:
          'Gửi bạn một cái ôm thật chặt 🫂! Mình từng làm đến 4h sáng và sau đó phải nhập viện vì kiệt sức. Từ đó mình hiểu không có công việc nào quý hơn sức khỏe. Tắt máy đi ngủ ngay đi bạn nhé!',
        cheerType: 'hug',
      },
      {
        post: insertedPosts[0]._id,
        user: userMap['huongly@cantstophere.com']._id,
        content:
          'Cố lên bạn ơi 💪! Ngày mai thức dậy uống một ly nước ấm, hít thở khí trời một chút rồi tính tiếp. Bạn đã làm rất tốt rồi!',
        cheerType: 'encourage',
      },
      {
        post: insertedPosts[1]._id,
        user: userMap['duchuy@cantstophere.com']._id,
        content:
          'Mình cũng y hệt bạn! Suốt ngày sợ người ta nghĩ mình may mắn. Đọc bài của bạn làm mình thấy bớt cô độc hẳn. Cảm ơn bạn rất nhiều!',
        cheerType: 'general',
      },
      {
        post: insertedPosts[2]._id,
        user: userMap['anthonyq012025@gmail.com']._id,
        content:
          'Ngưỡng mộ sự dũng cảm của bạn! Admin và cộng đồng chúc bạn vững bước trên con đường lập trình mới nhé! 🚀',
        cheerType: 'advice',
      },
    ];

    await Comment.insertMany(sampleComments);
    console.log(`[Seed] 💬 Đã tạo ${sampleComments.length} bình luận động viên mẫu`);

    // Tạo danh bạ bạn bè & cuộc trò chuyện mẫu
    const quan = userMap['anthonyq012025@gmail.com'];
    const nam = userMap['nam.pm@cantstophere.com'];
    const huy = userMap['duchuy@cantstophere.com'];
    const adminUser = userMap['admin@cantstophere.com'];
    const ly = userMap['huongly@cantstophere.com'];

    // Kết bạn: Quân kết bạn với Nam, Huy, Quản trị viên
    quan.friends = [nam._id, huy._id, adminUser._id];
    nam.friends = [quan._id];
    huy.friends = [quan._id];
    adminUser.friends = [quan._id];
    await Promise.all([quan.save(), nam.save(), huy.save(), adminUser.save()]);
    console.log('[Seed] 🤝 Đã liên kết danh bạ bạn bè mẫu');

    // 1. Cuộc trò chuyện giữa Quân và Nam (Bạn bè, 3 tin nhắn)
    const convNam = await Conversation.create({
      participants: [quan._id, nam._id],
      status: 'accepted',
      isStranger: false,
      totalMessagesCount: 3,
      lastMessage: {
        content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tâm sự tiếp nha! ☕',
        sender: nam._id,
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    });

    await Message.create([
      {
        conversation: convNam._id,
        sender: quan._id,
        receiver: nam._id,
        content: 'Chào Nam, dạo này dự án bên cậu thế nào rồi? Có bị OT nhiều không?',
        createdAt: new Date(Date.now() - 1000 * 60 * 120),
        isRead: true,
      },
      {
        conversation: convNam._id,
        sender: nam._id,
        receiver: quan._id,
        content: 'Cũng đỡ hơn rồi Quân ạ, đợt này team bắt đầu cân bằng lại công việc.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
        isRead: true,
      },
      {
        conversation: convNam._id,
        sender: nam._id,
        receiver: quan._id,
        content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tâm sự tiếp nha! ☕',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        isRead: true,
      },
    ]);

    // 2. Cuộc trò chuyện giữa Quân và Huy (Bạn bè, 2 tin nhắn)
    const convHuy = await Conversation.create({
      participants: [quan._id, huy._id],
      status: 'accepted',
      isStranger: false,
      totalMessagesCount: 2,
      lastMessage: {
        content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em ạ! 🎉',
        sender: huy._id,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      updatedAt: new Date(Date.now() - 1000 * 60 * 15),
    });

    await Message.create([
      {
        conversation: convHuy._id,
        sender: quan._id,
        receiver: huy._id,
        content: 'Chúc mừng Huy đã tìm lại được niềm đam mê lập trình nhé!',
        createdAt: new Date(Date.now() - 1000 * 60 * 45),
        isRead: true,
      },
      {
        conversation: convHuy._id,
        sender: huy._id,
        receiver: quan._id,
        content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em ạ! 🎉',
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        isRead: true,
      },
    ]);

    // 3. Cuộc trò chuyện từ Hương Ly (Người lạ - Chưa kết bạn, gửi yêu cầu trò chuyện)
    const convLy = await Conversation.create({
      participants: [quan._id, ly._id],
      status: 'pending',
      isStranger: true,
      requestedBy: ly._id,
      totalMessagesCount: 1,
      lastMessage: {
        content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm, em muốn xin lời khuyên về thiết kế UI ạ! ✨',
        sender: ly._id,
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      },
      updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    });

    await Message.create({
      conversation: convLy._id,
      sender: ly._id,
      receiver: quan._id,
      content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm, em muốn xin lời khuyên về thiết kế UI ạ! ✨',
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      isRead: false,
    });
    console.log('[Seed] 💬 Đã tạo 3 cuộc trò chuyện mẫu (Bạn bè & Người lạ)');

    await mongoose.disconnect();
    console.log('\n======================================================');
    console.log('🎉 NẠP DỮ LIỆU THÀNH CÔNG VÀO MONGODB ATLAS!');
    console.log('👉 Bây giờ bạn có thể đăng nhập bằng các tài khoản trên với mật khẩu: 123456');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDatabase();
