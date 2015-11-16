
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
        position: new THREE.Vector3(0, 0, 10)
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

      var verticalMirror = new THREE.Mirror( this.renderer, this.camera, { clipBias: 0.003, textureWidth: window.innerWidth, textureHeight: window.innerHeight, color:0x889999 } );
			var verticalMirrorMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 60, 60 ), verticalMirror.material );
			verticalMirrorMesh.add( verticalMirror );
			verticalMirrorMesh.position.y = 0;
			verticalMirrorMesh.position.z = 0;
			this.scene.add(verticalMirrorMesh);

      this.verticalMirror = verticalMirror;
    }
  }

  doTimedWork() {
    super.doTimedWork();

    // HERE YOU WANNA DO STUFF THAT MIGHT START AFTER A DELAY
  }

  update(dt) {
    super.update(dt);

    // render (update) the mirrors
    if (this.verticalMirror) {
      this.verticalMirror.render();
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

}
