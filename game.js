// --- ENGINE INITIALIZATION ---
const container = document.getElementById('game-container');

// 1. Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Clear Blue Sky
scene.fog = new THREE.FogExp2(0x87ceeb, 0.005); // Valley fog

// 2. Camera setup
const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);

// 3. Renderer with hardware safety check
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
} catch (e) {
  console.error("WebGL failed to initialize:", e);
  alert("WebGL failed to load in your browser. Check GPU acceleration settings in Brave/Chrome.");
}

// 4. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 0.9);
sunLight.position.set(100, 150, 50);
sunLight.castShadow = true;
scene.add(sunLight);

// --- ENVIRONMENT BUILDER ---
// Mountain Terrain
const terrainGeo = new THREE.PlaneGeometry(800, 800, 32, 32);
terrainGeo.rotateX(-Math.PI / 2);

const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  let x = pos.getX(i);
  let z = pos.getZ(i);
  let distFromRoad = Math.abs(x);
  if (distFromRoad > 30) {
    pos.setY(i, Math.sin(x * 0.02) * 15 + (distFromRoad - 30) * 0.3);
  }
}
terrainGeo.computeVertexNormals();
const terrainMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.receiveShadow = true;
scene.add(terrain);

// Asphalt Highway Road
const roadGeo = new THREE.PlaneGeometry(20, 800);
roadGeo.rotateX(-Math.PI / 2);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.position.y = 0.1;
road.receiveShadow = true;
scene.add(road);

// --- 3D BUS BUILD ---
const busGroup = new THREE.Group();

// Bus Body
const bodyGeo = new THREE.BoxGeometry(3.2, 3.5, 10);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
const busBody = new THREE.Mesh(bodyGeo, bodyMat);
busBody.position.y = 2.2;
busBody.castShadow = true;
busGroup.add(busBody);

// Roof Rack
const rackGeo = new THREE.BoxGeometry(2.8, 0.4, 6);
const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
const rack = new THREE.Mesh(rackGeo, rackMat);
rack.position.set(0, 4.1, -1);
busGroup.add(rack);

scene.add(busGroup);

// --- GAME LOGIC & STATE ---
let money = 3200;
let passengers = 5;
const maxPassengers = 32;
let doorOpen = false;
let fuel = 100;

const vehicle = {
  speed: 0,
  maxSpeed: 0.8,
  accel: 0.015,
  friction: 0.008,
  angle: 0
};

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') toggleDoor();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

document.getElementById('door-btn').addEventListener('click', toggleDoor);
document.getElementById('board-btn').addEventListener('click', boardPassengers);

function toggleDoor() {
  if (Math.abs(vehicle.speed) < 0.01) {
    doorOpen = !doorOpen;
    const badge = document.getElementById('door-txt');
    badge.innerText = doorOpen ? "OPEN" : "CLOSED";
    badge.className = `status-badge ${doorOpen ? 'open' : 'closed'}`;
  }
}

function boardPassengers() {
  if (!doorOpen) {
    alert("Stop the bus and open the doors first!");
    return;
  }
  if (passengers >= maxPassengers) {
    alert("Bus is fully loaded!");
    return;
  }
  let added = Math.floor(Math.random() * 6) + 2;
  passengers = Math.min(maxPassengers, passengers + added);
  money += added * 350;
  updateHUD();
}

function updateHUD() {
  document.getElementById('money-txt').innerText = money;
  document.getElementById('passengers-txt').innerText = passengers;
  document.getElementById('fuel-txt').innerText = Math.round(fuel);
  document.getElementById('speed-txt').innerText = (Math.abs(vehicle.speed) * 100).toFixed(1);
}

// --- RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);

  if (!doorOpen && fuel > 0) {
    if (keys['w'] || keys['arrowup']) vehicle.speed = Math.min(vehicle.maxSpeed, vehicle.speed + vehicle.accel);
    if (keys['s'] || keys['arrowdown']) vehicle.speed = Math.max(-vehicle.maxSpeed / 2, vehicle.speed - vehicle.accel);
    if (keys['a'] || keys['arrowleft']) vehicle.angle += 0.02 * (vehicle.speed / vehicle.maxSpeed);
    if (keys['d'] || keys['arrowright']) vehicle.angle -= 0.02 * (vehicle.speed / vehicle.maxSpeed);
  }

  // Apply friction & movement
  if (vehicle.speed > 0) vehicle.speed = Math.max(0, vehicle.speed - vehicle.friction);
  if (vehicle.speed < 0) vehicle.speed = Math.min(0, vehicle.speed + vehicle.friction);

  busGroup.rotation.y = vehicle.angle;
  busGroup.position.x += Math.sin(vehicle.angle) * vehicle.speed;
  busGroup.position.z += Math.cos(vehicle.angle) * vehicle.speed;

  if (Math.abs(vehicle.speed) > 0) {
    fuel = Math.max(0, fuel - 0.003);
    updateHUD();
  }

  // Camera tracking
  const cameraOffset = new THREE.Vector3(
    -Math.sin(vehicle.angle) * 18,
    8,
    -Math.cos(vehicle.angle) * 18
  );
  camera.position.x = busGroup.position.x + cameraOffset.x;
  camera.position.y = busGroup.position.y + cameraOffset.y;
  camera.position.z = busGroup.position.z + cameraOffset.z;
  camera.lookAt(busGroup.position.x, busGroup.position.y + 2, busGroup.position.z);

  if (renderer) renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
  if (container.clientWidth > 0 && container.clientHeight > 0) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(container.clientWidth, container.clientHeight);
  }
});
