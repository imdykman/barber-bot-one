const db = require('../database/database');

console.log('?? Заполняем базу данных "Ножницы&Ко"...');

// Очищаем БД
db.db.exec(`
  DELETE FROM holidays;
  DELETE FROM bookings;
  DELETE FROM master_services;
  DELETE FROM schedule;
  DELETE FROM masters;
  DELETE FROM services;
  DELETE FROM branches;
  DELETE FROM clients;
  DELETE FROM admins;
`);

console.log('??? База очищена');

// ========== ФИЛИАЛЫ ==========
const branches = [
  {
    name: 'Центральный филиал',
    address: 'г. Екатеринбург, ул. Ленина, д. 144',
    phone: '+7 (343) 100-10-10',
    work_hours: 'Пн-Вс: 9:00 - 21:00'
  },
  {
    name: 'Северный филиал (Уралмаш / Эльмаш)',
    address: 'г. Екатеринбург, пр. Космонавтов, д. 252',
    phone: '+7 (343) 200-20-20',
    work_hours: 'Пн-Вс: 9:00 - 21:00'
  },
  {
    name: 'Южный филиал (Ботаника / Чкаловский)',
    address: 'г. Екатеринбург, ул. 8 Марта, д. 308',
    phone: '+7 (343) 300-30-30',
    work_hours: 'Пн-Вс: 9:00 - 21:00'
  }
];

const insertBranch = db.db.prepare(`
  INSERT INTO branches (name, address, phone, work_hours)
  VALUES (?, ?, ?, ?)
`);

const branchIds = {};
for (const branch of branches) {
  const result = insertBranch.run(branch.name, branch.address, branch.phone, branch.work_hours);
  branchIds[branch.name] = result.lastInsertRowid;
  console.log(`? Филиал: ${branch.name}`);
}

// ========== УСЛУГИ ==========
const services = [
  // Стрижки
  { name: 'Женская стрижка', category: 'Стрижки', price_min: 1500, price_max: 2500, duration_minutes: 60, description: 'Стрижка любой сложности с укладкой' },
  { name: 'Мужская стрижка', category: 'Стрижки', price_min: 800, price_max: 1200, duration_minutes: 45, description: 'Классическая или модельная стрижка' },
  { name: 'Детская стрижка', category: 'Стрижки', price_min: 600, price_max: 900, duration_minutes: 30, description: 'Для детей до 12 лет' },
  
  // Окрашивание
  { name: 'Окрашивание в один тон', category: 'Окрашивание', price_min: 3000, price_max: 4500, duration_minutes: 120, description: 'Однотонное окрашивание' },
  { name: 'Сложное окрашивание', category: 'Окрашивание', price_min: 5000, price_max: 8000, duration_minutes: 180, description: 'Airtouch, балаяж, шатуш' },
  { name: 'Мелирование', category: 'Окрашивание', price_min: 3500, price_max: 6000, duration_minutes: 150, description: 'Классическое или современное мелирование' },
  
  // Укладки
  { name: 'Укладка', category: 'Укладки', price_min: 1000, price_max: 2000, duration_minutes: 45, description: 'Повседневная или вечерняя укладка' },
  { name: 'Свадебная причёска', category: 'Укладки', price_min: 3000, price_max: 5000, duration_minutes: 90, description: 'Причёска для особого случая' },
  
  // Уход
  { name: 'Уход за волосами', category: 'Уход', price_min: 1500, price_max: 3000, duration_minutes: 60, description: 'Маски, восстановление, ботокс' },
  { name: 'Кератиновое выпрямление', category: 'Уход', price_min: 4000, price_max: 7000, duration_minutes: 150, description: 'Выпрямление и восстановление' },
  
  // Барбершоп
  { name: 'Стрижка бороды', category: 'Барбершоп', price_min: 500, price_max: 800, duration_minutes: 30, description: 'Моделирование и оформление бороды' },
  { name: 'Королевское бритьё', category: 'Барбершоп', price_min: 1000, price_max: 1500, duration_minutes: 45, description: 'Бритьё опасной бритвой' }
];

