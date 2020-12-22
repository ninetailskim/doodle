/* global describe Okb doodleRig doodleMeta*/

var WIDTH = 256;
var HEIGHT = 256;

var mouseX = 0;
var mouseY = 0;
var mouseIsDown = false;

var STROKES = [];
var FAT = 15;
var BLEED = 5;

var NODES = [];
var SKIN = []

var SHOW_NODES = false;
var SHOW_SEL_NODE = false;
var AUTO_ANIM = true;
var SEL_NODE = 0;


function new_canvas(id,title){
  
  var c = document.createElement("canvas");
  c.id = id;
  c.width = WIDTH;
  c.height = HEIGHT;
  
  if (title == ""){
    c.style.display="none";
    document.body.appendChild(c);
  }else{
    var d = document.createElement("div"); d.classList.add("canvas-wrap");
    var dt = document.createElement("div"); dt.classList.add("canvas-title");
    d.style.display = "inline-block";
    dt.innerHTML = title;
    d.appendChild(dt);
    d.appendChild(c);
    document.body.appendChild(d);
  }
  return c;
}

var title = document.createElement("div");
title.id = "title";
title.innerHTML = "Loading...";
document.body.appendChild(title);
var intro = document.createElement("div");
intro.innerHTML = "<i>Automatically rig and animate any doodle!</i>";
document.body.appendChild(intro);

var canvas = new_canvas("canvas","v Doodle Anything Here");
var context = canvas.getContext("2d");

var blob_canvas = new_canvas("blob_canvas","");
var blob_context = blob_canvas.getContext("2d");

var skel_canvas = new_canvas("skel_canvas","> Skeletonization");
var skel_context = skel_canvas.getContext("2d");

var dbg_canvas = new_canvas("dbg_canvas","> Inferred Rig");
var dbg_context = dbg_canvas.getContext("2d");

var anim_canvas = new_canvas("anim_canvas","> Inferred Animation");
var anim_context = anim_canvas.getContext("2d");


var keybindings = {
  "Backspace": {hint:"clear drawing",down:function(event){ STROKES = [];SEL_NODE = 0;}},
  " ": {hint:"toggle rig visibility",down:function(event){SHOW_NODES = !SHOW_NODES}},
  "Enter": {hint:"toggle animation",down:function(event){ AUTO_ANIM = !AUTO_ANIM; }},
  "Tab": {hint:"select bones",down:function(event){ SEL_NODE = (SEL_NODE + 1) % NODES.length; SHOW_SEL_NODE = true; setTimeout(function(){SHOW_SEL_NODE=false},500) }},
  "ArrowLeft": {hint:"rotate bone anticlockwise",down:function(event){ if (!NODES.length){return}; NODES[SEL_NODE%NODES.length].th -= 0.1;doodleMeta.forwardKinematicsNodes(NODES);}},
  "ArrowRight": {hint:"rotate bone clockwise",down:function(event){ if (!NODES.length){return};NODES[SEL_NODE%NODES.length].th += 0.1;doodleMeta.forwardKinematicsNodes(NODES);}},
  "ArrowUp": {hint:"elongate bone",down:function(event){ if (!NODES.length){return};NODES[SEL_NODE%NODES.length].r += 4;doodleMeta.forwardKinematicsNodes(NODES);}},
  "ArrowDown": {hint:"shorten bone",down:function(event){ if (!NODES.length){return};NODES[SEL_NODE%NODES.length].r -= 4;doodleMeta.forwardKinematicsNodes(NODES);}},
}

var hint_div = document.createElement("div");
hint_div.id = "hint";
for (var k in keybindings){
  var slasha = "</a>"
  var br = "<br>"
  hint_div.innerHTML += `[<a href="#" onclick="keybindings['${k}'].down();event.preventDefault();">${k==" "?"Space":k}${slasha}] to ${keybindings[k].hint}${br}`;
}
document.body.appendChild(hint_div);


var footer = document.createElement("div");
footer.id = "footer";
footer.innerHTML = `<i><a href="https://lingdong.works">Lingdong Huang</a> 2019</i>`;
document.body.appendChild(footer);
  
function onmousemove(x,y){
  var rect = canvas.getBoundingClientRect();
  mouseX = x - rect.left;
  mouseY = y - rect.top;
  if (mouseX < 0 || mouseX > WIDTH || mouseY < 0 || mouseY > HEIGHT){
    mouseIsDown = false;
  }
  if (mouseIsDown){
    STROKES[STROKES.length-1].push([mouseX,mouseY]);
  }
}
function onmousedown(){
  mouseIsDown = true;
  STROKES.push([])
}
function onmouseup(){
  mouseIsDown = false;
  SEL_NODE = 0;
  process();
}
  
