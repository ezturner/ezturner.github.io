"use strict";

// Inspired from: http://codepen.io/akm2/pen/rHIsa

// GUI Library : https://code.google.com/p/dat-gui/

// Constants
var WALL_BOUNCE_SPEED_LOSS = 0.75,
    GRAVITY_COLOR =  "#4227d8",
    PARTICLE_COLOR = "#ffffff",
    REPULSOR_COLOR = "#801515",
    EMITTER_COLOR = "#ffff00",
    HEATER_COLOR = "#ff0000";

// Variable declarations.

var canvas = document.querySelector('canvas'),
    context = canvas.getContext('2d'),
    particles = [],
    mouse = new Vector(),
    numParticles = 25,  
    particleSize = 2,  
    gravityMass = 10,
    gravityForce = 1,
    repulsorForce = 1,
    gravitySelected,
    gravityMousedOver = false, 
    realPhysics = false,
    gravities = [],
    display,
    gui,
    bufferCtx,
    bufferCvs,
    gravitiesInteract = false,
    mouse,
    createType = "Gravity",
    framesSinceLastClick = 0,
    emitters = [],
    lastClicked,
    maxParticles = 100,
    emitterSelected,
    emitterGUI; 

bufferCvs = document.createElement('canvas');
bufferCtx = bufferCvs.getContext('2d');

// Utility functions

/**
 * from : http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDistanceVector(v1, v2){ 
  return new Vector(v2.x - v1.x , v2.y - v1.y);
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a hex number for color generation
  */
function getColorHex(num){
  var colorNum = (255 - Math.round(num)).toString(16);
  if(colorNum.length < 2)
    colorNum = "0" + colorNum;
  return colorNum;
}
/**
 * Here begins the object declarations.
 */

// Vector object.
function Vector(x , y){
  this.x = x;
  this.y = y
}

// Adds two vectors together.
Vector.prototype.add = function(v){
  this.x += v.x;
  this.y += v.y;
  return this; 
};

Vector.prototype.sub = function(v){
  this.x - v.x; 
  this.y - v.y;
  return this;
};

Vector.prototype.scaleTo = function(num){
  var angle = this.getAngle();
  this.x = num * Math.cos(angle);
  this.y = num * Math.sin(angle);
};

// Return the magnitude of this vector with pythagorean theorem
Vector.prototype.getMagnitude = function(){
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.getAngle = function(){
  return Math.atan2(this.y,this.x);
}

// The particle object. 
class Particle{
  constructor(position, mass, radius){
    this.position = position;
    this.velocity = new Vector(0,0);
    this.acceleration = new Vector(0,0); 
    this.mass = mass; 
    this.radius = radius;
    this.temp = 0;
    this.color = PARTICLE_COLOR;
  }
  
  bounce() {
    // These two if statements handle bouncing off the walls.
    if(this.position.x >= canvas.width && this.velocity.x > 0){
      this.velocity.x = this.velocity.x * -1 * WALL_BOUNCE_SPEED_LOSS;
      this.velocity.y = this.velocity.y * WALL_BOUNCE_SPEED_LOSS;
    } else if(this.position.x <= 0 && this.velocity.x < 0){
      this.velocity.x = this.velocity.x * -1 * WALL_BOUNCE_SPEED_LOSS;
      this.velocity.y = this.velocity.y * WALL_BOUNCE_SPEED_LOSS;
    }
    
    if(this.position.y >= canvas.height &&  this.velocity.y > 0){
      this.velocity.y = this.velocity.y * -0.75;
      this.velocity.x = this.velocity.x * 0.75;
    } else if(this.position.y <= 0 && this.velocity.y < 0){
      this.velocity.y = this.velocity.y * -0.75;
      this.velocity.x = this.velocity.x * 0.75; 
    }
  }
  
  move(){
    // basic physics
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    
    this.bounce();
  }
   
  draw(context){
    this.calculateTemp();
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0 , Math.PI * 2);
    context.closePath();
    context.fill(); 
  }
  
  calculateTemp(){
    if(this.mass === 1){
      if(this.temp > 1){
        console.log(this.temp);
        var color = "#ff"
        
        if(this.temp < 129){
          color += "ff";
          color += getColorHex(this.temp * 2);
        } else {
          color += getColorHex((this.temp - 128) * 2); 
          color += "00";
        }
        
        this.color = color;
        //console.log("Color: " + this.color + " , Temp: " + this.temp);
        this.temp-= 1.0 / 3.0;
      } else {
        this.temp = 0;
        this.color = PARTICLE_COLOR;
      }
      
    }
  }
  
}

