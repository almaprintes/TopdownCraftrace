// TrackStudio preview exports annotations on gameTrack.aiLineGuides.
// Registered circuits place author annotations inside gameTrack.meta.
// RaceScene wraps either source in scene.track.meta = gameTrack, so
// the runtime paths intentionally differ by exactly one nesting level.
// This pure helper keeps the local Realizador in sync with both formats.
import {SANTA_CRUZ_AUTHOR_BEZIER} from './craftraceSantaCruzAuthorBezier.js';
export function resolveDirectorGuideSource(runtimeTrack){
 const track=runtimeTrack?.meta;
 const direct=track?.aiLineGuides;
 const authored=track?.meta?.aiLineGuides;
 const guides=direct?.points?.length?direct:authored?.points?.length?authored:null;
 // The installed Santa Cruz photo uses the same authoring coordinates as
 // the original 10 tips. Expose the manually drawn line exclusively to
 // local Realizador G; the competitive race bridge never calls this helper.
 const officialSantaCruz=track?.id==='santa-cruz'&&
   track?.meta?.sourceFile==='Santa-Cruz-x3-nitido.tdrtrack'&&
   track?.meta?.aiGuideSource==='TrackStudio user-export 2026-11-21'&&
   track?.worldW===3072&&track?.worldH===4608;
 const bezier=track?.aiBezierLine||track?.meta?.aiBezierLine||
   (officialSantaCruz?SANTA_CRUZ_AUTHOR_BEZIER:null);
 return{
   guides,bezier,
   shape:track?.trackShape||null,
   dimensions:{worldW:track?.worldW,worldH:track?.worldH},
   carScale:track?.carScale??track?.meta?.carScale??1,
   source:direct?.points?.length?'trackstudio':
     authored?.points?.length?'registered-circuit':'none'
 };
}
