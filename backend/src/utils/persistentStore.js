import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
const storeFilePath = path.join(dataDir, 'db_store.json');

// Đảm bảo thư mục data luôn tồn tại
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const defaultStoreUsers = [
  {
    _id: '6aec5b46ee112662b33c0e32',
    name: 'Anthony Quân (Trần Đình Quân)',
    email: 'anthonyq012025@gmail.com',
    phone: '0901234567',
    password: 'password123',
    rawPassword: '123456',
    role: 'admin',
    chatStatus: 'online',
    allowStrangerNotifications: true,
    friends: ['u_huy', 'u_nam', 'u_minhanh'],
    jobTitle: 'System Admin & Lead Dev',
    avatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
    coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    bio: 'Tài khoản cá nhân https://facebook.com/anthony.qill/ đồng bộ từ trình duyệt. #Facebook',
    customLayout: {
      theme: 'ocean',
      frameStyle: 'gold',
      ambientEffect: 'waves',
      bgColor: '#f8fafc',
    },
    profileMusic: {
      enabled: true,
      title: 'Rock you like a hurricane',
      artist: 'Scorpion',
      sourceType: 'youtube',
      presetId: 'lofi_night',
      url: 'https://www.youtube.com/watch?v=WnJFQEHsSrU',
    },
    socialLinks: {
      facebook: 'https://www.facebook.com/anthony.qill/',
      instagram: 'https://www.instagram.com/hotcandy.134/',
      tiktok: 'https://www.tiktok.com/@whatwasthat2000?is_from_webapp=1&sender_device=pc',
      x: 'https://x.com/anthony_quan',
      linkedin: 'https://linkedin.com/in/anthonyquan',
      website: 'https://cantstophere.com',
    },
  },
  {
    _id: 'u_admin_2',
    name: 'Quản Trị Viên Freedom',
    email: 'admin@cantstophere.com',
    phone: '0901111222',
    password: 'password123',
    rawPassword: '123456',
    role: 'admin',
    chatStatus: 'online',
    friends: ['u_admin_1'],
    jobTitle: 'Community Administrator',
    avatar: '/images/1.jpg',
    bio: 'Hỗ trợ giải đáp và giữ gìn không gian chia sẻ an toàn, tích cực cho mọi người.',
    profileMusic: {
      enabled: true,
      title: 'Deep Focus - Nhịp điệu tập trung',
      artist: 'Freedom Ambient',
      sourceType: 'preset',
      presetId: 'deep_focus',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-orchestra-16230.mp3',
    },
  },
  {
    _id: 'u_minhanh',
    name: 'Minh Anh',
    email: 'minhanh@cantstophere.com',
    phone: '0902222333',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    chatStatus: 'offline',
    friends: ['u_admin_1'],
    jobTitle: 'Frontend Dev 3 năm kinh nghiệm',
    avatar: '/images/man.jpg',
    bio: 'Đang vật lộn với deadlines và tìm lại niềm vui code ngày đầu.',
    profileMusic: {
      enabled: true,
      title: 'Healing Piano - Khoảng lặng tâm hồn',
      artist: 'Peaceful Mind',
      sourceType: 'preset',
      presetId: 'healing_piano',
      url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    },
  },
  {
    _id: 'u_nam',
    name: 'Thành Nam',
    email: 'nam.pm@cantstophere.com',
    phone: '0903333444',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    chatStatus: 'busy',
    friends: ['u_admin_1'],
    jobTitle: 'Product Manager',
    avatar: '/images/2.jpg',
    bio: 'Cầu nối giữa team Tech và Kinh doanh. Thích lắng nghe câu chuyện của mọi người. #Product #LifeBalance',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/nam-pm',
      facebook: 'https://facebook.com/nam.product',
    },
    profileMusic: {
      enabled: true,
      title: 'Rain & Coffee - Tiếng mưa bên ô cửa sổ',
      artist: 'Acoustic Rain Project',
      sourceType: 'preset',
      presetId: 'rain_coffee',
      url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_731a104051.mp3?filename=rain-and-nostalgia-chill-lofi-song-8493.mp3',
    },
  },
  {
    _id: 'u_huy',
    name: 'Đức Huy',
    email: 'duchuy@cantstophere.com',
    phone: '0904444555',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    chatStatus: 'online',
    friends: ['u_admin_1'],
    jobTitle: 'Junior Developer (Chuyển ngành)',
    avatar: '/images/3.jpg',
    bio: 'Bắt đầu học code từ con số 0 ở tuổi 27. Tin rằng không bao giờ là quá muộn. #ChuyenNganh #Developer',
    profileMusic: {
      enabled: true,
      title: 'Deep Focus - Nhịp điệu tập trung',
      artist: 'Dev Chillhop',
      sourceType: 'preset',
      presetId: 'deep_focus',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-orchestra-16230.mp3',
    },
  },
  {
    _id: 'u_ly',
    name: 'Hương Ly',
    email: 'huongly@cantstophere.com',
    phone: '0905555666',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    chatStatus: 'online',
    friends: [],
    jobTitle: 'UI/UX Designer',
    avatar: '/images/img2.jpg',
    bio: 'Tìm kiếm sự cân bằng giữa sáng tạo nghệ thuật và cơm áo gạo tiền. #Design #Art #SmallWins',
    socialLinks: {
      instagram: 'https://instagram.com/huongly.designs',
      tiktok: 'https://tiktok.com/@huongly_uiux',
    },
    profileMusic: {
      enabled: true,
      title: 'Acoustic Sunset - Bình yên sau tan ca',
      artist: 'Acoustic Soul',
      sourceType: 'preset',
      presetId: 'acoustic_sunset',
      url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c93e43d61f.mp3?filename=warm-acoustic-guitar-124928.mp3',
    },
  },
];

