import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let currentPTZStatus = { pan: 0, tilt: 0, zoom: 0 };

async function getPTZStatus() {
  // console.log("Requesting PTZ status");
  fetch("http://127.0.0.1:5000/ptz_status", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify({ pan: 0.0, tilt: 0.0, zoom: 10 }), // body data type must match "Content-Type" header
  })
    .then((response) => response.json())
    .then((data) => {
      currentPTZStatus.pan = data.ptz[0];
      currentPTZStatus.tilt = data.ptz[1];
      currentPTZStatus.zoom = data.ptz[2];

      // console.log(currentPTZStatus);
    });
}

async function sendPTZCommand(pan, tilt, zoom) {
  fetch("http://127.0.0.1:5000/ptz_command", {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify({ pan: pan, tilt: tilt, zoom: zoom }), // body data type must match "Content-Type" header
  })
    // .then((response) => response.json())
    .then((data) => console.log(data.status));
}

window.document.addEventListener(
  "keyup",
  (ev) => {
    if (ev.key == "f") {
      getPTZStatus();
    } else if (ev.key == "1") {
      sendPTZCommand(0, 0, 0);
    } else if (ev.key == "2") {
      sendPTZCommand(1, 1, 0);
    } else if (ev.key == "3") {
      sendPTZCommand(-1, -1, 0);
    }
  },
  false
);

let ptz;

class PTZCamera {
  constructor(aspect = 16 / 9) {
    this.cam = new THREE.PerspectiveCamera(20, aspect, 0.1, 10);
    this.cam.rotation.order = "YXZ";
    scene.add(this.cam);

    this.raycaster = new THREE.Raycaster();
    // this.target = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // create a helper for the camera
    this.helper = new THREE.CameraHelper(this.cam);
    scene.add(this.helper);

    this.camBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.2, 0.3),
      new THREE.MeshBasicMaterial({ color: "blue" })
    );
    const directionIndicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 10),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
    directionIndicator.position.set(0, 0, -5);
    this.camBody.add(directionIndicator);
    this.camBody.position.set(0, 0, 0.3 / 2);
    this.cam.add(this.camBody);
    // this.testObject.rotation.order = "YXZ";
    // scene.add(this.testObject);

    this.panAxis = new THREE.Vector3(0, 1, 0);
    this.tiltAxis = new THREE.Vector3(1, 0, 0);
  }

  update(panAngle = 0, tiltAngle = 0, zoomValue = 50) {
    // this.testObject.rotation.y = THREE.MathUtils.degToRad(panAngle);
    // this.testObject.rotation.x = THREE.MathUtils.degToRad(tiltAngle);
    console.log(tiltAngle);
    this.cam.rotation.y = THREE.MathUtils.degToRad(panAngle);
    this.cam.rotation.x = THREE.MathUtils.degToRad(tiltAngle);
    this.helper.update();
    // this.raycaster.setFromCamera({ x: 0, y: 0 }, this.cam);
    // let intersections = this.raycaster.intersectObject(camViewMesh);
    // console.log("intersections:", intersections);
    // this.target.copy(intersections[0].point);
    this.direction.set(0, 0, -1);
    this.direction.applyQuaternion(this.cam.quaternion);
    this.direction.normalize();
    // console.log("{}{}{}");
    // console.log(this.direction.normalize());
    // console.log(this.target.normalize());
    //
    // this.tiltHandler.setRotationFromAxisAngle(
    //   this.tiltAxis,
    //   THREE.MathUtils.degToRad(tiltAngle)
    // );
    // this.panHandler.setRotationFromAxisAngle(
    //   this.panAxis,
    //   THREE.MathUtils.degToRad(panAngle)
    // );
    // console.log(this.cam);
  }
}

let scene, camera, renderer, my3DObject, camViewMesh;

let raycaster, pointer;

