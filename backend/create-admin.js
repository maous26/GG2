const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema (simple version for this script)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  subscription_type: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  lastLogin: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connected to MongoDB');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@globegenius.app' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', {
        email: existingAdmin.email,
        subscription_type: existingAdmin.subscription_type,
        id: existingAdmin._id,
        created: existingAdmin.createdAt
      });
      
      // Check if name field is missing and update it
      if (!existingAdmin.name) {
        console.log('⚙️  Updating admin user with missing name field...');
        existingAdmin.name = 'Administrator';
        await existingAdmin.save();
        console.log('✅ Admin user updated with name field');
      }
    } else {
      console.log('⚠️  Admin user not found. Creating...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('GG2024Admin!', salt);
      
      // Create admin user
      const adminUser = new User({
        email: 'admin@globegenius.app',
        name: 'Administrator',
        password: hashedPassword,
        subscription_type: 'enterprise'
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@globegenius.app');
      console.log('🔑 Password: GG2024Admin!');
      console.log('👑 Type: enterprise');
    }
    
    // Test admin login
    console.log('\n🧪 Testing admin login...');
    const testAdmin = await User.findOne({ email: 'admin@globegenius.app' });
    const passwordMatch = await bcrypt.compare('GG2024Admin!', testAdmin.password);
    
    console.log('✅ Password verification:', passwordMatch ? 'SUCCESS' : 'FAILED');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();