export const defaultStoreCategories = [
  { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout', description: 'OT, deadline và cạn kiệt năng lượng', icon: '😫' },
  { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis', description: 'Chênh vênh giữa tiếp tục hay từ bỏ', icon: '🧭' },
  { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart', description: 'Can đảm làm lại từ con số 0', icon: '🌱' },
  { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins', description: 'Thành tựu nhỏ bé nuôi dưỡng hi vọng', icon: '✨' },
  { _id: 'cat_5', name: 'Thời Sự & Tình Hình Thế Giới (Global Affairs)', slug: 'thoi-su-tinh-hinh-the-gioi', description: 'Điểm tin thời cuộc, diễn biến quốc tế & góc nhìn toàn cầu', icon: '🌍' },
  { _id: 'cat_6', name: 'Chiến Sự, Xung Đột & Hòa Bình (Conflict & Peace)', slug: 'chien-su-xung-dot-hoa-binh', description: 'Bình luận chiến sự, góc nhìn nhân đạo & khát vọng hòa bình', icon: '🕊️' },
  { _id: 'cat_7', name: 'Góc Nhìn & Xã Hội (Perspective & Society)', slug: 'goc-nhin-xa-hoi', description: 'Quan điểm đa chiều về thời cuộc và đời sống xã hội', icon: '🌐' },
  { _id: 'cat_8', name: 'Tâm Sự & Đời Sống Thường Nhật (Life Stories)', slug: 'tam-su-doi-song-thuong-nhat', description: 'Những dòng tâm sự thật, trải lòng không phán xét', icon: '☕' },
];

export const defaultStoreConversations = [
  {
    _id: 'conv_1',
    participants: ['u_ly', 'u_admin_1'],
    status: 'pending',
    isStranger: true,
    requestedBy: 'u_ly',
    totalMessagesCount: 1,
    unreadCounts: { u_admin_1: 1 },
    lastMessage: {
      _id: 'msg_1',
      content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm...',
      sender: { _id: 'u_ly', name: 'Hương Ly', avatar: '/images/img2.jpg' },
      createdAt: '2026-11-05T14:30:00.000Z',
    },
    updatedAt: '2026-11-05T14:30:00.000Z',
  },
  {
    _id: 'conv_2',
    participants: ['u_huy', 'u_admin_1'],
    status: 'accepted',
    isStranger: false,
    totalMessagesCount: 4,
    unreadCounts: { u_admin_1: 2 },
    lastMessage: {
      _id: 'msg_2',
      content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em hôm trước ạ!',
      sender: { _id: 'u_huy', name: 'Đức Huy', avatar: '/images/3.jpg' },
      createdAt: '2026-11-05T15:10:00.000Z',
    },
    updatedAt: '2026-11-05T15:10:00.000Z',
  },
  {
    _id: 'conv_3',
    participants: ['u_nam', 'u_admin_1'],
    status: 'accepted',
    isStranger: false,
    totalMessagesCount: 6,
    unreadCounts: { u_admin_1: 3 },
    lastMessage: {
      _id: 'msg_3',
      content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tán gẫu.',
      sender: { _id: 'u_nam', name: 'Thành Nam', avatar: '/images/2.jpg' },
      createdAt: '2026-11-05T15:45:00.000Z',
    },
    updatedAt: '2026-11-05T15:45:00.000Z',
  },
];

export const defaultStoreMessages = [
  {
    _id: 'msg_1',
    conversation: 'conv_1',
    sender: { _id: 'u_ly', name: 'Hương Ly', avatar: '/images/img2.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Chào anh Quân, em đọc bài viết 2 giờ sáng của anh thấy rất đồng cảm...',
    isRead: false,
    createdAt: '2026-11-05T14:30:00.000Z',
  },
  {
    _id: 'msg_2_prev',
    conversation: 'conv_2',
    sender: { _id: 'u_admin_1', name: 'Trần Đình Quân', avatar: '/images/man.jpg' },
    receiver: { _id: 'u_huy', name: 'Đức Huy' },
    content: 'Chào Huy, bài viết chia sẻ về việc chuyển ngành của em rất truyền cảm hứng!',
    isRead: true,
    createdAt: '2026-11-05T15:05:00.000Z',
  },
  {
    _id: 'msg_2',
    conversation: 'conv_2',
    sender: { _id: 'u_huy', name: 'Đức Huy', avatar: '/images/3.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Dạ em cảm ơn anh Quân đã động viên bài viết của em hôm trước ạ!',
    isRead: false,
    createdAt: '2026-11-05T15:10:00.000Z',
  },
  {
    _id: 'msg_3',
    conversation: 'conv_3',
    sender: { _id: 'u_nam', name: 'Thành Nam', avatar: '/images/2.jpg' },
    receiver: { _id: 'u_admin_1', name: 'Trần Đình Quân' },
    content: 'Cảm ơn Quân nhiều nhé, hôm nào rảnh anh em mình cafe tán gẫu.',
    isRead: false,
    createdAt: '2026-11-05T15:45:00.000Z',
  },
];

// Khởi tạo dữ liệu mẫu ban đầu nếu file chưa tồn tại
const initialData = {
  users: defaultStoreUsers,
  categories: defaultStoreCategories,
  conversations: defaultStoreConversations,
  messages: defaultStoreMessages,
  posts: [
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
      authorSocialLinks: {
        facebook: 'https://www.facebook.com/anthony.qill/',
        instagram: 'https://www.instagram.com/hotcandy.134/',
        tiktok: 'https://www.tiktok.com/@whatwasthat2000?is_from_webapp=1&sender_device=pc',
        x: 'https://x.com/anthony_quan',
        linkedin: 'https://linkedin.com/in/anthonyquan',
        website: 'https://cantstophere.com',
      },
      tags: ['Burnout', 'Overtime', 'Suy ngẫm'],
      cheersCount: 42,
      reactionCounts: { sympathy: 18, stop: 4, love: 12, encourage: 8, total: 42 },
      reactions: [
        { userName: 'Thành Nam', userAvatar: '/images/2.jpg', types: ['sympathy', 'encourage'] },
        { userName: 'Hương Ly', userAvatar: '/images/img2.jpg', types: ['love', 'encourage'] },
        { userName: 'Đức Huy', userAvatar: '/images/3.jpg', types: ['sympathy', 'stop'] },
      ],
      showReactionCount: true,
      sharesCount: 6,
      views: 18,
      createdAt: '2026-11-05T07:39:52.748Z',
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
      summary: 'Bạn bè bảo tôi điên rồ khi từ bỏ mức lương ổn định để trở thành thực tập sinh nhận lương hỗ trợ. Nhưng nếu không đi, làm sao biết con đường phía trước đẹp thế nào?',
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
  ],
  comments: [
    {
      _id: 'comm_1',
      postId: 'post_1',
      content: 'Gửi bạn một cái ôm thật chặt 🫂! Mình từng làm đến 4h sáng và sau đó phải nhập viện vì kiệt sức. Sức khỏe luôn là số một bạn nhé!',
      cheerType: 'hug',
      user: { _id: 'u_nam', name: 'Thành Nam', avatar: '/images/2.jpg', jobTitle: 'Product Manager' },
      createdAt: new Date().toISOString(),
      replies: [],
    },
    {
      _id: 'comm_2',
      postId: 'post_1',
      content: 'Cố lên bạn ơi 💪! Ngày mai thức dậy uống một ly nước ấm, hít thở khí trời một chút rồi tính tiếp. Bạn đã làm rất tốt rồi!',
      cheerType: 'encourage',
      user: { _id: 'u_ly', name: 'Hương Ly', avatar: '/images/img2.jpg', jobTitle: 'UI/UX Designer' },
      createdAt: new Date().toISOString(),
      replies: [],
    },
    {
      _id: 'comm_3',
      postId: 'post_1',
      content: 'Mình cũng y hệt bạn! Đọc bài của bạn làm mình thấy bớt cô độc hẳn. Cảm ơn bạn rất nhiều vì đã chia sẻ!',
      cheerType: 'general',
      user: { _id: 'u_huy', name: 'Đức Huy', avatar: '/images/3.jpg', jobTitle: 'Junior Developer' },
      createdAt: new Date().toISOString(),
      replies: [],
    },
  ],
};

/**
 * Đọc dữ liệu từ file JSON trên ổ cứng bền vững
 */
export const loadStore = () => {
  try {
    if (fs.existsSync(storeFilePath)) {
      const raw = fs.readFileSync(storeFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let needsSave = false;

        // Đảm bảo luôn có users
        if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = [...defaultStoreUsers];
          needsSave = true;
        } else {
          // Bổ sung friends và chatStatus nếu chưa có
          parsed.users = parsed.users.map((u) => {
            const defU = defaultStoreUsers.find((du) => du._id === u._id);
            return {
              ...u,
              friends: Array.isArray(u.friends) ? u.friends : (defU?.friends || []),
              chatStatus: u.chatStatus || defU?.chatStatus || 'online',
              allowStrangerNotifications: u.allowStrangerNotifications ?? true,
            };
          });
        }

        // Đảm bảo luôn có categories
        if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
          parsed.categories = [...defaultStoreCategories];
          needsSave = true;
        }

        // Đảm bảo luôn có conversations
        if (!Array.isArray(parsed.conversations) || parsed.conversations.length === 0) {
          parsed.conversations = [...defaultStoreConversations];
          needsSave = true;
        }

        // Đảm bảo luôn có messages
        if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
          parsed.messages = [...defaultStoreMessages];
          needsSave = true;
        }

        // Đảm bảo luôn có posts
        if (!Array.isArray(parsed.posts)) {
          parsed.posts = [...initialData.posts];
          needsSave = true;
        }

        // Đảm bảo luôn có comments
        if (!Array.isArray(parsed.comments)) {
          parsed.comments = [...initialData.comments];
          needsSave = true;
        }

        if (needsSave) {
          saveStore(parsed);
        }

        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc db_store.json, khởi tạo mặc định:', err.message);
  }

  saveStore(initialData);
  return initialData;
};

/**
 * Ghi dữ liệu xuống file JSON trên ổ cứng bền vững
 */
export const saveStore = (data) => {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi ghi db_store.json:', err.message);
  }
};

/**
 * Tìm người dùng trong db_store.json
 */
export const findUserInStore = (cleanIdentifier) => {
  if (!cleanIdentifier) return null;
  const store = loadStore();
  const lower = cleanIdentifier.toLowerCase().trim();
  const cleanPhone = cleanIdentifier.replace(/[\s.-]/g, '');

  return (store.users || []).find((u) => {
    return (
      (u._id && String(u._id).toLowerCase() === lower) ||
      (u.email && u.email.toLowerCase() === lower) ||
      (u.name && u.name.toLowerCase() === lower) ||
      (u.phone && (u.phone === cleanIdentifier || u.phone === cleanPhone))
    );
  });
};

/**
 * Cập nhật hoặc thêm người dùng vào db_store.json (Lưu vĩnh viễn trên ổ cứng)
 */
export const saveUserToStore = (userData) => {
  if (!userData) return null;
  const store = loadStore();
  store.users = store.users || [];

  const idx = store.users.findIndex(
    (u) =>
      (userData._id && String(u._id) === String(userData._id)) ||
      (userData.email && u.email && u.email.toLowerCase() === userData.email.toLowerCase())
  );

  let mergedUser = null;
  if (idx !== -1) {
    mergedUser = {
      ...store.users[idx],
      ...userData,
      customLayout: {
        ...(store.users[idx].customLayout || {}),
        ...(userData.customLayout || {}),
      },
      profileMusic: {
        ...(store.users[idx].profileMusic || {}),
        ...(userData.profileMusic || {}),
      },
      socialLinks: {
        ...(store.users[idx].socialLinks || {}),
        ...(userData.socialLinks || {}),
      },
    };
    store.users[idx] = mergedUser;
  } else {
    mergedUser = {
      _id: userData._id || `u_${Date.now()}`,
      role: userData.role || 'user',
      jobTitle: userData.jobTitle || 'Thành viên cộng đồng',
      avatar: userData.avatar || '/images/man.jpg',
      bio: userData.bio || '',
      ...userData,
    };
    store.users.push(mergedUser);
  }

  saveStore(store);
  return mergedUser;
};
