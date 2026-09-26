import { writeProject } from './scene.mjs';
const args=process.argv.slice(2);
if(args.length!==2 || args[0]!=='--out') throw new Error('Usage: node examples/motion-study/build.mjs --out ../motion-study');
await writeProject({out:args[1],captions:[
 {start:0,end:6.782,text:'口述，留下场景、情绪和判断。'},
 {start:6.782,end:10.8,text:'同一批记录归类，隐去身份。'},
 {start:10.8,end:14.162,text:'整理成一张可以分享的笔记。'}
]});
console.log('Created silent motion study. Run HyperFrames in the output directory.');
