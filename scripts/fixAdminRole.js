/**
 * Script to fix admin user role
 * Run with: node scripts/fixAdminRole.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || '';

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

async function fixAdminRole() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Find admin user
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('\n❌ Admin user not found!');
      console.log('Creating admin user...\n');
      
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await User.create({
        username: 'admin',
        email: 'admin@aiavatar.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('------------------------');
      console.log('Username: admin');
      console.log('Email: admin@aiavatar.com');
      console.log('Password: admin123');
      console.log('Role: admin');
      console.log('------------------------');
    } else {
      console.log('\n📝 Admin user found!');
      console.log('Current details:');
      console.log('- Username:', adminUser.username);
      console.log('- Email:', adminUser.email);
      console.log('- Role:', adminUser.role || 'NOT SET');
      console.log('- isActive:', adminUser.isActive);
      
      // Update admin user with correct fields
      let needsUpdate = false;
      
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        needsUpdate = true;
        console.log('\n✅ Setting role to: admin');
      }
      
      if (!adminUser.email) {
        adminUser.email = 'admin@aiavatar.com';
        needsUpdate = true;
        console.log('✅ Setting email to: admin@aiavatar.com');
      }
      
      if (adminUser.isActive === undefined || adminUser.isActive === false) {
        adminUser.isActive = true;
        needsUpdate = true;
        console.log('✅ Setting isActive to: true');
      }
      
      if (needsUpdate) {
        await adminUser.save();
        console.log('\n✅ Admin user updated successfully!');
      } else {
        console.log('\n✅ Admin user is already correctly configured!');
      }
      
      console.log('\n------------------------');
      console.log('Updated details:');
      console.log('- Username:', adminUser.username);
      console.log('- Email:', adminUser.email);
      console.log('- Role:', adminUser.role);
      console.log('- isActive:', adminUser.isActive);
      console.log('------------------------');
    }

    console.log('\n🎉 All done!');
    console.log('\n📌 Next steps:');
    console.log('1. Logout from your current session');
    console.log('2. Clear browser cache/cookies (or use incognito mode)');
    console.log('3. Login again with: admin / admin123');
    console.log('4. You should now see "Admin Dashboard" and "User Management" in the sidebar');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminRole();