const insertService = db.db.prepare(`
  INSERT INTO services (name, category, price_min, price_max, duration_minutes, description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const serviceIds = {};
for (const service of services) {
  const result = insertService.run(
    service.name, service.category, service.price_min, service.price_max,
    service.duration_minutes, service.description
  );
  serviceIds[service.name] = result.lastInsertRowid;
  console.log(`? Услуга: ${service.name}`);
}

// ========== МАСТЕРА ==========
const masters = [
  // Центральный филиал
  { branch: 'Центральный филиал', name: 'Анна Соколова', specialty: 'Стилист-универсал', experience: 7, description: 'Специализация: женские стрижки, окрашивание' },
  { branch: 'Центральный филиал', name: 'Дмитрий Волков', specialty: 'Барбер', experience: 5, description: 'Мужские стрижки, оформление бороды' },
  { branch: 'Центральный филиал', name: 'Елена Морозова', specialty: 'Колорист', experience: 10, description: 'Сложные окрашивания, мелирование' },
  
  // Северный филиал
  { branch: 'Северный филиал (Уралмаш / Эльмаш)', name: 'Мария Кузнецова', specialty: 'Стилист', experience: 6, description: 'Женские стрижки, укладки' },
  { branch: 'Северный филиал (Уралмаш / Эльмаш)', name: 'Алексей Орлов', specialty: 'Барбер', experience: 4, description: 'Мужские стрижки, бритьё' },
  
  // Южный филиал
  { branch: 'Южный филиал (Ботаника / Чкаловский)', name: 'Ольга Новикова', specialty: 'Стилист-колорист', experience: 8, description: 'Стрижки, окрашивание, уход' },
  { branch: 'Южный филиал (Ботаника / Чкаловский)', name: 'Игорь Белов', specialty: 'Барбер', experience: 6, description: 'Мужской зал, классические стрижки' },
  { branch: 'Южный филиал (Ботаника / Чкаловский)', name: 'Светлана Зайцева', specialty: 'Колорист', experience: 9, description: 'Сложные окрашивания, восстановление' }
];

const insertMaster = db.db.prepare(`
  INSERT INTO masters (branch_id, name, specialty, experience, description)
  VALUES (?, ?, ?, ?, ?)
`);

const masterIds = {};
for (const master of masters) {
  const result = insertMaster.run(
    branchIds[master.branch], master.name, master.specialty,
    master.experience, master.description
  );
  masterIds[master.name] = result.lastInsertRowid;
  console.log(`? Мастер: ${master.name} (${master.specialty})`);
}

// ========== СВЯЗИ МАСТЕР-УСЛУГА ==========
// Какие услуги оказывает каждый мастер (с ценами)
const masterServicesMap = {
  'Анна Соколова': ['Женская стрижка', 'Мужская стрижка', 'Детская стрижка', 'Окрашивание в один тон', 'Укладка', 'Уход за волосами'],
  'Дмитрий Волков': ['Мужская стрижка', 'Стрижка бороды', 'Королевское бритьё'],
  'Елена Морозова': ['Женская стрижка', 'Окрашивание в один тон', 'Сложное окрашивание', 'Мелирование', 'Уход за волосами', 'Кератиновое выпрямление'],
  'Мария Кузнецова': ['Женская стрижка', 'Детская стрижка', 'Укладка', 'Свадебная причёска'],
  'Алексей Орлов': ['Мужская стрижка', 'Детская стрижка', 'Стрижка бороды', 'Королевское бритьё'],
  'Ольга Новикова': ['Женская стрижка', 'Мужская стрижка', 'Окрашивание в один тон', 'Сложное окрашивание', 'Уход за волосами'],
  'Игорь Белов': ['Мужская стрижка', 'Стрижка бороды', 'Королевское бритьё'],
  'Светлана Зайцева': ['Женская стрижка', 'Окрашивание в один тон', 'Сложное окрашивание', 'Мелирование', 'Кератиновое выпрямление']
};

const insertMasterService = db.db.prepare(`
  INSERT INTO master_services (master_id, service_id, price, duration_minutes)
  VALUES (?, ?, ?, ?)
`);

for (const [masterName, serviceNames] of Object.entries(masterServicesMap)) {
  const masterId = masterIds[masterName];
  for (const serviceName of serviceNames) {
    const serviceId = serviceIds[serviceName];
    const service = services.find(s => s.name === serviceName);
    
    // Цена — среднее между min и max
    const price = Math.round((service.price_min + service.price_max) / 2);
    
    insertMasterService.run(masterId, serviceId, price, service.duration_minutes);
  }
  console.log(`? Услуги для ${masterName}: ${serviceNames.length} шт.`);
}

// ========== ГРАФИК РАБОТЫ ==========
// Все мастера работают Пн-Сб, с 9:00 до 21:00
const insertSchedule = db.db.prepare(`
  INSERT INTO schedule (master_id, day_of_week, start_time, end_time)
  VALUES (?, ?, ?, ?)
`);

for (const masterName of Object.keys(masterIds)) {
  const masterId = masterIds[masterName];
  // Пн-Сб (1-6), Вс — выходной (0)
  for (let day = 1; day <= 6; day++) {
    insertSchedule.run(masterId, day, '09:00', '21:00');
  }
}
console.log('? График работы для всех мастеров');

// ========== АДМИНЫ ==========
// Добавляем админов из .env
const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [18245428];
const insertAdmin = db.db.prepare('INSERT INTO admins (user_id, name, role) VALUES (?, ?, ?)');

for (const adminId of adminIds) {
  insertAdmin.run(adminId, 'Администратор', 'superadmin');
  console.log(`? Админ добавлен: ${adminId}`);
}

console.log('\n? База данных успешно заполнена!');
console.log(`?? Статистика:`);
console.log(`   • Филиалов: ${Object.keys(branchIds).length}`);
console.log(`   • Услуг: ${Object.keys(serviceIds).length}`);
console.log(`   • Мастеров: ${Object.keys(masterIds).length}`);
console.log(`   • Админов: ${adminIds.length}`);