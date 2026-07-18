// Глобальное состояние
let state = {
  branch_id: null,
  master_id: null,
  service_id: null,
  booking_date: null,
  booking_time: null,
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  // Сначала загружаем филиалы
  await loadBranches();

  // Проверяем URL на наличие слага филиала (например, "/central")
  const path = window.location.pathname.replace(/\//g, ''); // убираем все слеши

  if (path && path !== '') {
    // Ищем филиал с таким slug в уже загруженных данных
    // Примечание: нам нужно немного доработать loadBranches, чтобы он сохранял данные,
    // или сделать повторный запрос. Проще всего найти его по slug через API.

    try {
      const response = await fetch('/api/branches');
      const { success, data } = await response.json();

      if (success) {
        const targetBranch = data.find((b) => b.slug === path);

        if (targetBranch) {
          console.log(`🎯 Автовыбор филиала по URL: ${targetBranch.name}`);
          selectBranch(targetBranch.id);
        } else {
          console.warn(`⚠️ Филиал с slug "${path}" не найден, показываем выбор`);
        }
      }
    } catch (error) {
      console.error('Ошибка при автовыборе филиала:', error);
    }
  }
});

// Загрузка филиалов
async function loadBranches() {
  try {
    const response = await fetch('/api/branches');
    const { success, data } = await response.json();

    if (success) {
      const container = document.getElementById('branches-list');
      container.innerHTML = data
        .map(
          (branch) => `
        <div class="card" onclick="selectBranch(${branch.id})">
          <h3>🏢 ${branch.name}</h3>
          <p>📍 ${branch.address}</p>
        </div>
      `
        )
        .join('');

      showStep('branch');
    }
  } catch (error) {
    console.error('Ошибка загрузки филиалов:', error);
  }
}

// Выбор филиала
function selectBranch(branchId) {
  state.branch_id = branchId;
  loadMasters(branchId);
}

// Загрузка мастеров
async function loadMasters(branchId) {
  try {
    const response = await fetch(`/api/masters/${branchId}`);
    const { success, data } = await response.json();

    if (success) {
      const container = document.getElementById('masters-list');
      container.innerHTML = data
        .map((master) => {
          // 🆕 Умный выбор фото: берем из БД, иначе по ID, иначе сработает onerror
          const photoSrc = master.photo_url || `/images/masters/${master.id}.jpg`;

          return `
        <div class="card" onclick="selectMaster(${master.id})">
          <img src="${photoSrc}" 
               onerror="this.onerror=null; this.src='/images/default-avatar.svg';"
               alt="${master.name}">
          <h3>💇 ${master.name}</h3>
          <p>${master.specialty}</p>
        </div>
      `;
        })
        .join('');

      showStep('master');
    }
  } catch (error) {
    console.error('Ошибка загрузки мастеров:', error);
  }
}

// Выбор мастера
function selectMaster(masterId) {
  state.master_id = masterId;
  loadServices(masterId);
}

// Загрузка услуг
async function loadServices(masterId) {
  try {
    const response = await fetch(`/api/services/${masterId}`);
    const { success, data } = await response.json();

    if (success) {
      const container = document.getElementById('services-list');
      container.innerHTML = data
        .map(
          (service) => `
        <div class="list-item" onclick="selectService(${service.id})">
          <div>
            <h3>💈 ${service.name}</h3>
            <p>⏱️ ${service.duration_minutes} мин</p>
          </div>
          <div class="price">${service.price} ₽</div>
        </div>
      `
        )
        .join('');

      showStep('service');
    }
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
  }
}

// Выбор услуги
function selectService(serviceId) {
  state.service_id = serviceId;
  loadDates();
}

// Загрузка дат
function loadDates() {
  const container = document.getElementById('dates-list');
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  container.innerHTML = dates
    .map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      });

      return `
      <div class="date-item" onclick="selectDate('${dateStr}')">
        ${displayDate}
      </div>
    `;
    })
    .join('');

  showStep('date');
}

// Выбор даты
function selectDate(dateStr) {
  state.booking_date = dateStr;
  loadTimeSlots(dateStr);
}

// Загрузка слотов времени
async function loadTimeSlots(date) {
  try {
    const response = await fetch(`/api/free-slots/${state.master_id}/${state.service_id}/${date}`);
    const { success, data } = await response.json();

    if (success) {
      const container = document.getElementById('times-list');
      container.innerHTML = data
        .map(
          (time) => `
        <div class="time-item" onclick="selectTime('${time}')">
          ${time}
        </div>
      `
        )
        .join('');

      showStep('time');
    }
  } catch (error) {
    console.error('Ошибка загрузки времени:', error);
  }
}

