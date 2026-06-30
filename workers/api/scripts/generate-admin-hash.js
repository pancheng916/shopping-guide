import { hashPassword } from '../utils/password';

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || process.env.ADMIN_USERNAME || 'admin';
  const password = args[1] || process.env.ADMIN_PASSWORD || 'admin123456';
  const email = args[2] || process.env.ADMIN_EMAIL || 'admin@flasktoken.com';

  const pepper = process.env.ADMIN_PASSWORD_PEPPER || '';

  const passwordHash = await hashPassword(password, pepper);

  console.log('='.repeat(60));
  console.log('  管理员账号生成');
  console.log('='.repeat(60));
  console.log(`  用户名: ${username}`);
  console.log(`  邮箱:   ${email}`);
  console.log(`  密码:   ${password}`);
  console.log(`  角色:   super_admin (1)`);
  console.log('='.repeat(60));
  console.log('');
  console.log('密码哈希 (用于插入数据库):');
  console.log(passwordHash);
  console.log('');
  console.log('SQL 插入语句:');
  console.log(`INSERT INTO admins (username, email, password_hash, nickname, role_id, status) VALUES ('${username}', '${email}', '${passwordHash}', '超级管理员', 1, 'active');`);
  console.log('');
  console.log('注意: 请妥善保管密码，登录后立即修改！');
}

main().catch(console.error);
