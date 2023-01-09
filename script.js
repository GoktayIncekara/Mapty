'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset__btn');
const saveBtn = document.querySelector('.save__btn');

class Workout {
  date = new Date();
  id = uuidv4();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }

  update(distance, duration, cadence) {
    this.distance = distance;
    this.duration = duration;
    this.cadence = cadence;
    this.calcPace();
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }

  update(distance, duration, elevationGain) {
    this.distance = distance;
    this.duration = duration;
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }
}

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];
  #editMode = false;
  #editedWorkout;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener('submit', this._addWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    resetBtn.addEventListener('click', this.reset);
    containerWorkouts.addEventListener('click', this.edit.bind(this));
    containerWorkouts.addEventListener('click', this.delete.bind(this));
    saveBtn.addEventListener('click', this.updateWorkout.bind(this));
  }

  validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

  allPositive = (...inputs) => inputs.every(inp => inp > 0);

  _getPosition() {
    if (
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      )
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _addWorkout(e) {
    e.preventDefault();
    if (!this.#editMode) {
      const { lat, lng } = this.#mapEvent.latlng;

      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      let workout;

      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !this.validInputs(distance, duration, cadence) ||
          !this.allPositive(distance, duration, cadence)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Running([lat, lng], distance, duration, cadence);
      }
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !this.validInputs(distance, duration, elevation) ||
          !this.allPositive(distance, duration)
        )
          return alert('Inputs have to be positive numbers!');

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      this.#workouts.push(workout);

      this._renderWorkoutMarker(workout);
      this._renderWorkout(workout);
      this._hideForm();
      this._setLocalStorage();
      resetBtn.classList.remove('reset__btn-hidden');
    }
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <button class="edit__btn">Edit</button>
        <button class="delete__btn">Delete</button>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    if (e.target.className !== 'edit__btn') {
      const workoutEl = e.target.closest('.workout');
      if (!workoutEl) return;

      const workout = this.#workouts.find(
        workout => workout.id === workoutEl.dataset.id
      );

      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });

      workout.click();
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workouts = JSON.parse(localStorage.getItem('workouts'));
    if (!workouts) return;
    if (this.#workouts.length !== 0) {
      resetBtn.classList.remove('reset__btn-hidden');
    }
    workouts.forEach(workout =>
      this.#workouts.push(
        workout.type === 'running'
          ? new Running(
              workout.coords,
              workout.distance,
              workout.duration,
              workout.cadence
            )
          : new Cycling(
              workout.coords,
              workout.distance,
              workout.duration,
              workout.elevationGain
            )
      )
    );

    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
    resetBtn.classList.add('reset__btn-hidden');
  }

  edit(e) {
    if (e.target.className === 'edit__btn') {
      this.#editMode = true;
      saveBtn.classList.remove('save__btn-hidden');
      const workoutEl = e.target.closest('.workout');
      if (!workoutEl) return;

      const workout = this.#workouts.find(
        workout => workout.id === workoutEl.dataset.id
      );

      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputType.value = workout.type;
      inputType.disabled = true;

      if (workout.type === 'running') {
        inputCadence.value = workout.cadence;
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
      }

      if (workout.type === 'cycling') {
        inputElevation.value = workout.elevationGain;
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }

      form.classList.remove('hidden');

      this.#editedWorkout = workout;
    }
  }

  updateWorkout(e) {
    if (e.target.className === 'save__btn') {
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;

      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !this.validInputs(distance, duration, cadence) ||
          !this.allPositive(distance, duration, cadence)
        )
          return alert('Inputs have to be positive numbers!');
        this.#editedWorkout.update(distance, duration, cadence);
      }
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !this.validInputs(distance, duration, elevation) ||
          !this.allPositive(distance, duration)
        )
          return alert('Inputs have to be positive numbers!');

        this.#editedWorkout.update(distance, duration, elevation);
      }
      this._setLocalStorage();
      location.reload();
    }
  }

  delete(e) {
    if (e.target.className === 'delete__btn') {
      const workoutEl = e.target.closest('.workout');
      if (!workoutEl) return;

      const workoutToRemove = this.#workouts.find(
        workout => workout.id === workoutEl.dataset.id
      );
      this.#workouts = this.#workouts.filter(
        workout => workout.id !== workoutToRemove.id
      );
      localStorage.setItem('workouts', JSON.stringify(this.#workouts));
      location.reload();
    }
  }
}

const app = new App();