class Gravity extends Particle{
  constructor(position, mass){
    super(position, mass, 0);
    this.color = GRAVITY_COLOR;
    this.calculateRadius();
    this.isMousedOver = false;
  }
  
  checkMouse(e){
    var distance = getDistanceVector(this.position, new Vector(e.clientX , e.clientY));
    if(distance.getMagnitude() <= this.radius + 5){
      this.isMousedOver = true;
      return true; 
    } else {
      this.isMousedOver = false;
      return false;
    }
  }
  
  getForce(particle){ 
    
    if(particle.color == HEATER_COLOR || particle.color == EMITTER_COLOR)
      return new Vector(0, 0);
    
    var distance = getDistanceVector(particle.position , this.position);
    
    var dist = distance.getMagnitude();
    
    if(distance.getMagnitude() <= 5){
      dist = 10;
    }
    
    var forceMagnitude = ((particle.mass * this.mass) / (dist * particle.mass));
    
    if(this.color == REPULSOR_COLOR){
      forceMagnitude = forceMagnitude * -1 * repulsorForce;
    } else {
      forceMagnitude = forceMagnitude * gravityForce;
    }
    
    var angle = distance.getAngle();
    
    if(realPhysics)
      forceMagnitude = forceMagnitude / dist * 10;
    
    return new Vector(Math.cos(angle) * forceMagnitude, Math.sin(angle) * forceMagnitude);
  }
  
  checkForMerge(){
    
    if(this.color == EMITTER_COLOR)
      return;
  
    for(var i = 0; i < gravities.length; i++){
      if(this == gravities[i] || gravities[i].color == EMITTER_COLOR)
        continue;
      
      // If this is a heater and the other is not, then let's continue
      if(this.color != gravities[i].color  && (this.color == HEATER_COLOR || gravities[i].color == HEATER_COLOR))
        continue;
      
      
      var distance = getDistanceVector(this.position, gravities[i].position).getMagnitude();
      
      
      if(distance < this.radius + gravities[i].radius + 4 && gravities[i] != gravitySelected){
        
       // Check if that which we have collided with is a repulsor.
       // If so, then explode.
        
        if(this.color != gravities[i].color){
          
          // If their mass is the same, then just explode
          
          
          if(this.mass == gravities[i].mass){
            var totalMass =this.mass + gravities[i].mass;
            for(var particleNum = 0; particleNum < totalMass; particleNum++){
              var particle = new Particle(new Vector(this.position.x , this.position.y) ,1 , particleSize);
              particle.velocity = new Vector(getRandomArbitrary(-1 , 1) , getRandomArbitrary(-1 , 1));
              particle.velocity.scaleTo(10);
              particle.temp = 255;
              particles.push(particle); 
              display.add(particle, 1); 
            }
            
            gravities[i].delete();
            
            this.delete();
          } else {
            // Otherwise, explode and then leave the bigger one with its remaining mass going real fast.
            
            
            var particle = this.mass > gravities[i].mass ? this : gravities[i];
            var notParticle = this.mass < gravities[i].mass ? this : gravities[i];
            
            particle.mass -= notParticle.mass;
            particle.calculateRadius();
            
            for(var particleNum = 0; particleNum < notParticle.mass; particleNum++){
              var particleLight = new Particle(new Vector(this.position.x , this.position.y) ,1 , particleSize);
              particleLight.velocity = new Vector(getRandomArbitrary(-1 , 1) , getRandomArbitrary(-1 , 1));
              particleLight.velocity.scaleTo(10);
              particleLight.temp = 255;
              particles.push(particleLight); 
              display.add(particleLight, 1); 
            }
            
            
            // TODO : have the it fly away from the explosion.
            particle.velocity = new Vector(getRandomArbitrary(-1 , 1) , getRandomArbitrary(-1 , 1));
            particle.velocity.scaleTo(8);
            
            notParticle.delete();
            
          } 
        } else {
          
          // Merge velocities.
          this.velocity.scaleTo(this.velocity.getMagnitude() * this.mass);
          gravities[i].velocity.scaleTo(gravities[i].velocity.getMagnitude() * gravities[i].mass);
          this.velocity.add(gravities[i].velocity);
          this.mass += gravities[i].mass;
          
          this.velocity.scaleTo(this.velocity.getMagnitude() / this.mass);
          
          this.calculateRadius();
          
          gravities[i].delete();
          
          
          if(Math.abs(this.mass) >= 100){
            for(var i = 0; i < Math.abs(this.mass) / 2; i++){
              var particle = new Particle(new Vector(this.position.x , this.position.y) ,1 , particleSize);
              particle.velocity = new Vector(getRandomArbitrary(-4 , 4) , getRandomArbitrary(-4 , 4));
              particles.push(particle);
              display.add(particle, 1);
            } 
            this.delete();
        }
        }
        return;
        
      }
    }
  }
  