// Выбор времени
function selectTime(time) {
  state.booking_time = time;
  showStep('form');
}

// Показать успешную запись
function showSuccess() {
  const date = new Date(state.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  document.getElementById('booking-details').innerHTML = `
    <p><strong>📅 ${displayDate}</strong></p>
    <p><strong>🕐 ${state.booking_time}</strong></p>
    <p>Мы ждём вас!</p>
  `;

  showStep('success');
}

// Навигация
function showStep(step) {
  document.querySelectorAll('.step').forEach((el) => (el.style.display = 'none'));
  document.getElementById(`step-${step}`).style.display = 'block';
}

function backToBranch() {
  state.branch_id = null;
  showStep('branch');
}
function backToMaster() {
  state.master_id = null;
  showStep('master');
}
function backToService() {
  state.service_id = null;
  showStep('service');
}
function backToDate() {
  state.booking_date = null;
  showStep('date');
}
function backToTime() {
  state.booking_time = null;
  showStep('time');
}
// ========== ВАЛИДАЦИЯ ТЕЛЕФОНА ==========

// Маска для телефона
function formatPhone(value) {
  // Убираем всё кроме цифр
  const digits = value.replace(/\D/g, '');

  // Если начинается с 8, заменяем на 7
  let normalized = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    normalized = '7' + digits.slice(1);
  }

  // Если не начинается с 7, добавляем
  if (!normalized.startsWith('7') && normalized.length > 0) {
    normalized = '7' + normalized;
  }

  // Форматируем: +7 (XXX) XXX-XX-XX
  let formatted = '+7';
  if (normalized.length > 1) {
    formatted += ' (' + normalized.slice(1, 4);
  }
  if (normalized.length >= 5) {
    formatted += ') ' + normalized.slice(4, 7);
  }
  if (normalized.length >= 8) {
    formatted += '-' + normalized.slice(7, 9);
  }
  if (normalized.length >= 10) {
    formatted += '-' + normalized.slice(9, 11);
  }

  return formatted;
}

// Валидация телефона
function validatePhone(phone) {
  // Убираем всё кроме цифр
  const digits = phone.replace(/\D/g, '');

  // Проверяем длину (должно быть 11 цифр: 7 + 10 цифр номера)
  if (digits.length !== 11) {
    return { valid: false, error: 'Телефон должен содержать 11 цифр' };
  }

  // Проверяем, что начинается с 7
  if (!digits.startsWith('7')) {
    return { valid: false, error: 'Телефон должен начинаться с +7' };
  }

  return { valid: true, digits: '+' + digits };
}

// Применение маски при вводе
document.getElementById('client-phone').addEventListener('input', function (e) {
  const cursorPosition = e.target.selectionStart;
  const oldValue = e.target.value;
  const newValue = formatPhone(oldValue);

  e.target.value = newValue;

  // Восстанавливаем позицию курсора
  const diff = newValue.length - oldValue.length;
  e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

  // Скрываем ошибку при вводе
  document.getElementById('phone-error').style.display = 'none';
});

// ========== ОТПРАВКА ФОРМЫ ==========

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const client_name = document.getElementById('client-name').value.trim();
  const client_phone = document.getElementById('client-phone').value;

  // Валидация имени
  if (client_name.length < 2) {
    alert('Пожалуйста, введите ваше имя (минимум 2 символа)');
    return;
  }

  // Валидация телефона
  const phoneValidation = validatePhone(client_phone);
  if (!phoneValidation.valid) {
    const errorElement = document.getElementById('phone-error');
    errorElement.textContent = '❌ ' + phoneValidation.error;
    errorElement.style.display = 'block';
    document.getElementById('client-phone').focus();
    return;
  }

  // Используем отформатированный телефон
  const formattedPhone = phoneValidation.digits;

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name,
        client_phone: formattedPhone,
        branch_id: state.branch_id,
        master_id: state.master_id,
        service_id: state.service_id,
        booking_date: state.booking_date,
        booking_time: state.booking_time,
      }),
    });

    const { success, data, error } = await response.json();

    if (success) {
      showSuccess();
    } else {
      alert('Ошибка: ' + error);
    }
  } catch (error) {
    console.error('Ошибка создания записи:', error);
    alert('Произошла ошибка. Попробуйте ещё раз.');
  }
});
