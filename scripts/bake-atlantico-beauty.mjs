import { runTrackBeautyBake } from './bake-track-beauty.mjs';

runTrackBeautyBake('track01').catch(err=>{
  console.error('[atlantico-bake] failed');
  console.error(err);
  process.exitCode=1;
});