  calculateRadius(){ 
    var tempMass = this.mass;
    
    if(tempMass < 0)
      tempMass = tempMass * -1;
    
    this.radius = Math.sqrt(tempMass) / Math.PI * 15;
  }
  
  delete(){
    gravities.splice(gravities.indexOf(this) , 1);
    display.remove(this, 0);
    if(lastClicked == this)
      lastClicked = null;
  }
}

class Repulsor extends Gravity{
  constructor(position, mass, radius){
    super(position, mass, radius);
    this.mass = mass;
    this.color = REPULSOR_COLOR;
  }
}

class Emitter extends Gravity{
  constructor(position, mass){
    super(position, mass);
    this.color = EMITTER_COLOR;
    this.angle = getRandomInt(0 , 360);
    this.range = 0;
    this.speed = 10;
    this.emitterSpeed = 5;
    this.particleTemp = 0;
  }
  
  calculateRadius(){
    this.radius = 15.01;
  }
  
  delete(){
    gravities.splice(gravities.indexOf(this) , 1);
    display.remove(this, 0);
    if(lastClicked == this)
      lastClicked = null;
    emitters.splice(emitters.indexOf(this) , 1);
  }
  
  emitParticles(){
    if(getRandomArbitrary(0 , 1) > (1 - (this.emitterSpeed / 25))){
      var particle = new Particle(new Vector(this.position.x , this.position.y) , 1, particleSize);
      var angle = this.getAngle();
      particle.velocity = new Vector(Math.cos(angle) * this.getParticleSpeed() , Math.sin(angle) * this.getParticleSpeed());
      particles.push(particle);
      display.add(particle, 1);
    }
  }
  
  getParticleSpeed(){
    return this.speed;
  }
  
  getAngle(){
    var angle = this.angle * 0.0174533;
    var range = this.range * 0.0174533;
    return getRandomArbitrary(angle - (range / 2) , angle + (range / 2));
  }
}

class Heater extends Gravity{
  constructor(position, mass){
    super(position, mass);
    this.color = HEATER_COLOR;
  }
  
  getForce(particle){ 
    if(particle.mass != 1)
      return new Vector(0 , 0);
    
    var distance = getDistanceVector(particle.position , this.position);
    
    var dist = distance.getMagnitude() / 2;
    
    if(distance.getMagnitude() <= 5){
      dist = 10;
    }
    
    var forceMagnitude = ((particle.mass * this.mass) / (dist * particle.mass));
    
    particle.temp += forceMagnitude * 7.5;
    
    if(particle.temp > 255)
      particle.temp = 255;
    
    return new Vector(0 , 0);
  } 
  
}

