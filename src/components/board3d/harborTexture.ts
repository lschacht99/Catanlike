import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function resourceMark(ctx:CanvasRenderingContext2D, resource:string, cx:number, cy:number) {
  ctx.save();
  ctx.translate(cx,cy);
  ctx.strokeStyle="#22303f";
  ctx.fillStyle="#22303f";
  ctx.lineWidth=9;
  ctx.lineCap="round";
  ctx.lineJoin="round";
  ctx.beginPath();
  if(resource==="wood") {
    ctx.moveTo(0,-34);ctx.lineTo(0,33);ctx.moveTo(0,-18);ctx.lineTo(-19,-2);ctx.moveTo(0,-7);ctx.lineTo(19,9);ctx.moveTo(0,7);ctx.lineTo(-17,23);
  } else if(resource==="brick") {
    ctx.rect(-33,-24,66,48);ctx.moveTo(-33,0);ctx.lineTo(33,0);ctx.moveTo(-11,-24);ctx.lineTo(-11,0);ctx.moveTo(12,0);ctx.lineTo(12,24);
  } else if(resource==="grain") {
    ctx.moveTo(0,-34);ctx.lineTo(0,34);ctx.moveTo(0,-20);ctx.lineTo(-20,-7);ctx.moveTo(0,-7);ctx.lineTo(20,6);ctx.moveTo(0,7);ctx.lineTo(-19,21);
  } else if(resource==="wool") {
    ctx.arc(-18,2,17,0,Math.PI*2);ctx.arc(0,-7,21,0,Math.PI*2);ctx.arc(20,2,17,0,Math.PI*2);
  } else if(resource==="ore") {
    ctx.moveTo(-35,25);ctx.lineTo(-12,-28);ctx.lineTo(4,-4);ctx.lineTo(18,-25);ctx.lineTo(35,25);ctx.closePath();
  } else {
    ctx.arc(0,0,28,0,Math.PI*2);ctx.moveTo(-38,0);ctx.lineTo(38,0);ctx.moveTo(0,-38);ctx.lineTo(0,38);
  }
  ctx.stroke();
  ctx.restore();
}

export function harborTexture(label:string, accent:string, sub?:string, resource?:string):THREE.CanvasTexture {
  const key=`${label}|${accent}|${sub??""}|${resource??""}`;
  const hit=cache.get(key);
  if(hit)return hit;
  const size=256;
  const canvas=document.createElement("canvas");
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d")!;
  roundRect(ctx,10,10,size-20,size-20,36);
  ctx.fillStyle="#f4ead2";ctx.fill();
  ctx.lineWidth=14;ctx.strokeStyle=accent;ctx.stroke();
  ctx.textAlign="center";ctx.textBaseline="middle";
  if(resource)resourceMark(ctx,resource,size/2,62);
  else resourceMark(ctx,"any",size/2,62);
  ctx.fillStyle="#22303f";
  ctx.font="900 82px system-ui, sans-serif";
  ctx.fillText(label,size/2,145);
  if(sub){ctx.font="900 34px system-ui, sans-serif";ctx.fillStyle=accent;ctx.fillText(sub,size/2,207,size-44);}
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  cache.set(key,texture);
  return texture;
}
