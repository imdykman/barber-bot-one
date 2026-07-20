// Глобальное состояние
let state = {
  master_id: null,
  service_id: null,
  booking_date: null,
  booking_time: null,
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
  await loadMasters();
});

// Навигация
function showStep(step) {
  document.querySelectorAll('.step').forEach((el) => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// 1. Загрузка мастеров с умной подгрузкой фото
async function loadMasters() {
  try {
    const response = await fetch('/api/masters');
    const { success, data } = await response.json();

    if (success && data.length > 0) {
      const container = document.getElementById('masters-list');
      container.innerHTML = data
        .map((master) => {
          // 🆕 Умная логика фото:
          // 1. Берем из базы (photo_url)
          // 2. Если нет, ищем файл /images/masters/{id}.jpg
          // 3. Если и его нет, сработает onerror и поставит заглушку
          const photoSrc = master.photo_url || `/images/masters/${master.id}.jpg`;

          return `
            <div class="card" onclick="selectMaster(${master.id})">
              <img src="${photoSrc}" 
                   alt="${master.name}" 
                   onerror="this.onerror=null; this.src='https://via.placeholder.com/56/e8eaed/5f6368?text=👤';">
              <div>
                <h3>💇 ${master.name}</h3>
                <p>${master.specialty || 'Мастер'}</p>
              </div>
            </div>
          `;
        })
        .join('');
      showStep('master');
    } else {
      document.getElementById('masters-list').innerHTML =
        '<p style="text-align:center; color: #5f6368;">Сейчас нет свободных мастеров.</p>';
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

// 2. Загрузка услуг
async function loadServices(masterId) {
  try {
    const response = await fetch(`/api/masters/${masterId}/services`);
    const { success, data } = await response.json();

    if (success && data.length > 0) {
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
    } else {
      document.getElementById('services-list').innerHTML =
        '<p style="text-align:center; color: #5f6368;">У этого мастера пока нет услуг.</p>';
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

// 3. Загрузка дат
function loadDates() {
  const container = document.getElementById('dates-list');
  const dates = [];

  for (let i = 0; i < 10; i++) {
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
        weekday: 'short',
      });

      return `<div class="date-item" onclick="selectDate('${dateStr}')">${displayDate}</div>`;
    })
    .join('');

  showStep('date');
}

// Выбор даты
function selectDate(dateStr) {
  state.booking_date = dateStr;
  loadTimeSlots(dateStr);
}

// 4. Загрузка слотов времени
async function loadTimeSlots(date) {
  try {
    const response = await fetch(`/api/free-slots/${state.master_id}/${state.service_id}/${date}`);
    const { success, data } = await response.json();

    if (success && data.length > 0) {
      const container = document.getElementById('times-list');
      container.innerHTML = data
        .map((time) => `<div class="time-item" onclick="selectTime('${time}')">${time}</div>`)
        .join('');
      showStep('time');
    } else {
      document.getElementById('times-list').innerHTML =
        '<p style="grid-column: 1/-1; text-align:center; color: #5f6368;">Нет свободных окон на эту дату.</p>';
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

// ========== ВАЛИДАЦИЯ ТЕЛЕФОНА И МАСКА ==========

function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('8') && digits.length > 1) {
    normalized = '7' + digits.slice(1);
  }
  if (!normalized.startsWith('7') && normalized.length > 0) {
    normalized = '7' + normalized;
  }

  let formatted = '+7';
  if (normalized.length > 1) formatted += ' (' + normalized.slice(1, 4);
  if (normalized.length >= 5) formatted += ') ' + normalized.slice(4, 7);
  if (normalized.length >= 8) formatted += '-' + normalized.slice(7, 9);
  if (normalized.length >= 10) formatted += '-' + normalized.slice(9, 11);

  return formatted;
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return { valid: false, error: 'Телефон должен содержать 11 цифр' };
  if (!digits.startsWith('7')) return { valid: false, error: 'Телефон должен начинаться с +7' };
  return { valid: true, digits: '+' + digits };
}

document.getElementById('client-phone').addEventListener('input', function (e) {
  const cursorPosition = e.target.selectionStart;
  const oldValue = e.target.value;
  const newValue = formatPhone(oldValue);

  e.target.value = newValue;
  const diff = newValue.length - oldValue.length;
  e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
  document.getElementById('phone-error').style.display = 'none';
});

document.getElementById('privacy-agreed').addEventListener('change', function () {
  document.getElementById('privacy-error').style.display = 'none';
});

// ========== ОТПРАВКА ФОРМЫ ==========

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const client_name = document.getElementById('client-name').value.trim();
  const client_phone = document.getElementById('client-phone').value;
  const privacyAgreed = document.getElementById('privacy-agreed').checked;
  const privacyError = document.getElementById('privacy-error');
  const submitBtn = document.getElementById('submit-btn');

  if (!privacyAgreed) {
    privacyError.textContent = '❌ Необходимо согласиться с политикой конфиденциальности';
    privacyError.style.display = 'block';
    return;
  }

  if (client_name.length < 2) {
    alert('Пожалуйста, введите ваше имя (минимум 2 символа)');
    return;
  }

  const phoneValidation = validatePhone(client_phone);
  if (!phoneValidation.valid) {
    const errorElement = document.getElementById('phone-error');
    errorElement.textContent = '❌ ' + phoneValidation.error;
    errorElement.style.display = 'block';
    document.getElementById('client-phone').focus();
    return;
  }

  const formattedPhone = phoneValidation.digits;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка...';

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name,
        client_phone: formattedPhone,
        master_id: state.master_id,
        service_id: state.service_id,
        booking_date: state.booking_date,
        booking_time: state.booking_time,
      }),
    });

    const { success, error } = await response.json();

    if (success) {
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
    } else {
      alert('Ошибка: ' + (error || 'Не удалось создать запись'));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Записаться';
    }
  } catch (error) {
    console.error('Ошибка создания записи:', error);
    alert('Произошла ошибка сети. Попробуйте ещё раз.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Записаться';
  }
});