function Display(canvas, context){
  this.canvas = canvas; 
  this.context = context;
  this.levels = [];
  this.levels.push([]);
}

Display.prototype.draw = function(){
  for(var level = 0; level < this.levels.length; level++){
    for(var i = 0; i < this.levels[level].length; i++){
      this.levels[level][i].draw(context);
    }
  }
};

/**
 * Adds an object to be displayed (drawn)
 * level - the z level to display this object on
 * object - the object to be displayed.
 */
Display.prototype.add = function(object, level){
  if(this.levels.length - 1 < level){ 
    this.levels.push([]);
  }
  
  this.levels[level].push(object);
};

Display.prototype.remove = function(object, level){
  this.levels[level].splice(this.levels[level].indexOf(object) , 1);
}; 


function selectEmitter(emitter){
  if(emitter === emitterSelected)
    return;
  
  if(emitterSelected)
    deselectEmitter(emitter);
  
  emitterSelected = emitter;
  emitterGUI = new dat.GUI({autoPlace : false});
  emitterGUI.add(emitterSelected , "angle" , 0 , 360).name("Direction °");
  emitterGUI.add(emitterSelected , "speed" , 0 , 20).name("Particle speed");
  emitterGUI.add(emitterSelected , "range" , 0 , 90).name("Spread °");
  emitterGUI.add(emitterSelected , "emitterSpeed" , 0 , 10).name("Emitter Rate");
  emitterGUI.add(emitterSelected , "particleTemp" , 0 , 255).name("Temperature");
  var customContainer = document.getElementById('emitterGUI');
  customContainer.appendChild(emitterGUI.domElement);
};

function deselectEmitter(){
  if(!emitterSelected) 
    return;
  
  emitterSelected = null;
  var customContainer = document.getElementById('emitterGUI');
  customContainer.removeChild(emitterGUI.domElement);
  emitterGUI = null;
};


canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

bufferCvs.width  = window.innerWidth; 
bufferCvs.height = window.innerHeight; 

display = new Display(canvas, context);

function createGravity(e){
  var obj;
  if(createType === "Gravity"){ 
    obj = new Gravity(new Vector(e.clientX , e.clientY) , gravityMass);
  } else if(createType === "Repulsor"){ 
    obj = new Repulsor(new Vector(e.clientX , e.clientY) , gravityMass);
  } else if(createType === "Emitter"){
    obj = new Emitter(new Vector(e.clientX, e.clientY) , 0);
    selectEmitter(obj);
    emitters.push(obj);
  } else if(createType === "Heater"){
    obj = new Heater(new Vector(e.clientX, e.clientY) , gravityMass);
    console.log(obj.color);
  }
  gravities.push(obj);
  display.add(obj, 0);
   
  gravitySelected = obj;
}
 
function mouseDown(e){
  
  //Check if we're clicking on a gravity point
  for(var i = 0; i < gravities.length; i++){
    if(gravities[i].checkMouse(e)){
      
      if(lastClicked === gravities[i] && framesSinceLastClick < 15){
        console.log("Deleting");
        gravities[i].delete();
        return;
      }
      
      lastClicked = gravities[i];
      gravitySelected = gravities[i];
      
      if(gravitySelected.color === EMITTER_COLOR){
        selectEmitter(gravitySelected);
      } else {
        deselectEmitter();
      }
         
         
      framesSinceLastClick = 0;
      return;
    } 
  }
  deselectEmitter()
  //If not, then create a gravity point
  createGravity(e);
  
  framesSinceLastClick = 0;
}

function resize(e){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  bufferCvs.width  = window.innerWidth;
  bufferCvs.height = window.innerHeight;
  
}

var xMovements = [],
    yMovements = [];

function mouseMove(e){ 
  var isMousedOver = false;
  for(var i = 0; i < gravities.length; i++){
    var bool= gravities[i].checkMouse(e);
    if(!isMousedOver && bool)
      isMousedOver = bool;
  }
  
  mouse = e;
  
  if(isMousedOver){
    canvas.style.cursor = "pointer";
  } else { 
    canvas.style.cursor = "auto";
  }
}

