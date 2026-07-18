// Глобальные переменные
let allMasters = [];
let selectedMasterId = null;
let selectedServiceId = null;
let selectedDate = null;
let selectedTime = null;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Загрузка веб-версии Ножницы & One...');
  // Сразу загружаем мастеров, минуя выбор филиала
  await loadMastersDirect();
});

async function loadMastersDirect() {
  try {
    // 🆕 Запрашиваем всех мастеров (без branch_id)
    const response = await fetch('/api/masters');
    const result = await response.json();

    if (result.success && result.data) {
      allMasters = result.data;
      const container = document.getElementById('masters-list'); // Убедитесь, что в HTML есть этот контейнер

      if (container) {
        container.innerHTML = allMasters
          .map(
            (master) => `
          <div class="card" onclick="selectMaster(${master.id})">
            <img src="${master.photo_url || '/images/default-avatar.svg'}" alt="${master.name}" />
            <h3>${master.name}</h3>
            <p>${master.specialty || 'Мастер'}</p>
          </div>
        `
          )
          .join('');

        // Показываем шаг выбора мастера
        showStep('master');
      }
    } else {
      console.error('Ошибка загрузки мастеров:', result);
    }
  } catch (error) {
    console.error('Ошибка сети при загрузке мастеров:', error);
  }
}

// Вспомогательная функция для переключения шагов (если она у вас уже есть, оставьте как есть)
function showStep(stepName) {
  document.querySelectorAll('.step').forEach((el) => (el.style.display = 'none'));
  const target = document.getElementById(`step-${stepName}`);
  if (target) target.style.display = 'block';
}

function selectMaster(masterId) {
  selectedMasterId = masterId;
  console.log('Выбран мастер:', masterId);
  // Далее загружаем услуги для этого мастера
  loadServicesForMaster(masterId);
}

async function loadServicesForMaster(masterId) {
  try {
    const response = await fetch(`/api/masters/${masterId}/services`);
    const result = await response.json();

    if (result.success && result.data) {
      const container = document.getElementById('services-list');
      if (container) {
        container.innerHTML = result.data
          .map(
            (service) => `
          <div class="list-item" onclick="selectService(${service.id}, ${service.price})">
            <div>
              <h3>${service.name}</h3>
              <p>${service.duration_minutes} мин</p>
            </div>
            <div class="price">${service.price} ₽</div>
          </div>
        `
          )
          .join('');
        showStep('service');
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки услуг:', error);
  }
}

function selectService(serviceId, price) {
  selectedServiceId = serviceId;
  console.log('Выбрана услуга:', serviceId);
  loadCalendar(); // Переход к выбору даты
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
  updateHeaderForBranch(null); // 🆕 Сбрасываем заголовок на дефолтный
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
  // 🆕 Скрываем ошибку политики при изменении чекбокса
  document.getElementById('privacy-agreed').addEventListener('change', function () {
    document.getElementById('privacy-error').style.display = 'none';
  });
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
  const privacyAgreed = document.getElementById('privacy-agreed').checked;
  const privacyError = document.getElementById('privacy-error');

  // 🆕 Валидация согласия с политикой
  if (!privacyAgreed) {
    privacyError.textContent = '❌ Необходимо согласиться с политикой конфиденциальности';
    privacyError.style.display = 'block';
    return;
  } else {
    privacyError.style.display = 'none';
  }

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
