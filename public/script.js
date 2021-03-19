'use strict';

// **** Using the Geolocation API  ****
// **** Displaying a map using Leaflet library ****
// **** Displaying a map marker  ****
// **** Rendering workout input form  ****

// Initialize the class
class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in mi
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// Initialize the objects from the class
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/mi
    this.pace = this.duration / this.distance;
  }
}
class Skating extends Workout {
  type = 'skating';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // mph
    this.speed = this.distance / (this.duration / 60);
  }
}

///////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const darkMode = document.querySelector('.switch');
const resetButton = document.querySelector('.reset');
const metal = document.querySelector('.logo');

class App {
  #map;
  #mapZoomLevel = 14;
  #mapClickZoom = 15;
  #mapEvent;
  #workouts = [];
  #darkMode = false;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    darkMode.addEventListener('click', this._switchMap.bind(this));
    resetButton.addEventListener('click', this.reset.bind(this));
    metal.addEventListener('click', this.metalMode.bind(this));
  }

  metalMode() {
    console.log('BROOOOTAL');
    L.tileLayer('https://{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey={apikey}', {
      attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apikey: '330b111b23874d85ac083ae73e82d751',
      maxZoom: 22,
    }).addTo(this.#map);
  }

  _switchMap() {
    console.log(this.#darkMode);
    if (!this.#darkMode) {
      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      }).addTo(this.#map);
      this.#darkMode = true;
      darkMode.textContent = 'Light Mode';
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);
      this.#darkMode = false;
      darkMode.textContent = 'Dark Mode';
    }
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        console.log('Could not get position');
      });
    }
  }

  _getPositionTest() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._getNewPosition.bind(this), function () {
        console.log('Could not get position');
      });
    }
  }

  _getNewPosition(position) {
    // Currently brings you to Moscow
    let { latitude } = position.coords;
    let { longitude } = position.coords;
    latitude = 55.7558;
    longitude = 37.6173;
    const coords = [latitude, longitude];
    console.log(latitude, longitude);
    this.#map.panTo(coords);
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    if (!this.#darkMode) {
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);
    }
    // Handling clicks on map
    this.#map.on('click', this._showform.bind(this));
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  // **** Rendering workout input form  ****
  _showform(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert('Input has to be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If cycling, create cycling object
    if (type === 'skating') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert('Input has to be a positive number');
      workout = new Skating([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workout
    this._setLocalStorage();
  }

  // **** Displaying a map marker  ****
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
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
      .setPopupContent(`${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴‍♂️'} ${workout.description}`)
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴‍♂️'}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running')
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
    if (workout.type === 'skating')
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
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find((work) => work.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapClickZoom),
      {
        animate: true,
        pan: {
          duration: 1,
        },
      };

    // Using public interface
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    const areYouSure = window.confirm('Are you sure you want to reset all activities?');
    if (areYouSure) {
      localStorage.removeItem('workouts');
      location.reload();
    } else return;
  }
}

const app = new App();

// navigator.geolocation.getCurrentPosition(
//   function (pos) {
//     console.log(`Success! Here is the location data ${pos}`);
//     // pos.coords.latitude = '-150'
//     // const { latitude } = pos.coords;
//     // const { longitude } = pos.coords;
//     // const coords = [latitude, longitude];
//     // console.log(pos.coords, `${latitude}`);
//   },
//   function () {
//     console.log('oops');
//   }
// );
