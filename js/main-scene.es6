
var THREE = require('three');
var $ = require('jquery');
var buzz = require('./lib/buzz');
var kt = require('kutility');
require('./lib/Mirror');
var TWEEN = require('tween.js');
var SheenMesh = require('./sheen-mesh');

import {createGround, createWall, makePhysicsMaterial} from './util/builder.es6';
import {SheenScene} from './sheen-scene.es6';


export class MainScene extends SheenScene {

  /// Init

  constructor(renderer, camera, scene, options) {
    super(renderer, camera, scene, options);

    this.onPhone = options.onPhone || false;
    this.roomLength = 300;
    this.halfLength = this.roomLength/2;
  }

  /// Overrides

  enter() {
    super.enter();

    // HERE YOU DO STUFF THAT STARTS IMMEDIATELY

    this.controlObject = this.controls.getObject();
    this.mirrors = [];

    if (!this.domMode) {
      // the heaven and the lights
      this.makeLights();
      this.makeSky();

      // the earth
      this.ground = createGround({
        length: this.roomLength,
        y: 0,
        material: this.newStructureMaterial(null, 0x101010)
      });
      this.ground.addTo(this.scene);

      this.walls = [
        createWall({direction: 'back', roomLength: this.roomLength, wallHeight: this.roomLength, material: this.newStructureMaterial(null, 0x101010)}),
        createWall({direction: 'left', roomLength: this.roomLength, wallHeight: this.roomLength, material: this.newStructureMaterial(null, 0x101010)}),
        createWall({direction: 'right', roomLength: this.roomLength, wallHeight: this.roomLength, material: this.newStructureMaterial(null, 0x101010)}),
        createWall({direction: 'front', roomLength: this.roomLength, wallHeight: this.roomLength, material: this.newStructureMaterial(null, 0xff0000)})
      ];
      this.walls.forEach((wall) => {
        wall.addTo(this.scene);
      });

      var man = new SheenMesh({
        modelName: 'js/models/bigman.json',
        scale: 0.1,
        position: new THREE.Vector3(0, -10, 10)
      });

      man.addTo(this.controlObject, () => {
        man.rotate(0, Math.PI * (11/10), 0);

        // var material = man.mesh.material.materials[0];
        //
        // var skindisp = THREE.ImageUtils.loadTexture( "/media/skindisp.png" );
        // skindisp.wrapS = skindisp.wrapT = THREE.RepeatWrapping;
        // skindisp.repeat.set(10, 10);
        // material.bumpMap = skindisp;
        // material.bumpScale = 0.5;
      });

      var mirrorCube = this.makeMirrorCube({
        faceOutward: false /* set to false for a cube where you can be inside of it, true for a cube you look at from outside */
      });
      this.scene.add(mirrorCube);
    }
  }

  doTimedWork() {
    super.doTimedWork();

    // HERE YOU WANNA DO STUFF THAT MIGHT START AFTER A DELAY
  }

  update(dt) {
    super.update(dt);

    // render (update) the mirrors
    if (this.mirrors) {
      for (var i = 0; i < this.mirrors.length; i++) {
        var mirror = this.mirrors[i];
        mirror.renderWithMirrors(this.mirrors);
      }
    }
  }

  // Interaction

  spacebarPressed() {

  }

  click() {

  }

  // Creation

  makeLights() {
    let container = new THREE.Object3D();
    this.scene.add(container);
    this.lightContainer = container;

    this.frontLight = makeDirectionalLight();
    this.frontLight.position.set(0, 125, 148);

    this.backLight = makeDirectionalLight();
    this.backLight.position.set(0, 125, -148);

    this.leftLight = makeDirectionalLight();
    this.leftLight.position.set(-148, 125, 0);

    this.rightLight = makeDirectionalLight();
    this.rightLight.position.set(148, 125, 0);

    this.spotLight = new THREE.SpotLight(0xffffff, 10.0, 220, 20, 20); // color, intensity, distance, angle, exponent, decay
    this.spotLight.position.set(0, 150, 0);
    this.spotLight.shadowCameraFov = 20;
    this.spotLight.shadowCameraNear = 1;
    setupShadow(this.spotLight);
    container.add(this.spotLight);

    this.lights = [this.frontLight, this.backLight, this.leftLight, this.rightLight, this.spotLight];

    function makeDirectionalLight() {
      var light = new THREE.DirectionalLight(0xffffff, 0.03);
      light.color.setHSL(0.1, 1, 0.95);

      container.add(light);
      return light;
    }

    function setupShadow(light) {
      light.castShadow = true;
      //light.shadowCameraFar = 500;
      light.shadowDarkness = 0.6;
      light.shadowMapWidth = light.shadowMapHeight = 2048;
    }

  }

