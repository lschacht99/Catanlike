"use client";

import { useEffect, useState } from "react";
import type { ProgressTrackKey } from "@/types/game";
import { faceGrid } from "./dice-faces";
import GameIcon from "./GameIcon";

function Die({ value, spinDelay }: { value:number; spinDelay:number }) {
  return <div className="die3d" style={{animationDelay:`${spinDelay}ms`}} aria-hidden>
    {faceGrid(value).map((on,i)=><span key={i} className={on?"pip on":"pip"}/>) }
  </div>;
}

const EVENT_DIE_LABEL: Record<"barbarian"|ProgressTrackKey,string> = {
  barbarian:"Raiders advance",
  trade:"Trade event",
  politics:"Politics event",
  science:"Science event",
};

const EVENT_DIE_SYMBOL: Record<"barbarian"|ProgressTrackKey,string> = {
  barbarian:"event-barbarian-1",
  trade:"event-trade",
  politics:"event-politics",
  science:"event-science",
};

export default function DiceRoll({ roll, eventDie=null }: { roll:[number,number]; eventDie?:"barbarian"|ProgressTrackKey|null }) {
  const [faces,setFaces]=useState<[number,number]>(roll);
  const key=`${roll[0]}-${roll[1]}`;

  useEffect(()=>{
    let ticks=0;
    setFaces([1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)]);
    const id=window.setInterval(()=>{
      ticks+=1;
      if(ticks>=7){window.clearInterval(id);setFaces(roll);}
      else setFaces([1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)]);
    },70);
    return()=>window.clearInterval(id);
  },[key]);

  return <div className="dice-roll" key={key}>
    <div className="dice-row">
      <Die value={faces[0]} spinDelay={0}/>
      <Die value={faces[1]} spinDelay={90}/>
      {eventDie!=null&&<div className="event-die flex items-center justify-center text-ink" role="img" aria-label={EVENT_DIE_LABEL[eventDie]} title={EVENT_DIE_LABEL[eventDie]}><GameIcon name={EVENT_DIE_SYMBOL[eventDie]} size={46}/></div>}
    </div>
    <p className="mt-3 text-sm font-black text-yellow-300">Rolled {roll[0]+roll[1]}</p>
  </div>;
}
