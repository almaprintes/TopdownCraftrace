// TrackStudio preview exports annotations on gameTrack.aiLineGuides.
// Registered circuits place author annotations inside gameTrack.meta.
// RaceScene wraps either source in scene.track.meta = gameTrack, so
// the runtime paths intentionally differ by exactly one nesting level.
// This pure helper keeps the local Realizador in sync with both formats.
import {SANTA_CRUZ_AUTHOR_BEZIER} from './craftraceSantaCruzAuthorBezier.js';
import {KARTING_CANARIAS_AI_AUTHORING_ID,KARTING_CANARIAS_AI_SOURCE_SHA,
  KARTING_CANARIAS_AI_GUIDES,KARTING_CANARIAS_AI_BEZIER}
 from './craftraceKartingCanariasAuthorBezier.js';
export function resolveDirectorGuideSource(runtimeTrack){
 const track=runtimeTrack?.meta;
 const direct=track?.aiLineGuides;
 const authored=track?.meta?.aiLineGuides;
 // The manual Karting Canarias line is local-Realizador-only and bound to the
 // exact original owner geometry. Never let a similarly named legacy circuit
 // or a regenerated road inherit these coordinates.
 const officialCanarias=track?.id===KARTING_CANARIAS_AI_AUTHORING_ID&&
   track?.raceDirection==='forward'&&
   track?.worldW===4096&&track?.worldH===6144&&
   track?.meta?.originalOwnerBundleSha256===KARTING_CANARIAS_AI_SOURCE_SHA;
 const guides=direct?.points?.length?direct:
   authored?.points?.length?authored:
   officialCanarias?KARTING_CANARIAS_AI_GUIDES:null;
 // The installed Santa Cruz photo uses the same authoring coordinates as
 // the original 10 tips. Expose the manually drawn line exclusively to
 // local Realizador G; the competitive race bridge never calls this helper.
 const officialSantaCruz=track?.id==='santa-cruz'&&
   track?.meta?.sourceFile==='Santa-Cruz-x3-nitido.tdrtrack'&&
   track?.meta?.aiGuideSource==='TrackStudio user-export 2026-11-21'&&
   track?.worldW===3072&&track?.worldH===4608;
 const bezier=track?.aiBezierLine||track?.meta?.aiBezierLine||
   (officialSantaCruz?SANTA_CRUZ_AUTHOR_BEZIER:
     officialCanarias?KARTING_CANARIAS_AI_BEZIER:null);
 return{
   guides,bezier,
   shape:track?.trackShape||null,
   dimensions:{worldW:track?.worldW,worldH:track?.worldH},
   carScale:track?.carScale??track?.meta?.carScale??1,
   source:direct?.points?.length?'trackstudio':
     authored?.points?.length?'registered-circuit':
     officialCanarias?'owner-director-candidate':'none'
 };
}
