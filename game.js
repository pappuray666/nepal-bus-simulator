// --- 1. CORE ENGINE & CANVAS CHECK ---
const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Nepalese Sky
scene.fog = new THREE.FogExp2(0x87ceeb, 0.003); 

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1500);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
} catch (e) {
  console.error("WebGL Init Error:", e);
  alert("WebGL failed to start. Enable Hardware Acceleration in your browser settings.");
}

// --- 2. LIGHTING & ATMOSPHERE ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xfff5e6, 0.9);
sun.position.set(150, 200, 100);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

// --- 3. HIGHWAY NETWORK & ROUTE DATA ---
// Connected loop: Kathmandu -> Pokhara -> Hetauda -> Janakpur -> Malangwa -> Kathmandu
const ROUTE_DATA = {
  "Pokhara": { name: "Prithvi Highway", diff: "Dangerous Hairpins", dist: 200, curveFreq: 0.04, mountainH: 45, env: "mountain" },
  "Hetauda": { name: "Tribhuvan Rajpath", diff: "Steep Elevation & Tunnels", dist: 85, curveFreq: 0.06, mountainH: 60, env: "tunnel" },
  "Janakpur": { name: "Mahendra Highway", diff: "Flat Terai Speed Track", dist: 135, curveFreq: 0.01, mountainH: 10, env: "plains" },
  "Malangwa": { name: "Terai Feeder Road", diff: "Narrow Village Pass", dist: 60, curveFreq: 0.02, mountainH: 5, env: "village" },
  "Kathmandu": { name: "Capital Valley Loop", diff: "Heavy City Traffic", dist: 120, curveFreq: 0.03, mountainH: 30, env: "city" }
};

let currentCity = "Kathmandu";
let destination = "Pokhara";

// --- 4. PROCEDURAL WORLD GENERATOR ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);

function generateNepalHighway(config) {
  // Clear existing scene elements
  while(worldGroup.children.length > 0){ 
    const obj = worldGroup.children[0];
    worldGroup.remove(obj); 
  }

  // A. Curved Asphalt Road Path
  const points = [];
  for (let i = 0; i <= 200; i++) {
    let z = i * 6 - 600;
    let x = Math.sin(i * config.curveFreq) * 35; 
    points.push(new THREE.Vector3(x, 0.1, z));
  }
  const roadCurve = new THREE.CatmullRomCurve3(points);
  const roadGeo = new THREE.TubeGeometry(roadCurve, 200, 6, 8, false);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.scale.y = 0.02; // Flatten tube into highway
  roadMesh.receiveShadow = true;
  worldGroup.add(roadMesh);

  // B. Dynamic Mountain & Cliff Terrain
  const terrainGeo = new THREE.PlaneGeometry(1200, 1200, 40, 40);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    let distFromCenter = Math.abs(x);

    if (distFromCenter > 25) {
      // Cliff elevation
      let h = Math.sin(x * 0.01) * config.mountainH + Math.cos(z * 0.01) * config.mountainH;
      pos.setY(i, Math.max(-10, h));
    }
  }
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({ color: config.env === "plains" ? 0x4a7c59 : 0x2d4a27, roughness: 0.9 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.z = -100;
  terrain.receiveShadow = true;
  worldGroup.add(terrain);

  // C. Mountain Tunnels (If Route Has Elevated Mountain Passes)
  if (config.env === "tunnel" || config.env === "mountain") {
    createTunnel(0, 0, -200);
    createTunnel(0, 0, 200);
  }

  // D. Houses & Village Settlements
  for (let i = -400; i < 400; i += 80) {
    let side = (i % 160 === 0) ? 1 : -1;
    createNepaleseHouse((side * 28), 0, i);
  }

  // E. Bus Park / Terminal Stops
  createBusTerminal(12, 0, -500, `${currentCity} Terminal`);
  createBusTerminal(12, 0, 500, `${destination} Terminal`);
}

function createTunnel(x, y, z) {
  const tunnelGroup = new THREE.Group();
  const archGeo = new THREE.CylinderGeometry(10, 10, 30, 16, 1, true, 0, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.rotation.x = Math.PI / 2;
  arch.position.set(x, y + 2, z);
  tunnelGroup.add(arch);
  worldGroup.add(tunnelGroup);
}

function createNepaleseHouse(x, y, z) {
  const house = new THREE.Group();
  // Walls
  const wallGeo = new THREE.BoxGeometry(6, 4, 6);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd4a373 }); // Brick/Mud tone
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = 2;
  house.add(walls);

  // Tin Roof
  const roofGeo = new THREE.ConeGeometry(5, 2.5, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x9a031e }); // Red tin roof
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 5.25;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  house.position.set(x, y, z);
  worldGroup.add(house);
}

function createBusTerminal(x, y, z, label) {
  const terminal = new THREE.Group();
  const shelterGeo = new THREE.BoxGeometry(10, 4, 5);
  const shelterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
  const shelter = new THREE.Mesh(shelterGeo, shelterMat);
  shelter.position.y = 2;
  terminal.add(shelter);

  terminal.position.set(x, y, z);
  worldGroup.add(terminal);
}

