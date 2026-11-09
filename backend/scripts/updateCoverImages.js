import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MAPPING = {
  'tu-bo-cong-viec-van-phong-6-nam-de-hoc-lap-trinh-o-tuoi-27-can-dam-bat-dau-lai': '/images/restart-coding.jpg',
  'hom-nay-minh-da-dung-cam-tu-choi-mot-yeu-cau-vo-ly-va-cam-giac-that-nhe-nhom': '/images/peaceful-boundary.jpg',
  '2-gio-sang-o-van-phong-va-cau-hoi-minh-dang-chay-dua-vi-dieu-gi': '/images/office-night.jpg',
  'hoi-chung-ke-gia-mao-impostor-syndrome-khi-ban-luon-so-bi-phat-hien-minh-kem-coi': '/images/impostor-calm.jpg',
  'bai-viet-thu-nghiem-luu-tru': '/images/office-night.jpg',
};

async function updateAll() {
  console.log('🚀 Bắt đầu cập nhật hình ảnh bài viết...');

  // 1. Cập nhật file JSON offline (db_store.json)
  const storePath = path.join(__dirname, '../data/db_store.json');
  if (fs.existsSync(storePath)) {
    try {
      const dbData = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      let modified = 0;
      if (Array.isArray(dbData.posts)) {
        dbData.posts.forEach((post) => {
          if (MAPPING[post.slug]) {
            post.coverImage = MAPPING[post.slug];
            modified++;
          }
        });
        fs.writeFileSync(storePath, JSON.stringify(dbData, null, 2), 'utf-8');
        console.log(`✅ [db_store.json] Đã cập nhật ảnh bìa cho ${modified} bài viết.`);
      }
    } catch (e) {
      console.error('❌ Lỗi cập nhật db_store.json:', e);
    }
  }

  // 2. Cập nhật MongoDB Atlas
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ Không tìm thấy MONGO_URI trong .env');
    process.exit(1);
  }

  try {
    console.log('⏳ Đang kết nối MongoDB Atlas...');
    await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 15000,
    });
    console.log('✅ Đã kết nối MongoDB Atlas!');

    const collection = mongoose.connection.collection('posts');
    for (const [slug, image] of Object.entries(MAPPING)) {
      const res = await collection.updateMany(
        { slug: slug },
        { $set: { coverImage: image } }
      );
      console.log(`📸 [Atlas] Bài "${slug}" -> Cập nhật: ${res.modifiedCount} bản ghi (${image})`);
    }

    const allPosts = await collection.find({}, { projection: { title: 1, slug: 1, coverImage: 1 } }).toArray();
    console.log('\n📋 Danh sách bài viết trên Atlas sau khi cập nhật:');
    allPosts.forEach((p, idx) => {
      console.log(`${idx + 1}. [${p.title}] -> coverImage: ${p.coverImage}`);
    });

    await mongoose.disconnect();
    console.log('✨ Hoàn tất cập nhật cơ sở dữ liệu!');
  } catch (err) {
    console.error('❌ Lỗi kết nối / cập nhật MongoDB Atlas:', err);
  }
}

updateAll();