function mouseUp(e){
  if(gravitySelected){
    var xMovement = 0,
        yMovement = 0;
    
    for(var i = 0; i < xMovements.length; i++){
      xMovement += xMovements[i];
      yMovement += yMovements[i];
    }
    if(xMovements.length > 0){
      xMovement = xMovement / xMovements.length;
      yMovement = yMovement / yMovements.length;
      
      var threshold = 0.2;
      if(Math.abs(xMovement) < threshold && Math.abs(yMovement) < threshold){
        xMovement = 0;
        yMovement = 0;
      }
      
    }
    
    xMovements = [];
    yMovements = [];
    
    gravitySelected.velocity.x = xMovement;
    gravitySelected.velocity.y = yMovement;
  }
    
  gravitySelected = false;
  gravitySelected = null;
}

canvas.addEventListener('mousemove', mouseMove, false);
canvas.addEventListener('mouseup' , mouseUp , false);
canvas.addEventListener('mousedown', mouseDown, false);
window.addEventListener('resize', resize, false);

function addParticles(num){
  for(var i = 0; i < num; i++){
    var particle = new Particle(new Vector(getRandomInt(0, canvas.width) , getRandomInt(0, canvas.height)) ,1 , particleSize);
    particle.velocity = new Vector(getRandomArbitrary(-0.5 , 0.5) , getRandomArbitrary(-0.5 , 0.5));
    particles.push(particle);
    display.add(particle, 1);
  }
};


function resetAcceleration(particle){
  particle.acceleration = new Vector(0,0);
}

// Retrieves the forces exerted upon the given particle and adds them to the acceleration
function calculateGravity(particle){
  for(var i = 0; i < gravities.length; i++){
    
    if(gravities[i] == particle)
      continue;
    particle.acceleration.add(gravities[i].getForce(particle));
  }
};

var gui = new dat.GUI({width : 300});

gui.add(this, 'realPhysics').name('Realistic Physics');

gui.add(this, 'createType', [ 'Gravity', 'Repulsor', 'Emitter' , 'Heater' ] ).name("Type to create");

gui.add(this, 'gravitiesInteract').name("Gravities Interact");

gui.add(this , 'maxParticles', 50, 1000).name("Maximum Particles");

this.addParticles(numParticles);

var loop = function() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(resetAcceleration);
  gravities.forEach(resetAcceleration);
  display.draw();
  particles.forEach(calculateGravity);
  
  if(gravitiesInteract){
    gravities.forEach(calculateGravity);
  }
  
  framesSinceLastClick++;
  
  var length = gravities.length;
  for(var i = 0; i < gravities.length; i++){
    gravities[i].checkForMerge();
    
    if(gravities.length == 0)
      break;
    
    while(length > gravities.length){
      if(i >= 1)
        i--;
      
      //console.log("Length was " + length + " but now is : " + gravities.length + " changed, adjusting i: " + i);
      length--; 
    }
  } 
  
  for(var i = 0; i < emitters.length; i++){
    emitters[i].emitParticles();
  }
  
  for(var i = 0; i < particles.length; i++){ 
    particles[i].move();
  }
  
  if(gravitySelected){
    xMovements.push(mouse.clientX - gravitySelected.position.x);
    yMovements.push(mouse.clientY - gravitySelected.position.y);
    
    if(xMovements.length > 10){
      xMovements.splice(0 , 1);
      yMovements.splice(0 , 1);
    } 
    
    gravitySelected.position.x = mouse.clientX;
    gravitySelected.position.y = mouse.clientY;
    gravitySelected.velocity = new Vector(0,0);
    gravitySelected.acceleration = new Vector(0, 0);
  }
  
  for(var i = 0; i < gravities.length; i++){
    gravities[i].move();
  }
  
  while(particles.length > maxParticles){
    var particle = particles[0];
    particles.splice(0, 1);
    display.remove(particle, 1);
  }
  
  //context.drawImage(bufferCvs, 0 , 0);
  
  //bufferCvs.clear();

  requestAnimationFrame(loop);
};


this.loop();