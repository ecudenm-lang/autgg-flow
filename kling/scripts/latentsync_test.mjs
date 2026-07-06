// Test LatentSync (fal) con truco concatenar: V4 disney tomas 10 y 13 → 1 llamada → cortar.
import { fal } from "@fal-ai/client";
import { execFileSync } from "child_process";
import { readFileSync, mkdirSync, createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const FF="C:/ffmpeg/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe";
const FAL_KEY=process.env.FAL_KEY;
fal.config({credentials:FAL_KEY});
const T="C:/Users/Unda/AppData/Local/Temp/claude/D--videos-kling/6072a967-a61e-4cf0-9c73-d4bd861cf740/scratchpad/lstmp";
mkdirSync(T,{recursive:true});
const SYNCDIR="D:/videos-kling/clips/v4disney_sync"; mkdirSync(SYNCDIR,{recursive:true});
const sh=(a)=>execFileSync(FF,a,{stdio:["ignore","pipe","inherit"]});

const VOZ="D:/videos-kling/Videos a iterar/V4.mp3";
const shots=[
  {n:"10", start:47.84, dur:5.58, raw:"D:/videos-kling/clips/v4disney/raw_10.mp4"},
  {n:"13", start:68.56, dur:3.72, raw:"D:/videos-kling/clips/v4disney/raw_13.mp4"},
];

// 1) trim + normalizar cada video, extraer su audio
for(const s of shots){
  sh(["-y","-i",s.raw,"-t",String(s.dur),"-vf","scale=720:1280,fps=30","-c:v","libx264","-pix_fmt","yuv420p","-an",`${T}/v_${s.n}.mp4`]);
  sh(["-y","-ss",String(s.start),"-t",String(s.dur),"-i",VOZ,"-ar","44100","-ac","1",`${T}/a_${s.n}.wav`]);
}
// 2) concatenar
const vlist=shots.map(s=>`file '${T}/v_${s.n}.mp4'`).join("\n");
const alist=shots.map(s=>`file '${T}/a_${s.n}.wav'`).join("\n");
import { writeFileSync } from "fs";
writeFileSync(`${T}/vlist.txt`,vlist); writeFileSync(`${T}/alist.txt`,alist);
sh(["-y","-f","concat","-safe","0","-i",`${T}/vlist.txt`,"-c","copy",`${T}/concat_v.mp4`]);
sh(["-y","-f","concat","-safe","0","-i",`${T}/alist.txt`,"-c:a","pcm_s16le",`${T}/concat_a.wav`]);

// 3) subir + LatentSync
const up=async(p,type)=>await fal.storage.upload(new Blob([readFileSync(p)],{type}));
console.log("subiendo…");
const [video_url,audio_url]=await Promise.all([up(`${T}/concat_v.mp4`,"video/mp4"),up(`${T}/concat_a.wav`,"audio/wav")]);
console.log("llamando fal-ai/latentsync…");
const out=await fal.subscribe("fal-ai/latentsync",{input:{video_url,audio_url},logs:false});
const url=out?.data?.video?.url ?? out?.video?.url;
if(!url){console.error("sin url:",JSON.stringify(out?.data??out).slice(0,300)); process.exit(1);}
console.log("resultado:",url);
const dl=async(u,d)=>{const r=await fetch(u); await pipeline(Readable.fromWeb(r.body),createWriteStream(d)); return d;};
await dl(url,`${T}/concat_lip.mp4`);

// 4) cortar en lip_10 / lip_13
sh(["-y","-i",`${T}/concat_lip.mp4`,"-t",String(shots[0].dur),"-c:v","libx264","-pix_fmt","yuv420p","-an",`${SYNCDIR}/lip_10.mp4`]);
sh(["-y","-ss",String(shots[0].dur),"-i",`${T}/concat_lip.mp4`,"-c:v","libx264","-pix_fmt","yuv420p","-an",`${SYNCDIR}/lip_13.mp4`]);
console.log("LISTO -> lip_10.mp4, lip_13.mp4 en",SYNCDIR);
