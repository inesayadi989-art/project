import { supabase } from './supabase';

interface UserToCreate {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'seller' | 'customer';
}

const usersToCreate: UserToCreate[] = [
  // Admin
  {
    email: 'admin@souk.tn',
    password: 'admin123',
    fullName: 'Admin Souk',
    role: 'admin',
  },
  // Sellers
  {
    email: 'seller1@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 1',
    role: 'seller',
  },
  {
    email: 'seller2@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 2',
    role: 'seller',
  },
  {
    email: 'seller3@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 3',
    role: 'seller',
  },
  {
    email: 'seller4@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 4',
    role: 'seller',
  },
  {
    email: 'seller5@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 5',
    role: 'seller',
  },
  {
    email: 'seller6@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 6',
    role: 'seller',
  },
  {
    email: 'seller7@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 7',
    role: 'seller',
  },
  {
    email: 'seller8@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 8',
    role: 'seller',
  },
  {
    email: 'seller9@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 9',
    role: 'seller',
  },
  {
    email: 'seller10@souk.tn',
    password: 'Seller123',
    fullName: 'Vendeur 10',
    role: 'seller',
  },
];

export async function createInitialUsers() {
  console.log('🔄 بدء إنشاء المستخدمين...');
  let successCount = 0;
  let errorCount = 0;

  for (const user of usersToCreate) {
    try {
      console.log(`📧 Creating: ${user.email}`);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            role: user.role,
          },
        },
      });

      if (authError) {
        console.error(`❌ خطأ في إنشاء ${user.email}:`, authError.message);
        errorCount++;
        continue;
      }

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            is_banned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error(`⚠️ تحذير في ملف الملف الشخصي ${user.email}:`, profileError.message);
        } else {
          console.log(`✅ تم إنشاء: ${user.email} (${user.role})`);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`❌ خطأ غير متوقع لـ ${user.email}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 النتيجة النهائية:`);
  console.log(`✅ نجح: ${successCount}`);
  console.log(`❌ فشل: ${errorCount}`);
  console.log(`📈 الإجمالي: ${successCount + errorCount}`);

  return {
    success: successCount,
    error: errorCount,
    total: usersToCreate.length,
  };
}

// Example usage:
// await createInitialUsers();