canvas.onmousemove = function(event){onmousemove(event.clientX,event.clientY);event.preventDefault();}
canvas.onmousedown = function(event){onmousedown();event.preventDefault();}
canvas.onmouseup = function(event){onmouseup();event.preventDefault();}
canvas.ontouchstart =function(event){onmousedown();event.preventDefault();}
canvas.ontouchmove = function(event){onmousemove(event.touches[0].pageX,event.touches[0].pageY);event.preventDefault();}
canvas.ontouchend =  function(event){onmouseup();event.preventDefault();}

  
window.addEventListener("keydown", function(event){
  console.log(event);
  if (event.key in keybindings){
    keybindings[event.key].down(event);
  }
  event.preventDefault()
})

function draw_strokes(ctx){
  for (var i = 0; i < STROKES.length; i++){
    ctx.beginPath();
    for (var j = 0; j < STROKES[i].length; j++){
      if (j == 0){
        ctx.moveTo(STROKES[i][j][0], STROKES[i][j][1]);
      }else{
        ctx.lineTo(STROKES[i][j][0], STROKES[i][j][1]);
      }
    }
    ctx.stroke(); 
  }
}


function main(){
  context.lineWidth = 1;
  context.fillStyle="white";
  context.fillRect(0,0,WIDTH,HEIGHT);
  context.strokeStyle="black";
  draw_strokes(context);
}


function test_animate(){
  if (AUTO_ANIM){
    for (var i = 0; i < NODES.length; i++){
      if (NODES[i].parent ){
        var r = Math.min(Math.max(parseFloat(atob(NODES[i].id)),0.3),0.7);
        NODES[i].th = NODES[i].th0 + Math.sin((new Date()).getTime()*0.003/r+r*Math.PI*2)*r*0.5;
      }else{
        NODES[i].th = NODES[i].th0
      }
    }
  }
  doodleMeta.forwardKinematicsNodes(NODES);
  doodleMeta.calculateSkin(SKIN);
  anim_render();
}

function anim_render(){
  anim_context.fillStyle="white";
  anim_context.fillRect(0,0,WIDTH,HEIGHT);
  
  if (SHOW_NODES){
    anim_context.fillStyle = "none";
    anim_context.lineWidth = 1;
    
    for (var i = 0; i < SKIN.length; i++){
      for (var j = 0; j < SKIN[i].anchors.length; j++){
        var a = SKIN[i].anchors[j]
        anim_context.strokeStyle = Okb.color.css(0,0,0,a.w*0.5)
        anim_context.beginPath();
        anim_context.moveTo(a.node.x,a.node.y);
        anim_context.lineTo(SKIN[i].x,SKIN[i].y);
        anim_context.stroke();
      }
    }
    anim_context.lineWidth = 1.5;
    anim_context.strokeStyle="red"; 
    doodleMeta.drawTree(anim_canvas,NODES[0]);
  }
  if (SHOW_NODES || SHOW_SEL_NODE){
    
    anim_context.fillStyle = "magenta";
    var p = NODES[SEL_NODE%NODES.length];
    if (p){
      anim_context.fillRect(p.x-5,p.y-5,10,10)
    }
  }
  
  anim_context.strokeStyle="black";  
  anim_context.fillStyle = "none";
  anim_context.lineWidth = 2;
  anim_context.lineJoin = "round";
  anim_context.lineCap = "round";
  
  for (var i = 0; i < SKIN.length; i++){
    if (!SKIN[i].connect){
      if (i != 0){
        anim_context.stroke();
      }
      anim_context.beginPath();
      anim_context.moveTo(SKIN[i].x, SKIN[i].y);
    }else{
      anim_context.lineTo(SKIN[i].x, SKIN[i].y);
    }
  }
  anim_context.stroke();
}


doodleRig.setup({
  width:WIDTH,
  height:HEIGHT,
  fat:FAT,
  bleed:BLEED,
  debugCanvasId : "dbg_canvas",
  skeletonCanvasId : "skel_canvas",
  blobCanvasId : "blob_canvas"
})


function process(){
  var ret = doodleRig.process(STROKES);
  NODES = ret.nodes;
  SKIN = ret.skin;
}

doodleRig.checkOpenCVReady(function(){
  console.log("ready.")
  title.innerHTML = "Doodle Rig";
  process();
})

window.setInterval(main,10);
window.setInterval(test_animate,10);