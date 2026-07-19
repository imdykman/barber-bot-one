// Глобальные переменные состояния
let state = {
  masterId: null,
  masterName: '',
  serviceId: null,
  serviceName: '',
  date: null,
  time: null,
};

// При загрузке страницы сразу показываем мастеров
document.addEventListener('DOMContentLoaded', () => {
  loadMasters();

  // Устанавливаем минимальную дату как "сегодня"
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    dateInput.addEventListener('change', (e) => {
      state.date = e.target.value;
      loadTimeSlots();
    });
  }
});

// Переключение шагов
function showStep(stepId) {
  document.querySelectorAll('.step').forEach((el) => el.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

// 1. Загрузка мастеров
async function loadMasters() {
  const container = document.getElementById('masters-list');
  container.innerHTML = '<div class="loader">Загрузка...</div>';

  try {
    const res = await fetch('/api/masters');
    const { success, data } = await res.json();

    if (success && data.length > 0) {
      container.innerHTML = data
        .map(
          (m) => `
        <div class="card" onclick="selectMaster(${m.id}, '${m.name.replace(/'/g, "\\'")}')">
          <img src="${m.photo_url || 'https://via.placeholder.com/50'}" alt="${m.name}" />
          <div class="card-info">
            <h3>${m.name}</h3>
            <p>${m.specialty || 'Мастер'}</p>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      container.innerHTML =
        '<p style="text-align:center; color:#666;">К сожалению, сейчас нет свободных мастеров.</p>';
    }
  } catch (err) {
    container.innerHTML =
      '<p style="text-align:center; color:red;">Ошибка загрузки. Обновите страницу.</p>';
  }
}

// 2. Выбор мастера и загрузка услуг
async function selectMaster(masterId, masterName) {
  state.masterId = masterId;
  state.masterName = masterName;

  showStep('step-service');
  const container = document.getElementById('services-list');
  container.innerHTML = '<div class="loader">Загрузка...</div>';

  try {
    const res = await fetch(`/api/masters/${masterId}/services`);
    const { success, data } = await res.json();

    if (success && data.length > 0) {
      container.innerHTML = data
        .map(
          (s) => `
        <div class="card" onclick="selectService(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
          <div class="card-info" style="flex:1;">
            <h3>${s.name}</h3>
            <p>${s.duration_minutes} мин</p>
          </div>
          <div style="font-weight:bold; color:var(--accent);">${s.price} ₽</div>
        </div>
      `
        )
        .join('');
    } else {
      container.innerHTML =
        '<p style="text-align:center; color:#666;">У этого мастера пока нет услуг.</p>';
    }
  } catch (err) {
    container.innerHTML = '<p style="text-align:center; color:red;">Ошибка загрузки услуг.</p>';
  }
}

// 3. Выбор услуги и переход к дате
function selectService(serviceId, serviceName) {
  state.serviceId = serviceId;
  state.serviceName = serviceName;
  showStep('step-datetime');

  // Триггерим загрузку слотов для текущей даты
  if (state.date) loadTimeSlots();
}

// 4. Загрузка временных слотов
async function loadTimeSlots() {
  const container = document.getElementById('time-slots');
  container.innerHTML =
    '<div class="loader" style="grid-column: 1/-1;">Поиск свободных окон...</div>';

  try {
    const res = await fetch(`/api/free-slots/${state.masterId}/${state.serviceId}/${state.date}`);
    const { success, data } = await res.json();

    if (success && data.length > 0) {
      container.innerHTML = data
        .map(
          (time) => `
        <button class="btn" style="margin:0; padding:10px; font-size:14px;" onclick="selectTime('${time}')">${time}</button>
      `
        )
        .join('');
    } else {
      container.innerHTML =
        '<p style="grid-column: 1/-1; text-align:center; color:#666;">Нет свободных окон на эту дату.</p>';
    }
  } catch (err) {
    container.innerHTML =
      '<p style="grid-column: 1/-1; text-align:center; color:red;">Ошибка загрузки расписания.</p>';
  }
}

// 5. Выбор времени и переход к форме
function selectTime(time) {
  state.time = time;

  // Заполняем саммари
  const dateObj = new Date(state.date);
  const formattedDate = dateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  document.getElementById('booking-summary').innerHTML = `
    <p>💇 <strong>Мастер:</strong> ${state.masterName}</p>
    <p>💈 <strong>Услуга:</strong> ${state.serviceName}</p>
    <p>📅 <strong>Дата:</strong> ${formattedDate}</p>
    <p>🕐 <strong>Время:</strong> ${state.time}</p>
  `;

  showStep('step-client');
}

// 6. Отправка записи
async function submitBooking() {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const btn = document.getElementById('submit-btn');

  if (!name || name.length < 2) {
    alert('Пожалуйста, введите корректное имя');
    return;
  }
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    alert('Пожалуйста, введите корректный номер телефона');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Отправка...';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: name,
        client_phone: phone,
        master_id: state.masterId,
        service_id: state.serviceId,
        booking_date: state.date,
        booking_time: state.time,
      }),
    });

    const result = await res.json();
    if (result.success) {
      showStep('step-success');
    } else {
      alert('Ошибка: ' + (result.error || 'Не удалось создать запись'));
      btn.disabled = false;
      btn.textContent = '✅ Подтвердить запись';
    }
  } catch (err) {
    alert('Ошибка сети. Попробуйте позже.');
    btn.disabled = false;
    btn.textContent = '✅ Подтвердить запись';
  }
}