function init() {
  // create a scene in which all other objects will exist
  scene = new THREE.Scene();

  // create a camera and position it in space
  let aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.z = 0.1; // place the camera in space
  // camera.position.y = 0.01;
  camera.lookAt(0, 0, 0);

  // the renderer will actually show the camera view within our <canvas>
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // add orbit controls
  let controls = new OrbitControls(camera, renderer.domElement);

  // create a sphere
  let tex = new THREE.TextureLoader().load("./360.jpg");
  let geometry = new THREE.SphereGeometry(10, 24, 24);
  let material = new THREE.MeshBasicMaterial({
    // color: "blue",
    map: tex,
    side: THREE.DoubleSide,
  });
  camViewMesh = new THREE.Mesh(geometry, material);

  pointer = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  document.addEventListener("pointermove", (ev) => {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  });

  document.addEventListener("click", () => {
    console.log("zap");
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(camViewMesh);

    for (let i = 0; i < intersects.length; i++) {
      console.log(intersects[0]);
      let m = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshBasicMaterial({ color: "yellow" })
      );
      scene.add(m);
      m.position.copy(intersects[i].point);
      console.log(m);

      // let dummy = new THREE.Mesh(
      //   new THREE.BoxGeometry(0.2, 0.2, 0.2),
      //   new THREE.MeshBasicMaterial()
      // );
      // dummy.rotation.order = "YXZ";
      // dummy.lookAt(intersects[i].point.x, 0, intersects[i].point.z);
      // console.log(dummy.rotation._y);

      // dummy.lookAt(intersects[i].point.x, intersects[i].point.y, 0);
      // console.log(dummy);

      // calculating alt-az difference
      // https://stackoverflow.com/questions/12229950/the-x-angle-between-two-3d-vectors
      const XZComponentOfCameraDirection = ptz.direction.clone();
      const XYComponentOfCameraDirection = ptz.direction.clone();
      XZComponentOfCameraDirection.set(
        XZComponentOfCameraDirection.x,
        0,
        XZComponentOfCameraDirection.z
      );

      XYComponentOfCameraDirection.set(
        XYComponentOfCameraDirection.x,
        XYComponentOfCameraDirection.y,
        0
      );

      const forward = new THREE.Vector3(0, 0, -1);
      console.log(
        "Camera Altitude: ",
        -1 *
          Math.sign(XZComponentOfCameraDirection.x) *
          THREE.MathUtils.radToDeg(
            forward.angleTo(XZComponentOfCameraDirection)
          )
      );

      const right = new THREE.Vector3(-1, 0, 0);
      console.log("XY: ", XYComponentOfCameraDirection);
      console.log("RIGHT:", right);
      console.log(
        "Camera Azimuth: ",
        THREE.MathUtils.radToDeg(right.angleTo(XYComponentOfCameraDirection))
      );

      // const B = intersects[i].point.normalize().clone();
      // console.log(ptz.direction);
      // let x = A.x - B.x;
      // let y = A.y - B.y;
      // let z = A.z - B.z;

      // let alt = THREE.MathUtils.radToDeg(
      //   Math.atan2(y, Math.sqrt(x * x + z * z))
      // );
      // let az = THREE.MathUtils.radToDeg(Math.atan2(-x, -z));

      // console.log("DELTA ALT/AZ: ", alt, "/", az);
    }
  });

  // let camViewGeo = new THREE.RingGeometry(1, 1.1, 4, 1);
  // let camViewMat = new THREE.MeshBasicMaterial({
  //   color: "red",
  //   side: THREE.DoubleSide,
  // });
  // camViewMesh = new THREE.Mesh(camViewGeo, camViewMat);
  // camViewMesh.rotateZ(Math.PI / 4);
  // let camParent = new THREE.Group();
  // camParent.add(camViewMesh);
  // // camParent.scale.set(1.6, 0.9, 1);
  // let scaleFactor = 4;
  // camParent.scale.set(1.6 * scaleFactor, 0.9 * scaleFactor, 1);
  // camParent.position.set(0, 0, 9);
  // scene.add(camParent);

  // const zoomValue = 50;
  // let ptzCam = new THREE.PerspectiveCamera(zoomValue, 16 / 9, 0.1, 8);
  // const panValue = THREE.MathUtils.degToRad(120);
  // const tiltValue = THREE.MathUtils.degToRad(40);
  // camera.rotateX(panValue);
  // camera.rotateY(tiltValue);
  // const helper = new THREE.CameraHelper(ptzCam);
  // console.log(helper);
  // console.log(helper.geometry.attributes.position.array[helper.pointMap.f1]);
  // scene.add(helper);

  // and add it to the scene
  scene.add(camViewMesh);

  ptz = new PTZCamera(16 / 9);

  loop();
}
let frameCount = 0;
function loop() {
  frameCount++;

  if (frameCount % 10 === 0) {
    getPTZStatus();
  }
  // add some movement
  // my3DObject.rotateY(0.01);
  ptz.update(
    currentPTZStatus.pan,
    currentPTZStatus.tilt,
    currentPTZStatus.zoom
  );

  // finally, take a picture of the scene and show it in the <canvas>
  renderer.render(scene, camera);

  window.requestAnimationFrame(loop); // pass the name of your loop function into this function
}

init();