// --- 5. 3D VEHICLE CONTROLLER ---
const busGroup = new THREE.Group();

// Bus Body Shell
const bodyGeo = new THREE.BoxGeometry(3.4, 3.6, 10.5);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2 });
const busBody = new THREE.Mesh(bodyGeo, bodyMat);
busBody.position.y = 2.3;
busBody.castShadow = true;
busGroup.add(busBody);

// Windows
const winGeo = new THREE.BoxGeometry(3.42, 1.2, 8);
const winMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
const windows = new THREE.Mesh(winGeo, winMat);
windows.position.y = 2.8;
busGroup.add(windows);

scene.add(busGroup);

// --- 6. GAME STATE & MECHANICS ---
let money = 3200;
let passengers = 5;
const maxPassengers = 32;
let doorOpen = false;
let fuel = 100;

const vehicle = {
  speed: 0,
  maxSpeed: 0.9,
  accel: 0.018,
  friction: 0.009,
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
    alert("Stop the bus completely and open the doors!");
    return;
  }
  let added = Math.floor(Math.random() * 8) + 3;
  passengers = Math.min(maxPassengers, passengers + added);
  money += added * 350;
  updateHUD();
}

function updateHUD() {
  document.getElementById('money-txt').innerText = money;
  document.getElementById('passengers-txt').innerText = passengers;
  document.getElementById('fuel-txt').innerText = Math.round(fuel);
  document.getElementById('speed-txt').innerText = (Math.abs(vehicle.speed) * 90).toFixed(0);
  document.getElementById('city-txt').innerText = `${currentCity} Terminal`;
}

// --- 7. ROUTE LOOPING SYSTEM ---
const routeSelect = document.getElementById('route-select');
routeSelect.addEventListener('change', (e) => {
  destination = e.target.value;
  startRoute();
});

function startRoute() {
  let routeConfig = ROUTE_DATA[destination];
  document.getElementById('route-txt').innerText = `${currentCity} ➔ ${destination} (${routeConfig.name})`;
  
  // Re-generate environment for new destination
  generateNepalHighway(routeConfig);
  
  // Reset vehicle position to highway start
  busGroup.position.set(0, 0, -520);
  vehicle.speed = 0;
  vehicle.angle = 0;
}

// Initialize First Route
generateNepalHighway(ROUTE_DATA["Pokhara"]);
busGroup.position.set(0, 0, -520);

// --- 8. ANIMATION ENGINE LOOP ---
function animate() {
  requestAnimationFrame(animate);

  // Driving Controls
  if (!doorOpen && fuel > 0) {
    if (keys['w'] || keys['arrowup']) vehicle.speed = Math.min(vehicle.maxSpeed, vehicle.speed + vehicle.accel);
    if (keys['s'] || keys['arrowdown']) vehicle.speed = Math.max(-vehicle.maxSpeed / 2, vehicle.speed - vehicle.accel);
    if (keys['a'] || keys['arrowleft']) vehicle.angle += 0.022 * (vehicle.speed / vehicle.maxSpeed);
    if (keys['d'] || keys['arrowright']) vehicle.angle -= 0.022 * (vehicle.speed / vehicle.maxSpeed);
  }

  // Apply Drag & Translation
  if (vehicle.speed > 0) vehicle.speed = Math.max(0, vehicle.speed - vehicle.friction);
  if (vehicle.speed < 0) vehicle.speed = Math.min(0, vehicle.speed + vehicle.friction);

  busGroup.rotation.y = vehicle.angle;
  busGroup.position.x += Math.sin(vehicle.angle) * vehicle.speed;
  busGroup.position.z += Math.cos(vehicle.angle) * vehicle.speed;

  if (Math.abs(vehicle.speed) > 0) {
    fuel = Math.max(0, fuel - 0.002);
    updateHUD();
  }

  // Destination Check & Route Loop Logic
  if (busGroup.position.z > 510) {
    alert(`Arrived at ${destination}! Complete your passenger drop-offs.`);
    currentCity = destination;
    
    // Auto-advance route loop
    const cities = Object.keys(ROUTE_DATA);
    let nextIndex = (cities.indexOf(currentCity) + 1) % cities.length;
    destination = cities[nextIndex];
    
    routeSelect.value = destination;
    startRoute();
  }

  // Smooth Chase Camera
  const camOffset = new THREE.Vector3(
    -Math.sin(vehicle.angle) * 16,
    7,
    -Math.cos(vehicle.angle) * 16
  );
  camera.position.x = busGroup.position.x + camOffset.x;
  camera.position.y = busGroup.position.y + camOffset.y;
  camera.position.z = busGroup.position.z + camOffset.z;
  camera.lookAt(busGroup.position.x, busGroup.position.y + 2, busGroup.position.z);

  if (renderer) renderer.render(scene, camera);
}

animate();

// Window Resize Safety
window.addEventListener('resize', () => {
  if (container.clientWidth > 0 && container.clientHeight > 0) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(container.clientWidth, container.clientHeight);
  }
});
