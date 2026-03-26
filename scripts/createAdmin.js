/**
 * Script to create the first admin user
 * Run with: node scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load .env.local first, then .env (so .env fills in keys when .local is empty)
require('dotenv').config({ path: ['.env.local', '.env'] });

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_avatar_studio';

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  createdAt: Date,
  lastLoginAt: Date,
  createdBy: mongoose.Schema.Types.ObjectId,
  isActive: Boolean,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash('Lovjeet', 10);
    
    const adminUser = await User.create({
      username: 'Lovjeet',
      email: 'admin@aiavatar.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('------------------------');
    console.log('Username: admin');
    console.log('Email: admin@aiavatar.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('------------------------');
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

