// Глобальное состояние
let state = {
  branch_id: null,
  master_id: null,
  service_id: null,
  booking_date: null,
  booking_time: null,
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  loadBranches();
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
        .map(
          (master) => `
        <div class="card" onclick="selectMaster(${master.id})">
          <img src="/images/masters/${master.id}.jpg" onerror="this.src='/images/default-master.jpg'">
          <h3>💇 ${master.name}</h3>
          <p>${master.specialty}</p>
        </div>
      `
        )
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

// Отправка формы
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const client_name = document.getElementById('client-name').value;
  const client_phone = document.getElementById('client-phone').value;

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name,
        client_phone,
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
