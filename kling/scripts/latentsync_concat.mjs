// Lipsync video→video con LatentSync (fal) + truco concatenar. Uso:
//   node latentsync_concat.mjs <ad> "<n1 n2 ...>"   (lee cuts_<ad>.json, voces/vo_<ad>.mp3, clips/<ad>/raw_<n>.mp4)
// Salida: clips/<ad>_sync/lip_<n>.mp4
import { fal } from "@fal-ai/client";
import { execFileSync } from "child_process";
import { readFileSync, mkdirSync, writeFileSync, createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
const FF="C:/ffmpeg/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe";
fal.config({credentials:process.env.FAL_KEY});
const ad=process.argv[2]; const ns=process.argv[3].trim().split(/\s+/);
const cuts=JSON.parse(readFileSync(`D:/videos-kling/config/cuts_${ad}.json`,"utf8"));
const cm=Object.fromEntries(cuts.map(c=>[c.n,c]));
const VOZ=`D:/videos-kling/voces/vo_${ad}.mp3`;
const T=`C:/Users/Unda/AppData/Local/Temp/claude/D--videos-kling/6072a967-a61e-4cf0-9c73-d4bd861cf740/scratchpad/ls_${ad}`;
mkdirSync(T,{recursive:true});
const SYNC=`D:/videos-kling/clips/${ad}_sync`; mkdirSync(SYNC,{recursive:true});
const sh=(a)=>execFileSync(FF,a,{stdio:["ignore","pipe","inherit"]});
const durs=[];
for(const n of ns){ const c=cm[n]; const d=c.dur; durs.push(d);
  sh(["-y","-i",`D:/videos-kling/clips/${ad}/raw_${n}.mp4`,"-t",String(d),"-vf","scale=720:1280,fps=30","-c:v","libx264","-pix_fmt","yuv420p","-an",`${T}/v_${n}.mp4`]);
  sh(["-y","-ss",String(c.start),"-t",String(d),"-i",VOZ,"-ar","44100","-ac","1",`${T}/a_${n}.wav`]);
}
writeFileSync(`${T}/vlist.txt`,ns.map(n=>`file '${T}/v_${n}.mp4'`).join("\n"));
writeFileSync(`${T}/alist.txt`,ns.map(n=>`file '${T}/a_${n}.wav'`).join("\n"));
sh(["-y","-f","concat","-safe","0","-i",`${T}/vlist.txt`,"-c","copy",`${T}/cv.mp4`]);
sh(["-y","-f","concat","-safe","0","-i",`${T}/alist.txt`,"-c:a","pcm_s16le",`${T}/ca.wav`]);
const up=async(p,ty)=>await fal.storage.upload(new Blob([readFileSync(p)],{type:ty}));
console.log("subiendo…");
const [video_url,audio_url]=await Promise.all([up(`${T}/cv.mp4`,"video/mp4"),up(`${T}/ca.wav`,"audio/wav")]);
console.log("LatentSync…");
const out=await fal.subscribe("fal-ai/latentsync",{input:{video_url,audio_url},logs:false});
const url=out?.data?.video?.url ?? out?.video?.url;
if(!url){console.error("sin url",JSON.stringify(out?.data??out).slice(0,200));process.exit(1);}
const r=await fetch(url); await pipeline(Readable.fromWeb(r.body),createWriteStream(`${T}/clip.mp4`));
// cortar por duraciones acumuladas
let acc=0;
for(let i=0;i<ns.length;i++){ const n=ns[i];
  sh(["-y","-ss",String(acc),"-t",String(durs[i]),"-i",`${T}/clip.mp4`,"-c:v","libx264","-pix_fmt","yuv420p","-an",`${SYNC}/lip_${n}.mp4`]);
  acc+=durs[i];
}
console.log("LISTO lip:",ns.join(","),"->",SYNC);