  makeSky() {
    // lifted from mrdoob.github.io/three.js/examples/webgl_lights_hemisphere.html
    var vertexShader = document.getElementById('skyVertexShader').textContent;
    var fragmentShader = document.getElementById('skyFragmentShader').textContent;
    var uniforms = {
      topColor: 	 { type: "c", value: new THREE.Color().setHSL(0.6, 1, 0.6) },
      bottomColor: { type: "c", value: new THREE.Color(0xccccff) },
      offset:		 { type: "f", value: 33 },
      exponent:	 { type: "f", value: 0.75 }
    };

    this.renderer.setClearColor(uniforms.topColor.value, 1);

    if (this.scene.fog) {
      this.scene.fog.color.copy(uniforms.bottomColor.value);
    }

    var skyGeo = new THREE.SphereGeometry(480, 32, 24);
    var skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.BackSide
    });

    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
  }

  newStructureMaterial(map, color) {
    return new THREE.MeshPhongMaterial({
      color: color,
      side: THREE.DoubleSide,
      map: map ? map : null
    });
  }

  makeMirror() {
    var mirror = new THREE.Mirror(this.renderer, this.camera, {
      clipBias: 0.003,
      textureWidth: window.innerWidth,
      textureHeight: window.innerHeight
    });

    this.mirrors.push(mirror);

    return mirror;
  }

  makeMirrorCube(options) {
    var length = options.length || 50;
    var centerPosition = options.position || new THREE.Vector3(0, length/2, 0);
    var faceOutward = options.faceOutward !== undefined ? options.faceOutward : false;

    var frontMirror = this.makeMirror();
    var frontMirrorMesh = this.makeMirrorPlaneMesh(frontMirror, {
      position: new THREE.Vector3(centerPosition.x, centerPosition.y, centerPosition.z - length/2),
      length: length,
    });
    frontMirrorMesh.rotation.y = faceOutward ? Math.PI : 0;

    var backMirror = this.makeMirror();
    var backMirrorMesh = this.makeMirrorPlaneMesh(backMirror, {
      position: new THREE.Vector3(centerPosition.x, centerPosition.y, centerPosition.z + length/2),
      length: length,
    });
    backMirrorMesh.rotation.y = faceOutward ? 0 : Math.PI;

    var leftMirror = this.makeMirror();
    var leftMirrorMesh = this.makeMirrorPlaneMesh(leftMirror, {
      position: new THREE.Vector3(centerPosition.x - length/2, centerPosition.y, centerPosition.z),
      length: length,
    });
    leftMirrorMesh.rotation.y = faceOutward ? -Math.PI/2 : Math.PI/2;

    var rightMirror = this.makeMirror();
    var rightMirrorMesh = this.makeMirrorPlaneMesh(rightMirror, {
      position: new THREE.Vector3(centerPosition.x + length/2, centerPosition.y, centerPosition.z),
      length: length,
    });
    rightMirrorMesh.rotation.y = faceOutward ? Math.PI/2 : -Math.PI/2;

    var bottomMirror = this.makeMirror();
    var bottomMirrorMesh = this.makeMirrorPlaneMesh(bottomMirror, {
      position: new THREE.Vector3(centerPosition.x, centerPosition.y - length/2 + 1, centerPosition.z),
      length: length,
    });
    bottomMirrorMesh.rotation.x = faceOutward ? Math.PI/2 : -Math.PI/2;

    var topMirror = this.makeMirror();
    var topMirrorMesh = this.makeMirrorPlaneMesh(topMirror, {
      position: new THREE.Vector3(centerPosition.x, centerPosition.y + length/2, centerPosition.z),
      length: length,
    });
    topMirrorMesh.rotation.x = faceOutward ? -Math.PI/2 : Math.PI/2;

    var cubeContainer = new THREE.Object3D();
    cubeContainer.add(frontMirrorMesh);
    cubeContainer.add(backMirrorMesh);
    cubeContainer.add(leftMirrorMesh);
    cubeContainer.add(rightMirrorMesh);
    cubeContainer.add(bottomMirrorMesh);
    cubeContainer.add(topMirrorMesh);

    return cubeContainer;
  }

  makeMirrorPlaneMesh(mirror, options) {
    var length = options.length || 40;
    var height = options.height || length;
    var position = options.position || new THREE.Vector3(0, 5, 0);

    var geometry = new THREE.PlaneGeometry(length, height);
    var mesh = new THREE.Mesh(geometry, mirror.material);
    mesh.add(mirror);
    mesh.position.copy(position);

    return mesh;
  }

}
